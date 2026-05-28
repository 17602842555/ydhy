import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 19000 + Math.floor(Math.random() * 2000);
const tempRoot = await mkdtemp(join(tmpdir(), 'huage-api-contract-'));
const api = `http://127.0.0.1:${port}/api`;
const stdout = [];
const stderr = [];
const server = spawn('node', ['apps/api/server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    API_PORT: String(port),
    HUAGE_DATA_FILE: join(tempRoot, 'runtime.json'),
    HUAGE_SOURCE_FILE_DIR: join(tempRoot, 'source-files'),
    HUAGE_CORS_ORIGIN: 'http://127.0.0.1:5173',
  },
  stdio: ['ignore', 'pipe', 'pipe'],
});

server.stdout.on('data', (chunk) => stdout.push(String(chunk)));
server.stderr.on('data', (chunk) => stderr.push(String(chunk)));

try {
  await waitForHealth();
  const health = await request('/health');
  assert(health.status === 200, 'health should be public');
  assert(health.body.runtime.store.mode === 'json', 'health should expose json store mode');
  assert(health.body.runtime.schema.checkCommand === 'npm run db:schema:check', 'health should expose schema gate');

  await request('/admin/reset', { method: 'POST' });
  const noTokenDashboard = await request('/dashboard');
  assert(noTokenDashboard.status === 401, 'dashboard must reject missing bearer token');

  const pmoLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId: 'user-lijinning' }),
  });
  assert(pmoLogin.status === 201, 'PMO login should issue a session');
  const pmoAuth = auth(pmoLogin.body.token);

  const dashboard = await request('/dashboard', { headers: pmoAuth });
  assert(dashboard.status === 200, 'PMO dashboard should load');
  assert(dashboard.body.subsidiaries.length === 8, 'dashboard should expose 8 subsidiaries');

  const operatingSystem = await request('/operating-system', { headers: pmoAuth });
  assert(operatingSystem.status === 200, 'PMO operating system should load');
  assert(operatingSystem.body.goalBranches.length >= 5, 'operating system should expose goal branches');
  assert(operatingSystem.body.contacts.length >= 10, 'operating system should expose contact registry');
  assert(operatingSystem.body.tasks.length >= 7, 'operating system should expose task ledger');

  const people = await request('/people', { headers: pmoAuth });
  assert(people.status === 200, 'PMO people graph should load');
  for (const key of ['people', 'roles', 'moduleResponsibilities', 'primaryContacts', 'reportingLines', 'handoverEvents', 'auditEvents']) {
    assert(Array.isArray(people.body[key]), `/api/people should expose ${key}`);
  }
  assert(people.body.people.length >= 5, 'people graph should expose person profiles');
  assert(people.body.primaryContacts.length >= 10, 'people graph should expose primary contacts');

  const commercialSystem = await request('/commercial-system', { headers: pmoAuth });
  assert(commercialSystem.status === 200, 'PMO commercial system should load');
  assert(commercialSystem.body.systemModules.length >= 12, 'commercial system should expose full module map');
  assert(commercialSystem.body.masterData.products.length >= 4, 'commercial system should expose product master data');
  assert(commercialSystem.body.integrations.length >= 6, 'commercial system should expose integration registry');
  assert(commercialSystem.body.desktopClients.length >= 3, 'commercial system should expose software client targets');

  const workOrderUpdate = await request('/commercial-system/work-orders/WO-001', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({ status: '进行中', reason: 'api contract commercial work order' }),
  });
  assert(workOrderUpdate.status === 200, 'PMO should update commercial work order');
  assert(workOrderUpdate.body.workOrder.status === '进行中', 'commercial work order status should update');
  assert(workOrderUpdate.body.auditLog?.action === 'commercial_work_order.update', 'commercial work order update should audit');

  const peopleAuditBefore = people.body.auditEvents.length;
  const contactBefore = people.body.primaryContacts.find((contact) => contact.id === 'contact-huamu');
  const contactUpdate = await request('/people/contacts/contact-huamu', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({
      contact: '珠海谷春雨负责人',
      status: '正常',
      remark: '新品节奏与达人投放，已纳入周追踪',
      reason: 'api contract primary contact update',
    }),
  });
  assert(contactUpdate.status === 200, 'PMO should update primary contact');
  assert(contactUpdate.body.contact.status === '正常', 'contact status should update');
  assert(contactUpdate.body.handoverEvent, 'contact update should create handover event');
  assert(contactUpdate.body.auditLog?.action === 'people.primary_contact.update', 'contact update should create audit log');
  assert(contactUpdate.body.people.auditEvents.length === peopleAuditBefore + 1, 'people audit events should increase');

  const taskUpdate = await request('/operating-system/tasks/TASK-001', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({ status: '进行中', reason: 'api contract task progress' }),
  });
  assert(taskUpdate.status === 200, 'PMO should update operating task status');
  assert(taskUpdate.body.task.status === '进行中', 'operating task status should update');
  assert(taskUpdate.body.auditLog?.action === 'operating_task.update', 'task update should create audit log');

  const riskEscalation = await request('/risks/RISK-003', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({
      action: 'escalate',
      escalationReason: 'api contract risk escalation',
      impactScope: '库存周转、毛利压力、618资源优先级',
      evidenceRefs: ['RISK-003', 'finance-budget', 'BATCH-20260526-001'],
    }),
  });
  assert(riskEscalation.status === 200, 'PMO should escalate risk to decision');
  assert(riskEscalation.body.auditLog?.action === 'risk.escalate_decision', 'risk escalation should create audit log');
  for (const key of ['sourceRiskId', 'ownerPersonId', 'escalationReason', 'impactScope', 'decisionMakerPersonId', 'evidenceRefs', 'auditEventId']) {
    assert(riskEscalation.body.decisionPackage?.[key], `risk decision package should include ${key}`);
  }
  const riskEscalationAgain = await request('/risks/RISK-003', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({ action: 'escalate', escalationReason: 'api contract duplicate escalation' }),
  });
  assert(riskEscalationAgain.status === 200 && riskEscalationAgain.body.idempotent === true, 'risk escalation should be idempotent');

  const preview = await request('/imports/validate-preview', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      rows: [
        { name: '逆戟鲸', target: '300', actual: '125.8' },
        { name: '深圳赫拉', target: '', actual: '0' },
        { name: '未知子公司', target: '20', actual: '12' },
      ],
    }),
  });
  assert(preview.status === 200, 'dirty validation preview should return 200');
  assert(preview.body.issues.filter((issue) => issue.severity === 'error').length >= 2, 'dirty preview should surface errors');

  const csv = 'name,target,actual,forecastRate,threeDayRate,weekRate\n逆戟鲸,300,180,69,36.8,48.4\n杭州控驻,45,39,92,41.5,78.2\n';
  const fileHash = `sha256-${createHash('sha256').update(Buffer.from(csv, 'utf8')).digest('hex')}`;
  const imported = await request('/imports', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      fileName: 'api-contract-valid.csv',
      fileHash,
      source: 'api-contract-check',
      sourceFile: {
        fileName: 'api-contract-valid.csv',
        mimeType: 'text/csv',
        size: Buffer.byteLength(csv),
        contentBase64: Buffer.from(csv, 'utf8').toString('base64'),
      },
      rows: [
        { name: '逆戟鲸', target: '300', actual: '180', forecastRate: '69', threeDayRate: '36.8', weekRate: '48.4' },
        { name: '杭州控驻', target: '45', actual: '39', forecastRate: '92', threeDayRate: '41.5', weekRate: '78.2' },
      ],
    }),
  });
  assert(imported.status === 201, 'valid import should create a batch');
  assert(imported.body.batch.state === 'validated', 'valid import should become validated');
  assert(imported.body.batch.objectKey, 'valid import should archive source bytes');

  const duplicate = await request('/imports', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      fileName: 'api-contract-valid-copy.csv',
      fileHash,
      source: 'api-contract-check',
      rows: [{ name: '逆戟鲸', target: '300', actual: '180' }],
    }),
  });
  assert(duplicate.status === 409 && duplicate.body.error === 'duplicate_import', 'duplicate file hash must be rejected');

  const noTokenSource = await request(`/imports/${imported.body.batch.id}/source-file`, { parseJson: false });
  assert(noTokenSource.status === 401, 'source file must reject missing token');
  const sourceFile = await request(`/imports/${imported.body.batch.id}/source-file`, { headers: pmoAuth, parseJson: false });
  assert(sourceFile.status === 200, 'source file should download with source.read');
  assert(Buffer.compare(sourceFile.bytes, Buffer.from(csv, 'utf8')) === 0, 'downloaded source bytes must match original');

  const published = await request(`/imports/${imported.body.batch.id}/publish`, {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({ reason: 'api contract publish' }),
  });
  assert(published.status === 200, 'validated batch should publish');
  assert(published.body.batch.state === 'published', 'published batch should be published');

  const drilldown = await request('/subsidiaries/nijijing', { headers: pmoAuth });
  assert(drilldown.status === 200, 'PMO should read subsidiary drilldown');
  assert(drilldown.body.sourceRow?.rawPayload, 'drilldown should include source row payload');

  const invalidWorkflow = await request('/subsidiaries/hangzhoukongzhu/workflows/task', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({ nextState: 'accepted', reason: 'cannot skip active work' }),
  });
  assert(invalidWorkflow.status === 409 && invalidWorkflow.body.error === 'invalid_workflow_transition', 'invalid workflow jump must be rejected');

  const validWorkflow = await request('/subsidiaries/hangzhoukongzhu/workflows/task', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({ nextState: 'in_progress', reason: 'api contract workflow transition' }),
  });
  assert(validWorkflow.status === 200, 'PMO workflow transition should succeed');
  assert(validWorkflow.body.auditLog.action === 'task.transition', 'workflow transition should audit');

  const decisionWorkflow = await request('/subsidiaries/hangzhoukongzhu/workflows/decision', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({ nextState: 'decided', reason: 'api contract decision evidence accepted' }),
  });
  assert(decisionWorkflow.status === 200, 'decision transition should succeed for PMO workflow.manage');
  assert(decisionWorkflow.body.decisionPackage?.state === 'decided', 'decision transition should upsert package');

  const ownerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId: 'user-zhaoyizhu-owner' }),
  });
  const ownerAuth = auth(ownerLogin.body.token);
  const crossRead = await request('/subsidiaries/nijijing', { headers: ownerAuth });
  assert(crossRead.status === 403, 'subsidiary owner must not read another subsidiary');
  const ownerTask = await request('/subsidiaries/zhaoyizhu/workflows/task', {
    method: 'PATCH',
    headers: ownerAuth,
    body: JSON.stringify({ nextState: 'done', reason: 'owner closes own task work' }),
  });
  assert(ownerTask.status === 200, 'subsidiary owner should update own task state');
  const missingReason = await request('/subsidiaries/zhaoyizhu/workflows/task', {
    method: 'PATCH',
    headers: ownerAuth,
    body: JSON.stringify({ nextState: 'accepted' }),
  });
  assert(missingReason.status === 400 && missingReason.body.error === 'missing_reason', 'workflow reason should be mandatory');

  const ownerContactDenied = await request('/people/contacts/contact-huamu', {
    method: 'PATCH',
    headers: ownerAuth,
    body: JSON.stringify({ contact: '无权限改动', status: '预警', reason: 'should be denied' }),
  });
  assert(ownerContactDenied.status === 403, 'subsidiary owner should not update primary contacts');
  const peopleAfterDenied = await request('/people', { headers: pmoAuth });
  const contactAfterDenied = peopleAfterDenied.body.primaryContacts.find((contact) => contact.id === 'contact-huamu');
  assert(contactAfterDenied.contact === contactUpdate.body.contact.contact, '403 contact update must not change contact');
  assert(contactBefore.contact !== '无权限改动', 'baseline contact should not equal denied value');

  const financeLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userId: 'user-finance' }),
  });
  const financeAuth = auth(financeLogin.body.token);
  const taskDenied = await request('/operating-system/tasks/TASK-002', {
    method: 'PATCH',
    headers: financeAuth,
    body: JSON.stringify({ status: '进行中', reason: 'finance should be denied' }),
  });
  assert(taskDenied.status === 403, 'finance role should not update operating tasks');
  const riskDenied = await request('/risks/RISK-004', {
    method: 'PATCH',
    headers: financeAuth,
    body: JSON.stringify({ action: 'escalate', escalationReason: 'finance should be denied' }),
  });
  assert(riskDenied.status === 403, 'finance role should not escalate risks');
  const workOrderDenied = await request('/commercial-system/work-orders/WO-003', {
    method: 'PATCH',
    headers: financeAuth,
    body: JSON.stringify({ status: '进行中', reason: 'finance should be denied' }),
  });
  assert(workOrderDenied.status === 403, 'finance role should not update commercial work orders');

  console.log(
    JSON.stringify(
      {
        ok: true,
        api,
        checks: {
          health: health.status,
          dashboardSubsidiaries: dashboard.body.subsidiaries.length,
          operatingBranches: operatingSystem.body.goalBranches.length,
          people: people.body.people.length,
          commercialModules: commercialSystem.body.systemModules.length,
          workOrderAudit: workOrderUpdate.body.auditLog.action,
          contactAudit: contactUpdate.body.auditLog.action,
          operatingTaskStatus: taskUpdate.body.task.status,
          riskDecision: riskEscalation.body.decisionPackage.id,
          dirtyPreviewIssues: preview.body.issues.length,
          importedBatch: imported.body.batch.id,
          sourceBytes: sourceFile.bytes.length,
          workflowAudit: validWorkflow.body.auditLog.action,
          ownerScopeDenied: crossRead.status,
          contactDenied: ownerContactDenied.status,
          taskDenied: taskDenied.status,
          riskDenied: riskDenied.status,
          workOrderDenied: workOrderDenied.status,
        },
      },
      null,
      2,
    ),
  );
} finally {
  server.kill('SIGTERM');
  await rm(tempRoot, { recursive: true, force: true });
}

async function waitForHealth() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 8000) {
    if (server.exitCode !== null) {
      throw new Error(`API server exited early: ${stderr.join('') || stdout.join('')}`);
    }
    try {
      const health = await request('/health');
      if (health.status === 200) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error(`API server did not become healthy: ${stderr.join('') || stdout.join('')}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${api}${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
    body: options.body,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (options.parseJson === false) {
    return { status: response.status, headers: response.headers, bytes };
  }
  const text = bytes.toString('utf8');
  const body = text ? JSON.parse(text) : null;
  return { status: response.status, headers: response.headers, body, bytes };
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
