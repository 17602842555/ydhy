import { addAudit, fail, permissionsFor } from './domain.mjs';

const contactStatuses = ['正常', '预警', '停用'];

export function getPeopleGraph(data) {
  const operatingSystem = data.operatingSystem ?? {};
  const people = Array.isArray(operatingSystem.people) ? operatingSystem.people : [];
  const primaryContacts = Array.isArray(operatingSystem.contacts) ? operatingSystem.contacts : [];
  const handoverEvents = Array.isArray(operatingSystem.handoverEvents) ? operatingSystem.handoverEvents : [];
  return {
    people,
    roles: data.roles ?? [],
    moduleResponsibilities: operatingSystem.moduleResponsibilities ?? [],
    primaryContacts,
    reportingLines: operatingSystem.reportingLines ?? [],
    handoverEvents,
    auditEvents: (data.auditLogs ?? []).filter((log) => log.targetType === 'primary_contact' || log.action?.startsWith('people.')),
  };
}

export function updatePrimaryContact(data, contactId, body, actor) {
  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('people.manage')) {
    fail(403, 'forbidden', `${actor.role} cannot update primary contacts`);
  }

  const contacts = data.operatingSystem?.contacts;
  if (!Array.isArray(contacts)) fail(404, 'not_found', 'primary contact registry is not configured');
  const contact = contacts.find((entry) => entry.id === contactId);
  if (!contact) fail(404, 'not_found', `primary contact ${contactId} was not found`);

  const beforeContact = contact.contact;
  const beforeStatus = contact.status;
  const nextContact = body?.contact === undefined ? contact.contact : String(body.contact).trim();
  const nextStatus = body?.status === undefined ? contact.status : String(body.status);
  const nextRemark = body?.remark === undefined ? contact.remark : String(body.remark);
  if (!nextContact) fail(400, 'invalid_contact', 'contact is required');
  if (!contactStatuses.includes(nextStatus)) {
    fail(400, 'invalid_contact_status', `status must be one of ${contactStatuses.join(', ')}`);
  }

  if (beforeContact === nextContact && beforeStatus === nextStatus && contact.remark === nextRemark) {
    return {
      contact,
      handoverEvent: null,
      auditLog: null,
      people: getPeopleGraph(data),
    };
  }

  const reason = String(body?.reason || `${actor.name} 更新 ${contact.company} 一级对接人`);
  const handoverEvent = {
    id: nextHandoverId(data),
    contactId: contact.id,
    beforeContact,
    afterContact: nextContact,
    beforeStatus,
    afterStatus: nextStatus,
    reason,
    actor: actor.name,
    timestamp: new Date().toISOString(),
  };

  contact.contact = nextContact;
  contact.status = nextStatus;
  contact.remark = nextRemark;
  contact.updatedAt = handoverEvent.timestamp;
  data.operatingSystem.handoverEvents = [handoverEvent, ...(data.operatingSystem.handoverEvents ?? [])];

  const auditLog = addAudit(data, actor, 'people.primary_contact.update', 'primary_contact', contact.id, beforeStatus, nextStatus, reason);
  return {
    contact,
    handoverEvent,
    auditLog,
    people: getPeopleGraph(data),
  };
}

function nextHandoverId(data) {
  const events = data.operatingSystem?.handoverEvents ?? [];
  const next = events
    .map((event) => Number(String(event.id).replace(/^HOV-/, '')))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 0) + 1;
  return `HOV-${String(next).padStart(3, '0')}`;
}
