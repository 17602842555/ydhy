import seed from './data/seed.json' with { type: 'json' };
import { authenticate } from './lib/auth.mjs';
import { D1StateStore } from './lib/d1Store.mjs';
import { ApiError, dataStates, getActor, requirePermission } from './lib/domain.mjs';
import { getImportBatchDetail } from './lib/imports.mjs';
import { handleApiRoute } from './lib/routes.mjs';

const maxBodyBytes = 15_000_000;

export default {
  async fetch(request, env) {
    const store = new D1StateStore({ db: env.DB, seed });
    return handleRequest(request, env, store);
  },
};

async function handleRequest(request, env, store) {
  if (request.method === 'OPTIONS') return json(request, env, 204, {});

  try {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return json(request, env, 200, {
        ok: true,
        service: 'huage-api',
        mode: 'cloudflare-d1',
        runtime: {
          environment: env.ENVIRONMENT || 'production',
          api: {
            host: url.host,
            port: 443,
            corsOrigin: env.HUAGE_CORS_ORIGIN || '*',
          },
          store: {
            mode: 'd1',
            adapter: 'cloudflare-d1',
            dataFile: null,
            databaseUrlConfigured: false,
          },
          sourceFiles: {
            adapter: 'disabled',
            rootDir: null,
          },
          auth: {
            allowHeaderFallback: env.HUAGE_ALLOW_HEADER_AUTH === '1',
          },
          ai: {
            provider: 'ark-coding-plan',
            configured: Boolean(env.ARK_API_KEY),
            model: env.ARK_MODEL || 'ark-code-latest',
            baseUrl: env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3',
            timeoutMs: Number(env.ARK_TIMEOUT_MS || 75_000),
          },
          schema: {
            path: 'apps/api/migrations/0001_app_state.sql',
            checkCommand: 'npm run cf:seed:generate && wrangler d1 migrations apply DB',
          },
          warnings: env.HUAGE_CORS_ORIGIN ? [] : ['HUAGE_CORS_ORIGIN is wildcard in production'],
        },
        dataStates,
      });
    }

    // Source-file download is genuinely runtime-specific: this Worker keeps
    // structured state in D1 only and never serves source bytes, so it is
    // handled here rather than through the shared JSON route table.
    const sourceFileMatch = url.pathname.match(/^\/api\/imports\/([^/]+)\/source-file$/);
    if (sourceFileMatch && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      requirePermission(data, actor, 'source.read');
      const detail = getImportBatchDetail(data, sourceFileMatch[1]);
      if (!detail.batch.objectKey) return json(request, env, 404, { error: 'source_file_not_found' });
      return json(request, env, 501, { error: 'source_file_store_not_configured', reason: 'Cloudflare Worker deployment currently stores structured state in D1 only.' });
    }

    const body = request.method === 'POST' || request.method === 'PATCH' ? await readBody(request) : {};
    const result = await handleApiRoute({
      method: request.method,
      pathname: url.pathname,
      searchParams: url.searchParams,
      body,
      seed,
      store,
      readActor: (data) => resolveActor(data, request, env),
      makeAiConfig: (input) => aiConfig(env, input),
      nodeReq: toNodeRequest(request),
      capabilities: {
        sourceFileStore: null,
        maxSourceFileBytes: null,
        isProduction: env.ENVIRONMENT === 'production',
      },
    });
    if (!result) return json(request, env, 404, { error: 'not_found' });
    return json(request, env, result.status, result.body);
  } catch (error) {
    return errorResponse(request, env, error);
  }
}

function aiConfig(env, body = {}) {
  const settings = body.aiSettings ?? body;
  const apiKey = String(settings.apiKey || '').trim();
  const model = String(settings.model || '').trim();
  const baseUrl = String(settings.baseUrl || '').trim();
  return {
    apiKey: apiKey || env.ARK_API_KEY || '',
    model: model || env.ARK_MODEL || 'ark-code-latest',
    baseUrl: baseUrl || env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/coding/v3',
    timeoutMs: Number(env.ARK_TIMEOUT_MS || 75_000),
    section: String(body.section || '').trim(),
    context: body.context && typeof body.context === 'object' ? body.context : null,
  };
}

function json(request, env, status, body, extraHeaders = {}) {
  // 204 is a null-body status: spec-compliant runtimes (and Node's undici
  // Response) reject a non-null body here, so pass null rather than ''.
  const payload = status === 204 ? null : JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowedOrigin(request, env),
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Role, X-Actor, X-Subsidiary-Id, X-Ark-Api-Key, X-Ark-Model, X-Ark-Base-Url',
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Object-Key, X-Request-Id',
      Vary: 'Origin',
      ...extraHeaders,
    },
  });
}

function newRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function errorResponse(request, env, error) {
  const requestId = newRequestId();
  const headers = { 'X-Request-Id': requestId };
  if (error instanceof ApiError) {
    return json(request, env, error.status, { error: error.error, reason: error.reason, requestId }, headers);
  }
  if (error.message === 'invalid_json') return json(request, env, 400, { error: error.message, requestId }, headers);
  if (error.message === 'body_too_large') {
    return json(request, env, 413, { error: error.message, reason: `request body exceeds ${maxBodyBytes} bytes`, requestId }, headers);
  }
  let pathname = '';
  try {
    pathname = new URL(request.url).pathname;
  } catch {
    pathname = request.url;
  }
  console.error(JSON.stringify({
    level: 'error',
    requestId,
    method: request.method,
    path: pathname,
    message: error?.message || String(error),
    stack: error?.stack || null,
  }));
  return json(request, env, 500, { error: 'internal_server_error', requestId }, headers);
}

async function readBody(request) {
  const raw = await request.text();
  if (raw.length > maxBodyBytes) throw new Error('body_too_large');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error('invalid_json');
  }
}

function resolveActor(data, request, env) {
  try {
    return authenticate(data, toNodeRequest(request));
  } catch (error) {
    if (env.HUAGE_ALLOW_HEADER_AUTH === '1' && ['unauthorized', 'session_expired', 'invalid_user'].includes(error.error)) {
      return getActor(toNodeRequest(request));
    }
    throw error;
  }
}

function toNodeRequest(request) {
  return { headers: Object.fromEntries([...request.headers.entries()].map(([key, value]) => [key.toLowerCase(), value])) };
}

function allowedOrigin(request, env) {
  const configured = String(env.HUAGE_CORS_ORIGIN || '*');
  if (configured === '*') return '*';
  const origin = request.headers.get('Origin') || '';
  const allowed = configured.split(',').map((item) => item.trim()).filter(Boolean);
  return allowed.includes(origin) ? origin : allowed[0] || '*';
}
