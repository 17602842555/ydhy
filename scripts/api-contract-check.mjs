import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const port = 19000 + Math.floor(Math.random() * 2000);
const arkPort = 22000 + Math.floor(Math.random() * 2000);
const tempRoot = await mkdtemp(join(tmpdir(), 'huage-api-contract-'));
const api = `http://127.0.0.1:${port}/api`;
const arkBaseUrl = `http://127.0.0.1:${arkPort}`;
const stdout = [];
const stderr = [];
const arkRequests = [];
const arkServer = createServer(async (req, res) => {
  if (req.url !== '/chat/completions' || req.method !== 'POST') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not_found' }));
    return;
  }
  const payload = JSON.parse(await readRequestBody(req));
  arkRequests.push(payload);
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    choices: [{
      message: {
        content: JSON.stringify({
          summary: '契约测试 Ark 分析已生成并保存。',
          advice: [{ text: '品牌经营先追低完成度品牌。', sourceRefs: ['operatingSystem.brands'] }],
          warnings: [{ text: '低完成度品牌需要补动作验证。', sourceRefs: ['operatingSystem.brands'] }],
          next: [{ text: '下次周会按负责人追踪。', sourceRefs: ['operatingSystem.tasks'] }],
          decisionPackage: '契约测试决策包',
        }),
      },
    }],
  }));
});
await new Promise((resolve) => arkServer.listen(arkPort, '127.0.0.1', resolve));
const server = spawn('node', ['apps/api/server.mjs'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    API_PORT: String(port),
    HUAGE_DATA_FILE: join(tempRoot, 'runtime.json'),
    HUAGE_SOURCE_FILE_DIR: join(tempRoot, 'source-files'),
    HUAGE_CORS_ORIGIN: 'http://127.0.0.1:5173',
    ARK_API_KEY: '',
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
    body: JSON.stringify({ userId: 'user-lijinning', password: '123456' }),
  });
  assert(pmoLogin.status === 201, 'PMO login should issue a session');
  const pmoAuth = auth(pmoLogin.body.token);

  const dashboard = await request('/dashboard', { headers: pmoAuth });
  assert(dashboard.status === 200, 'PMO dashboard should load');
  assert(dashboard.body.subsidiaries.length === 11, 'dashboard should expose 11 subsidiaries');

  const operatingSystem = await request('/operating-system', { headers: pmoAuth });
  assert(operatingSystem.status === 200, 'PMO operating system should load');
  assert(operatingSystem.body.goalBranches.length >= 5, 'operating system should expose goal branches');
  assert(operatingSystem.body.contacts.length >= 10, 'operating system should expose contact registry');
  assert(operatingSystem.body.tasks.length >= 7, 'operating system should expose task ledger');

  const aiCacheMiss = await request('/ai/insights', { headers: pmoAuth });
  assert(aiCacheMiss.status === 404 && aiCacheMiss.body.error === 'ai_insight_cache_miss', 'AI cache read should miss before first analysis');

  const aiInsights = await request('/ai/insights', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({ refresh: true }),
  });
  assert(aiInsights.status === 200, 'PMO AI refresh should return a fallback without a key');
  assert(aiInsights.body.provider.status === 'not_configured', 'AI refresh should use no-key fallback in contract check');
  assert(aiInsights.body.cache.status === 'not_saved', 'no-key fallback should not overwrite saved AI cache');
  assert(aiInsights.body.advice.length >= 3, 'AI insights should expose advice items');
  assert(aiInsights.body.sourceRefs.some((ref) => ref.id === 'dashboard.subsidiaries'), 'AI insights should expose source references');

  const sectionAiInsights = await request('/ai/insights', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      refresh: true,
      section: 'brand',
      context: { label: '品牌经营进度', brands: operatingSystem.body.brands },
      aiSettings: { apiKey: 'contract-key', model: 'ark-code-latest', baseUrl: arkBaseUrl },
    }),
  });
  assert(sectionAiInsights.status === 200, 'section AI insights should refresh');
  assert(sectionAiInsights.body.provider.status === 'ark', 'successful Ark section analysis should use Ark provider');
  assert(sectionAiInsights.body.cache.status === 'saved', 'successful Ark section analysis should save to backend cache');
  assert(sectionAiInsights.body.section.key === 'brand', 'section AI insights should preserve the requested section preset');
  assert(sectionAiInsights.body.sourceRefs.some((ref) => ref.id === 'operatingSystem.brands'), 'section AI insights should expose section source references');
  assert(arkRequests.length === 1, 'section refresh should call Ark exactly once');

  const sectionAiCached = await request('/ai/insights', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      section: 'brand',
      context: { label: '品牌经营进度' },
    }),
  });
  assert(sectionAiCached.status === 200, 'section AI cache should be readable after refresh');
  assert(sectionAiCached.body.cache.status === 'hit', 'section AI cache read should report a cache hit');
  assert(sectionAiCached.body.summary === sectionAiInsights.body.summary, 'section AI cache should return the saved analysis');
  assert(arkRequests.length === 1, 'cache read must not call Ark again');

  const aiConnectionMissingKey = await request('/ai/test-connection', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      aiSettings: { model: 'ark-code-latest', baseUrl: 'https://ark.cn-beijing.volces.com/api/coding/v3' },
    }),
  });
  assert(aiConnectionMissingKey.status === 200, 'AI connection test should return a structured result');
  assert(aiConnectionMissingKey.body.ok === false, 'AI connection test should fail without a key');
  assert(aiConnectionMissingKey.body.error.code === 'missing_ark_api_key', 'AI connection test should expose missing-key reason');

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

  const villaProject = await request('/villa-project', { headers: pmoAuth });
  assert(villaProject.status === 200, 'PMO villa project should load');
  assert(villaProject.body.phases.length >= 20, 'villa project should expose imported construction phases');
  assert(villaProject.body.issues.length >= 4, 'villa project should expose imported inspection issues');
  assert(villaProject.body.budgets.length >= 9, 'villa project should expose imported budget categories');
  assert(villaProject.body.summary.budgetTotal === 4000000, 'villa project should calculate total budget');
  assert(villaProject.body.summary.expenseTotal > 1900000, 'villa project should calculate registered expenses');

  const villaPhaseCreate = await request('/villa-project/phases', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      name: '契约测试新增施工节点',
      zone: '1F 客厅',
      owner: '李锦宁',
      start: '2026-05-29',
      end: '2026-06-02',
      progress: 15,
      status: '施工中',
      acceptance: '照片、报价与现场验收同步归档',
      next: '安排施工负责人复核',
    }),
  });
  assert(villaPhaseCreate.status === 201, 'PMO should create villa construction phase');
  assert(villaPhaseCreate.body.phase.name === '契约测试新增施工节点', 'created villa phase should echo payload');
  assert(villaPhaseCreate.body.auditLog?.action === 'villa_project.phase.create', 'villa phase create should audit');

  const villaIssueCreate = await request('/villa-project/issues', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      title: '契约测试新增整改问题',
      zone: 'B1 影音室',
      owner: '施工负责人',
      due: '2026-06-03',
      severity: '中',
      status: '待整改',
      note: '闭环前不得进入节点验收',
    }),
  });
  assert(villaIssueCreate.status === 201, 'PMO should create villa inspection issue');
  assert(villaIssueCreate.body.auditLog?.action === 'villa_project.issue.create', 'villa issue create should audit');

  const villaExpenseCreate = await request('/villa-project/expenses', {
    method: 'POST',
    headers: pmoAuth,
    body: JSON.stringify({
      date: '2026-05-29',
      category: '契约测试',
      item: '临时保护材料',
      vendor: '测试供应商',
      amount: 888,
      status: '待付',
      voucherType: '收据',
      voucherNo: 'TEST-001',
      note: '契约测试写入',
    }),
  });
  assert(villaExpenseCreate.status === 201, 'PMO should create villa budget expense');
  assert(villaExpenseCreate.body.villaProject.budgets.some((item) => item.category === '契约测试'), 'new villa expense category should appear in budgets');
  assert(villaExpenseCreate.body.auditLog?.action === 'villa_project.expense.create', 'villa expense create should audit');

  const villaBudgetUpdate = await request('/villa-project/budgets/%E5%A5%91%E7%BA%A6%E6%B5%8B%E8%AF%95', {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({ budget: 66000 }),
  });
  assert(villaBudgetUpdate.status === 200, 'PMO should update villa budget limit');
  assert(villaBudgetUpdate.body.budget.budget === 66000, 'villa budget limit should update');
  assert(villaBudgetUpdate.body.auditLog?.action === 'villa_project.budget.update', 'villa budget update should audit');

  const villaExpenseUpdate = await request(`/villa-project/expenses/${villaExpenseCreate.body.expense.id}`, {
    method: 'PATCH',
    headers: pmoAuth,
    body: JSON.stringify({ ...villaExpenseCreate.body.expense, amount: 999, status: '预留' }),
  });
  assert(villaExpenseUpdate.status === 200, 'PMO should update villa expense');
  assert(villaExpenseUpdate.body.expense.amount === 999, 'villa expense amount should update');
  assert(villaExpenseUpdate.body.auditLog?.action === 'villa_project.expense.update', 'villa expense update should audit');

  const villaExpenseDelete = await request(`/villa-project/expenses/${villaExpenseCreate.body.expense.id}`, {
    method: 'DELETE',
    headers: pmoAuth,
  });
  assert(villaExpenseDelete.status === 200, 'PMO should delete villa expense');
  assert(villaExpenseDelete.body.auditLog?.action === 'villa_project.expense.delete', 'villa expense delete should audit');

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
    body: JSON.stringify({ userId: 'user-zhaoyizhu-owner', password: '123456' }),
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
    body: JSON.stringify({ userId: 'user-finance', password: '123456' }),
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
          aiInsightMode: aiInsights.body.provider.status,
          aiCacheStatus: sectionAiCached.body.cache.status,
          arkRequests: arkRequests.length,
          people: people.body.people.length,
          commercialModules: commercialSystem.body.systemModules.length,
          villaPhases: villaProject.body.phases.length,
          villaBudgetTotal: villaProject.body.summary.budgetTotal,
          villaPhaseAudit: villaPhaseCreate.body.auditLog.action,
          villaIssueAudit: villaIssueCreate.body.auditLog.action,
          villaExpenseAudit: villaExpenseCreate.body.auditLog.action,
          villaBudgetAudit: villaBudgetUpdate.body.auditLog.action,
          villaExpenseUpdateAudit: villaExpenseUpdate.body.auditLog.action,
          villaExpenseDeleteAudit: villaExpenseDelete.body.auditLog.action,
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
  await new Promise((resolve) => arkServer.close(resolve));
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

async function readRequestBody(req) {
  let raw = '';
  for await (const chunk of req) raw += String(chunk);
  return raw;
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
