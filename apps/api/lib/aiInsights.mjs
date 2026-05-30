import { calculateDashboard } from './imports.mjs';
import { getCommercialSystem } from './commercialSystem.mjs';
import { requirePermission } from './domain.mjs';
import { getOperatingSystem } from './operatingSystem.mjs';
import { getTaskCalendar } from './taskCalendar.mjs';
import { getVillaProject } from './villaProject.mjs';

const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3';
const DEFAULT_ARK_MODEL = 'ark-code-latest';
const DEFAULT_ANALYSIS_TIMEOUT_MS = 75_000;
const DEFAULT_TEST_TIMEOUT_MS = 18_000;
const MAX_CONTEXT_CHARS = 6_000;

const SECTION_PRESETS = {
  'overview-kpis': {
    title: '核心指标诊断',
    sourceId: 'dashboard.subsidiaries',
    prompt: '分析集团 KPI、目标完成率、缺口、现金流和一级风险，输出今天最该盯的三件事。',
  },
  pyramid: {
    title: '目标拆解诊断',
    sourceId: 'operatingSystem.goalPyramid',
    prompt: '检查战略目标到分支、模块、负责人、周动作是否能闭环，指出断点和补齐动作。',
  },
  'branch-detail': {
    title: '分支目标诊断',
    sourceId: 'operatingSystem.goalBranches',
    prompt: '围绕当前分支目标，检查动作、负责人、验证节奏和上报口径是否完整。',
  },
  contacts: {
    title: '一级对接人诊断',
    sourceId: 'operatingSystem.contacts',
    prompt: '检查公司、品牌、模块是否都有唯一一级对接人，识别汇报链和责任口径风险。',
  },
  brand: {
    title: '品牌经营诊断',
    sourceId: 'operatingSystem.brands',
    prompt: '按品牌完成度、低完成度品牌、渠道和利润动作，输出经营纠偏建议。',
  },
  tasks: {
    title: '任务推进诊断',
    sourceId: 'operatingSystem.tasks',
    prompt: '分析本周任务优先级、逾期/未完事项和一级负责人承接，输出周会追踪重点。',
  },
  risk: {
    title: '风险分流诊断',
    sourceId: 'operatingSystem.risks',
    prompt: '区分李锦宁可协调事项和必须上报华哥拍板事项，输出决策包入口。',
  },
  supply: {
    title: '供应链成本诊断',
    sourceId: 'operatingSystem.costs',
    prompt: '按产品成本、物流成本、规格和成本预警，找出降本优先级和待补数据。',
  },
  tax: {
    title: '财税合规诊断',
    sourceId: 'operatingSystem.taxCards',
    prompt: '检查供应链公司、运营公司、开票流、资金合同流的合规关注点，只给经营检查建议。',
  },
  daily: {
    title: '每日工作诊断',
    sourceId: 'taskCalendar.supervision',
    prompt: '分析每日目标、动作验证周期、填报完整度和未验证事项，输出今天的跟进清单。',
  },
  decision: {
    title: '决策包生成',
    sourceId: 'dashboard.subsidiaries',
    prompt: '汇总经营建议、异常提醒和下周重点，生成可复制给华哥的决策包草案。',
  },
  'subcompany-metrics': {
    title: '子公司总指标诊断',
    sourceId: 'taskCalendar.supervision',
    prompt: '分析集团目标、已完成、预计完成率、风险完成率和达标日均需求，输出监管重点。',
  },
  'subcompany-rank': {
    title: '监管排行诊断',
    sourceId: 'taskCalendar.supervision',
    prompt: '按预计完成率、3天完成率、周完成率和月缺口，排序识别最该追问的子公司。',
  },
  'subcompany-company': {
    title: '单家公司诊断',
    sourceId: 'taskCalendar.supervision',
    prompt: '围绕当前子公司，分析月目标、完成率、三天/周完成率、动作验证和补救建议。',
  },
};

export async function getAiInsights(data, actor, options = {}) {
  requirePermission(data, actor, 'dashboard.read');
  const snapshot = buildAnalysisSnapshot(data, actor);
  const section = resolveSectionPreset(options.section);
  const sectionContext = normalizeSectionContext(options.context);
  const fallback = buildRuleBasedInsights(snapshot, {
    status: options.apiKey ? 'fallback' : 'not_configured',
    model: options.model || DEFAULT_ARK_MODEL,
    reason: options.apiKey ? 'ark_unavailable' : 'missing_ark_api_key',
  }, section, sectionContext);

  if (!options.apiKey) return fallback;

  try {
    const generated = await requestArkJson(snapshot, { ...options, section, sectionContext });
    return normalizeAiInsights(generated, snapshot, {
      status: 'ark',
      model: options.model || DEFAULT_ARK_MODEL,
      reason: '',
    }, section, sectionContext);
  } catch (error) {
    return {
      ...fallback,
      provider: {
        ...fallback.provider,
        status: 'fallback',
        reason: 'ark_request_failed',
        error: safeErrorMessage(error),
      },
    };
  }
}

export function getCachedAiInsights(data, actor, options = {}) {
  requirePermission(data, actor, 'dashboard.read');
  const section = resolveSectionPreset(options.section);
  const sectionContext = normalizeSectionContext(options.context);
  const key = aiInsightCacheKey(data, section, sectionContext);
  const record = (data.aiInsightCache ?? []).find((entry) => entry.key === key || entry.id === key);
  if (!record?.insights) return null;
  return withCacheMeta(record.insights, {
    status: 'hit',
    key,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  });
}

export function saveAiInsightCache(data, actor, options = {}, insights) {
  const section = resolveSectionPreset(options.section);
  const sectionContext = normalizeSectionContext(options.context);
  const key = aiInsightCacheKey(data, section, sectionContext);
  const updatedAt = new Date().toISOString();
  const updatedBy = actor?.name || 'system';
  const record = {
    id: key,
    key,
    section: section.key,
    title: section.title,
    contextLabel: sectionMeta(section, sectionContext).contextLabel,
    companyName: sectionContext?.companyName || '',
    period: data.period,
    updatedAt,
    updatedBy,
    provider: insights?.provider ?? null,
    insights: stripCacheMeta(insights),
  };
  const rest = (data.aiInsightCache ?? []).filter((entry) => entry.key !== key && entry.id !== key);
  data.aiInsightCache = [record, ...rest].slice(0, 120);
  return withCacheMeta(record.insights, {
    status: 'saved',
    key,
    updatedAt,
    updatedBy,
  });
}

export function isPersistableAiInsights(insights) {
  return insights?.provider?.status === 'ark';
}

export async function testAiConnection(options = {}) {
  const apiKey = String(options.apiKey || '').trim();
  const baseUrl = String(options.baseUrl || options.endpoint || DEFAULT_ARK_BASE_URL).replace(/\/$/, '');
  const model = options.model || DEFAULT_ARK_MODEL;
  const timeoutMs = Number(options.timeoutMs || DEFAULT_TEST_TIMEOUT_MS);
  const checkedAt = new Date().toISOString();
  const startedAt = Date.now();

  if (!apiKey) {
    return {
      ok: false,
      checkedAt,
      latencyMs: 0,
      provider: { status: 'missing_key', model, baseUrl },
      error: {
        code: 'missing_ark_api_key',
        message: '请先填写 Ark API Key。',
      },
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const payload = {
    model,
    messages: [
      { role: 'system', content: '你是连接测试探针。' },
      { role: 'user', content: '请只回复“连接正常”。' },
    ],
    temperature: 0,
    max_tokens: 300,
  };

  try {
    const { response, body } = await postArkChatCompletion(baseUrl, apiKey, payload, controller.signal);
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return {
        ok: false,
        checkedAt,
        latencyMs,
        provider: { status: 'ark_error', model, baseUrl },
        httpStatus: response.status,
        error: arkErrorFromBody(body, response.status),
      };
    }
    const text = extractOpenAiContent(body);
    if (!text) {
      return {
        ok: false,
        checkedAt,
        latencyMs,
        provider: { status: 'invalid_response', model, baseUrl },
        httpStatus: response.status,
        error: {
          code: 'empty_ark_response',
          message: 'Ark 返回成功状态，但没有返回可读取的 message.content。',
        },
      };
    }
    return {
      ok: true,
      checkedAt,
      latencyMs,
      provider: { status: 'ark', model, baseUrl },
      message: 'Ark 连接成功。',
      sample: cleanText(text).slice(0, 80),
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      latencyMs: Date.now() - startedAt,
      provider: { status: 'request_failed', model, baseUrl },
      error: {
        code: error?.name === 'AbortError' ? 'ark_request_timeout' : 'ark_request_failed',
        message: safeErrorMessage(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function buildAnalysisSnapshot(data, actor) {
  const dashboard = calculateDashboard(data);
  const operatingSystem = getOperatingSystem(data);
  const commercialSystem = getCommercialSystem(data);
  const taskCalendar = tryRead(() => getTaskCalendar(data, actor, { month: data.period }));
  const villaProject = tryRead(() => getVillaProject(data, actor));
  const publishedSubsidiaries = dashboard.subsidiaries.filter((item) => item.dataState === 'published');

  return {
    generatedAt: new Date().toISOString(),
    period: data.period,
    organization: data.organization,
    sourceRefs: [
      { id: 'dashboard.subsidiaries', label: '子公司监管已发布数据', recordCount: publishedSubsidiaries.length },
      { id: 'operatingSystem.goalPyramid', label: '目标金字塔拆解', recordCount: operatingSystem.goalPyramid?.length ?? 0 },
      { id: 'operatingSystem.goalBranches', label: '分支目标与动作清单', recordCount: operatingSystem.goalBranches?.length ?? 0 },
      { id: 'operatingSystem.contacts', label: '一级对接人总表', recordCount: operatingSystem.contacts?.length ?? 0 },
      { id: 'operatingSystem.brands', label: '品牌经营进度', recordCount: operatingSystem.brands?.length ?? 0 },
      { id: 'operatingSystem.tasks', label: '经营 OS 任务台账', recordCount: operatingSystem.tasks?.length ?? 0 },
      { id: 'operatingSystem.risks', label: '经营 OS 风险/决策事项', recordCount: operatingSystem.risks?.length ?? 0 },
      { id: 'operatingSystem.costs', label: '供应链成本台账', recordCount: operatingSystem.costs?.length ?? 0 },
      { id: 'operatingSystem.taxCards', label: '财税合规卡片', recordCount: operatingSystem.taxCards?.length ?? 0 },
      { id: 'taskCalendar.supervision', label: '任务日历子公司经营填报', recordCount: taskCalendar?.summaries?.length ?? 0 },
      { id: 'commercialSystem.workOrders', label: '商业系统建设工单', recordCount: commercialSystem.workOrders?.length ?? 0 },
      { id: 'villaProject.summary', label: '别墅专项项目进度与预算', recordCount: villaProject?.phases?.length ?? 0 },
    ],
    dashboard: {
      kpis: dashboard.kpis,
      lifecycle: dashboard.lifecycle,
      importBatches: dashboard.importBatches.slice(0, 8).map((batch) => ({
        id: batch.id,
        fileName: batch.fileName,
        source: batch.source,
        state: batch.state,
        rowCount: batch.rowCount,
        errorCount: batch.errorCount,
        uploadedAt: batch.uploadedAt,
      })),
      subsidiaries: publishedSubsidiaries.map((item) => ({
        id: item.id,
        name: item.name,
        owner: item.owner,
        target: numberOrNull(item.target),
        actual: numberOrNull(item.actual),
        forecastRate: numberOrNull(item.forecastRate),
        threeDayRate: numberOrNull(item.threeDayRate),
        weekRate: numberOrNull(item.weekRate),
        riskLevel: item.riskLevel,
        hevState: item.hevState,
        taskState: item.taskState,
        riskState: item.riskState,
        decisionState: item.decisionState,
        sourceBatchId: item.sourceBatchId,
        sourceRow: item.sourceRow,
        summary: item.summary,
      })),
    },
    operatingSystem: {
      summaries: operatingSystem.summaries,
      kpis: operatingSystem.kpis,
      goalPyramid: operatingSystem.goalPyramid,
      goalBranches: operatingSystem.goalBranches,
      contacts: operatingSystem.contacts,
      moduleHealth: (operatingSystem.moduleHealth ?? []).map((item) => pickFields(item, ['module', 'name', 'status', 'score', 'completion', 'owner', 'summary'])),
      brands: (operatingSystem.brands ?? []).map((item) => pickFields(item, ['id', 'name', 'company', 'completion', 'owner', 'status'])),
      tasks: (operatingSystem.tasks ?? []).map((item) => pickFields(item, ['id', 'name', 'module', 'owner', 'due', 'dueLabel', 'priority', 'status'])),
      risks: (operatingSystem.risks ?? []).map((item) => pickFields(item, ['id', 'type', 'level', 'text', 'owner', 'status'])),
      costs: (operatingSystem.costs ?? []).map((item) => pickFields(item, ['id', 'brand', 'product', 'logistics', 'total', 'spec', 'status'])),
      taxCards: (operatingSystem.taxCards ?? []).map((item) => pickFields(item, ['id', 'title', 'desc', 'description', 'status'])),
    },
    taskCalendar: taskCalendar ? {
      period: taskCalendar.period,
      companies: taskCalendar.companies,
      summaries: taskCalendar.summaries.map((item) => pickFields(item, [
        'company',
        'targetWan',
        'actualWan',
        'completionRate',
        'forecastRate',
        'threeDayRate',
        'weekRate',
        'gapWan',
        'dailyNeedWan',
        'status',
        'rowCount',
        'latestDate',
        'summary',
      ])),
      actionPlans: taskCalendar.actionPlans.slice(0, 20).map((item) => pickFields(item, [
        'id',
        'company',
        'date',
        'action',
        'expectedGmvGrowthRate',
        'validationDays',
        'periodEndDate',
        'expectation',
        'owner',
      ])),
      monthlyTargets: taskCalendar.monthlyTargets.map((item) => pickFields(item, ['company', 'month', 'monthlyTarget', 'dailyTarget', 'updatedBy', 'updatedAt'])),
    } : null,
    commercialSystem: {
      summaries: commercialSystem.summaries,
      readiness: (commercialSystem.readiness ?? []).map((item) => pickFields(item, ['name', 'label', 'completion', 'status', 'owner'])),
      systemModules: (commercialSystem.systemModules ?? []).map((item) => pickFields(item, ['id', 'name', 'status', 'owner', 'phase', 'summary'])),
      workOrders: (commercialSystem.workOrders ?? []).map((item) => pickFields(item, ['id', 'title', 'module', 'owner', 'priority', 'status', 'due'])),
      integrations: (commercialSystem.integrations ?? []).map((item) => pickFields(item, ['id', 'name', 'type', 'status', 'owner', 'cadence'])),
    },
    villaProject: villaProject ? {
      title: villaProject.title,
      summary: villaProject.summary,
      activePhases: villaProject.phases.filter((item) => item.status !== '已完成').slice(0, 12).map((item) => pickFields(item, ['id', 'name', 'zone', 'owner', 'end', 'progress', 'status'])),
      openIssues: villaProject.issues.filter((item) => item.status !== '已关闭').map((item) => pickFields(item, ['id', 'title', 'zone', 'owner', 'due', 'severity', 'status'])),
      budgets: villaProject.budgets.map((item) => pickFields(item, ['category', 'budget', 'spent', 'remaining', 'rate'])),
    } : null,
  };
}

function buildRuleBasedInsights(snapshot, provider, section = resolveSectionPreset(), sectionContext = null) {
  const subsidiaries = snapshot.dashboard.subsidiaries ?? [];
  const weakSubsidiaries = subsidiaries
    .map((item) => ({
      ...item,
      completion: item.target > 0 ? (item.actual / item.target) * 100 : null,
      gap: Math.max(0, Number(item.target || 0) - Number(item.actual || 0)),
    }))
    .filter((item) => item.completion === null || item.completion < 80 || ['risk', 'critical'].includes(item.riskLevel))
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0))
    .slice(0, 4);
  const highTasks = (snapshot.operatingSystem.tasks ?? [])
    .filter((item) => item.priority === '高' && item.status !== '已完成')
    .slice(0, 4);
  const decisionRisks = (snapshot.operatingSystem.risks ?? [])
    .filter((item) => item.type === 'decision' || ['高', 'critical'].includes(String(item.level || '')))
    .slice(0, 4);
  const openWorkOrders = (snapshot.commercialSystem.workOrders ?? [])
    .filter((item) => item.status !== '已完成')
    .slice(0, 4);
  const openVillaIssues = snapshot.villaProject?.openIssues ?? [];

  const generic = {
    generatedAt: snapshot.generatedAt,
    provider,
    section: sectionMeta(section, sectionContext),
    summary: `【${section.title}】已汇总 ${subsidiaries.length} 家已发布子公司、${snapshot.operatingSystem.tasks?.length ?? 0} 条经营任务、${snapshot.operatingSystem.risks?.length ?? 0} 条风险/决策事项。${provider.status === 'not_configured' ? '当前未配置 Ark Coding Plan API key，显示本地规则分析。' : 'Ark Coding Plan 暂不可用，显示本地规则分析。'}`,
    advice: [
      item(
        weakSubsidiaries.length
          ? `先处理 ${weakSubsidiaries.map((entry) => entry.name).join('、')} 的经营缺口，按目标、实际、预计完成率拆到负责人。`
          : '已发布子公司暂无明显低完成度项，继续维持日填报和周复盘节奏。',
        ['dashboard.subsidiaries', 'taskCalendar.supervision'],
      ),
      item(
        highTasks.length
          ? `高优先级未完任务仍有 ${highTasks.length} 条，周会先看 ${highTasks.map((entry) => entry.name).join('、')}。`
          : '高优先级任务已闭环，下一步转向低完成度品牌和跨模块风险。',
        ['operatingSystem.tasks'],
      ),
      item(
        openWorkOrders.length
          ? `商业系统建设还有 ${openWorkOrders.length} 条开放工单，应先排接口、权限和报表自动化。`
          : '商业系统工单暂无明显阻塞，保持现有上线节奏。',
        ['commercialSystem.workOrders'],
      ),
    ],
    warnings: [
      ...weakSubsidiaries.slice(0, 3).map((entry) =>
        item(`${entry.name} 月缺口约 ${formatWan(entry.gap)}万，风险等级 ${entry.riskLevel || '待定'}，需要补动作和验证周期。`, ['dashboard.subsidiaries', 'taskCalendar.supervision']),
      ),
      ...decisionRisks.slice(0, 2).map((entry) =>
        item(`${entry.text || entry.id} 需要形成书面决策包，避免口头上报。`, ['operatingSystem.risks']),
      ),
      ...(openVillaIssues.length ? [item(`别墅专项仍有 ${openVillaIssues.length} 个未关闭整改问题，预算/工期复盘要进入专项看板。`, ['villaProject.summary'])] : []),
    ].slice(0, 4),
    next: [
      item('今天先刷新子公司月目标、月完成、预计完成率，未发布数据不进入 AI 判断。', ['dashboard.subsidiaries']),
      item('将低完成度公司逐一补齐“动作、预期涨幅、验证天数、负责人”。', ['taskCalendar.supervision']),
      item('把需要华哥拍板的风险合并成一份决策包，附来源批次、负责人和预计影响。', ['operatingSystem.risks', 'dashboard.subsidiaries']),
    ],
    decisionPackage: buildDecisionPackageText(weakSubsidiaries, highTasks, decisionRisks, openWorkOrders),
    sourceRefs: snapshot.sourceRefs,
  };
  return applySectionFallback(generic, snapshot, section, sectionContext);
}

function applySectionFallback(generic, snapshot, section, sectionContext) {
  const label = sectionContext?.label || sectionContext?.companyName || section.title;
  const sourceId = section.sourceId || 'dashboard.subsidiaries';
  const source = (text, refs = []) => item(text, [sourceId, ...refs]);
  const brands = snapshot.operatingSystem.brands ?? [];
  const lowBrands = brands.filter((brand) => Number(brand.completion) < 70);
  const highTasks = (snapshot.operatingSystem.tasks ?? []).filter((task) => task.priority === '高' && task.status !== '已完成');
  const localRisks = (snapshot.operatingSystem.risks ?? []).filter((risk) => risk.type === 'local');
  const decisionRisks = (snapshot.operatingSystem.risks ?? []).filter((risk) => risk.type === 'decision');
  const summaries = snapshot.taskCalendar?.summaries ?? [];
  const weakCompanies = summaries
    .filter((entry) => Number(entry.forecastRate ?? entry.completionRate ?? 0) < 80 || ['risk', 'bad'].includes(String(entry.status || '')))
    .slice(0, 4);

  if (section.key === 'overview-kpis') {
    return {
      ...generic,
      advice: [
        source(`先把 ${weakCompanies.map((entry) => entry.company).join('、') || '低完成率子公司'} 作为今日监管主线。`, ['taskCalendar.supervision']),
        source(`高优未完任务 ${highTasks.length} 条，先按负责人和截止日排周会追踪。`, ['operatingSystem.tasks']),
        source(`决策类风险 ${decisionRisks.length} 条，需要合并进华哥决策包。`, ['operatingSystem.risks']),
      ],
    };
  }

  if (section.key === 'pyramid' || section.key === 'branch-detail') {
    return {
      ...generic,
      summary: `【${section.title}】${label} 已按目标、动作、负责人维度检查，当前显示本地规则分析。`,
      advice: [
        source(`${label} 先检查每个目标是否都有负责人、验证周期和上报口径。`),
        source('动作项要从“要做什么”补到“谁负责、何时验收、用什么数据验证”。'),
        source('需华哥拍板的资源、预算、人事、法务问题，统一沉淀为决策包。', ['operatingSystem.risks']),
      ],
    };
  }

  if (section.key === 'contacts') {
    const contacts = snapshot.operatingSystem.contacts ?? [];
    const warningContacts = contacts.filter((entry) => entry.status !== '正常');
    return {
      ...generic,
      summary: `【一级对接人诊断】已检查 ${contacts.length} 条对接关系，${warningContacts.length} 条不是正常状态。`,
      warnings: [
        source(warningContacts.length ? `${warningContacts.map((entry) => entry.company).join('、')} 的对接状态需要确认。` : '一级对接人状态整体正常，继续保持单一口径。'),
        source('未确认唯一接口的公司，不应直接进入华哥决策沟通。'),
        source('对接人表需要同步替补人和直接汇报对象，避免周会无人承接。'),
      ],
    };
  }

  if (section.key === 'brand') {
    return {
      ...generic,
      summary: `【品牌经营诊断】已检查 ${brands.length} 个品牌，${lowBrands.length} 个品牌完成度低于 70%。`,
      advice: [
        source(lowBrands.length ? `${lowBrands.map((brand) => brand.name).join('、')} 先拆 GMV、毛利、渠道三个缺口。` : '品牌完成度暂无明显低于 70% 项，重点转向利润质量。'),
        source('每个品牌补齐单品净利模型：售价、佣金、广告、成本、物流、税费、退款损耗。', ['operatingSystem.costs']),
        source('低完成品牌必须提交本周动作和验证周期，不只提交原因说明。', ['taskCalendar.supervision']),
      ],
    };
  }

  if (section.key === 'tasks') {
    return {
      ...generic,
      summary: `【任务推进诊断】高优未完 ${highTasks.length} 条，所有任务必须归口一级负责人。`,
      next: [
        source(highTasks.length ? `周会先追 ${highTasks.map((task) => task.name).join('、')}。` : '高优任务暂无未完项，可复盘中优任务和风险动作。'),
        source('每条任务补齐负责人、截止日、验收标准和阻塞原因。'),
        source('已完成任务要回填结果数据，避免只改状态不沉淀证据。'),
      ],
    };
  }

  if (section.key === 'risk') {
    return {
      ...generic,
      summary: `【风险分流诊断】李锦宁协调类 ${localRisks.length} 条，需华哥拍板 ${decisionRisks.length} 条。`,
      warnings: [
        source(localRisks.length ? `协调类先处理：${localRisks.slice(0, 3).map((risk) => risk.text).join('；')}。` : '暂无协调类风险。'),
        source(decisionRisks.length ? `决策类必须成包：${decisionRisks.slice(0, 3).map((risk) => risk.text).join('；')}。` : '暂无必须上报的决策类风险。'),
        source('风险不要混在任务列表里，必须绑定影响、选项、负责人和截止日。'),
      ],
    };
  }

  if (section.key === 'supply') {
    const costs = [...(snapshot.operatingSystem.costs ?? [])].sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
    return {
      ...generic,
      summary: `【供应链成本诊断】已检查 ${costs.length} 条成本记录，先看高总成本和物流占比。`,
      advice: [
        source(costs[0] ? `${costs[0].brand} 合计成本最高，先拆产品成本、物流成本和规格口径。` : '供应链成本数据待补齐。'),
        source('所有 SKU 需要补售价和净利口径，否则无法判断是否真正降本。'),
        source('库存损耗、滞销、退货损耗要和品牌经营动作一起复盘。', ['operatingSystem.brands']),
      ],
    };
  }

  if (section.key === 'tax') {
    return {
      ...generic,
      summary: '【财税合规诊断】仅做经营检查建议，不替代财务、税务或法务结论。',
      warnings: [
        source('供应链公司和运营公司要分开检查资金流、合同流、发票流。'),
        source('异常发票、返税、差额服务费等事项必须由财务负责人复核。'),
        source('重大税负优化方案需要形成书面测算和风险边界后再上报。'),
      ],
    };
  }

  if (section.key === 'daily') {
    return {
      ...generic,
      summary: `【每日工作诊断】已汇总 ${summaries.length} 家子公司月度填报和动作验证情况。`,
      next: [
        source(weakCompanies.length ? `今天先追 ${weakCompanies.map((entry) => entry.company).join('、')} 的动作验证。` : '今日暂无明显低完成率子公司，继续补齐动作验证数据。'),
        source('新增动作必须写预期涨幅和验证天数，避免只有动作没有复盘。'),
        source('每日目标、实际营业额、成本费用缺一项都不能进入最终判断。'),
      ],
    };
  }

  if (section.key === 'subcompany-metrics' || section.key === 'subcompany-rank') {
    return {
      ...generic,
      summary: `【${section.title}】已基于子公司监管数据检查完成率、周完成率和月缺口。`,
      warnings: [
        source(weakCompanies.length ? `${weakCompanies.map((entry) => entry.company).join('、')} 是当前监管优先级。` : '当前排行暂无明显低完成率项。'),
        source('0% 的 3天/周完成率要先判断是未填报、未发生，还是数据口径未同步。'),
        source('月缺口大的公司必须补“动作、预期、验证周期、负责人”。'),
      ],
    };
  }

  if (section.key === 'subcompany-company') {
    const companyName = sectionContext?.companyName || label;
    return {
      ...generic,
      summary: `【单家公司诊断】${companyName} 已按月目标、完成率、周完成率和动作验证检查。`,
      advice: [
        source(`${companyName} 先确认月目标、月完成、预计完成率是否来自已发布/已填报数据。`),
        source('如果 3天完成率或周完成率为 0%，先追数据填报和动作验证，不直接判断经营无效。'),
        source('补救动作要写清预计涨幅、验证天数和责任人，便于周会追责。'),
      ],
    };
  }

  return generic;
}

async function requestArkJson(snapshot, options) {
  const baseUrl = String(options.baseUrl || options.endpoint || DEFAULT_ARK_BASE_URL).replace(/\/$/, '');
  const model = options.model || DEFAULT_ARK_MODEL;
  const timeoutMs = Number(options.timeoutMs || DEFAULT_ANALYSIS_TIMEOUT_MS);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const payload = {
    model,
    messages: [
      { role: 'system', content: buildSystemInstruction() },
      { role: 'user', content: buildUserPrompt(snapshot, options.section, options.sectionContext) },
    ],
    temperature: 0.2,
    max_tokens: maxTokensForSection(options.section),
  };

  try {
    let { response, body } = await postArkChatCompletion(baseUrl, options.apiKey, payload, controller.signal);
    if (!response.ok && responseFormatMayBeUnsupported(body)) {
      const { response: retryResponse, body: retryBody } = await postArkChatCompletion(
        baseUrl,
        options.apiKey,
        withoutResponseFormat(payload),
        controller.signal,
      );
      response = retryResponse;
      body = retryBody;
    }
    if (!response.ok) {
      throw new Error(body?.error?.message || body?.message || `Ark request failed with ${response.status}`);
    }
    const text = extractOpenAiContent(body);
    if (!text) throw new Error('Ark response did not include content');
    return parseJsonText(text);
  } finally {
    clearTimeout(timeout);
  }
}

async function postArkChatCompletion(baseUrl, apiKey, payload, signal) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal,
  });
  const rawText = await response.text().catch(() => '');
  let body = {};
  try {
    body = rawText ? JSON.parse(rawText) : {};
  } catch {
    body = { _rawText: rawText.slice(0, 300) };
  }
  return { response, body };
}

function responseFormatMayBeUnsupported(body) {
  const message = String(body?.error?.message || body?.message || '').toLowerCase();
  return message.includes('response_format') || message.includes('response format') || message.includes('json_object');
}

function withoutResponseFormat(payload) {
  const next = { ...payload };
  delete next.response_format;
  return next;
}

function buildSystemInstruction() {
  return [
    '你是华哥集团经营 OS 的数据分析员，只能基于用户提供的 JSON 快照分析。',
    '不要编造数据，不要替代最终决策，不要给财税法务结论，只输出经营预警、动作建议和决策包草案。',
    '每条建议必须引用 sourceRefs 里的来源 id。输出必须是合法 JSON 对象，不要 Markdown，不要代码块，不要解释 JSON 之外的内容。',
  ].join('\n');
}

function buildUserPrompt(snapshot, section = resolveSectionPreset(), sectionContext = null) {
  const scopedSnapshot = buildScopedPromptSnapshot(snapshot, section, sectionContext);
  return JSON.stringify({
    task: '按指定板块分析集团经营看板，输出结构化中文洞察。',
    section: sectionMeta(section, sectionContext),
    sectionContext: promptSectionContext(sectionContext),
    schema: {
      summary: '不超过120字',
      advice: [{ text: '当前板块经营建议，50字内', sourceRefs: [section.sourceId] }],
      warnings: [{ text: '当前板块异常提醒，50字内', sourceRefs: [section.sourceId] }],
      next: [{ text: '当前板块下步动作，50字内', sourceRefs: [section.sourceId] }],
      decisionPackage: '可复制给华哥的简短决策包草案，分一二三四段',
    },
    constraints: [
      'advice、warnings、next 各输出 3 条。',
      `本次只分析“${section.title}”板块，预设提示词：${section.prompt}`,
      '优先使用 sectionContext 与 snapshot 中当前板块相关数据，不要扩展分析未提供的全局明细。',
      '所有金额单位沿用输入中的万元口径。',
      '如果数据缺失，请明确写“待补数据”，不要猜。',
      '必须返回可被 JSON.parse 直接解析的 JSON；字符串内如需换行请使用 \\n。',
    ],
    snapshot: scopedSnapshot,
  });
}

function maxTokensForSection(section) {
  if (section?.key === 'decision') return 5200;
  if (section?.key === 'branch-detail') return 4200;
  return 3600;
}

function buildScopedPromptSnapshot(snapshot, section, sectionContext) {
  const companyName = contextCompanyName(sectionContext);
  const base = basePromptSnapshot(snapshot);

  if (section.key === 'overview-kpis') {
    return {
      ...base,
      dashboard: compactDashboard(snapshot, { limit: 12 }),
      taskCalendar: compactTaskCalendar(snapshot.taskCalendar, { summaryLimit: 12, actionLimit: 8 }),
      operatingSystem: {
        kpis: snapshot.operatingSystem.kpis,
        moduleHealth: compactModuleHealth(snapshot.operatingSystem.moduleHealth),
        tasks: compactTasks(snapshot.operatingSystem.tasks, 10),
        risks: compactRisks(snapshot.operatingSystem.risks, 10),
      },
    };
  }

  if (section.key === 'pyramid') {
    return {
      ...base,
      operatingSystem: {
        summaries: snapshot.operatingSystem.summaries,
        goalPyramid: snapshot.operatingSystem.goalPyramid,
        goalBranches: compactGoalBranches(snapshot.operatingSystem.goalBranches, sectionContext?.label),
        moduleHealth: compactModuleHealth(snapshot.operatingSystem.moduleHealth),
        tasks: compactTasks(snapshot.operatingSystem.tasks, 8),
        risks: compactRisks(snapshot.operatingSystem.risks, 8),
      },
    };
  }

  if (section.key === 'branch-detail') {
    return {
      ...base,
      operatingSystem: {
        goalBranches: compactGoalBranches(snapshot.operatingSystem.goalBranches, sectionContext?.label),
        contacts: compactContacts(snapshot.operatingSystem.contacts, 12),
        tasks: compactTasks(snapshot.operatingSystem.tasks, 12),
        risks: compactRisks(snapshot.operatingSystem.risks, 10),
      },
    };
  }

  if (section.key === 'contacts') {
    return {
      ...base,
      operatingSystem: {
        contacts: compactContacts(snapshot.operatingSystem.contacts, 40),
        tasks: compactTasks(snapshot.operatingSystem.tasks, 8),
        risks: compactRisks(snapshot.operatingSystem.risks, 8),
      },
    };
  }

  if (section.key === 'brand') {
    return {
      ...base,
      operatingSystem: {
        brands: compactBrands(snapshot.operatingSystem.brands, 20),
        costs: compactCosts(snapshot.operatingSystem.costs, 12),
        tasks: compactTasks(snapshot.operatingSystem.tasks, 10),
      },
      taskCalendar: compactTaskCalendar(snapshot.taskCalendar, { summaryLimit: 10, actionLimit: 8 }),
    };
  }

  if (section.key === 'tasks') {
    return {
      ...base,
      operatingSystem: {
        tasks: compactTasks(snapshot.operatingSystem.tasks, 30),
        risks: compactRisks(snapshot.operatingSystem.risks, 10),
        contacts: compactContacts(snapshot.operatingSystem.contacts, 12),
      },
      taskCalendar: compactTaskCalendar(snapshot.taskCalendar, { summaryLimit: 8, actionLimit: 12 }),
    };
  }

  if (section.key === 'risk') {
    return {
      ...base,
      dashboard: { subsidiaries: compactSubsidiaries(prioritizedSubsidiaries(snapshot.dashboard.subsidiaries, '', 8)) },
      operatingSystem: {
        risks: compactRisks(snapshot.operatingSystem.risks, 30),
        tasks: compactTasks(snapshot.operatingSystem.tasks, 10),
      },
      commercialSystem: compactCommercialSystem(snapshot.commercialSystem, 8),
      villaProject: compactVillaProject(snapshot.villaProject, 8),
    };
  }

  if (section.key === 'supply') {
    return {
      ...base,
      operatingSystem: {
        costs: compactCosts(snapshot.operatingSystem.costs, 30),
        brands: compactBrands(snapshot.operatingSystem.brands, 12),
        risks: compactRisks(snapshot.operatingSystem.risks, 8),
      },
    };
  }

  if (section.key === 'tax') {
    return {
      ...base,
      operatingSystem: {
        taxCards: compactTaxCards(snapshot.operatingSystem.taxCards, 20),
        risks: compactRisks(snapshot.operatingSystem.risks, 10),
        costs: compactCosts(snapshot.operatingSystem.costs, 10),
      },
    };
  }

  if (section.key === 'daily') {
    return {
      ...base,
      taskCalendar: compactTaskCalendar(snapshot.taskCalendar, { summaryLimit: 12, actionLimit: 20 }),
      operatingSystem: {
        tasks: compactTasks(snapshot.operatingSystem.tasks, 14),
        risks: compactRisks(snapshot.operatingSystem.risks, 8),
      },
    };
  }

  if (section.key === 'subcompany-metrics' || section.key === 'subcompany-rank') {
    return {
      ...base,
      dashboard: compactDashboard(snapshot, { limit: 14 }),
      taskCalendar: compactTaskCalendar(snapshot.taskCalendar, { summaryLimit: 14, actionLimit: 8, includeCompanies: true }),
    };
  }

  if (section.key === 'subcompany-company') {
    return {
      ...base,
      dashboard: compactDashboard(snapshot, { companyName, limit: 4 }),
      taskCalendar: compactTaskCalendar(snapshot.taskCalendar, { companyName, summaryLimit: 4, actionLimit: 12, includeMonthlyTargets: true }),
      operatingSystem: {
        contacts: compactContactsForCompany(snapshot.operatingSystem.contacts, companyName),
        tasks: compactTasksForCompany(snapshot.operatingSystem.tasks, companyName),
        risks: compactRisks(snapshot.operatingSystem.risks, 8),
      },
    };
  }

  return {
    ...base,
    dashboard: compactDashboard(snapshot, { limit: 10 }),
    taskCalendar: compactTaskCalendar(snapshot.taskCalendar, { summaryLimit: 12, actionLimit: 12 }),
    operatingSystem: {
      moduleHealth: compactModuleHealth(snapshot.operatingSystem.moduleHealth),
      brands: compactBrands(snapshot.operatingSystem.brands, 10),
      tasks: compactTasks(snapshot.operatingSystem.tasks, 12),
      risks: compactRisks(snapshot.operatingSystem.risks, 12),
      costs: compactCosts(snapshot.operatingSystem.costs, 8),
      taxCards: compactTaxCards(snapshot.operatingSystem.taxCards, 8),
    },
    commercialSystem: compactCommercialSystem(snapshot.commercialSystem, 10),
    villaProject: compactVillaProject(snapshot.villaProject, 10),
  };
}

function basePromptSnapshot(snapshot) {
  return {
    generatedAt: snapshot.generatedAt,
    period: snapshot.period,
    organization: snapshot.organization,
    sourceRefs: snapshot.sourceRefs,
  };
}

function compactDashboard(snapshot, options = {}) {
  return {
    kpis: snapshot.dashboard.kpis,
    lifecycle: snapshot.dashboard.lifecycle,
    subsidiaries: compactSubsidiaries(prioritizedSubsidiaries(snapshot.dashboard.subsidiaries, options.companyName, options.limit ?? 10)),
  };
}

function compactTaskCalendar(taskCalendar, options = {}) {
  if (!taskCalendar) return null;
  const summaries = prioritizedCompanyRows(taskCalendar.summaries ?? [], options.companyName, options.summaryLimit ?? 10);
  const actionPlans = prioritizedCompanyRows(taskCalendar.actionPlans ?? [], options.companyName, options.actionLimit ?? 10);
  const monthlyTargets = options.includeMonthlyTargets
    ? prioritizedCompanyRows(taskCalendar.monthlyTargets ?? [], options.companyName, 6)
    : [];
  return {
    period: taskCalendar.period,
    companies: options.includeCompanies ? taskCalendar.companies : undefined,
    summaries: summaries.map((item) => pickFields(item, [
      'company',
      'targetWan',
      'actualWan',
      'completionRate',
      'forecastRate',
      'threeDayRate',
      'weekRate',
      'gapWan',
      'dailyNeedWan',
      'status',
      'rowCount',
      'latestDate',
      'summary',
    ])),
    actionPlans: actionPlans.map((item) => pickFields(item, [
      'id',
      'company',
      'date',
      'action',
      'expectedGmvGrowthRate',
      'validationDays',
      'periodEndDate',
      'expectation',
      'owner',
    ])),
    monthlyTargets: monthlyTargets.map((item) => pickFields(item, ['company', 'month', 'monthlyTarget', 'dailyTarget', 'updatedBy', 'updatedAt'])),
  };
}

function compactSubsidiaries(items) {
  return (items ?? []).map((item) => pickFields(item, [
    'id',
    'name',
    'owner',
    'target',
    'actual',
    'forecastRate',
    'threeDayRate',
    'weekRate',
    'riskLevel',
    'hevState',
    'taskState',
    'riskState',
    'decisionState',
    'summary',
  ]));
}

function compactGoalBranches(branches = [], label = '') {
  const normalizedLabel = cleanText(label);
  const matches = normalizedLabel
    ? branches.filter((branch) => textMatches(branch.name, normalizedLabel) || textMatches(branch.summary, normalizedLabel) || textMatches(branch.id, normalizedLabel))
    : [];
  const selected = (matches.length ? matches : branches).slice(0, normalizedLabel ? 2 : 5);
  return selected.map((branch) => ({
    id: branch.id,
    code: branch.code,
    name: branch.name,
    owner: branch.owner,
    status: branch.status,
    summary: branch.summary,
    goals: branch.goals,
    objectives: (branch.objectives ?? []).slice(0, normalizedLabel ? 6 : 3).map((objective) => ({
      code: objective.code,
      group: objective.group,
      title: objective.title,
      metric: objective.metric,
      owner: objective.owner,
      children: objective.children,
      actions: (objective.actions ?? []).map((group) =>
        (group ?? []).slice(0, 4).map((entry) => ({
          action: truncateText(entry.action, 90),
          owner: truncateText(entry.owner, 60),
          ownerDetail: truncateText(entry.ownerDetail, 120),
        })),
      ),
    })),
  }));
}

function compactContacts(items = [], limit = 20) {
  return items.slice(0, limit).map((item) => pickFields(item, ['module', 'company', 'contact', 'reportsTo', 'status', 'remark']));
}

function compactContactsForCompany(items = [], companyName = '') {
  const selected = companyName ? items.filter((item) => textMatches(item.company, companyName) || textMatches(item.module, companyName)) : items;
  return compactContacts(selected.length ? selected : items, 8);
}

function compactBrands(items = [], limit = 12) {
  return [...items]
    .sort((a, b) => Number(a.completion ?? 999) - Number(b.completion ?? 999))
    .slice(0, limit)
    .map((item) => pickFields(item, ['id', 'name', 'company', 'completion', 'owner', 'status']));
}

function compactTasks(items = [], limit = 12) {
  return [...items]
    .sort((a, b) => taskPriorityScore(b) - taskPriorityScore(a))
    .slice(0, limit)
    .map((item) => pickFields(item, ['id', 'name', 'module', 'owner', 'due', 'dueLabel', 'priority', 'status']));
}

function compactTasksForCompany(items = [], companyName = '') {
  const selected = companyName
    ? items.filter((item) => textMatches(item.name, companyName) || textMatches(item.module, companyName) || textMatches(item.owner, companyName))
    : items;
  return compactTasks(selected.length ? selected : items, 10);
}

function compactRisks(items = [], limit = 12) {
  return [...items]
    .sort((a, b) => riskPriorityScore(b) - riskPriorityScore(a))
    .slice(0, limit)
    .map((item) => pickFields(item, ['id', 'type', 'level', 'text', 'owner', 'status']));
}

function compactCosts(items = [], limit = 12) {
  return [...items]
    .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
    .slice(0, limit)
    .map((item) => pickFields(item, ['id', 'brand', 'product', 'logistics', 'total', 'spec', 'status']));
}

function compactTaxCards(items = [], limit = 12) {
  return items.slice(0, limit).map((item) => pickFields(item, ['id', 'title', 'desc', 'description', 'status']));
}

function compactModuleHealth(items = []) {
  return items.map((item) => pickFields(item, ['module', 'name', 'status', 'score', 'completion', 'owner', 'summary']));
}

function compactCommercialSystem(commercialSystem, limit = 10) {
  if (!commercialSystem) return null;
  return {
    summaries: commercialSystem.summaries,
    readiness: (commercialSystem.readiness ?? []).map((item) => pickFields(item, ['name', 'label', 'completion', 'status', 'owner'])),
    systemModules: (commercialSystem.systemModules ?? []).slice(0, limit).map((item) => pickFields(item, ['id', 'name', 'status', 'owner', 'phase', 'summary'])),
    workOrders: compactWorkOrders(commercialSystem.workOrders, limit),
  };
}

function compactWorkOrders(items = [], limit = 10) {
  return [...items]
    .sort((a, b) => taskPriorityScore(b) - taskPriorityScore(a))
    .slice(0, limit)
    .map((item) => pickFields(item, ['id', 'title', 'module', 'owner', 'priority', 'status', 'due']));
}

function compactVillaProject(villaProject, limit = 10) {
  if (!villaProject) return null;
  return {
    title: villaProject.title,
    summary: villaProject.summary,
    activePhases: (villaProject.activePhases ?? []).slice(0, limit),
    openIssues: (villaProject.openIssues ?? []).slice(0, limit),
    budgets: (villaProject.budgets ?? []).slice(0, 8),
  };
}

function prioritizedSubsidiaries(items = [], companyName = '', limit = 10) {
  if (companyName) {
    const selected = items.filter((item) => textMatches(item.name, companyName));
    if (selected.length) return selected.slice(0, limit);
  }
  return [...items].sort((a, b) => subsidiaryPriorityScore(b) - subsidiaryPriorityScore(a)).slice(0, limit);
}

function prioritizedCompanyRows(items = [], companyName = '', limit = 10) {
  if (companyName) {
    const selected = items.filter((item) => textMatches(item.company, companyName) || textMatches(item.name, companyName));
    if (selected.length) return selected.slice(0, limit);
  }
  return [...items].sort((a, b) => companyRowPriorityScore(b) - companyRowPriorityScore(a)).slice(0, limit);
}

function subsidiaryPriorityScore(item) {
  const riskScore = riskLevelScore(item.riskLevel) * 1000;
  const gapScore = Math.max(0, Number(item.target || 0) - Number(item.actual || 0));
  const ratePenalty = Math.max(0, 100 - Number(item.forecastRate ?? item.weekRate ?? 100)) * 5;
  return riskScore + gapScore + ratePenalty;
}

function companyRowPriorityScore(item) {
  const statusScore = ['risk', 'bad', 'zero'].includes(String(item.status || '').toLowerCase()) ? 1000 : 0;
  const gapScore = Number(item.gapWan || 0);
  const ratePenalty = Math.max(0, 100 - Number(item.forecastRate ?? item.completionRate ?? 100)) * 5;
  return statusScore + gapScore + ratePenalty;
}

function taskPriorityScore(item) {
  const priority = item.priority === '高' ? 100 : item.priority === '中' ? 50 : 0;
  const open = item.status === '已完成' ? 0 : 30;
  return priority + open;
}

function riskPriorityScore(item) {
  const level = riskLevelScore(item.level) * 100;
  const decision = item.type === 'decision' ? 50 : 0;
  const open = item.status === '已关闭' || item.status === '已完成' ? 0 : 20;
  return level + decision + open;
}

function riskLevelScore(value) {
  const normalized = String(value || '').toLowerCase();
  if (['critical', '高', 'risk'].includes(normalized)) return 3;
  if (['medium', '中', 'watch'].includes(normalized)) return 2;
  if (['low', '低'].includes(normalized)) return 1;
  return 0;
}

function contextCompanyName(sectionContext) {
  const value = sectionContext?.companyName || sectionContext?.label || sectionContext?.data?.companyName || '';
  return cleanText(value).replace(/经营卡片$/, '');
}

function textMatches(value, keyword) {
  const text = cleanText(value).toLowerCase();
  const query = cleanText(keyword).toLowerCase();
  return Boolean(text && query && (text === query || text.includes(query) || query.includes(text)));
}

function truncateText(value, limit = 120) {
  const text = cleanText(value);
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function promptSectionContext(sectionContext) {
  if (!sectionContext) return null;
  return {
    label: sectionContext.label,
    companyName: sectionContext.companyName,
    data: sectionContext.data,
    truncated: sectionContext.truncated,
  };
}

function normalizeAiInsights(payload, snapshot, provider, section = resolveSectionPreset(), sectionContext = null) {
  const fallback = buildRuleBasedInsights(snapshot, provider, section, sectionContext);
  return {
    generatedAt: snapshot.generatedAt,
    provider,
    section: sectionMeta(section, sectionContext),
    summary: cleanText(payload?.summary) || fallback.summary,
    advice: normalizeItems(payload?.advice, fallback.advice, snapshot),
    warnings: normalizeItems(payload?.warnings, fallback.warnings, snapshot),
    next: normalizeItems(payload?.next, fallback.next, snapshot),
    decisionPackage: cleanText(payload?.decisionPackage) || fallback.decisionPackage,
    sourceRefs: snapshot.sourceRefs,
  };
}

function normalizeItems(value, fallback, snapshot) {
  if (!Array.isArray(value) || value.length === 0) return fallback;
  const validRefs = new Set(snapshot.sourceRefs.map((ref) => ref.id));
  const items = value
    .map((entry) => {
      if (typeof entry === 'string') return item(entry, ['dashboard.subsidiaries']);
      return item(
        cleanText(entry?.text),
        Array.isArray(entry?.sourceRefs) ? entry.sourceRefs.filter((ref) => validRefs.has(ref)) : [],
      );
    })
    .filter((entry) => entry.text);
  return items.length ? items.slice(0, 4) : fallback;
}

function arkErrorFromBody(body, status) {
  const error = body?.error && typeof body.error === 'object' ? body.error : {};
  return {
    code: cleanText(error.code || body?.code || `ark_http_${status}`),
    message: cleanText(error.message || body?.message || body?._rawText || `Ark request failed with ${status}`),
    type: cleanText(error.type || body?.type),
  };
}

function resolveSectionPreset(sectionKey = 'decision') {
  const key = Object.prototype.hasOwnProperty.call(SECTION_PRESETS, sectionKey) ? sectionKey : 'decision';
  return { key, ...SECTION_PRESETS[key] };
}

function sectionMeta(section, sectionContext) {
  return {
    key: section.key,
    title: section.title,
    prompt: section.prompt,
    contextLabel: sectionContext?.label || sectionContext?.companyName || '',
  };
}

function aiInsightCacheKey(data, section, sectionContext) {
  const context = normalizeCacheKeyPart(sectionContext?.companyName || sectionContext?.label || 'global');
  return [normalizeCacheKeyPart(data.period || 'all'), section.key, context].join('::');
}

function normalizeCacheKeyPart(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}._-]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'global';
}

function normalizeSectionContext(value) {
  if (!value || typeof value !== 'object') return null;
  const label = cleanText(value.label || value.companyName);
  const data = compactContextValue(value);
  let rawJson = '';
  let truncated = false;
  try {
    const serialized = JSON.stringify(data);
    rawJson = serialized.length > MAX_CONTEXT_CHARS ? serialized.slice(0, MAX_CONTEXT_CHARS) : serialized;
    truncated = serialized.length > MAX_CONTEXT_CHARS;
  } catch {
    rawJson = '';
  }
  return {
    label,
    companyName: cleanText(value.companyName),
    data,
    rawJson,
    truncated,
  };
}

function compactContextValue(value, depth = 0) {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return truncateText(value, depth === 0 ? 240 : 160);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    const limit = depth === 0 ? 12 : 8;
    return value.slice(0, limit).map((item) => compactContextValue(item, depth + 1));
  }
  if (typeof value === 'object') {
    if (depth >= 4) return '[truncated]';
    const entries = Object.entries(value).slice(0, depth === 0 ? 24 : 16);
    return Object.fromEntries(entries.map(([key, item]) => [key, compactContextValue(item, depth + 1)]));
  }
  return cleanText(value);
}

function stripCacheMeta(insights) {
  if (!insights || typeof insights !== 'object') return insights;
  const result = { ...insights };
  delete result.cache;
  return result;
}

function withCacheMeta(insights, cache) {
  return {
    ...stripCacheMeta(insights),
    cache,
  };
}

function buildDecisionPackageText(weakSubsidiaries, highTasks, decisionRisks, openWorkOrders) {
  const risks = decisionRisks.map((entry) => `- ${entry.text || entry.id}`).join('\n') || '- 暂无高风险决策事项';
  const weak = weakSubsidiaries.map((entry) => `- ${entry.name}：缺口约 ${formatWan(entry.gap)}万`).join('\n') || '- 暂无明显低完成度子公司';
  const tasks = highTasks.map((entry) => `- ${entry.name}｜${entry.owner || '负责人待补'}｜${entry.dueLabel || entry.due || '截止日待补'}`).join('\n') || '- 暂无未完成高优任务';
  const workOrders = openWorkOrders.map((entry) => `- ${entry.title || entry.id}｜${entry.status || '待定'}`).join('\n') || '- 暂无开放系统工单';
  return `《华哥经营决策包草案》\n\n一、需拍板/关注事项\n${risks}\n\n二、经营缺口\n${weak}\n\n三、未完高优任务\n${tasks}\n\n四、系统建设阻塞\n${workOrders}`;
}

function parseJsonText(text) {
  const normalized = stripJsonFences(text);
  try {
    return JSON.parse(normalized);
  } catch {
    const match = normalized.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return coerceUnstructuredInsights(normalized);
      }
    }
    return coerceUnstructuredInsights(normalized);
  }
}

function stripJsonFences(text) {
  return String(text || '')
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function coerceUnstructuredInsights(text) {
  const cleaned = cleanText(text);
  if (!cleaned) throw new Error('Ark response was not valid JSON');
  const jsonTextItems = extractJsonTextItems(text);
  const sentences = cleaned
    .split(/(?:。|；|;|\n|\r)+/)
    .map((line) => cleanText(line.replace(/^[-*\d.、\s]+/, '')))
    .filter(Boolean);
  const summary = extractJsonStringField(text, 'summary') || sentences[0] || cleaned.slice(0, 120);
  const warningLines = sentences.filter((line) => /风险|异常|预警|缺口|低于|为0|0%/.test(line));
  const nextLines = sentences.filter((line) => /下一步|先|立即|补齐|确认|跟进|追/.test(line));
  const adviceLines = sentences.filter((line) => !warningLines.includes(line)).slice(0, 6);
  const adviceItems = jsonTextItems.slice(0, 3);
  const warningItems = jsonTextItems.slice(3, 6);
  const nextItems = jsonTextItems.slice(6, 9);
  return {
    summary: summary.slice(0, 160),
    advice: toInsightItems(adviceItems.length ? adviceItems : adviceLines.length ? adviceLines : sentences, 'dashboard.subsidiaries'),
    warnings: toInsightItems(warningItems.length ? warningItems : warningLines.length ? warningLines : sentences.slice(1), 'dashboard.subsidiaries'),
    next: toInsightItems(nextItems.length ? nextItems : nextLines.length ? nextLines : sentences.slice(2), 'dashboard.subsidiaries'),
    decisionPackage: (extractJsonStringField(text, 'decisionPackage') || cleaned).slice(0, 1800),
  };
}

function toInsightItems(lines, sourceId) {
  return lines.slice(0, 3).map((line) => ({ text: line.slice(0, 90), sourceRefs: [sourceId] }));
}

function extractJsonStringField(text, field) {
  const safeField = String(field).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = String(text || '').match(new RegExp(`"${safeField}"\\s*:\\s*"([^"]{1,1000})"`));
  return match ? cleanText(match[1].replace(/\\n/g, ' ')) : '';
}

function extractJsonTextItems(text) {
  return [...String(text || '').matchAll(/"text"\s*:\s*"([^"]{1,500})"/g)]
    .map((match) => cleanText(match[1].replace(/\\n/g, ' ')))
    .filter(Boolean);
}

function extractOpenAiContent(body) {
  const content = body?.choices?.[0]?.message?.content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      return part?.text || part?.content || '';
    }).join('').trim();
  }
  return String(content || '').trim();
}

function tryRead(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

function item(text, sourceRefs) {
  return {
    text: cleanText(text),
    sourceRefs: Array.isArray(sourceRefs) && sourceRefs.length ? sourceRefs : ['dashboard.subsidiaries'],
  };
}

function pickFields(source, fields) {
  return Object.fromEntries(fields.map((field) => [field, source?.[field]]).filter(([, value]) => value !== undefined));
}

function cleanText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatWan(value) {
  const number = Number(value || 0);
  if (Math.abs(number) >= 100) return number.toFixed(0);
  if (Math.abs(number) >= 10) return number.toFixed(1).replace(/\.0$/, '');
  return number.toFixed(1).replace(/\.0$/, '');
}

function safeErrorMessage(error) {
  if (error?.name === 'AbortError') return 'Ark request timed out';
  return String(error?.message || error || 'unknown_error').slice(0, 180);
}
