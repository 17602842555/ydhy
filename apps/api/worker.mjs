import seed from './data/seed.json' with { type: 'json' };
import { listLoginUsers, login, logout, authenticate } from './lib/auth.mjs';
import { getCommercialSystem, updateCommercialWorkOrder } from './lib/commercialSystem.mjs';
import { D1StateStore } from './lib/d1Store.mjs';
import { ApiError, canReadSubsidiary, dataStates, getActor, permissionsFor, requirePermission, transitions } from './lib/domain.mjs';
import {
  calculateDashboard,
  createImportBatch,
  getImportBatchDetail,
  publishImportBatch,
  revalidateImportBatch,
  validateImportRows,
} from './lib/imports.mjs';
import { getOperatingSystem, updateOperatingTask } from './lib/operatingSystem.mjs';
import { getPeopleGraph, updatePrimaryContact } from './lib/people.mjs';
import { updateRiskItem } from './lib/risks.mjs';
import { addTaskCalendarUnit, getTaskCalendar, syncTaskCalendarFromSeed, upsertTaskCalendarMetric, upsertTaskCalendarMonthlyTarget } from './lib/taskCalendar.mjs';
import {
  addVillaExpense,
  addVillaIssue,
  addVillaPhase,
  deleteVillaExpense,
  getVillaProject,
  syncVillaProjectFromSeed,
  updateVillaBudget,
  updateVillaExpense,
  updateVillaIssue,
  updateVillaPhase,
} from './lib/villaProject.mjs';
import { updateWorkflowState, workflowConfigs } from './lib/workflows.mjs';

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
          schema: {
            path: 'apps/api/migrations/0001_app_state.sql',
            checkCommand: 'npm run cf:seed:generate && wrangler d1 migrations apply DB',
          },
          warnings: env.HUAGE_CORS_ORIGIN ? [] : ['HUAGE_CORS_ORIGIN is wildcard in production'],
        },
        dataStates,
      });
    }

    if (url.pathname === '/api/auth/users' && request.method === 'GET') {
      return json(request, env, 200, { users: listLoginUsers(await store.read()) });
    }

    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await store.transaction((data) => login(data, body));
      return json(request, env, 201, result);
    }

    if (url.pathname === '/api/auth/me' && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      return json(request, env, 200, {
        actor,
        permissions: [...permissionsFor(data, actor.role)],
      });
    }

    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      const result = await store.transaction((data) => logout(data, toNodeRequest(request)));
      return json(request, env, 200, result);
    }

    if (url.pathname === '/api/dashboard' && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      requirePermission(data, actor, 'dashboard.read');
      return json(request, env, 200, calculateDashboard(data));
    }

    if (url.pathname === '/api/operating-system' && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      requirePermission(data, actor, 'dashboard.read');
      return json(request, env, 200, getOperatingSystem(data));
    }

    if (url.pathname === '/api/people' && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      requirePermission(data, actor, 'dashboard.read');
      return json(request, env, 200, getPeopleGraph(data));
    }

    if (url.pathname === '/api/commercial-system' && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      requirePermission(data, actor, 'dashboard.read');
      return json(request, env, 200, getCommercialSystem(data));
    }

    if (url.pathname === '/api/task-calendar' && request.method === 'GET') {
      const data = await store.read();
      return json(request, env, 200, getTaskCalendar(data, resolveActor(data, request, env), { month: url.searchParams.get('month') }));
    }

    if (url.pathname === '/api/task-calendar/supervision' && request.method === 'GET') {
      const data = await store.read();
      return json(request, env, 200, getTaskCalendar(data, resolveActor(data, request, env), { month: url.searchParams.get('month') }).supervisionDashboard);
    }

    if (url.pathname === '/api/villa-project' && request.method === 'GET') {
      const data = await store.read();
      return json(request, env, 200, getVillaProject(data, resolveActor(data, request, env)));
    }

    const peopleContactMatch = url.pathname.match(/^\/api\/people\/contacts\/([^/]+)$/);
    if (peopleContactMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const result = await store.transaction((data) => updatePrimaryContact(data, peopleContactMatch[1], body, resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    const operatingTaskMatch = url.pathname.match(/^\/api\/operating-system\/tasks\/([^/]+)$/);
    if (operatingTaskMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const result = await store.transaction((data) => updateOperatingTask(data, operatingTaskMatch[1], body, resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    const riskMatch = url.pathname.match(/^\/api\/risks\/([^/]+)$/);
    if (riskMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const result = await store.transaction((data) => updateRiskItem(data, riskMatch[1], body, resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    const commercialWorkOrderMatch = url.pathname.match(/^\/api\/commercial-system\/work-orders\/([^/]+)$/);
    if (commercialWorkOrderMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const result = await store.transaction((data) =>
        updateCommercialWorkOrder(data, commercialWorkOrderMatch[1], body, resolveActor(data, request, env)),
      );
      return json(request, env, 200, result);
    }

    if (url.pathname === '/api/task-calendar/units' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await store.transaction((data) => addTaskCalendarUnit(data, body, resolveActor(data, request, env)));
      return json(request, env, 201, result);
    }

    if (url.pathname === '/api/task-calendar/metrics' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await store.transaction((data) => upsertTaskCalendarMetric(data, body, resolveActor(data, request, env)));
      return json(request, env, 200, {
        ...result,
        dashboard: calculateDashboard(await store.read()),
      });
    }

    if (url.pathname === '/api/task-calendar/monthly-targets' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await store.transaction((data) => upsertTaskCalendarMonthlyTarget(data, body, resolveActor(data, request, env)));
      return json(request, env, 200, {
        ...result,
        dashboard: calculateDashboard(await store.read()),
      });
    }

    if (url.pathname === '/api/task-calendar/sync-source' && request.method === 'POST') {
      const result = await store.transaction((data) => syncTaskCalendarFromSeed(data, seed, resolveActor(data, request, env)));
      return json(request, env, 200, {
        ...result,
        dashboard: calculateDashboard(await store.read()),
      });
    }

    if (url.pathname === '/api/villa-project/phases' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await store.transaction((data) => addVillaPhase(data, body, resolveActor(data, request, env)));
      return json(request, env, 201, result);
    }

    const villaPhaseMatch = url.pathname.match(/^\/api\/villa-project\/phases\/([^/]+)$/);
    if (villaPhaseMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const result = await store.transaction((data) => updateVillaPhase(data, villaPhaseMatch[1], body, resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    if (url.pathname === '/api/villa-project/issues' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await store.transaction((data) => addVillaIssue(data, body, resolveActor(data, request, env)));
      return json(request, env, 201, result);
    }

    const villaIssueMatch = url.pathname.match(/^\/api\/villa-project\/issues\/([^/]+)$/);
    if (villaIssueMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const result = await store.transaction((data) => updateVillaIssue(data, villaIssueMatch[1], body, resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    if (url.pathname === '/api/villa-project/expenses' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await store.transaction((data) => addVillaExpense(data, body, resolveActor(data, request, env)));
      return json(request, env, 201, result);
    }

    const villaExpenseMatch = url.pathname.match(/^\/api\/villa-project\/expenses\/([^/]+)$/);
    if (villaExpenseMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const result = await store.transaction((data) => updateVillaExpense(data, villaExpenseMatch[1], body, resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    if (villaExpenseMatch && request.method === 'DELETE') {
      const result = await store.transaction((data) => deleteVillaExpense(data, villaExpenseMatch[1], resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    const villaBudgetMatch = url.pathname.match(/^\/api\/villa-project\/budgets\/([^/]+)$/);
    if (villaBudgetMatch && request.method === 'PATCH') {
      const body = await readBody(request);
      const result = await store.transaction((data) => updateVillaBudget(data, decodeURIComponent(villaBudgetMatch[1]), body, resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    if (url.pathname === '/api/villa-project/sync-source' && request.method === 'POST') {
      const result = await store.transaction((data) => syncVillaProjectFromSeed(data, seed, resolveActor(data, request, env)));
      return json(request, env, 200, result);
    }

    if (url.pathname === '/api/imports/validate-preview' && request.method === 'POST') {
      const body = await readBody(request);
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      requirePermission(data, actor, 'import.validate');
      const rows = Array.isArray(body.rows) ? body.rows : [];
      const { issues } = validateImportRows(data, rows);
      return json(request, env, 200, {
        state: issues.some((issue) => issue.severity === 'error') ? 'raw' : 'validated',
        rowCount: rows.length,
        issues,
      });
    }

    if (url.pathname === '/api/imports' && request.method === 'POST') {
      const body = await readBody(request);
      const result = await store.transaction((data) => createImportBatch(data, body, resolveActor(data, request, env)));
      return json(request, env, 201, result);
    }

    const sourceFileMatch = url.pathname.match(/^\/api\/imports\/([^/]+)\/source-file$/);
    if (sourceFileMatch && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      requirePermission(data, actor, 'source.read');
      const detail = getImportBatchDetail(data, sourceFileMatch[1]);
      if (!detail.batch.objectKey) return json(request, env, 404, { error: 'source_file_not_found' });
      return json(request, env, 501, { error: 'source_file_store_not_configured', reason: 'Cloudflare Worker deployment currently stores structured state in D1 only.' });
    }

    const importActionMatch = url.pathname.match(/^\/api\/imports\/([^/]+)\/(validate|publish)$/);
    if (importActionMatch && request.method === 'POST') {
      const [, batchId, action] = importActionMatch;
      const body = await readBody(request);
      const result = await store.transaction((data) =>
        action === 'validate'
          ? revalidateImportBatch(data, batchId, resolveActor(data, request, env))
          : publishImportBatch(data, batchId, resolveActor(data, request, env), body.reason),
      );
      return json(request, env, 200, {
        ...result,
        dashboard: calculateDashboard(await store.read()),
      });
    }

    const importMatch = url.pathname.match(/^\/api\/imports\/([^/]+)$/);
    if (importMatch && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      requirePermission(data, actor, 'source.read');
      return json(request, env, 200, getImportBatchDetail(data, importMatch[1]));
    }

    const workflowActionMatch = url.pathname.match(/^\/api\/subsidiaries\/([^/]+)\/workflows\/([^/]+)$/);
    if (workflowActionMatch && request.method === 'PATCH') {
      const [, subsidiaryId, workflowType] = workflowActionMatch;
      const body = await readBody(request);
      const result = await store.transaction((data) => updateWorkflowState(data, subsidiaryId, workflowType, body, resolveActor(data, request, env)));
      return json(request, env, 200, {
        ...result,
        dashboard: calculateDashboard(await store.read()),
      });
    }

    const subsidiaryMatch = url.pathname.match(/^\/api\/subsidiaries\/([^/]+)$/);
    if (subsidiaryMatch && request.method === 'GET') {
      const data = await store.read();
      const actor = resolveActor(data, request, env);
      const item = data.subsidiaries.find((entry) => entry.id === subsidiaryMatch[1]);
      if (!item) return json(request, env, 404, { error: 'not_found' });
      if (!canReadSubsidiary(data, actor, item.id)) {
        return json(request, env, 403, {
          error: 'forbidden',
          reason: 'role scope does not allow cross-subsidiary access',
        });
      }
      const batch = data.importBatches.find((entry) => entry.id === item.sourceBatchId);
      const sourceRow = data.sourceRows.find((entry) => entry.batchId === item.sourceBatchId && entry.rowNumber === item.sourceRow);
      const workflowTargets = Object.keys(workflowConfigs).map((type) => `${item.id}:${type}`);
      return json(request, env, 200, {
        subsidiary: item,
        source: batch,
        sourceRow,
        auditLogs: data.auditLogs.filter((entry) => entry.target === item.sourceBatchId || workflowTargets.includes(entry.target)),
      });
    }

    if (url.pathname === '/api/admin/reset' && request.method === 'POST' && env.ENVIRONMENT !== 'production') {
      return json(request, env, 200, { ok: true, dashboard: calculateDashboard(await store.resetFromSeed()) });
    }

    return json(request, env, 404, { error: 'not_found' });
  } catch (error) {
    return errorResponse(request, env, error);
  }
}

function json(request, env, status, body) {
  const payload = status === 204 ? '' : JSON.stringify(body);
  return new Response(payload, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': allowedOrigin(request, env),
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Role, X-Actor, X-Subsidiary-Id',
      'Access-Control-Expose-Headers': 'Content-Disposition, X-Object-Key',
      Vary: 'Origin',
    },
  });
}

function errorResponse(request, env, error) {
  if (error instanceof ApiError) {
    return json(request, env, error.status, { error: error.error, reason: error.reason });
  }
  if (error.message === 'invalid_json') return json(request, env, 400, { error: error.message });
  if (error.message === 'body_too_large') {
    return json(request, env, 413, { error: error.message, reason: `request body exceeds ${maxBodyBytes} bytes` });
  }
  console.error(error);
  return json(request, env, 500, { error: 'internal_server_error' });
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
