import { addAudit, fail, permissionsFor } from './domain.mjs';
import { getOperatingSystem } from './operatingSystem.mjs';

const riskStatuses = ['open', 'mitigating', 'closed', 'decided'];

export function updateRiskItem(data, riskId, body, actor) {
  const risks = data.operatingSystem?.risks;
  if (!Array.isArray(risks)) fail(404, 'not_found', 'risk registry is not configured');
  const risk = risks.find((entry) => entry.id === riskId);
  if (!risk) fail(404, 'not_found', `risk ${riskId} was not found`);

  if (body?.action === 'escalate') {
    return escalateRiskToDecision(data, risk, body, actor);
  }

  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('risk.manage')) fail(403, 'forbidden', `${actor.role} cannot update risk items`);
  const nextStatus = String(body?.status ?? '');
  if (!riskStatuses.includes(nextStatus)) fail(400, 'invalid_risk_status', `status must be one of ${riskStatuses.join(', ')}`);
  const before = risk.status ?? 'open';
  if (before === nextStatus) return { risk, auditLog: null, operatingSystem: getOperatingSystem(data) };
  risk.status = nextStatus;
  risk.updatedAt = new Date().toISOString();
  const auditLog = addAudit(data, actor, 'risk.update', 'risk_item', risk.id, before, nextStatus, String(body?.reason || `${actor.name} 更新风险状态`));
  return { risk, auditLog, operatingSystem: getOperatingSystem(data) };
}

function escalateRiskToDecision(data, risk, body, actor) {
  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('risk.manage') && !permissions.has('decision.decide')) {
    fail(403, 'forbidden', `${actor.role} cannot escalate risk items`);
  }

  const existing = (data.decisionPackages ?? []).find((decision) => decision.sourceRiskId === risk.id);
  if (existing) {
    return {
      risk,
      decisionPackage: existing,
      auditLog: null,
      operatingSystem: getOperatingSystem(data),
      idempotent: true,
    };
  }

  const before = risk.status ?? 'open';
  const reason = String(body?.escalationReason || body?.reason || risk.text);
  const decisionMakerPersonId = String(body?.decisionMakerPersonId || 'person-huage');
  const ownerPersonId = String(body?.ownerPersonId || personIdForName(data, risk.owner) || 'person-lijinning');
  const impactScope = String(body?.impactScope || risk.text);
  const evidenceRefs = Array.isArray(body?.evidenceRefs) && body.evidenceRefs.length > 0
    ? body.evidenceRefs.map(String)
    : [risk.id];

  const auditLog = addAudit(data, actor, 'risk.escalate_decision', 'risk_item', risk.id, before, 'decision_required', reason);
  const decisionPackage = {
    id: nextDecisionId(data),
    title: `${risk.text} 决策包`,
    state: 'pending_decision',
    owner: actor.name,
    evidence: evidenceRefs,
    sourceRiskId: risk.id,
    ownerPersonId,
    escalationReason: reason,
    impactScope,
    decisionMakerPersonId,
    evidenceRefs,
    auditEventId: auditLog.id,
    summary: `由风险 ${risk.id} 升级：${risk.text}`,
  };

  risk.type = 'decision';
  risk.status = 'decided';
  risk.updatedAt = new Date().toISOString();
  data.decisionPackages = [decisionPackage, ...(data.decisionPackages ?? [])];
  return {
    risk,
    decisionPackage,
    auditLog,
    operatingSystem: getOperatingSystem(data),
    idempotent: false,
  };
}

function personIdForName(data, name) {
  return data.operatingSystem?.people?.find((person) => person.name === name)?.id ?? null;
}

function nextDecisionId(data) {
  const next = (data.decisionPackages ?? [])
    .map((decision) => Number(String(decision.id).replace(/^DEC-\d{6}-/, '')))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0) + 1;
  return `DEC-${String(data.period || '000000').replace('-', '')}-${String(next).padStart(3, '0')}`;
}
