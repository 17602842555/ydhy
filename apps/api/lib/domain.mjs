export const dataStates = ['raw', 'validated', 'published', 'corrected', 'archived'];

export const transitions = {
  raw: ['validated', 'archived'],
  validated: ['published', 'corrected', 'archived'],
  published: ['corrected', 'archived'],
  corrected: ['validated', 'published', 'archived'],
  archived: [],
};

const fallbackPermissions = {
  boss: ['dashboard.read', 'subsidiary.read', 'decision.decide', 'audit.read', 'source.read', 'task_calendar.read', 'villa_project.read'],
  pmo: [
    'dashboard.read',
    'subsidiary.read',
    'import.upload',
    'import.validate',
    'data.publish',
    'workflow.manage',
    'people.manage',
    'risk.manage',
    'system.manage',
    'audit.read',
    'source.read',
    'task_calendar.read',
    'task_calendar.write',
    'villa_project.read',
    'villa_project.write',
  ],
  subsidiary_owner: ['subsidiary.read', 'hev.submit', 'task.update', 'task_calendar.read', 'task_calendar.write'],
  finance_ops: ['dashboard.read', 'import.upload', 'import.validate', 'data.correct', 'source.read', 'task_calendar.read', 'task_calendar.write'],
};

export class ApiError extends Error {
  constructor(status, error, reason) {
    super(reason ?? error);
    this.status = status;
    this.error = error;
    this.reason = reason;
  }
}

export function fail(status, error, reason) {
  throw new ApiError(status, error, reason);
}

export function getActor(req) {
  return {
    role: String(req.headers['x-role'] || 'pmo'),
    name: decodeHeaderValue(req.headers['x-actor'] || 'PMO'),
    subsidiaryId: req.headers['x-subsidiary-id'] ? String(req.headers['x-subsidiary-id']) : null,
  };
}

function decodeHeaderValue(value) {
  const raw = String(value);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function permissionsFor(data, roleCode) {
  const role = data.roles?.find((entry) => entry.id === roleCode);
  return new Set(role?.permissions ?? fallbackPermissions[roleCode] ?? []);
}

export function requirePermission(data, actor, permission) {
  if (!permissionsFor(data, actor.role).has(permission)) {
    fail(403, 'forbidden', `${actor.role} is missing permission ${permission}`);
  }
}

export function canReadSubsidiary(data, actor, subsidiaryId) {
  if (actor.role === 'subsidiary_owner') return actor.subsidiaryId === subsidiaryId;
  return permissionsFor(data, actor.role).has('dashboard.read') || permissionsFor(data, actor.role).has('subsidiary.read');
}

export function assertTransition(before, after) {
  if (before === after) return;
  if (!transitions[before]?.includes(after)) {
    fail(409, 'invalid_state_transition', `${before} cannot transition to ${after}`);
  }
}

export function addAudit(data, actor, action, targetType, targetId, before, after, reason) {
  const nextNumber = (data.auditLogs?.length ?? 0) + 1001;
  const log = {
    id: `AUD-${nextNumber}`,
    actor: actor.name,
    role: actor.role,
    action,
    targetType,
    target: targetId,
    before,
    after,
    reason: reason || '',
    requestId: `REQ-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  data.auditLogs = [log, ...(data.auditLogs ?? [])];
  return log;
}
