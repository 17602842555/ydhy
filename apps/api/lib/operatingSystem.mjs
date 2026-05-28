import { addAudit, fail, permissionsFor } from './domain.mjs';

const taskStatuses = ['待办', '进行中', '已完成'];

export function getOperatingSystem(data) {
  const operatingSystem = data.operatingSystem ?? {};
  const tasks = Array.isArray(operatingSystem.tasks) ? operatingSystem.tasks : [];
  const risks = Array.isArray(operatingSystem.risks) ? operatingSystem.risks : [];
  const brands = Array.isArray(operatingSystem.brands) ? operatingSystem.brands : [];
  const costs = Array.isArray(operatingSystem.costs) ? operatingSystem.costs : [];
  const moduleHealth = Array.isArray(operatingSystem.moduleHealth) ? operatingSystem.moduleHealth : [];

  return {
    period: data.period,
    organization: data.organization,
    kpis: operatingSystem.kpis ?? [],
    moduleHealth,
    goalPyramid: operatingSystem.goalPyramid ?? [],
    goalBranches: operatingSystem.goalBranches ?? [],
    ownerDirectory: operatingSystem.ownerDirectory ?? {},
    contacts: operatingSystem.contacts ?? [],
    brands,
    tasks,
    risks,
    costs,
    taxCards: operatingSystem.taxCards ?? [],
    decisionRules: operatingSystem.decisionRules ?? [],
    summaries: {
      openTasks: tasks.filter((task) => task.status !== '已完成').length,
      highPriorityTasks: tasks.filter((task) => task.priority === '高' && task.status !== '已完成').length,
      decisionRisks: risks.filter((risk) => risk.type === 'decision').length,
      weakBrands: brands.filter((brand) => Number(brand.completion) < 70).length,
      costWatchItems: costs.filter((item) => ['watch', 'risk', 'critical'].includes(item.status)).length,
      modulesAtRisk: moduleHealth.filter((module) => ['watch', 'risk', 'critical'].includes(module.status)).length,
    },
  };
}

export function updateOperatingTask(data, taskId, body, actor) {
  const permissions = permissionsFor(data, actor.role);
  if (!permissions.has('workflow.manage') && !permissions.has('task.update')) {
    fail(403, 'forbidden', `${actor.role} cannot update operating tasks`);
  }

  const tasks = data.operatingSystem?.tasks;
  if (!Array.isArray(tasks)) fail(404, 'not_found', 'operating task registry is not configured');
  const task = tasks.find((entry) => entry.id === taskId);
  if (!task) fail(404, 'not_found', `operating task ${taskId} was not found`);

  const nextStatus = String(body?.status ?? '');
  if (!taskStatuses.includes(nextStatus)) {
    fail(400, 'invalid_task_status', `status must be one of ${taskStatuses.join(', ')}`);
  }
  if (task.status === nextStatus) {
    return {
      task,
      auditLog: null,
      operatingSystem: getOperatingSystem(data),
    };
  }

  const before = task.status;
  task.status = nextStatus;
  task.updatedAt = new Date().toISOString();
  const auditLog = addAudit(
    data,
    actor,
    'operating_task.update',
    'operating_task',
    task.id,
    before,
    nextStatus,
    String(body?.reason || `${actor.name} 更新 ${task.name} 状态`),
  );

  return {
    task,
    auditLog,
    operatingSystem: getOperatingSystem(data),
  };
}
