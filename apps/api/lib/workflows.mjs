import { addAudit, canReadSubsidiary, fail, permissionsFor } from './domain.mjs';

export const workflowConfigs = {
  hev: {
    field: 'hevState',
    label: 'HEV',
    transitions: {
      draft: ['submitted', 'archived'],
      submitted: ['reviewed', 'action_required', 'archived'],
      reviewed: ['action_required', 'verified', 'archived'],
      action_required: ['submitted', 'verified', 'archived'],
      verified: ['archived'],
      archived: [],
    },
  },
  task: {
    field: 'taskState',
    label: '任务',
    transitions: {
      created: ['assigned', 'archived'],
      assigned: ['in_progress', 'blocked', 'archived'],
      in_progress: ['blocked', 'done', 'archived'],
      blocked: ['in_progress', 'archived'],
      done: ['accepted', 'archived'],
      accepted: ['archived'],
      archived: [],
    },
  },
  risk: {
    field: 'riskState',
    label: '风险',
    transitions: {
      identified: ['triaged', 'archived'],
      triaged: ['owner_assigned', 'escalated', 'archived'],
      owner_assigned: ['mitigation_in_progress', 'escalated', 'archived'],
      mitigation_in_progress: ['controlled', 'escalated', 'archived'],
      escalated: ['mitigation_in_progress', 'controlled', 'closed', 'archived'],
      controlled: ['closed', 'archived'],
      closed: ['archived'],
      archived: [],
    },
  },
  decision: {
    field: 'decisionState',
    label: '决策',
    transitions: {
      proposed: ['evidence_attached', 'archived'],
      evidence_attached: ['pending_decision', 'archived'],
      pending_decision: ['decided', 'archived'],
      decided: ['action_created', 'archived'],
      action_created: ['archived'],
      archived: [],
    },
  },
};

export function updateWorkflowState(data, subsidiaryId, workflowType, body, actor) {
  const config = workflowConfigs[workflowType];
  if (!config) fail(404, 'workflow_not_found', `workflow type ${workflowType} is not supported`);

  const subsidiary = data.subsidiaries.find((entry) => entry.id === subsidiaryId);
  if (!subsidiary) fail(404, 'subsidiary_not_found', `subsidiary ${subsidiaryId} was not found`);
  if (!canReadSubsidiary(data, actor, subsidiary.id)) {
    fail(403, 'forbidden', 'role scope does not allow cross-subsidiary workflow access');
  }

  const nextState = String(body.nextState || '').trim();
  const reason = String(body.reason || '').trim();
  if (!nextState) fail(400, 'missing_next_state', 'nextState is required');
  if (!reason) fail(400, 'missing_reason', 'workflow transition reason is required');

  const before = subsidiary[config.field];
  const allowed = config.transitions[before] ?? [];
  if (!allowed.includes(nextState)) {
    fail(409, 'invalid_workflow_transition', `${workflowType} cannot transition from ${before} to ${nextState}`);
  }
  assertWorkflowPermission(data, actor, workflowType, nextState);

  subsidiary[config.field] = nextState;
  const auditLog = addAudit(
    data,
    actor,
    `${workflowType}.transition`,
    'subsidiary_workflow',
    `${subsidiary.id}:${workflowType}`,
    before,
    nextState,
    reason,
  );
  const decisionPackage = workflowType === 'decision'
    ? upsertDecisionPackage(data, subsidiary, nextState, actor, reason)
    : null;

  return { subsidiary, auditLog, decisionPackage };
}

function assertWorkflowPermission(data, actor, workflowType, nextState) {
  const permissions = permissionsFor(data, actor.role);
  if (permissions.has('workflow.manage')) return;
  if (workflowType === 'decision' && nextState === 'decided' && permissions.has('decision.decide')) return;
  if (workflowType === 'hev' && nextState === 'submitted' && permissions.has('hev.submit')) return;
  if (workflowType === 'task' && ['in_progress', 'blocked', 'done'].includes(nextState) && permissions.has('task.update')) return;
  fail(403, 'forbidden', `${actor.role} cannot transition ${workflowType} to ${nextState}`);
}

function upsertDecisionPackage(data, subsidiary, nextState, actor, reason) {
  const evidence = [subsidiary.id, subsidiary.sourceBatchId].filter(Boolean);
  const existing = (data.decisionPackages ?? []).find((entry) =>
    evidence.some((evidenceId) => entry.evidence?.includes(evidenceId)),
  );
  if (existing) {
    existing.state = nextState;
    existing.owner = actor.name;
    existing.summary = reason;
    return existing;
  }

  const periodKey = String(data.period || new Date().toISOString().slice(0, 7)).replace(/\D/g, '');
  const nextNumber = String((data.decisionPackages?.length ?? 0) + 1).padStart(3, '0');
  const decisionPackage = {
    id: `DEC-${periodKey}-${nextNumber}`,
    title: `${subsidiary.name} 风险决策包`,
    state: nextState,
    owner: actor.name,
    evidence,
    summary: reason,
  };
  data.decisionPackages = [decisionPackage, ...(data.decisionPackages ?? [])];
  return decisionPackage;
}
