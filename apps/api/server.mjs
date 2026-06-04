import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getAiInsights } from './lib/aiInsights.mjs';
import { authenticate, login } from './lib/auth.mjs';
import { getCommercialSystem, updateCommercialWorkOrder } from './lib/commercialSystem.mjs';
import { healthFromConfig, loadRuntimeConfig } from './lib/config.mjs';
import { ApiError, canReadSubsidiary, dataStates, getActor, requirePermission, transitions } from './lib/domain.mjs';
import { calculateDashboard, createImportBatch, getImportBatchDetail, publishImportBatch, validateImportRows } from './lib/imports.mjs';
import { getOperatingSystem, updateOperatingTask } from './lib/operatingSystem.mjs';
import { getPeopleGraph, updatePrimaryContact } from './lib/people.mjs';
import { updateRiskItem } from './lib/risks.mjs';
import { handleApiRoute } from './lib/routes.mjs';
import { LocalSourceFileStore } from './lib/sourceFiles.mjs';
import { JsonFileStore, prepareInitialData } from './lib/store.mjs';
import { getVillaProject } from './lib/villaProject.mjs';
import { updateWorkflowState } from './lib/workflows.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const runtimeConfig = loadRuntimeConfig({ apiDir: __dirname });
const seed = JSON.parse(readFileSync(join(__dirname, 'data/seed.json'), 'utf8'));
const store = new JsonFileStore({
  seed,
  filePath: runtimeConfig.store.dataFile,
});
const sourceFileStore = new LocalSourceFileStore({
  rootDir: runtimeConfig.sourceFiles.rootDir,
});
const MAX_BODY_BYTES = runtimeConfig.limits.maxBodyBytes;
const MAX_SOURCE_FILE_BYTES = runtimeConfig.limits.maxSourceFileBytes;

function json(res, status, body, extraHeaders = {}) {
  const payload = status === 204 ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Access-Control-Allow-Origin': runtimeConfig.api.corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Role, X-Actor, X-Subsidiary-Id, X-Ark-Api-Key, X-Ark-Model, X-Ark-Base-Url',
    'Access-Control-Expose-Headers': 'Content-Disposition, X-Object-Key, X-Request-Id',
    ...extraHeaders,
  });
  res.end(payload);
}

function newRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function handleError(res, error, req) {
  const requestId = newRequestId();
  const headers = { 'X-Request-Id': requestId };
  if (error instanceof ApiError) {
    json(res, error.status, { error: error.error, reason: error.reason, requestId }, headers);
    return;
  }
  if (error.message === 'invalid_json') {
    json(res, 400, { error: error.message, requestId }, headers);
    return;
  }
  if (error.message === 'body_too_large') {
    json(res, 413, { error: error.message, reason: `request body exceeds ${MAX_BODY_BYTES} bytes`, requestId }, headers);
    return;
  }
  console.error(JSON.stringify({
    level: 'error',
    requestId,
    method: req?.method || null,
    path: req?.url || null,
    message: error?.message || String(error),
    stack: error?.stack || null,
  }));
  json(res, 500, { error: 'internal_server_error', requestId }, headers);
}

function notFound(res) {
  json(res, 404, { error: 'not_found' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > MAX_BODY_BYTES) {
        reject(new Error('body_too_large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) resolve({});
      else {
        try {
          resolve(JSON.parse(raw));
        } catch {
          reject(new Error('invalid_json'));
        }
      }
    });
  });
}

const server = createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === '/api/health') {
      json(res, 200, {
        ok: true,
        service: 'huage-api',
        mode: runtimeConfig.store.adapter,
        runtime: healthFromConfig(runtimeConfig),
        dataStates,
      });
      return;
    }

    // Source-file download streams original bytes from local object storage, a
    // non-JSON response specific to this Node runtime, so it is handled here
    // rather than through the shared JSON route table.
    const sourceFileMatch = url.pathname.match(/^\/api\/imports\/([^/]+)\/source-file$/);
    if (sourceFileMatch && req.method === 'GET') {
      const data = store.read();
      const actor = resolveActor(data, req);
      requirePermission(data, actor, 'source.read');
      const detail = getImportBatchDetail(data, sourceFileMatch[1]);
      if (!detail.batch.objectKey) {
        json(res, 404, { error: 'source_file_not_found' });
        return;
      }
      const sourceFile = sourceFileStore.read(detail.batch.objectKey);
      if (!sourceFile) {
        json(res, 404, { error: 'source_file_not_found' });
        return;
      }
      res.writeHead(200, {
        'Content-Type': detail.batch.sourceMimeType || 'application/octet-stream',
        'Content-Length': sourceFile.stat.size,
        'Content-Disposition': contentDisposition(detail.batch.fileName),
        'X-Object-Key': encodeURIComponent(detail.batch.objectKey),
        'Access-Control-Allow-Origin': runtimeConfig.api.corsOrigin,
        'Access-Control-Expose-Headers': 'Content-Disposition, X-Object-Key',
      });
      res.end(sourceFile.bytes);
      return;
    }

    const body = req.method === 'POST' || req.method === 'PATCH' ? await readBody(req) : {};
    const result = await handleApiRoute({
      method: req.method,
      pathname: url.pathname,
      searchParams: url.searchParams,
      body,
      seed,
      store,
      readActor: (data) => resolveActor(data, req),
      makeAiConfig: (input) => aiConfigFromBody(runtimeConfig.ai, input),
      nodeReq: req,
      capabilities: {
        sourceFileStore,
        maxSourceFileBytes: MAX_SOURCE_FILE_BYTES,
        isProduction: process.env.NODE_ENV === 'production',
      },
    });
    if (!result) {
      notFound(res);
      return;
    }
    json(res, result.status, result.body);
  } catch (error) {
    handleError(res, error, req);
  }
});

async function runSelfCheck() {
  const data = prepareInitialData(seed);
  const loggedIn = login(data, { userId: 'user-lijinning', password: '123456' });
  const sessionActor = authenticate(data, {
    headers: {
      authorization: `Bearer ${loggedIn.token}`,
    },
  });
  if (sessionActor.name !== '李锦宁' || sessionActor.role !== 'pmo') {
    throw new Error('expected login session to resolve PMO actor');
  }
  try {
    authenticate(data, { headers: {} });
    throw new Error('expected missing bearer token to be rejected');
  } catch (error) {
    if (error.error !== 'unauthorized') throw error;
  }
  const actor = { role: 'pmo', name: 'Self Check PMO', subsidiaryId: null };
  const preview = validateImportRows(data, [
    { name: '逆戟鲸', target: '300', actual: '125.8' },
    { name: '深圳赫拉', target: '', actual: '0' },
    { name: '未知子公司', target: '20', actual: '12' },
  ]);
  if (preview.issues.filter((issue) => issue.severity === 'error').length < 2) {
    throw new Error('expected dirty import preview to produce validation errors');
  }

  const created = createImportBatch(
    data,
    {
      fileName: 'self-check-valid.csv',
      fileHash: 'sha256-1111111111111111111111111111111111111111111111111111111111111111',
      source: 'api-self-check',
      rows: [
        { name: '逆戟鲸', target: '300', actual: '180', forecastRate: '69' },
        { name: '杭州控驻', target: '45', actual: '39', forecastRate: '92' },
      ],
    },
    actor,
    {
      maxSourceFileBytes: MAX_SOURCE_FILE_BYTES,
    },
  );
  if (created.batch.state !== 'validated') throw new Error('expected clean import to become validated');
  const createdState = created.batch.state;
  try {
    createImportBatch(
      data,
      {
        fileName: 'self-check-valid-copy.csv',
        fileHash: 'sha256-1111111111111111111111111111111111111111111111111111111111111111',
        source: 'api-self-check',
        rows: [{ name: '逆戟鲸', target: '300', actual: '180' }],
      },
      actor,
    );
    throw new Error('expected duplicate hash to be rejected');
  } catch (error) {
    if (error.error !== 'duplicate_import') throw error;
  }
  const published = publishImportBatch(data, created.batch.id, actor, 'self check publish');
  if (published.batch.state !== 'published') throw new Error('expected clean import to publish');
  const workflowResult = updateWorkflowState(data, 'nijijing', 'task', { nextState: 'blocked', reason: 'self check workflow transition' }, actor);
  if (workflowResult.subsidiary.taskState !== 'blocked') throw new Error('expected workflow transition to update task state');
  try {
    updateWorkflowState(
      data,
      'nijijing',
      'risk',
      { nextState: 'controlled', reason: 'owner should not control cross-subsidiary risk' },
      { role: 'subsidiary_owner', name: 'Scoped User', subsidiaryId: 'zhaoyizhu' },
    );
    throw new Error('expected cross-subsidiary workflow transition to be denied');
  } catch (error) {
    if (error.error !== 'forbidden') throw error;
  }
  const forbidden = canReadSubsidiary(data, { role: 'subsidiary_owner', name: 'Scoped User', subsidiaryId: 'zhaoyizhu' }, 'nijijing');
  if (forbidden) throw new Error('expected subsidiary_owner cross-subsidiary read to be denied');
  const dashboard = calculateDashboard(data);
  const operatingSystem = getOperatingSystem(data);
  if (operatingSystem.goalBranches.length < 5 || operatingSystem.contacts.length < 10) {
    throw new Error('expected operating system payload to expose original prototype modules');
  }
  const taskUpdate = updateOperatingTask(data, 'TASK-001', { status: '进行中', reason: 'self check task update' }, actor);
  if (taskUpdate.task.status !== '进行中') throw new Error('expected operating task status update');
  const people = getPeopleGraph(data);
  if (people.people.length < 5 || people.primaryContacts.length < 10 || people.handoverEvents.length < 1) {
    throw new Error('expected people graph to expose people, contacts, and handover events');
  }
  const commercialSystem = getCommercialSystem(data);
  if (commercialSystem.systemModules.length < 12 || commercialSystem.integrations.length < 6 || commercialSystem.workOrders.length < 6) {
    throw new Error('expected commercial system payload to expose full system typed records');
  }
  const aiInsights = await getAiInsights(data, sessionActor, { model: 'self-check-ark-disabled' });
  if (aiInsights.provider.status !== 'not_configured' || aiInsights.advice.length < 3 || aiInsights.sourceRefs.length < 4) {
    throw new Error('expected AI insights to return source-bound local fallback when Ark is not configured');
  }
  const villaProject = getVillaProject(data, sessionActor);
  if (villaProject.phases.length < 20 || villaProject.issues.length < 4 || villaProject.summary.budgetTotal !== 4000000) {
    throw new Error('expected villa project payload to expose imported dashboard seed data');
  }
  const commercialWorkOrder = updateCommercialWorkOrder(
    data,
    'WO-001',
    { status: '进行中', reason: 'self check commercial work order' },
    actor,
  );
  if (commercialWorkOrder.workOrder.status !== '进行中' || !commercialWorkOrder.auditLog) {
    throw new Error('expected commercial work order update to audit');
  }
  const contactUpdate = updatePrimaryContact(data, 'contact-huamu', { contact: '珠海谷春雨负责人', status: '正常', reason: 'self check contact update' }, actor);
  if (!contactUpdate.auditLog || !contactUpdate.handoverEvent) throw new Error('expected contact update to create handover and audit records');
  const riskUpdate = updateRiskItem(
    data,
    'RISK-003',
    {
      action: 'escalate',
      escalationReason: 'self check risk escalation',
      impactScope: '库存周转与毛利压力',
      evidenceRefs: ['RISK-003', 'finance-budget'],
    },
    actor,
  );
  if (!riskUpdate.decisionPackage?.sourceRiskId || !riskUpdate.decisionPackage.auditEventId) {
    throw new Error('expected risk escalation to generate evidence-bound decision package');
  }
  const idempotentRiskUpdate = updateRiskItem(data, 'RISK-003', { action: 'escalate', escalationReason: 'self check duplicate' }, actor);
  if (!idempotentRiskUpdate.idempotent) throw new Error('expected duplicate risk escalation to be idempotent');
  console.log(
    JSON.stringify(
      {
        ok: true,
        dataStates,
        transitions,
        checks: {
          dirtyPreviewIssues: preview.issues.length,
          sessionUser: sessionActor.name,
          createdBatch: created.batch.id,
          createdState,
          publishedState: published.batch.state,
          workflowState: workflowResult.subsidiary.taskState,
          dashboardSubsidiaries: dashboard.subsidiaries.length,
          operatingModules: operatingSystem.moduleHealth.length,
          operatingTasks: operatingSystem.tasks.length,
          people: people.people.length,
          commercialModules: commercialSystem.systemModules.length,
          aiInsightMode: aiInsights.provider.status,
          villaPhases: villaProject.phases.length,
          villaBudgetTotal: villaProject.summary.budgetTotal,
          workOrderAudit: commercialWorkOrder.auditLog.action,
          contactAudit: contactUpdate.auditLog.action,
          riskDecision: riskUpdate.decisionPackage.id,
          auditLogs: data.auditLogs.length,
        },
      },
      null,
      2,
    ),
  );
}

function resolveActor(data, req) {
  try {
    return authenticate(data, req);
  } catch (error) {
    if (runtimeConfig.auth.allowHeaderFallback && ['unauthorized', 'session_expired', 'invalid_user'].includes(error.error)) {
      return getActor(req);
    }
    throw error;
  }
}

function contentDisposition(fileName) {
  const fallback = String(fileName || 'source-file').replace(/[^\w.\-]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName || 'source-file')}`;
}

function aiConfigFromBody(config, body = {}) {
  const settings = body.aiSettings ?? body;
  const apiKey = String(settings.apiKey || '').trim();
  const model = String(settings.model || '').trim();
  const baseUrl = String(settings.baseUrl || '').trim();
  return {
    ...config,
    apiKey: apiKey || config.apiKey,
    model: model || config.model,
    baseUrl: baseUrl || config.baseUrl,
    configured: Boolean(apiKey || config.apiKey),
    section: String(body.section || '').trim(),
    context: body.context && typeof body.context === 'object' ? body.context : null,
  };
}

if (process.argv.includes('--check')) {
  await runSelfCheck();
} else {
  server.listen(runtimeConfig.api.port, runtimeConfig.api.host, () => {
    console.log(`HUAGE API listening on http://${runtimeConfig.api.host}:${runtimeConfig.api.port}`);
  });
}
