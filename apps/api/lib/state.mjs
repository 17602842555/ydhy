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
  }
  data.sourceRows = Array.isArray(data.sourceRows) ? data.sourceRows : buildSeedSourceRows(data);
  data.validationIssues = Array.isArray(data.validationIssues) ? data.validationIssues : [];
  data.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];
  data.importBatches = Array.isArray(data.importBatches) ? data.importBatches : [];
  data.subsidiaries = Array.isArray(data.subsidiaries) ? data.subsidiaries : [];
  data.decisionPackages = Array.isArray(data.decisionPackages) ? data.decisionPackages : [];
  data.operatingSystem = data.operatingSystem ?? clone(defaults.operatingSystem ?? {});
  data.commercialSystem = data.commercialSystem ?? clone(defaults.commercialSystem ?? {});
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

function roleNeedsRefresh(roles) {
  const pmo = roles.find((role) => role.id === 'pmo');
  return (
    !pmo?.permissions?.includes('source.read') ||
    !pmo?.permissions?.includes('people.manage') ||
    !pmo?.permissions?.includes('risk.manage') ||
    !pmo?.permissions?.includes('system.manage')
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
