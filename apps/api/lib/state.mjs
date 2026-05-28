export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function prepareInitialData(seed, defaults = {}) {
  const data = clone(seed);
  data.schemaVersion = data.schemaVersion ?? 1;
  if ((!Array.isArray(data.roles) || data.roles.length === 0 || roleNeedsRefresh(data.roles)) && Array.isArray(defaults.roles)) {
    data.roles = clone(defaults.roles);
  }
  if ((!Array.isArray(data.users) || data.users.length === 0) && Array.isArray(defaults.users)) {
    data.users = clone(defaults.users);
  } else if (Array.isArray(defaults.users)) {
    data.users = mergeById(data.users, defaults.users);
  }
  data.sourceRows = Array.isArray(data.sourceRows) ? data.sourceRows : buildSeedSourceRows(data);
  data.validationIssues = Array.isArray(data.validationIssues) ? data.validationIssues : [];
  data.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
  data.importBatches = Array.isArray(data.importBatches) ? data.importBatches : [];
  data.subsidiaries = Array.isArray(data.subsidiaries) ? data.subsidiaries : [];
  if (Array.isArray(defaults.subsidiaries)) data.subsidiaries = mergeById(data.subsidiaries, defaults.subsidiaries);
  data.decisionPackages = Array.isArray(data.decisionPackages) ? data.decisionPackages : [];
  data.operatingSystem = data.operatingSystem ?? clone(defaults.operatingSystem ?? {});
  data.commercialSystem = data.commercialSystem ?? clone(defaults.commercialSystem ?? {});
  data.villaProject = data.villaProject ?? clone(defaults.villaProject ?? { phases: [], issues: [], budgets: [], expenses: [], villaZones: [] });
  data.villaProject.phases = Array.isArray(data.villaProject.phases) ? data.villaProject.phases : clone(defaults.villaProject?.phases ?? []);
  data.villaProject.issues = Array.isArray(data.villaProject.issues) ? data.villaProject.issues : clone(defaults.villaProject?.issues ?? []);
  data.villaProject.budgets = Array.isArray(data.villaProject.budgets) ? data.villaProject.budgets : clone(defaults.villaProject?.budgets ?? []);
  data.villaProject.expenses = Array.isArray(data.villaProject.expenses) ? data.villaProject.expenses : clone(defaults.villaProject?.expenses ?? []);
  data.villaProject.villaZones = Array.isArray(data.villaProject.villaZones) ? data.villaProject.villaZones : clone(defaults.villaProject?.villaZones ?? []);
  data.taskCalendar = data.taskCalendar ?? clone(defaults.taskCalendar ?? { companies: [], units: [], metrics: [], entries: [] });
  data.taskCalendar.companies = Array.isArray(data.taskCalendar.companies) ? data.taskCalendar.companies : clone(defaults.taskCalendar?.companies ?? []);
  data.taskCalendar.units = Array.isArray(data.taskCalendar.units) ? data.taskCalendar.units : clone(defaults.taskCalendar?.units ?? []);
  data.taskCalendar.metrics = Array.isArray(data.taskCalendar.metrics) ? data.taskCalendar.metrics : clone(defaults.taskCalendar?.metrics ?? []);
  data.taskCalendar.entries = Array.isArray(data.taskCalendar.entries) ? data.taskCalendar.entries : clone(defaults.taskCalendar?.entries ?? []);
  data.taskCalendar.monthlyTargets = Array.isArray(data.taskCalendar.monthlyTargets) ? data.taskCalendar.monthlyTargets : clone(defaults.taskCalendar?.monthlyTargets ?? []);
  data.operatingSystem.people = Array.isArray(data.operatingSystem.people) ? data.operatingSystem.people : clone(defaults.operatingSystem?.people ?? []);
  data.operatingSystem.moduleResponsibilities = Array.isArray(data.operatingSystem.moduleResponsibilities)
    ? data.operatingSystem.moduleResponsibilities
    : clone(defaults.operatingSystem?.moduleResponsibilities ?? []);
  data.operatingSystem.reportingLines = Array.isArray(data.operatingSystem.reportingLines)
    ? data.operatingSystem.reportingLines
    : clone(defaults.operatingSystem?.reportingLines ?? []);
  data.operatingSystem.handoverEvents = Array.isArray(data.operatingSystem.handoverEvents)
    ? data.operatingSystem.handoverEvents
    : clone(defaults.operatingSystem?.handoverEvents ?? []);
  data.users = Array.isArray(data.users) ? data.users : [];
  data.sessions = Array.isArray(data.sessions) ? data.sessions : [];
  return data;
}

function mergeById(current = [], defaults = []) {
  const ids = new Set(current.map((item) => item.id));
  return [...current, ...clone(defaults).filter((item) => item?.id && !ids.has(item.id))];
}

function roleNeedsRefresh(roles) {
  const pmo = roles.find((role) => role.id === 'pmo');
  return (
    !pmo?.permissions?.includes('source.read') ||
    !pmo?.permissions?.includes('people.manage') ||
    !pmo?.permissions?.includes('risk.manage') ||
    !pmo?.permissions?.includes('system.manage') ||
    !pmo?.permissions?.includes('task_calendar.read') ||
    !pmo?.permissions?.includes('task_calendar.write') ||
    !pmo?.permissions?.includes('villa_project.read') ||
    !pmo?.permissions?.includes('villa_project.write')
  );
}

function buildSeedSourceRows(data) {
  const seen = new Set();
  return data.subsidiaries.map((item) => {
    const rowKey = `${item.sourceBatchId}:${item.sourceRow}`;
    const uniqueSuffix = seen.has(rowKey) ? `-${item.id}` : '';
    seen.add(rowKey);
    return {
      id: `SRC-${item.sourceBatchId}-${String(item.sourceRow).padStart(4, '0')}${uniqueSuffix}`,
      batchId: item.sourceBatchId,
      rowNumber: item.sourceRow,
      rawPayload: {
        name: item.name,
        owner: item.owner,
        target: item.target,
        actual: item.actual,
        forecastRate: item.forecastRate,
        threeDayRate: item.threeDayRate,
        weekRate: item.weekRate,
      },
      normalizedPayload: {
        subsidiaryId: item.id,
        name: item.name,
        target: item.target,
        actual: item.actual,
        forecastRate: item.forecastRate,
        threeDayRate: item.threeDayRate,
        weekRate: item.weekRate,
      },
      validationState: item.dataState === 'raw' ? 'error' : 'valid',
    };
  });
}
