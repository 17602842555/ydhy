import { addAudit, fail, permissionsFor, requirePermission } from './domain.mjs';

const storeFields = ['gmv', 'gsv', 'returnRate', 'promotionFee', 'impressions'];
const businessFields = ['revenue', 'costExpense'];

export function getTaskCalendar(data, actor, options = {}) {
  requireTaskCalendarRead(data, actor);
  const month = normalizeMonth(options.month) ?? data.period?.month ?? currentMonth();
  const state = taskCalendarState(data);
  const scopedCompanies = scopeCompanies(data, actor, state.companies);
  const metrics = state.metrics.filter((metric) => scopedCompanies.includes(metric.company) && String(metric.date || '').startsWith(`${month}-`));
  const entries = state.entries.filter((entry) => scopedCompanies.includes(entry.company) && String(entry.date || '').startsWith(`${month}-`));
  const actionPlans = state.actionPlans.filter((plan) => scopedCompanies.includes(plan.company) && String(plan.date || '').startsWith(`${month}-`));
  const units = state.units.filter((unit) => scopedCompanies.includes(unit.company));
  const monthlyTargets = state.monthlyTargets.filter((target) => scopedCompanies.includes(target.company) && target.month === month);
  const summaries = buildCompanySummaries(data, state, month, scopedCompanies);

  return {
    period: {
      month,
      generatedAt: new Date().toISOString(),
      source: 'yongdonghuayu-task-calendar',
    },
    companies: scopedCompanies,
    units,
    metrics,
    entries,
    actionPlans,
    monthlyTargets,
    summaries,
    supervisionDashboard: buildSupervisionDashboard(data, summaries, month),
  };
}

export function upsertTaskCalendarMonthlyTarget(data, body, actor) {
  requireTaskCalendarWrite(data, actor);
  const state = taskCalendarState(data);
  const company = normalizeCompanyForActor(data, actor, body?.company);
  const month = normalizeMonth(body?.month);
  const monthlyTarget = finiteNumber(body?.monthlyTarget);
  const allocationMode = body?.allocationMode === 'none' ? 'none' : 'daily';
  if (!month) fail(400, 'invalid_month', 'month must be YYYY-MM');
  if (monthlyTarget <= 0) fail(400, 'invalid_monthly_target', '月度目标必须大于 0');
  if (!state.companies.includes(company)) state.companies = [...state.companies, company];

  const dailyTarget = allocationMode === 'daily' ? Math.round((monthlyTarget / daysInMonth(month)) * 100) / 100 : 0;
  const existing = state.monthlyTargets.find((target) => target.company === company && target.month === month);
  const beforeText = existing ? JSON.stringify(existing) : '-';
  const target = {
    id: existing?.id ?? `monthly-target-${slug(company)}-${month}`,
    company,
    month,
    monthlyTarget,
    allocationMode,
    dailyTarget,
    updatedBy: actor.name,
    updatedAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, target);
  else state.monthlyTargets = [target, ...state.monthlyTargets];
  syncMonthlyTargetEntries(state, target);
  data.taskCalendar = state;

  const subsidiary = data.subsidiaries?.find((item) => item.name === company);
  if (subsidiary) {
    subsidiary.target = roundWan(monthlyTarget);
    subsidiary.sourceBatchId = `TASK-CALENDAR-${month}`;
  }
  const rollup = applyTaskCalendarRollup(data, company, month, actor);
  const auditLog = addAudit(
    data,
    actor,
    'task_calendar.monthly_target.upsert',
    'task_calendar_monthly_target',
    target.id,
    beforeText,
    JSON.stringify(target),
    `${actor.name} 设置 ${company} ${month} 月度目标`,
  );
  return {
    target,
    rollup,
    auditLog,
    taskCalendar: getTaskCalendar(data, actor, { month }),
  };
}

export function upsertTaskCalendarDailyTarget(data, body, actor) {
  requireTaskCalendarWrite(data, actor);
  const state = taskCalendarState(data);
  const company = normalizeCompanyForActor(data, actor, body?.company);
  const date = normalizeDate(body?.date);
  const revenueTarget = finiteNumber(body?.revenueTarget);
  if (!date) fail(400, 'invalid_date', 'date must be YYYY-MM-DD');
  if (revenueTarget <= 0) fail(400, 'invalid_daily_target', '当日目标必须大于 0');
  if (!state.companies.includes(company)) state.companies = [...state.companies, company];

  const id = `daily-target-${slug(company)}-${date}`;
  const existing = state.entries.find((entry) => entry.id === id);
  const beforeText = existing ? JSON.stringify(existing) : '-';
  const targetEntry = {
    id,
    company,
    date,
    task: '当日总体营业额目标',
    status: '未开始',
    revenueTarget,
    revenueActual: 0,
    progress: 0,
    action: '手动设置当日目标。',
    owner: actor.name,
    risk: '',
    source: 'daily-target',
    updatedAt: new Date().toISOString(),
  };
  state.entries = state.entries.filter((entry) => {
    if (entry.company !== company || entry.date !== date) return true;
    return entry.id !== id && entry.source !== 'monthly-target' && entry.source !== 'daily-target';
  });
  state.entries = [targetEntry, ...state.entries];
  data.taskCalendar = state;

  const month = date.slice(0, 7);
  const rollup = applyTaskCalendarRollup(data, company, month, actor);
  const auditLog = addAudit(
    data,
    actor,
    existing ? 'task_calendar.daily_target.update' : 'task_calendar.daily_target.create',
    'task_calendar_daily_target',
    targetEntry.id,
    beforeText,
    JSON.stringify(targetEntry),
    `${actor.name} 设置 ${company} ${date} 当日目标`,
  );
  return {
    target: targetEntry,
    rollup,
    auditLog,
    taskCalendar: getTaskCalendar(data, actor, { month }),
  };
}

export function upsertTaskCalendarActionPlan(data, body, actor) {
  requireTaskCalendarWrite(data, actor);
  const state = taskCalendarState(data);
  const company = normalizeCompanyForActor(data, actor, body?.company);
  const date = normalizeDate(body?.date);
  const action = String(body?.action || '').trim();
  const expectedGmvGrowthRate = finiteNumber(body?.expectedGmvGrowthRate);
  const expectation = String(body?.expectation || '').trim();
  const validationDays = normalizeValidationDays(body?.validationDays);
  if (!date) fail(400, 'invalid_date', 'date must be YYYY-MM-DD');
  if (!action) fail(400, 'invalid_action', '当日动作不能为空');
  if (!Number.isFinite(expectedGmvGrowthRate) || expectedGmvGrowthRate <= 0) {
    fail(400, 'invalid_expected_growth', '预期 GMV 涨幅必须大于 0');
  }
  if (!state.companies.includes(company)) state.companies = [...state.companies, company];

  const id = `daily-action-${slug(company)}-${date}`;
  const existing = state.actionPlans.find((plan) => plan.id === id);
  const conflict = state.actionPlans.find((plan) => {
    if (plan.company !== company || plan.id === id) return false;
    return actionPeriodsOverlap(date, validationDays, plan.date, planValidationDays(plan));
  });
  if (conflict) {
    const end = actionPeriodEnd(conflict.date, planValidationDays(conflict));
    fail(409, 'action_cycle_conflict', `${conflict.date} 到 ${end} 已有动作验证周期，周期内不能填写新的当日动作`);
  }
  const beforeText = existing ? JSON.stringify(existing) : '-';
  const plan = {
    id,
    company,
    date,
    action,
    expectedGmvGrowthRate,
    validationDays,
    periodEndDate: actionPeriodEnd(date, validationDays),
    expectation,
    owner: actor.name,
    updatedAt: new Date().toISOString(),
  };
  if (existing) Object.assign(existing, plan);
  else state.actionPlans = [plan, ...state.actionPlans];
  data.taskCalendar = state;

  const auditLog = addAudit(
    data,
    actor,
    existing ? 'task_calendar.action_plan.update' : 'task_calendar.action_plan.create',
    'task_calendar_action_plan',
    plan.id,
    beforeText,
    JSON.stringify(plan),
    `${actor.name} 填写 ${company} ${date} 当日动作和预期`,
  );
  return {
    actionPlan: plan,
    auditLog,
    taskCalendar: getTaskCalendar(data, actor, { month: date.slice(0, 7) }),
  };
}

export function deleteTaskCalendarActionPlan(data, body, actor) {
  requireTaskCalendarWrite(data, actor);
  const state = taskCalendarState(data);
  const company = normalizeCompanyForActor(data, actor, body?.company);
  const id = String(body?.id || '').trim();
  const date = normalizeDate(body?.date);
  const existing = state.actionPlans.find((plan) => plan.company === company && ((id && plan.id === id) || (date && plan.date === date)));
  if (!existing) fail(404, 'action_plan_not_found', '动作和预期不存在');

  const beforeText = JSON.stringify(existing);
  state.actionPlans = state.actionPlans.filter((plan) => plan.id !== existing.id);
  data.taskCalendar = state;
  const auditLog = addAudit(
    data,
    actor,
    'task_calendar.action_plan.delete',
    'task_calendar_action_plan',
    existing.id,
    beforeText,
    '-',
    `${actor.name} 删除 ${company} ${existing.date} 当日动作和预期`,
  );
  return {
    deleted: existing,
    auditLog,
    taskCalendar: getTaskCalendar(data, actor, { month: String(existing.date || currentMonth()).slice(0, 7) }),
  };
}

export function clearTaskCalendarFutureTargets(data, body, actor) {
  requireTaskCalendarWrite(data, actor);
  const state = taskCalendarState(data);
  const afterMonth = normalizeMonth(body?.afterMonth || body?.month);
  if (!afterMonth) fail(400, 'invalid_month', 'afterMonth must be YYYY-MM');
  const companies = resolveWritableCompanies(data, actor, state, body?.company);
  const before = {
    monthlyTargets: state.monthlyTargets.length,
    entries: state.entries.length,
  };
  state.monthlyTargets = state.monthlyTargets.filter((target) => {
    if (!companies.includes(target.company)) return true;
    return String(target.month || '') <= afterMonth;
  });
  state.entries = state.entries.filter((entry) => {
    if (!companies.includes(entry.company)) return true;
    const entryMonth = String(entry.date || '').slice(0, 7);
    if (entryMonth <= afterMonth) return true;
    return !isTargetEntry(entry);
  });
  data.taskCalendar = state;
  const cleared = {
    monthlyTargets: before.monthlyTargets - state.monthlyTargets.length,
    entries: before.entries - state.entries.length,
  };
  const auditLog = addAudit(
    data,
    actor,
    'task_calendar.future_targets.clear',
    'task_calendar',
    `future-targets-${afterMonth}`,
    JSON.stringify(before),
    JSON.stringify({ afterMonth, companies, cleared }),
    `${actor.name} 清空 ${afterMonth} 之后的任务日历目标`,
  );
  return {
    afterMonth,
    companies,
    cleared,
    auditLog,
    taskCalendar: getTaskCalendar(data, actor, { month: afterMonth }),
  };
}

export function clearTaskCalendarMonthData(data, body, actor) {
  requireTaskCalendarWrite(data, actor);
  const state = taskCalendarState(data);
  const month = normalizeMonth(body?.month);
  if (!month) fail(400, 'invalid_month', 'month must be YYYY-MM');
  const companies = resolveWritableCompanies(data, actor, state, body?.company);
  const before = {
    monthlyTargets: state.monthlyTargets.length,
    metrics: state.metrics.length,
    entries: state.entries.length,
    actionPlans: state.actionPlans.length,
  };
  state.monthlyTargets = state.monthlyTargets.filter((target) => !companies.includes(target.company) || target.month !== month);
  state.metrics = state.metrics.filter((metric) => !companies.includes(metric.company) || !String(metric.date || '').startsWith(`${month}-`));
  state.entries = state.entries.filter((entry) => !companies.includes(entry.company) || !String(entry.date || '').startsWith(`${month}-`));
  state.actionPlans = state.actionPlans.filter((plan) => !companies.includes(plan.company) || !String(plan.date || '').startsWith(`${month}-`));
  for (const company of companies) {
    const subsidiary = data.subsidiaries?.find((item) => item.name === company);
    if (subsidiary) {
      subsidiary.target = 0;
      subsidiary.sourceBatchId = `TASK-CALENDAR-${month}`;
    }
  }
  data.taskCalendar = state;
  const rollups = companies.map((company) => applyTaskCalendarRollup(data, company, month, actor));
  const cleared = {
    monthlyTargets: before.monthlyTargets - state.monthlyTargets.length,
    metrics: before.metrics - state.metrics.length,
    entries: before.entries - state.entries.length,
    actionPlans: before.actionPlans - state.actionPlans.length,
  };
  const auditLog = addAudit(
    data,
    actor,
    'task_calendar.month_data.clear',
    'task_calendar',
    `month-data-${month}`,
    JSON.stringify(before),
    JSON.stringify({ month, companies, cleared }),
    `${actor.name} 清空 ${month} 任务日历当月数据和目标`,
  );
  return {
    month,
    companies,
    cleared,
    rollups,
    auditLog,
    taskCalendar: getTaskCalendar(data, actor, { month }),
  };
}

export function upsertTaskCalendarMetric(data, body, actor) {
  requireTaskCalendarWrite(data, actor);
  const state = taskCalendarState(data);
  const unit = state.units.find((item) => item.id === String(body?.unitId || ''));
  if (!unit) fail(404, 'unit_not_found', '经营主体不存在');
  if (!canWriteCompany(data, actor, unit.company)) fail(403, 'forbidden', '只能填写本公司经营数据');

  const date = normalizeDate(body?.date);
  if (!date) fail(400, 'invalid_date', 'date must be YYYY-MM-DD');

  const fields = unit.type === 'business' ? businessFields : storeFields;
  const metric = normalizeMetricPayload(body, unit, actor, date, fields);
  const before = state.metrics.find((item) => item.company === unit.company && item.unitId === unit.id && item.date === date);
  const beforeText = before ? JSON.stringify(pickMetricSnapshot(before)) : '-';

  if (before) {
    Object.assign(before, metric, {
      id: before.id,
      createdAt: before.createdAt,
      updatedAt: new Date().toISOString(),
    });
  } else {
    state.metrics = [
      {
        id: nextMetricId(state),
        ...metric,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...state.metrics,
    ];
  }
  data.taskCalendar = state;

  const afterMetric = state.metrics.find((item) => item.company === unit.company && item.unitId === unit.id && item.date === date);
  syncMetricEntry(state, afterMetric, actor);
  const rollup = applyTaskCalendarRollup(data, unit.company, date.slice(0, 7), actor);
  const auditLog = addAudit(
    data,
    actor,
    before ? 'task_calendar.metric.update' : 'task_calendar.metric.create',
    'task_calendar_metric',
    afterMetric.id,
    beforeText,
    JSON.stringify(pickMetricSnapshot(afterMetric)),
    `${actor.name} 填写 ${unit.company} ${unit.name} ${date} 经营数据`,
  );

  return {
    metric: afterMetric,
    rollup,
    auditLog,
    taskCalendar: getTaskCalendar(data, actor, { month: date.slice(0, 7) }),
  };
}

export function addTaskCalendarUnit(data, body, actor) {
  requireTaskCalendarWrite(data, actor);
  const state = taskCalendarState(data);
  const company = normalizeCompanyForActor(data, actor, body?.company);
  const name = String(body?.name || '').trim();
  const type = body?.type === 'business' ? 'business' : 'store';
  if (!name) fail(400, 'invalid_unit_name', '经营主体名称不能为空');
  if (!state.companies.includes(company)) state.companies = [...state.companies, company];
  const duplicate = state.units.find((item) => item.company === company && item.name === name && item.type === type);
  if (duplicate) return { unit: duplicate, taskCalendar: getTaskCalendar(data, actor, { month: body?.month }) };

  const unit = {
    id: `unit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    company,
    type,
    name,
    createdBy: actor.name,
    createdAt: new Date().toISOString(),
  };
  state.units = [unit, ...state.units];
  data.taskCalendar = state;
  addAudit(data, actor, 'task_calendar.unit.create', 'task_calendar_unit', unit.id, '-', name, `${actor.name} 新增 ${company} 经营主体`);
  return { unit, taskCalendar: getTaskCalendar(data, actor, { month: body?.month }) };
}

export function syncTaskCalendarFromSeed(data, seed, actor) {
  requirePermission(data, actor, 'system.manage');
  data.taskCalendar = clone(seed.taskCalendar ?? { companies: [], units: [], metrics: [], entries: [], actionPlans: [], monthlyTargets: [] });
  const seedSubsidiaries = new Map((seed.subsidiaries ?? []).map((item) => [item.id, item]));
  data.subsidiaries = (data.subsidiaries ?? []).map((item) => {
    const seeded = seedSubsidiaries.get(item.id);
    if (!seeded) return item;
    return {
      ...item,
      target: seeded.target,
      actual: seeded.actual,
      forecastRate: seeded.forecastRate,
      threeDayRate: seeded.threeDayRate,
      weekRate: seeded.weekRate,
      riskLevel: seeded.riskLevel,
      dataState: seeded.dataState,
      sourceBatchId: seeded.sourceBatchId,
      summary: seeded.summary,
    };
  });
  const auditLog = addAudit(
    data,
    actor,
    'task_calendar.seed.sync',
    'task_calendar',
    'seed',
    '-',
    JSON.stringify({
      companies: data.taskCalendar.companies?.length ?? 0,
      units: data.taskCalendar.units?.length ?? 0,
      metrics: data.taskCalendar.metrics?.length ?? 0,
      entries: data.taskCalendar.entries?.length ?? 0,
      actionPlans: data.taskCalendar.actionPlans?.length ?? 0,
      monthlyTargets: data.taskCalendar.monthlyTargets?.length ?? 0,
    }),
    `${actor.name} 从内置数据源同步任务日历`,
  );
  return {
    auditLog,
    taskCalendar: getTaskCalendar(data, actor, { month: '2026-05' }),
  };
}

function taskCalendarState(data) {
  const taskCalendar = data.taskCalendar ?? {};
  const companies = Array.isArray(taskCalendar.companies) ? taskCalendar.companies.map(String) : [];
  const units = Array.isArray(taskCalendar.units) ? taskCalendar.units : [];
  const metrics = Array.isArray(taskCalendar.metrics) ? taskCalendar.metrics : [];
  const entries = Array.isArray(taskCalendar.entries) ? taskCalendar.entries : [];
  const actionPlans = Array.isArray(taskCalendar.actionPlans) ? taskCalendar.actionPlans : [];
  const monthlyTargets = Array.isArray(taskCalendar.monthlyTargets) ? taskCalendar.monthlyTargets : [];
  data.taskCalendar = { companies, units, metrics, entries, actionPlans, monthlyTargets };
  return data.taskCalendar;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireTaskCalendarRead(data, actor) {
  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('task_calendar.read') && !permissions.has('dashboard.read') && !permissions.has('subsidiary.read')) {
    fail(403, 'forbidden', `${actor.role} cannot read task calendar`);
  }
}

function requireTaskCalendarWrite(data, actor) {
  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('task_calendar.write') && !permissions.has('task.update') && !permissions.has('workflow.manage')) {
    fail(403, 'forbidden', `${actor.role} cannot write task calendar`);
  }
}

function scopeCompanies(data, actor, companies) {
  if (actor.role !== 'subsidiary_owner') return companies;
  const subsidiary = data.subsidiaries?.find((item) => item.id === actor.subsidiaryId);
  return subsidiary ? companies.filter((company) => company === subsidiary.name) : [];
}

function normalizeCompanyForActor(data, actor, requestedCompany) {
  if (actor.role === 'subsidiary_owner') {
    const subsidiary = data.subsidiaries?.find((item) => item.id === actor.subsidiaryId);
    if (!subsidiary) fail(403, 'forbidden', '未绑定子公司');
    return subsidiary.name;
  }
  const company = String(requestedCompany || '').trim();
  if (!company) fail(400, 'invalid_company', '公司不能为空');
  return company;
}

function resolveWritableCompanies(data, actor, state, requestedCompany) {
  if (actor.role === 'subsidiary_owner') return [normalizeCompanyForActor(data, actor, requestedCompany)];
  const company = String(requestedCompany || '').trim();
  if (company) return [normalizeCompanyForActor(data, actor, company)];
  return scopeCompanies(data, actor, state.companies);
}

function canWriteCompany(data, actor, company) {
  if (actor.role !== 'subsidiary_owner') return true;
  const subsidiary = data.subsidiaries?.find((item) => item.id === actor.subsidiaryId);
  return subsidiary?.name === company;
}

function isTargetEntry(entry) {
  return ['monthly-target', 'daily-target', 'day-target'].includes(String(entry?.source || ''));
}

function normalizeValidationDays(value) {
  const days = Math.trunc(Number(value || 1));
  if (!Number.isFinite(days) || days < 1 || days > 30) fail(400, 'invalid_validation_days', '验证周期必须是 1 到 30 天');
  return days;
}

function planValidationDays(plan) {
  const days = Math.trunc(Number(plan?.validationDays || 1));
  return Number.isFinite(days) && days > 0 ? days : 1;
}

function actionPeriodEnd(startDate, days) {
  return dateOffset(startDate, Math.max(1, Number(days || 1)) - 1);
}

function actionPeriodsOverlap(startA, daysA, startB, daysB) {
  const endA = actionPeriodEnd(startA, daysA);
  const endB = actionPeriodEnd(startB, daysB);
  return String(startA) <= String(endB) && String(startB) <= String(endA);
}

function eachDateInRange(startDate, endDate) {
  const dates = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = dateOffset(current, 1);
  }
  return dates;
}

function normalizeMetricPayload(body, unit, actor, date, fields) {
  const payload = {
    company: unit.company,
    unitId: unit.id,
    unitName: unit.name,
    unitType: unit.type,
    date,
    note: String(body?.note || '').trim(),
    owner: actor.name,
  };
  for (const field of [...storeFields, ...businessFields]) {
    payload[field] = fields.includes(field) ? finiteNumber(body?.[field]) : 0;
  }
  payload.estimatedGsv = payload.gsv;
  payload.revenueAmount = getMetricRevenue(payload);
  return payload;
}

function buildCompanySummaries(data, state, month, companies) {
  return companies
    .map((company) => summarizeCompany(data, state, company, month))
    .sort((a, b) => {
      const severity = { risk: 0, watch: 1, good: 2, pending: 3 };
      return (severity[a.status] ?? 4) - (severity[b.status] ?? 4) || b.gapWan - a.gapWan;
    });
}

function summarizeCompany(data, state, company, month) {
  const rows = state.metrics.filter((metric) => metric.company === company && String(metric.date || '').startsWith(`${month}-`));
  const entries = state.entries.filter((entry) => entry.company === company && String(entry.date || '').startsWith(`${month}-`));
  const subsidiary = data.subsidiaries?.find((item) => item.name === company);
  const monthlyTarget = findMonthlyTarget(state, company, month);
  const dates = [...new Set([...rows, ...entries].map((row) => row.date).filter(Boolean))].sort();
  const lastDate = dates.at(-1) ?? `${month}-01`;
  const elapsedDays = Math.max(1, Number(lastDate.slice(8, 10)) || 1);
  const days = daysInMonth(month);
  const actualWan = roundWan(sumDailyActuals(rows, entries, dates));
  const targetWan = monthlyTarget ? roundWan(monthlyTarget.monthlyTarget) : roundWan(sumEntryRevenue(entries, 'revenueTarget')) || Number(subsidiary?.target ?? 0);
  const completionRate = targetWan > 0 ? (actualWan / targetWan) * 100 : null;
  const dailyNeedWan = targetWan > 0 ? Math.max(0, (targetWan - actualWan) / Math.max(1, days - elapsedDays)) : 0;
  const forecastRate = targetWan > 0 ? (actualWan / elapsedDays) * days / targetWan * 100 : null;
  const recentDates = dates.filter((date) => date > dateOffset(lastDate, -3));
  const weekDates = dates.filter((date) => date > dateOffset(lastDate, -7));
  const threeDayActual = roundWan(sumDailyActuals(rows, entries, recentDates));
  const weekActual = roundWan(sumDailyActuals(rows, entries, weekDates));
  const threeDayRate = targetWan > 0 ? (threeDayActual / (targetWan / days * 3)) * 100 : 0;
  const weekRate = targetWan > 0 ? (weekActual / (targetWan / days * 7)) * 100 : 0;
  const status = targetWan <= 0 ? 'pending' : completionRate >= 90 ? 'good' : completionRate >= 70 ? 'watch' : 'risk';
  const gapWan = targetWan > 0 ? Math.max(0, targetWan - actualWan) : 0;

  return {
    company,
    targetWan,
    actualWan,
    completionRate,
    forecastRate,
    threeDayRate,
    weekRate,
    gapWan,
    dailyNeedWan,
    status,
    rowCount: rows.length + entries.length,
    unitCount: new Set([...rows.map((row) => row.unitId || row.unitName), ...entries.map((row) => row.owner || row.task)].filter(Boolean)).size,
    latestDate: dates.at(-1) ?? null,
    summary: buildSummary(company, targetWan, actualWan, completionRate, status, rows.length + entries.length),
  };
}

function sumDailyActuals(metrics, entries, dates) {
  return dates.reduce((sum, date) => {
    const metricRows = metrics.filter((row) => row.date === date);
    if (metricRows.length) return sum + sumMetricRevenue(metricRows);
    return sum + sumEntryRevenue(entries.filter((row) => row.date === date), 'revenueActual');
  }, 0);
}

function buildSupervisionDashboard(data, summaries, month) {
  const totalTarget = summaries.reduce((sum, item) => sum + item.targetWan, 0);
  const totalActual = summaries.reduce((sum, item) => sum + item.actualWan, 0);
  const completionRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : null;
  const gap = Math.max(0, totalTarget - totalActual);
  const weightedForecast = weightedAverage(summaries, 'forecastRate', 'targetWan');
  const riskRate = summaries.length ? (summaries.filter((item) => item.status !== 'risk').length / summaries.length) * 100 : 0;
  const dailyNeed = summaries.reduce((sum, item) => sum + item.dailyNeedWan, 0);

  return {
    title: `${month.replace('-', '年')}月子公司目标完成看板`,
    subtitle: '后端数据库联动 / 数据来源：涌动花鱼任务管理经营填报 / 保存后自动重算',
    metrics: [
      { label: '集团月目标', value: `${formatNumber(totalTarget)}万` },
      { label: '集团月完成', value: `${formatNumber(totalActual)}万` },
      { label: '集团完成率', value: formatPercent(completionRate) },
      { label: '集团缺口', value: `${formatNumber(gap)}万` },
      { label: '预计完成率', value: formatPercent(weightedForecast), note: '按当前日均推算' },
      { label: '风险完成率', value: formatPercent(riskRate), note: '非风险公司占比' },
      { label: '达标日均需求', value: `${formatNumber(dailyNeed)}万`, note: '剩余天数每日需完成' },
    ],
    rankHeaders: ['子公司', '月目标', '月完成', '月完成率', '预计完成率', '3天完成率', '周完成率', '月缺口'],
    rankRows: summaries.map((item) => ({
      status: item.status === 'good' ? 'good' : item.status === 'watch' ? 'warn' : item.status === 'risk' ? 'bad' : 'empty',
      cells: [
        item.company,
        item.targetWan > 0 ? `${formatNumber(item.targetWan)}万` : '目标待定',
        `${formatNumber(item.actualWan)}万`,
        formatPercent(item.completionRate),
        formatPercent(item.forecastRate),
        formatPercent(item.threeDayRate),
        formatPercent(item.weekRate),
        item.gapWan > 0 ? `${formatNumber(item.gapWan)}万` : '0',
      ],
    })),
    companies: summaries.map((item) => buildSupervisionCompanyCard(data, item, month)),
  };
}

function buildSupervisionCompanyCard(data, item, month) {
  const actionVerifications = buildCompanyActionVerifications(data, item.company, month);
  return {
    name: item.company,
    status: item.status === 'good' ? 'good' : item.status === 'watch' ? 'warn' : item.status === 'risk' ? 'bad' : 'empty',
    score: formatPercent(item.completionRate),
    metrics: [
      { label: '月目标', value: item.targetWan > 0 ? `${formatNumber(item.targetWan)}万` : '待定' },
      { label: '月完成', value: `${formatNumber(item.actualWan)}万` },
      { label: '预计完成率', value: formatPercent(item.forecastRate) },
      { label: '3天完成率', value: formatPercent(item.threeDayRate) },
      { label: '周完成率', value: formatPercent(item.weekRate) },
    ],
    summary: item.summary,
    bars: [
      { label: '月度进度', value: `${formatNumber(item.actualWan)}万 / ${formatNumber(item.targetWan)}万`, width: percentWidth(item.completionRate) },
      { label: '预计完成率', value: formatPercent(item.forecastRate), width: percentWidth(item.forecastRate) },
      { label: '3天监管', value: item.gapWan > 0 ? `缺口 ${formatNumber(item.gapWan)}万` : '达标', width: percentWidth(item.threeDayRate) },
      { label: '周监管', value: `日均需 ${formatNumber(item.dailyNeedWan)}万`, width: percentWidth(item.weekRate) },
    ],
    actionVerification: actionVerifications[0] ?? emptyActionVerification(),
    actionVerifications,
    fillModules: [],
    dailyHeaders: ['日期', '经营主体数', '数据行数', '月完成'],
    dailyRows: [],
  };
}

function emptyActionVerification() {
  return {
    status: 'empty',
    label: '待填写动作',
    action: '暂无当日动作和预期。',
    expectedGmvGrowthRate: null,
    actualGmvGrowthRate: null,
    complianceRate: null,
  };
}

function buildCompanyActionVerifications(data, company, month) {
  const state = taskCalendarState(data);
  const plans = state.actionPlans
    .filter((plan) => plan.company === company && String(plan.date || '').startsWith(`${month}-`))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return plans.map((plan) => buildActionVerificationForPlan(state, company, plan));
}

function buildActionVerificationForPlan(state, company, plan) {
  const validationDays = planValidationDays(plan);
  const periodEndDate = actionPeriodEnd(plan.date, validationDays);
  const baselineStartDate = dateOffset(plan.date, -validationDays);
  const baselineEndDate = dateOffset(plan.date, -1);
  const periodDates = eachDateInRange(plan.date, periodEndDate);
  const baselineDates = eachDateInRange(baselineStartDate, baselineEndDate);
  const baseGmv = totalRevenueForDates(state, company, baselineDates);
  const verifyGmv = totalRevenueForDates(state, company, periodDates);
  const expectedGmvGrowthRate = Number(plan.expectedGmvGrowthRate || 0);
  const hasVerificationData = periodDates.some((date) => {
    const rows = dayRowsForCompany(state, company, date);
    return rows.metrics.length > 0 || rows.entries.length > 0;
  });
  const actualGmvGrowthRate = hasVerificationData
    ? (baseGmv > 0 ? ((verifyGmv - baseGmv) / baseGmv) * 100 : (verifyGmv > 0 ? 100 : 0))
    : null;
  const complianceRate = Number.isFinite(Number(actualGmvGrowthRate)) && expectedGmvGrowthRate > 0
    ? (Number(actualGmvGrowthRate) / expectedGmvGrowthRate) * 100
    : null;
  const status = actionVerificationStatus(complianceRate, actualGmvGrowthRate);

  return {
    status,
    label: actionVerificationLabel(status, validationDays),
    date: plan.date,
    verifyDate: periodEndDate,
    validationDays,
    periodStartDate: plan.date,
    periodEndDate,
    baselineStartDate,
    baselineEndDate,
    action: plan.action,
    expectation: plan.expectation,
    expectedGmvGrowthRate,
    actualGmvGrowthRate,
    complianceRate,
    baseGmv,
    verifyGmv,
    owner: plan.owner,
    updatedAt: plan.updatedAt,
  };
}

function totalRevenueForDates(state, company, dates) {
  return dates.reduce((sum, date) => {
    const rows = dayRowsForCompany(state, company, date);
    return sum + dayRevenueFromRows(rows);
  }, 0);
}

function dayRowsForCompany(state, company, date) {
  return {
    metrics: state.metrics.filter((metric) => metric.company === company && metric.date === date),
    entries: state.entries.filter((entry) => entry.company === company && entry.date === date),
  };
}

function dayRevenueFromRows(rows) {
  if (rows.metrics.length) return sumMetricRevenue(rows.metrics);
  return sumEntryRevenue(rows.entries, 'revenueActual');
}

function actionVerificationStatus(complianceRate, actualGrowthRate) {
  if (!Number.isFinite(Number(complianceRate)) || !Number.isFinite(Number(actualGrowthRate))) return 'empty';
  if (Number(actualGrowthRate) <= 0 || Number(complianceRate) < 20) return 'bad';
  if (Number(complianceRate) < 60) return 'invalid';
  if (Number(complianceRate) < 90) return 'warn';
  return 'good';
}

function actionVerificationLabel(status, validationDays = 1) {
  if (status === 'good') return Number(validationDays) > 1 ? '周期动作有效' : '当日动作有效';
  if (status === 'warn') return '需要优化';
  if (status === 'invalid') return '动作基本无效';
  if (status === 'bad') return '动作无效需要预警';
  return '待验证';
}

function applyTaskCalendarRollup(data, company, month, actor) {
  const state = taskCalendarState(data);
  const summary = summarizeCompany(data, state, company, month);
  const subsidiary = data.subsidiaries?.find((item) => item.name === company);
  if (!subsidiary) return { company, linked: false, summary };
  const before = JSON.stringify({
    actual: subsidiary.actual,
    forecastRate: subsidiary.forecastRate,
    threeDayRate: subsidiary.threeDayRate,
    weekRate: subsidiary.weekRate,
  });
  Object.assign(subsidiary, {
    actual: summary.actualWan,
    forecastRate: nullableRound(summary.forecastRate),
    threeDayRate: nullableRound(summary.threeDayRate),
    weekRate: nullableRound(summary.weekRate),
    riskLevel: summary.status === 'risk' ? 'risk' : summary.status === 'watch' ? 'watch' : 'healthy',
    dataState: 'published',
    sourceBatchId: `TASK-CALENDAR-${month}`,
    sourceRow: 1,
    summary: summary.summary,
  });
  addAudit(
    data,
    actor,
    'task_calendar.rollup.publish',
    'subsidiary',
    subsidiary.id,
    before,
    JSON.stringify({ actual: subsidiary.actual, forecastRate: subsidiary.forecastRate }),
    `经营填报同步到 ${company} 子公司监管看板`,
  );
  return { company, linked: true, subsidiary, summary };
}

function sumMetricRevenue(rows) {
  return rows.reduce((sum, metric) => sum + getMetricRevenue(metric), 0);
}

function sumEntryRevenue(rows, key) {
  return rows.reduce((sum, entry) => sum + Number(entry?.[key] || 0), 0);
}

function getMetricRevenue(metric) {
  if (Number.isFinite(Number(metric.revenueAmount))) return Number(metric.revenueAmount || 0);
  if (metric.unitType === 'business') return Number(metric.revenue || metric.income || 0);
  return Number(metric.gmv || 0);
}

function findMonthlyTarget(state, company, month) {
  return state.monthlyTargets.find((target) => target.company === company && target.month === month);
}

function syncMetricEntry(state, metric, actor) {
  if (!metric) return;
  const id = `business-metric-${metric.id}`;
  const entry = {
    id,
    company: metric.company,
    date: metric.date,
    task: `${metric.unitName || '经营数据'}同步`,
    status: '',
    revenueTarget: 0,
    revenueActual: getMetricRevenue(metric),
    progress: 0,
    action: metric.note || '经营数据已同步。',
    owner: metric.owner || actor.name,
    risk: '',
    source: 'business-metric',
    businessMetricId: metric.id,
    updatedAt: metric.updatedAt || new Date().toISOString(),
  };
  const index = state.entries.findIndex((item) => item.id === id || item.businessMetricId === metric.id);
  if (index >= 0) state.entries[index] = { ...state.entries[index], ...entry };
  else state.entries = [entry, ...state.entries];
}

function syncMonthlyTargetEntries(state, target) {
  const [year, monthNumber] = target.month.split('-').map(Number);
  const days = daysInMonth(target.month);
  state.entries = state.entries.filter((entry) => {
    if (entry.company !== target.company || !String(entry.date || '').startsWith(`${target.month}-`)) return true;
    if (entry.source === 'monthly-target' || entry.source === 'day-target') return false;
    if (String(entry.id || '').startsWith(`${target.id}-`)) return false;
    return !(entry.task === '月度营业额目标' && String(entry.action || '').includes('按月度目标自动拆分'));
  });
  if (target.allocationMode !== 'daily') return;
  const generated = Array.from({ length: days }, (_, index) => {
    const day = String(index + 1).padStart(2, '0');
    return {
      id: `${target.id}-${day}`,
      company: target.company,
      date: `${year}-${String(monthNumber).padStart(2, '0')}-${day}`,
      task: '月度营业额目标',
      status: '未开始',
      revenueTarget: target.dailyTarget,
      revenueActual: 0,
      progress: 0,
      action: '按月度目标自动拆分。',
      owner: target.updatedBy,
      risk: '',
      source: 'monthly-target',
    };
  });
  state.entries = [...generated, ...state.entries];
}

function buildSummary(company, targetWan, actualWan, completionRate, status, rowCount) {
  if (targetWan <= 0) return `${company} 已收集 ${rowCount} 条经营数据，但月目标尚未设定，需要先补齐目标后进入完成率监管。`;
  const rateText = formatPercent(completionRate);
  if (status === 'good') return `${company} 月完成 ${formatNumber(actualWan)}万，完成率 ${rateText}，当前节奏基本达标，继续保持日填报连续性。`;
  if (status === 'watch') return `${company} 月完成 ${formatNumber(actualWan)}万，完成率 ${rateText}，需关注剩余缺口并确认近 3 天填报是否完整。`;
  return `${company} 月完成 ${formatNumber(actualWan)}万，完成率 ${rateText}，低于监管线，需要负责人补动作、补数据、补风险说明。`;
}

function weightedAverage(rows, valueKey, weightKey) {
  const valid = rows.filter((row) => Number.isFinite(Number(row[valueKey])) && Number(row[weightKey]) > 0);
  const weight = valid.reduce((sum, row) => sum + Number(row[weightKey]), 0);
  if (!weight) return null;
  return valid.reduce((sum, row) => sum + Number(row[valueKey]) * Number(row[weightKey]), 0) / weight;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nullableRound(value) {
  return Number.isFinite(Number(value)) ? Math.round(Number(value) * 10) / 10 : null;
}

function roundWan(value) {
  return Math.round((Number(value || 0) / 10000) * 10) / 10;
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 100) return number.toFixed(0);
  if (Math.abs(number) >= 10) return number.toFixed(1).replace(/\.0$/, '');
  return number.toFixed(1).replace(/\.0$/, '');
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return '目标待定';
  return `${Number(value).toFixed(1).replace(/\.0$/, '')}%`;
}

function slug(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || Date.now().toString(36);
}

function percentWidth(value) {
  if (!Number.isFinite(Number(value))) return '0%';
  return `${Math.max(0, Math.min(100, Number(value)))}%`;
}

function normalizeMonth(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}$/.test(text) ? text : null;
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function daysInMonth(month) {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber, 0).getDate();
}

function dateOffset(date, offset) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + offset);
  return next.toISOString().slice(0, 10);
}

function pickMetricSnapshot(metric) {
  return {
    company: metric.company,
    unitId: metric.unitId,
    date: metric.date,
    gmv: metric.gmv,
    gsv: metric.gsv,
    returnRate: metric.returnRate,
    promotionFee: metric.promotionFee,
    impressions: metric.impressions,
    revenue: metric.revenue,
    costExpense: metric.costExpense,
    note: metric.note,
  };
}

function nextMetricId(state) {
  return `business-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
