import { addAudit, fail, permissionsFor, requirePermission } from './domain.mjs';
import { clone } from './state.mjs';

const phaseStatuses = new Set(['未开始', '施工中', '待验收', '已完成']);
const issueStatuses = new Set(['待整改', '整改中', '待复验', '已关闭']);
const severities = new Set(['高', '中', '低']);
const expenseStatuses = new Set(['已付', '合同', '待付', '已取消']);

export function getVillaProject(data, actor) {
  requireVillaProjectRead(data, actor);
  const project = villaProjectState(data);
  return {
    ...clone(project),
    generatedAt: new Date().toISOString(),
    summary: buildSummary(project),
    zoneSummaries: buildZoneSummaries(project),
  };
}

export function addVillaPhase(data, body, actor) {
  requireVillaProjectWrite(data, actor);
  const project = villaProjectState(data);
  const phase = normalizePhase(body, nextId('phase'));
  project.phases = [phase, ...project.phases];
  data.villaProject = project;
  const auditLog = addAudit(data, actor, 'villa_project.phase.create', 'villa_project_phase', phase.id, '-', JSON.stringify(phase), `${actor.name} 新增别墅施工任务`);
  return { phase, auditLog, villaProject: getVillaProject(data, actor) };
}

export function updateVillaPhase(data, id, body, actor) {
  requireVillaProjectWrite(data, actor);
  const project = villaProjectState(data);
  const phase = project.phases.find((item) => item.id === id);
  if (!phase) fail(404, 'phase_not_found', '施工任务不存在');
  const before = JSON.stringify(phase);
  Object.assign(phase, normalizePhase({ ...phase, ...body }, phase.id));
  data.villaProject = project;
  const auditLog = addAudit(data, actor, 'villa_project.phase.update', 'villa_project_phase', phase.id, before, JSON.stringify(phase), `${actor.name} 更新别墅施工任务`);
  return { phase, auditLog, villaProject: getVillaProject(data, actor) };
}

export function addVillaIssue(data, body, actor) {
  requireVillaProjectWrite(data, actor);
  const project = villaProjectState(data);
  const issue = normalizeIssue(body, nextId('issue'));
  project.issues = [issue, ...project.issues];
  data.villaProject = project;
  const auditLog = addAudit(data, actor, 'villa_project.issue.create', 'villa_project_issue', issue.id, '-', JSON.stringify(issue), `${actor.name} 新增别墅整改问题`);
  return { issue, auditLog, villaProject: getVillaProject(data, actor) };
}

export function updateVillaIssue(data, id, body, actor) {
  requireVillaProjectWrite(data, actor);
  const project = villaProjectState(data);
  const issue = project.issues.find((item) => item.id === id);
  if (!issue) fail(404, 'issue_not_found', '整改问题不存在');
  const before = JSON.stringify(issue);
  Object.assign(issue, normalizeIssue({ ...issue, ...body }, issue.id));
  data.villaProject = project;
  const auditLog = addAudit(data, actor, 'villa_project.issue.update', 'villa_project_issue', issue.id, before, JSON.stringify(issue), `${actor.name} 更新别墅整改问题`);
  return { issue, auditLog, villaProject: getVillaProject(data, actor) };
}

export function addVillaExpense(data, body, actor) {
  requireVillaProjectWrite(data, actor);
  const project = villaProjectState(data);
  const expense = normalizeExpense(body, nextId('expense'));
  if (!project.budgets.some((item) => item.category === expense.category)) {
    project.budgets = [{ category: expense.category, budget: 0 }, ...project.budgets];
  }
  project.expenses = [expense, ...project.expenses];
  data.villaProject = project;
  const auditLog = addAudit(data, actor, 'villa_project.expense.create', 'villa_project_expense', expense.id, '-', JSON.stringify(expense), `${actor.name} 新增别墅预算支出`);
  return { expense, auditLog, villaProject: getVillaProject(data, actor) };
}

export function syncVillaProjectFromSeed(data, seed, actor) {
  requirePermission(data, actor, 'system.manage');
  data.villaProject = clone(seed.villaProject ?? { phases: [], issues: [], budgets: [], expenses: [], villaZones: [] });
  const auditLog = addAudit(
    data,
    actor,
    'villa_project.seed.sync',
    'villa_project',
    'seed',
    '-',
    JSON.stringify({
      phases: data.villaProject.phases?.length ?? 0,
      issues: data.villaProject.issues?.length ?? 0,
      budgets: data.villaProject.budgets?.length ?? 0,
      expenses: data.villaProject.expenses?.length ?? 0,
    }),
    `${actor.name} 从内置数据源同步别墅项目`,
  );
  return { auditLog, villaProject: getVillaProject(data, actor) };
}

function villaProjectState(data) {
  const current = data.villaProject ?? {};
  current.title = current.title || '华哥别墅装修进度系统看板';
  current.subtitle = current.subtitle || '施工进度、监督整改、预算支出统一看板';
  current.phases = Array.isArray(current.phases) ? current.phases : [];
  current.issues = Array.isArray(current.issues) ? current.issues : [];
  current.budgets = Array.isArray(current.budgets) ? current.budgets : [];
  current.expenses = Array.isArray(current.expenses) ? current.expenses : [];
  current.villaZones = Array.isArray(current.villaZones) ? current.villaZones : [];
  data.villaProject = current;
  return current;
}

function normalizePhase(body, id) {
  const name = clean(body?.name);
  const zone = clean(body?.zone);
  const owner = clean(body?.owner);
  const start = dateOr(body?.start, today());
  const end = dateOr(body?.end, start);
  if (!name || !zone || !owner) fail(400, 'invalid_phase', '工序、区域、负责人不能为空');
  return {
    id,
    name,
    zone,
    owner,
    start,
    end,
    progress: clamp(Number(body?.progress ?? 0), 0, 100),
    status: phaseStatuses.has(body?.status) ? body.status : '施工中',
    acceptance: clean(body?.acceptance),
    next: clean(body?.next),
  };
}

function normalizeIssue(body, id) {
  const title = clean(body?.title);
  const zone = clean(body?.zone);
  const owner = clean(body?.owner);
  if (!title || !zone || !owner) fail(400, 'invalid_issue', '问题、区域、负责人不能为空');
  return {
    id,
    title,
    zone,
    owner,
    due: dateOr(body?.due, today()),
    severity: severities.has(body?.severity) ? body.severity : '中',
    status: issueStatuses.has(body?.status) ? body.status : '待整改',
    note: clean(body?.note),
  };
}

function normalizeExpense(body, id) {
  const category = clean(body?.category);
  const item = clean(body?.item);
  const vendor = clean(body?.vendor);
  const amount = finiteNumber(body?.amount);
  if (!category || !item || !vendor || amount <= 0) fail(400, 'invalid_expense', '分类、事项、供应商和金额不能为空');
  return {
    id,
    date: dateOr(body?.date, today()),
    category,
    item,
    vendor,
    amount,
    status: expenseStatuses.has(body?.status) ? body.status : '已付',
    voucherType: clean(body?.voucherType) || '待补',
    voucherNo: clean(body?.voucherNo) || '待补',
    note: clean(body?.note),
  };
}

function buildSummary(project) {
  const phases = project.phases ?? [];
  const issues = project.issues ?? [];
  const budgets = project.budgets ?? [];
  const expenses = project.expenses ?? [];
  const overallProgress = phases.length ? phases.reduce((sum, phase) => sum + finiteNumber(phase.progress), 0) / phases.length : 0;
  const activePhases = phases.filter((phase) => phase.status !== '已完成').length;
  const weekTasks = phases.filter((phase) => isWithinNextDays(phase.end, 7)).length;
  const openIssues = issues.filter((issue) => issue.status !== '已关闭').length;
  const urgentIssues = issues.filter((issue) => issue.status !== '已关闭' && issue.severity === '高').length;
  const budgetTotal = budgets.reduce((sum, item) => sum + finiteNumber(item.budget), 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + finiteNumber(item.amount), 0);
  return {
    overallProgress: round(overallProgress, 1),
    activePhases,
    weekTasks,
    openIssues,
    urgentIssues,
    budgetTotal,
    expenseTotal,
    budgetRate: budgetTotal > 0 ? round((expenseTotal / budgetTotal) * 100, 1) : 0,
  };
}

function buildZoneSummaries(project) {
  return (project.villaZones ?? []).map((zone) => {
    const phases = (project.phases ?? []).filter((phase) => matchesZone(phase.zone, zone));
    const progress = phases.length ? phases.reduce((sum, phase) => sum + finiteNumber(phase.progress), 0) / phases.length : 0;
    return {
      key: zone.key,
      title: zone.title,
      roomCount: zone.rooms?.length ?? 0,
      phaseCount: phases.length,
      progress: round(progress, 1),
      status: progress >= 90 ? 'good' : progress >= 60 ? 'watch' : phases.length ? 'risk' : 'pending',
    };
  });
}

function matchesZone(phaseZone, zone) {
  const value = String(phaseZone || '').toLowerCase();
  const aliases = [...(zone.aliases ?? []), zone.title, zone.key].filter(Boolean).map((item) => String(item).toLowerCase());
  return aliases.some((alias) => value.includes(alias.toLowerCase()));
}

function requireVillaProjectRead(data, actor) {
  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('villa_project.read') && !permissions.has('dashboard.read')) {
    fail(403, 'forbidden', `${actor.role} is missing permission villa_project.read`);
  }
}

function requireVillaProjectWrite(data, actor) {
  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('villa_project.write') && !permissions.has('workflow.manage') && !permissions.has('system.manage')) {
    fail(403, 'forbidden', `${actor.role} is missing permission villa_project.write`);
  }
}

function isWithinNextDays(date, days) {
  const target = Date.parse(`${date}T00:00:00`);
  if (!Number.isFinite(target)) return false;
  const start = Date.parse(`${today()}T00:00:00`);
  return target >= start && target <= start + days * 24 * 60 * 60 * 1000;
}

function nextId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function dateOr(value, fallback) {
  const text = clean(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function clean(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, finiteNumber(value)));
}

function round(value, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(finiteNumber(value) * factor) / factor;
}
