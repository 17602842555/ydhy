// Shared API route table for both runtime entrypoints.
//
// apps/api/server.mjs (Node http) and apps/api/worker.mjs (Cloudflare Worker)
// used to carry two near-identical copies of the same ~44 routes. The only
// genuine differences between them are runtime concerns, not business logic:
//   - sync JSON store vs async D1 store        -> handlers always `await`
//   - res mutation vs returning a Response      -> handlers return {status, body}
//   - actor / AI config / capability wiring     -> injected through `ctx`
//
// Each entrypoint builds a `ctx`, keeps only its truly runtime-specific routes
// (OPTIONS, /api/health shape, the binary source-file download), and delegates
// everything else here through `handleApiRoute`.
import { getAiInsights, getCachedAiInsights, isPersistableAiInsights, saveAiInsightCache, testAiConnection } from './aiInsights.mjs';
import { listLoginUsers, login, logout } from './auth.mjs';
import { getCommercialSystem, updateCommercialWorkOrder } from './commercialSystem.mjs';
import { canReadSubsidiary, permissionsFor, requirePermission } from './domain.mjs';
import {
  calculateDashboard,
  createImportBatch,
  getImportBatchDetail,
  publishImportBatch,
  revalidateImportBatch,
  validateImportRows,
} from './imports.mjs';
import { getOperatingSystem, updateOperatingTask } from './operatingSystem.mjs';
import { getPeopleGraph, updatePrimaryContact } from './people.mjs';
import { updateRiskItem } from './risks.mjs';
import {
  addTaskCalendarUnit,
  clearTaskCalendarFutureTargets,
  clearTaskCalendarMonthData,
  deleteTaskCalendarActionPlan,
  getTaskCalendar,
  syncTaskCalendarFromSeed,
  upsertTaskCalendarActionPlan,
  upsertTaskCalendarDailyTarget,
  upsertTaskCalendarMetric,
  upsertTaskCalendarMonthlyReport,
  upsertTaskCalendarMonthlyTarget,
  upsertTaskCalendarWeeklyReport,
} from './taskCalendar.mjs';
import {
  addVillaExpense,
  addVillaIssue,
  addVillaPhase,
  deleteVillaExpense,
  getVillaProject,
  syncVillaProjectFromSeed,
  updateVillaBudget,
  updateVillaExpense,
  updateVillaIssue,
  updateVillaPhase,
} from './villaProject.mjs';
import { updateWorkflowState, workflowConfigs } from './workflows.mjs';

function shouldRefreshAiInsights(method, body = {}) {
  return method === 'POST' && body.refresh === true;
}

// Re-read the store after a mutation and attach the recalculated dashboard,
// matching the legacy `{ ...result, dashboard }` envelope used by both files.
async function withDashboard(ctx, result, status = 200) {
  return { status, body: { ...result, dashboard: calculateDashboard(await ctx.store.read()) } };
}

const routes = [
  { method: 'GET', path: '/api/auth/users', handler: async (ctx) => ({ status: 200, body: { users: listLoginUsers(await ctx.store.read()) } }) },
  { method: 'POST', path: '/api/auth/login', handler: async (ctx) => ({ status: 201, body: await ctx.store.transaction((data) => login(data, ctx.body)) }) },
  {
    method: 'GET',
    path: '/api/auth/me',
    handler: async (ctx) => {
      const data = await ctx.store.read();
      const actor = ctx.readActor(data);
      return { status: 200, body: { actor, permissions: [...permissionsFor(data, actor.role)] } };
    },
  },
  { method: 'POST', path: '/api/auth/logout', handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => logout(data, ctx.nodeReq)) }) },

  { method: 'GET', path: '/api/dashboard', handler: async (ctx) => readWithPermission(ctx, 'dashboard.read', (data) => calculateDashboard(data)) },
  { method: 'GET', path: '/api/operating-system', handler: async (ctx) => readWithPermission(ctx, 'dashboard.read', (data) => getOperatingSystem(data)) },
  { method: 'GET', path: '/api/people', handler: async (ctx) => readWithPermission(ctx, 'dashboard.read', (data) => getPeopleGraph(data)) },
  { method: 'GET', path: '/api/commercial-system', handler: async (ctx) => readWithPermission(ctx, 'dashboard.read', (data) => getCommercialSystem(data)) },

  {
    method: ['GET', 'POST'],
    path: '/api/ai/insights',
    handler: async (ctx) => {
      const data = await ctx.store.read();
      const actor = ctx.readActor(data);
      const config = ctx.makeAiConfig(ctx.body);
      if (!shouldRefreshAiInsights(ctx.method, ctx.body)) {
        const cached = getCachedAiInsights(data, actor, config);
        if (!cached) return { status: 404, body: { error: 'ai_insight_cache_miss', reason: 'no saved AI analysis for this section/context' } };
        return { status: 200, body: cached };
      }
      const result = await getAiInsights(data, actor, config);
      if (!isPersistableAiInsights(result)) {
        return { status: 200, body: { ...result, cache: { status: 'not_saved', reason: 'only_successful_ark_results_are_saved' } } };
      }
      const saved = await ctx.store.transaction((latest) => saveAiInsightCache(latest, actor, config, result));
      return { status: 200, body: saved };
    },
  },
  {
    method: 'POST',
    path: '/api/ai/test-connection',
    handler: async (ctx) => {
      const data = await ctx.store.read();
      const actor = ctx.readActor(data);
      requirePermission(data, actor, 'dashboard.read');
      return { status: 200, body: await testAiConnection(ctx.makeAiConfig(ctx.body)) };
    },
  },

  {
    method: 'GET',
    path: '/api/task-calendar',
    handler: async (ctx) => {
      const data = await ctx.store.read();
      return { status: 200, body: getTaskCalendar(data, ctx.readActor(data), { month: ctx.searchParams.get('month') }) };
    },
  },
  {
    method: 'GET',
    path: '/api/task-calendar/supervision',
    handler: async (ctx) => {
      const data = await ctx.store.read();
      return { status: 200, body: getTaskCalendar(data, ctx.readActor(data), { month: ctx.searchParams.get('month') }).supervisionDashboard };
    },
  },
  {
    method: 'GET',
    path: '/api/villa-project',
    handler: async (ctx) => {
      const data = await ctx.store.read();
      return { status: 200, body: getVillaProject(data, ctx.readActor(data)) };
    },
  },

  { method: 'PATCH', pattern: /^\/api\/people\/contacts\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => updatePrimaryContact(data, ctx.params[0], ctx.body, ctx.readActor(data))) }) },
  { method: 'PATCH', pattern: /^\/api\/operating-system\/tasks\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => updateOperatingTask(data, ctx.params[0], ctx.body, ctx.readActor(data))) }) },
  { method: 'PATCH', pattern: /^\/api\/risks\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => updateRiskItem(data, ctx.params[0], ctx.body, ctx.readActor(data))) }) },
  { method: 'PATCH', pattern: /^\/api\/commercial-system\/work-orders\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => updateCommercialWorkOrder(data, ctx.params[0], ctx.body, ctx.readActor(data))) }) },

  { method: 'POST', path: '/api/task-calendar/units', handler: async (ctx) => ({ status: 201, body: await ctx.store.transaction((data) => addTaskCalendarUnit(data, ctx.body, ctx.readActor(data))) }) },
  { method: 'POST', path: '/api/task-calendar/metrics', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => upsertTaskCalendarMetric(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/monthly-targets', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => upsertTaskCalendarMonthlyTarget(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/daily-targets', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => upsertTaskCalendarDailyTarget(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/action-plans', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => upsertTaskCalendarActionPlan(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/action-plans/delete', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => deleteTaskCalendarActionPlan(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/weekly-reports', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => upsertTaskCalendarWeeklyReport(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/monthly-reports', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => upsertTaskCalendarMonthlyReport(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/future-targets/clear', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => clearTaskCalendarFutureTargets(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/month-data/clear', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => clearTaskCalendarMonthData(data, ctx.body, ctx.readActor(data)))) },
  { method: 'POST', path: '/api/task-calendar/sync-source', handler: async (ctx) => withDashboard(ctx, await ctx.store.transaction((data) => syncTaskCalendarFromSeed(data, ctx.seed, ctx.readActor(data)))) },

  { method: 'POST', path: '/api/villa-project/phases', handler: async (ctx) => ({ status: 201, body: await ctx.store.transaction((data) => addVillaPhase(data, ctx.body, ctx.readActor(data))) }) },
  { method: 'PATCH', pattern: /^\/api\/villa-project\/phases\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => updateVillaPhase(data, ctx.params[0], ctx.body, ctx.readActor(data))) }) },
  { method: 'POST', path: '/api/villa-project/issues', handler: async (ctx) => ({ status: 201, body: await ctx.store.transaction((data) => addVillaIssue(data, ctx.body, ctx.readActor(data))) }) },
  { method: 'PATCH', pattern: /^\/api\/villa-project\/issues\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => updateVillaIssue(data, ctx.params[0], ctx.body, ctx.readActor(data))) }) },
  { method: 'POST', path: '/api/villa-project/expenses', handler: async (ctx) => ({ status: 201, body: await ctx.store.transaction((data) => addVillaExpense(data, ctx.body, ctx.readActor(data))) }) },
  { method: 'PATCH', pattern: /^\/api\/villa-project\/expenses\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => updateVillaExpense(data, ctx.params[0], ctx.body, ctx.readActor(data))) }) },
  { method: 'DELETE', pattern: /^\/api\/villa-project\/expenses\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => deleteVillaExpense(data, ctx.params[0], ctx.readActor(data))) }) },
  { method: 'PATCH', pattern: /^\/api\/villa-project\/budgets\/([^/]+)$/, handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => updateVillaBudget(data, decodeURIComponent(ctx.params[0]), ctx.body, ctx.readActor(data))) }) },
  { method: 'POST', path: '/api/villa-project/sync-source', handler: async (ctx) => ({ status: 200, body: await ctx.store.transaction((data) => syncVillaProjectFromSeed(data, ctx.seed, ctx.readActor(data))) }) },

  {
    method: 'POST',
    path: '/api/imports/validate-preview',
    handler: async (ctx) => {
      const data = await ctx.store.read();
      const actor = ctx.readActor(data);
      requirePermission(data, actor, 'import.validate');
      const rows = Array.isArray(ctx.body.rows) ? ctx.body.rows : [];
      const { issues } = validateImportRows(data, rows);
      return {
        status: 200,
        body: {
          state: issues.some((issue) => issue.severity === 'error') ? 'raw' : 'validated',
          rowCount: rows.length,
          issues,
        },
      };
    },
  },
  {
    method: 'POST',
    path: '/api/imports',
    handler: async (ctx) => ({
      status: 201,
      body: await ctx.store.transaction((data) =>
        createImportBatch(data, ctx.body, ctx.readActor(data), {
          sourceFileStore: ctx.capabilities.sourceFileStore,
          maxSourceFileBytes: ctx.capabilities.maxSourceFileBytes,
        }),
      ),
    }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/imports\/([^/]+)\/(validate|publish)$/,
    handler: async (ctx) => {
      const [batchId, action] = ctx.params;
      const result = await ctx.store.transaction((data) =>
        action === 'validate'
          ? revalidateImportBatch(data, batchId, ctx.readActor(data))
          : publishImportBatch(data, batchId, ctx.readActor(data), ctx.body.reason),
      );
      return withDashboard(ctx, result);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/imports\/([^/]+)$/,
    handler: async (ctx) => {
      const data = await ctx.store.read();
      const actor = ctx.readActor(data);
      requirePermission(data, actor, 'source.read');
      return { status: 200, body: getImportBatchDetail(data, ctx.params[0]) };
    },
  },

  {
    method: 'PATCH',
    pattern: /^\/api\/subsidiaries\/([^/]+)\/workflows\/([^/]+)$/,
    handler: async (ctx) => {
      const [subsidiaryId, workflowType] = ctx.params;
      const result = await ctx.store.transaction((data) => updateWorkflowState(data, subsidiaryId, workflowType, ctx.body, ctx.readActor(data)));
      return withDashboard(ctx, result);
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/subsidiaries\/([^/]+)$/,
    handler: async (ctx) => {
      const data = await ctx.store.read();
      const actor = ctx.readActor(data);
      const item = data.subsidiaries.find((entry) => entry.id === ctx.params[0]);
      if (!item) return { status: 404, body: { error: 'not_found' } };
      if (!canReadSubsidiary(data, actor, item.id)) {
        return { status: 403, body: { error: 'forbidden', reason: 'role scope does not allow cross-subsidiary access' } };
      }
      const batch = data.importBatches.find((entry) => entry.id === item.sourceBatchId);
      const sourceRow = data.sourceRows.find((entry) => entry.batchId === item.sourceBatchId && entry.rowNumber === item.sourceRow);
      const workflowTargets = Object.keys(workflowConfigs).map((type) => `${item.id}:${type}`);
      return {
        status: 200,
        body: {
          subsidiary: item,
          source: batch,
          sourceRow,
          auditLogs: data.auditLogs.filter((entry) => entry.target === item.sourceBatchId || workflowTargets.includes(entry.target)),
        },
      };
    },
  },

  {
    method: 'POST',
    path: '/api/admin/reset',
    handler: async (ctx) => {
      if (ctx.capabilities.isProduction) return null; // fall through to 404 in production
      return { status: 200, body: { ok: true, dashboard: calculateDashboard(await ctx.store.resetFromSeed()) } };
    },
  },
];

async function readWithPermission(ctx, permission, project) {
  const data = await ctx.store.read();
  const actor = ctx.readActor(data);
  requirePermission(data, actor, permission);
  return { status: 200, body: project(data) };
}

// Returns { status, body } for the matched route, or null when no route
// matches (the caller renders a 404). A matched handler may also return null
// to fall through to a 404 (e.g. /api/admin/reset in production).
export async function handleApiRoute(ctx) {
  for (const route of routes) {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    if (!methods.includes(ctx.method)) continue;
    if (route.path) {
      if (route.path !== ctx.pathname) continue;
      return route.handler(ctx);
    }
    const match = ctx.pathname.match(route.pattern);
    if (!match) continue;
    ctx.params = match.slice(1);
    return route.handler(ctx);
  }
  return null;
}
