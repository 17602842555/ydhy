import { createHash } from 'node:crypto';
import { addAudit, assertTransition, fail, requirePermission } from './domain.mjs';

const rowFieldMap = {
  name: ['name', 'company', 'subsidiary', '子公司', '子公司名称'],
  target: ['target', 'monthlyTarget', '月目标', '目标'],
  actual: ['actual', 'monthlyActual', '月完成', '完成'],
  forecastRate: ['forecastRate', '预计完成率', '预测完成率'],
  threeDayRate: ['threeDayRate', '三天完成率', '3天完成率'],
  weekRate: ['weekRate', '周完成率'],
};

export function calculateDashboard(data) {
  const published = data.subsidiaries.filter((item) => item.dataState === 'published');
  const totalTarget = published.reduce((sum, item) => sum + Number(item.target || 0), 0);
  const totalActual = published.reduce((sum, item) => sum + Number(item.actual || 0), 0);
  const riskCount = data.subsidiaries.filter((item) => ['risk', 'critical'].includes(item.riskLevel)).length;
  const lifecycle = ['raw', 'validated', 'published', 'corrected', 'archived'].map((state) => ({
    state,
    count:
      data.importBatches.filter((batch) => batch.state === state).length +
      data.subsidiaries.filter((item) => item.dataState === state).length,
  }));
  const pendingBatches = data.importBatches.filter((batch) => batch.state !== 'published').length;
  const completionRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;

  return {
    period: data.period,
    organization: data.organization,
    kpis: [
      { label: '集团月目标', value: `${totalTarget.toFixed(0)}万`, tone: 'neutral' },
      { label: '集团月完成', value: `${totalActual.toFixed(1)}万`, tone: 'neutral' },
      { label: '集团完成率', value: `${completionRate.toFixed(1)}%`, tone: completionRate >= 90 ? 'good' : 'watch' },
      { label: '风险子公司', value: `${riskCount}家`, tone: riskCount > 0 ? 'risk' : 'good' },
      { label: '待发布批次', value: `${pendingBatches}批`, tone: pendingBatches > 0 ? 'watch' : 'good' },
    ],
    lifecycle,
    subsidiaries: data.subsidiaries,
    importBatches: data.importBatches,
    validationIssues: data.validationIssues,
    auditLogs: data.auditLogs,
    decisionPackages: data.decisionPackages,
  };
}

export function validateImportRows(data, rows, batchId = 'PREVIEW') {
  const issues = [];
  const normalizedRows = rows.map((row, index) => {
    const rowNumber = index + 2;
    const normalized = normalizeRow(row);
    const subsidiary = data.subsidiaries.find((item) => item.name === normalized.name);
    const duplicateIndex = rows.findIndex((candidate, candidateIndex) => {
      if (candidateIndex >= index) return false;
      return String(pick(candidate, rowFieldMap.name) ?? '').trim() === normalized.name;
    });

    if (!normalized.name) {
      issues.push(issue(batchId, rowNumber, 'name', 'error', '子公司名称不能为空。'));
    } else if (!subsidiary) {
      issues.push(issue(batchId, rowNumber, 'name', 'error', '子公司名称无法匹配组织档案。'));
    }

    if (duplicateIndex >= 0) {
      issues.push(issue(batchId, rowNumber, 'name', 'error', '同一导入批次内子公司重复。'));
    }

    if (!Number.isFinite(normalized.target) || normalized.target <= 0) {
      issues.push(issue(batchId, rowNumber, 'target', 'error', '月目标必须是大于 0 的数字。'));
    }

    if (!Number.isFinite(normalized.actual) || normalized.actual < 0) {
      issues.push(issue(batchId, rowNumber, 'actual', 'error', '月完成必须是大于等于 0 的数字。'));
    }

    if (Number.isFinite(normalized.target) && Number.isFinite(normalized.actual) && normalized.actual > normalized.target * 1.6) {
      issues.push(issue(batchId, rowNumber, 'actual', 'warning', '完成值超过目标 160%，需要确认单位是否为万元。'));
    }

    return {
      ...normalized,
      subsidiaryId: subsidiary?.id ?? null,
      rowNumber,
    };
  });

  return { issues, normalizedRows };
}

export function createImportBatch(data, body, actor, options = {}) {
  requirePermission(data, actor, 'import.upload');
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (rows.length === 0) fail(400, 'empty_import', 'rows must contain at least one item');

  const fileHash = normalizeImportHash(body.fileHash) ?? createImportHash(body.fileName, rows);
  const duplicate = data.importBatches.find((batch) => batch.hash === fileHash && batch.state !== 'archived');
  if (duplicate) {
    fail(409, 'duplicate_import', `同一文件已导入为 ${duplicate.id}，当前状态为 ${duplicate.state}`);
  }

  const batchId = nextBatchId(data);
  const { issues, normalizedRows } = validateImportRows(data, rows, batchId);
  const errorCount = issues.filter((entry) => entry.severity === 'error').length;
  const state = errorCount > 0 ? 'raw' : 'validated';
  const now = new Date().toISOString();
  const sourceFile = normalizeSourceFile(body.sourceFile, fileHash, options.maxSourceFileBytes);
  const sourceFileResult = sourceFile && options.sourceFileStore
    ? options.sourceFileStore.save({
        batchId,
        fileName: body.fileName,
        fileHash,
        sourceFile,
      })
    : null;
  const batch = {
    id: batchId,
    fileName: String(body.fileName || `子公司监管导入-${batchId}.csv`),
    source: String(body.source || 'manual-ui-import'),
    uploadedBy: actor.name,
    uploadedAt: now,
    state,
    hash: fileHash,
    rowCount: rows.length,
    errorCount,
    objectKey: sourceFileResult?.objectKey ?? null,
    sourceFileSize: sourceFileResult?.byteSize ?? sourceFile?.size ?? null,
    sourceMimeType: sourceFileResult?.mimeType ?? sourceFile?.mimeType ?? null,
  };

  data.importBatches = [batch, ...data.importBatches];
  data.sourceRows = [
    ...normalizedRows.map((row, index) => ({
      id: `SRC-${batchId}-${String(row.rowNumber).padStart(4, '0')}`,
      batchId,
      rowNumber: row.rowNumber,
      rawPayload: rows[index],
      normalizedPayload: row,
      validationState: issues.some((entry) => entry.row === row.rowNumber && entry.severity === 'error') ? 'error' : 'valid',
    })),
    ...(data.sourceRows ?? []),
  ];
  data.validationIssues = [...persistIssues(batchId, issues), ...(data.validationIssues ?? [])];

  addAudit(data, actor, 'upload', 'import_batch', batchId, '-', 'raw', `上传 ${batch.fileName}`);
  addAudit(data, actor, 'validate', 'import_batch', batchId, 'raw', state, errorCount > 0 ? '导入结构校验未通过' : '导入结构校验通过');
  return { batch, issues: data.validationIssues.filter((entry) => entry.batchId === batchId) };
}

export function revalidateImportBatch(data, batchId, actor) {
  requirePermission(data, actor, 'import.validate');
  const batch = findBatch(data, batchId);
  if (['published', 'archived'].includes(batch.state)) {
    fail(409, 'batch_locked', `${batch.state} batch cannot be revalidated`);
  }
  const rows = data.sourceRows.filter((row) => row.batchId === batchId).sort((a, b) => a.rowNumber - b.rowNumber);
  const before = batch.state;
  const { issues, normalizedRows } = validateImportRows(
    data,
    rows.map((row) => row.rawPayload),
    batchId,
  );
  const errorCount = issues.filter((entry) => entry.severity === 'error').length;
  const after = errorCount > 0 ? 'raw' : 'validated';
  if (before !== 'raw') assertTransition(before, after);

  data.sourceRows = data.sourceRows.map((row) => {
    if (row.batchId !== batchId) return row;
    const normalized = normalizedRows.find((entry) => entry.rowNumber === row.rowNumber);
    return {
      ...row,
      normalizedPayload: normalized ?? row.normalizedPayload,
      validationState: issues.some((entry) => entry.row === row.rowNumber && entry.severity === 'error') ? 'error' : 'valid',
    };
  });
  data.validationIssues = [...persistIssues(batchId, issues), ...data.validationIssues.filter((entry) => entry.batchId !== batchId)];
  batch.state = after;
  batch.errorCount = errorCount;
  addAudit(data, actor, 'validate', 'import_batch', batchId, before, after, errorCount > 0 ? '重新校验仍有错误' : '重新校验通过');
  return { batch, issues: data.validationIssues.filter((entry) => entry.batchId === batchId) };
}

export function publishImportBatch(data, batchId, actor, reason = '发布子公司监管导入批次') {
  requirePermission(data, actor, 'data.publish');
  const batch = findBatch(data, batchId);
  if (batch.state !== 'validated') {
    fail(409, 'batch_not_publishable', `only validated batches can be published, current state is ${batch.state}`);
  }
  const issues = data.validationIssues.filter((entry) => entry.batchId === batchId);
  if (issues.some((entry) => entry.severity === 'error')) {
    fail(409, 'batch_has_errors', 'batch has unresolved validation errors');
  }
  const rows = data.sourceRows.filter((row) => row.batchId === batchId).sort((a, b) => a.rowNumber - b.rowNumber);
  if (rows.length === 0) fail(409, 'empty_batch', 'batch has no source rows');

  const before = batch.state;
  assertTransition(before, 'published');
  const updatedSubsidiaries = [];

  for (const row of rows) {
    const normalized = row.normalizedPayload;
    const subsidiary = data.subsidiaries.find((item) => item.id === normalized.subsidiaryId);
    if (!subsidiary) continue;
    const rate = normalized.target > 0 ? (normalized.actual / normalized.target) * 100 : null;
    const riskLevel = computeRiskLevel(rate);
    Object.assign(subsidiary, {
      target: normalized.target,
      actual: normalized.actual,
      forecastRate: normalized.forecastRate ?? rate,
      threeDayRate: normalized.threeDayRate ?? subsidiary.threeDayRate,
      weekRate: normalized.weekRate ?? subsidiary.weekRate,
      sourceBatchId: batchId,
      sourceRow: row.rowNumber,
      dataState: 'published',
      riskLevel,
      hevState: riskLevel === 'healthy' ? 'reviewed' : subsidiary.hevState === 'draft' ? 'submitted' : subsidiary.hevState,
      taskState: ['critical', 'risk'].includes(riskLevel) ? 'in_progress' : subsidiary.taskState,
      riskState: riskLevel === 'critical' ? 'escalated' : riskLevel === 'risk' ? 'triaged' : riskLevel === 'watch' ? 'owner_assigned' : 'controlled',
      decisionState: ['critical', 'risk'].includes(riskLevel) ? 'pending_decision' : subsidiary.decisionState,
      summary: buildSubsidiarySummary(subsidiary.name, normalized.target, normalized.actual, rate, riskLevel),
    });
    updatedSubsidiaries.push(subsidiary);
  }

  batch.state = 'published';
  batch.errorCount = 0;
  addAudit(data, actor, 'publish', 'import_batch', batchId, before, 'published', reason);
  return { batch, updatedSubsidiaries };
}

export function getImportBatchDetail(data, batchId) {
  const batch = findBatch(data, batchId);
  return {
    batch,
    rows: data.sourceRows.filter((row) => row.batchId === batchId).sort((a, b) => a.rowNumber - b.rowNumber),
    issues: data.validationIssues.filter((issue) => issue.batchId === batchId),
    auditLogs: data.auditLogs.filter((log) => log.target === batchId),
  };
}

function normalizeRow(row) {
  return {
    name: String(pick(row, rowFieldMap.name) ?? '').trim(),
    target: toNumber(pick(row, rowFieldMap.target)),
    actual: toNumber(pick(row, rowFieldMap.actual)),
    forecastRate: optionalNumber(pick(row, rowFieldMap.forecastRate)),
    threeDayRate: optionalNumber(pick(row, rowFieldMap.threeDayRate)),
    weekRate: optionalNumber(pick(row, rowFieldMap.weekRate)),
  };
}

function pick(row, keys) {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) return row[key];
  }
  return undefined;
}

function toNumber(value) {
  if (value === null || value === undefined || value === '') return Number.NaN;
  return Number(value);
}

function optionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function issue(batchId, row, field, severity, message) {
  return {
    id: `VAL-${batchId}-${String(row).padStart(3, '0')}-${field}`,
    batchId,
    row,
    field,
    severity,
    message,
  };
}

function persistIssues(batchId, issues) {
  return issues.map((entry, index) => ({
    ...entry,
    id: `VAL-${batchId}-${String(index + 1).padStart(3, '0')}`,
  }));
}

function findBatch(data, batchId) {
  const batch = data.importBatches.find((entry) => entry.id === batchId);
  if (!batch) fail(404, 'not_found', `import batch ${batchId} was not found`);
  return batch;
}

function nextBatchId(data) {
  const dateId = formatDateId(new Date());
  const prefix = `BATCH-${dateId}-`;
  const existing = data.importBatches
    .map((batch) => String(batch.id))
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter(Number.isFinite);
  const next = Math.max(0, ...existing) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

function formatDateId(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}${byType.month}${byType.day}`;
}

function createImportHash(fileName, rows) {
  return `sha256-${createHash('sha256').update(JSON.stringify({ fileName, rows })).digest('hex').slice(0, 12)}`;
}

function normalizeImportHash(value) {
  if (typeof value !== 'string') return null;
  const hash = value.trim();
  if (!/^sha256-[a-f0-9]{12,64}$/i.test(hash)) return null;
  return hash.toLowerCase();
}

function normalizeSourceFile(value, expectedHash, maxSourceFileBytes = 10_000_000) {
  if (!value || typeof value !== 'object') return null;
  const contentBase64 = String(value.contentBase64 || '');
  if (!contentBase64) return null;
  if (!/^[A-Za-z0-9+/=]+$/.test(contentBase64)) {
    fail(400, 'invalid_source_file', 'source file content must be base64');
  }
  const size = Number(value.size || 0);
  if (!Number.isFinite(size) || size <= 0) {
    fail(400, 'invalid_source_file', 'source file size is required');
  }
  if (size > maxSourceFileBytes) {
    fail(413, 'source_file_too_large', `source file exceeds ${maxSourceFileBytes} bytes`);
  }
  const decodedSize = Buffer.byteLength(contentBase64, 'base64');
  if (decodedSize !== size) {
    fail(400, 'invalid_source_file', 'source file size does not match content');
  }
  const sourceHash = normalizeImportHash(value.fileHash);
  if (sourceHash && sourceHash !== expectedHash) {
    fail(400, 'invalid_source_file', 'source file hash does not match import hash');
  }
  return {
    fileName: String(value.fileName || ''),
    mimeType: String(value.mimeType || 'application/octet-stream'),
    size,
    contentBase64,
  };
}

function computeRiskLevel(rate) {
  if (rate === null) return 'unknown';
  if (rate < 60) return 'critical';
  if (rate < 80) return 'risk';
  if (rate < 95) return 'watch';
  return 'healthy';
}

function buildSubsidiarySummary(name, target, actual, rate, riskLevel) {
  const rateText = rate === null ? '目标待定' : `${rate.toFixed(1)}%`;
  const action =
    riskLevel === 'critical'
      ? '必须进入风险升级和决策包。'
      : riskLevel === 'risk'
        ? '需要 PMO 分派补救任务并跟进 HEV 解释。'
        : riskLevel === 'watch'
          ? '需要负责人确认后续节奏。'
          : '当前达成情况健康，保留来源证据归档。';
  return `${name} 本批次发布后完成 ${actual}万 / 目标 ${target}万，完成率 ${rateText}，${action}`;
}
