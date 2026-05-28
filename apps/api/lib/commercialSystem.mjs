import { addAudit, fail, permissionsFor } from './domain.mjs';

const workOrderStatuses = ['待办', '进行中', '阻塞', '已完成'];

export function getCommercialSystem(data) {
  const system = data.commercialSystem ?? {};
  const readiness = Array.isArray(system.readiness) ? system.readiness : [];
  const systemModules = Array.isArray(system.systemModules) ? system.systemModules : [];
  const approvalFlows = Array.isArray(system.approvalFlows) ? system.approvalFlows : [];
  const workOrders = Array.isArray(system.workOrders) ? system.workOrders : [];
  const integrations = Array.isArray(system.integrations) ? system.integrations : [];
  const reportPacks = Array.isArray(system.reportPacks) ? system.reportPacks : [];
  const desktopClients = Array.isArray(system.desktopClients) ? system.desktopClients : [];
  const systemSettings = Array.isArray(system.systemSettings) ? system.systemSettings : [];

  return {
    period: data.period,
    organization: data.organization,
    readiness,
    systemModules,
    masterData: system.masterData ?? emptyMasterData(),
    approvalFlows,
    workOrders,
    integrations,
    reportPacks,
    desktopClients,
    systemSettings,
    summaries: {
      readinessScore: readiness.length
        ? Math.round(readiness.reduce((sum, item) => sum + Number(item.completion || 0), 0) / readiness.length)
        : 0,
      implementedModules: systemModules.filter((item) => ['active', 'healthy'].includes(item.status)).length,
      plannedModules: systemModules.filter((item) => ['planned', 'scaffold', 'manual_export'].includes(item.status)).length,
      pendingApprovals: approvalFlows.filter((item) => !['approved', 'rejected', 'archived'].includes(item.state)).length,
      openWorkOrders: workOrders.filter((item) => item.status !== '已完成').length,
      manualIntegrations: integrations.filter((item) => item.status === 'manual_export').length,
      softwareTargets: desktopClients.length,
    },
  };
}

export function updateCommercialWorkOrder(data, workOrderId, body, actor) {
  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('system.manage') && !permissions.has('workflow.manage') && !permissions.has('task.update')) {
    fail(403, 'forbidden', `${actor.role} cannot update commercial system work orders`);
  }

  const workOrders = data.commercialSystem?.workOrders;
  if (!Array.isArray(workOrders)) fail(404, 'not_found', 'commercial system work order registry is not configured');
  const workOrder = workOrders.find((entry) => entry.id === workOrderId);
  if (!workOrder) fail(404, 'not_found', `work order ${workOrderId} was not found`);

  const nextStatus = String(body?.status ?? '');
  if (!workOrderStatuses.includes(nextStatus)) {
    fail(400, 'invalid_work_order_status', `status must be one of ${workOrderStatuses.join(', ')}`);
  }
  if (workOrder.status === nextStatus) {
    return {
      workOrder,
      auditLog: null,
      commercialSystem: getCommercialSystem(data),
    };
  }

  const before = workOrder.status;
  workOrder.status = nextStatus;
  workOrder.updatedAt = new Date().toISOString();
  const auditLog = addAudit(
    data,
    actor,
    'commercial_work_order.update',
    'commercial_work_order',
    workOrder.id,
    before,
    nextStatus,
    String(body?.reason || `${actor.name} 更新 ${workOrder.title} 状态`),
  );

  return {
    workOrder,
    auditLog,
    commercialSystem: getCommercialSystem(data),
  };
}

function emptyMasterData() {
  return {
    legalEntities: [],
    brands: [],
    channels: [],
    products: [],
    suppliers: [],
    warehouses: [],
  };
}
