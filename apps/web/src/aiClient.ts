export type AiInsightItem = { text: string; sourceRefs?: string[] }
export type AiSourceRef = { id: string; label: string; recordCount?: number }
export type AiSettings = { apiKey: string; model: string; baseUrl: string }
export type AiSectionContext = Record<string, unknown> & {
  label?: string
  companyName?: string
}
export type AiInsights = {
  generatedAt?: string
  provider?: { status: string; model?: string; reason?: string; error?: string }
  cache?: { status: 'hit' | 'saved' | 'not_saved'; key?: string; updatedAt?: string; updatedBy?: string; reason?: string }
  section?: { key: string; title: string; prompt: string; contextLabel?: string }
  summary: string
  advice: AiInsightItem[]
  warnings: AiInsightItem[]
  next: AiInsightItem[]
  decisionPackage?: string
  sourceRefs?: AiSourceRef[]
}
export type AiConnectionTestResult = {
  ok: boolean
  checkedAt?: string
  latencyMs?: number
  provider?: { status: string; model?: string; baseUrl?: string }
  httpStatus?: number
  message?: string
  sample?: string
  error?: { code?: string; message?: string; type?: string }
}

export type AiSectionKey =
  | 'overview-kpis'
  | 'pyramid'
  | 'branch-detail'
  | 'contacts'
  | 'brand'
  | 'tasks'
  | 'risk'
  | 'supply'
  | 'tax'
  | 'daily'
  | 'decision'
  | 'subcompany-metrics'
  | 'subcompany-rank'
  | 'subcompany-company'

export const DEFAULT_ARK_BASE_URL = 'https://ark.cn-beijing.volces.com/api/coding/v3'
export const DEFAULT_ARK_MODEL = 'ark-code-latest'
export const AI_SETTINGS_STORAGE_KEY = 'huage:ark-ai-settings:v1'

let cachedAuthToken = ''
let pendingAuthToken: Promise<string> | null = null

export const SECTION_AI_PRESETS: Record<AiSectionKey, { title: string; prompt: string; source: string }> = {
  'overview-kpis': {
    title: '核心指标诊断',
    prompt: '分析集团 KPI、目标完成率、缺口、现金流和一级风险，输出今天最该盯的三件事。',
    source: '集团 KPI / 子公司已发布数据',
  },
  pyramid: {
    title: '目标拆解诊断',
    prompt: '检查战略目标到分支、模块、负责人、周动作是否能闭环，指出断点和补齐动作。',
    source: '目标金字塔 / 经营 OS 分支',
  },
  'branch-detail': {
    title: '分支目标诊断',
    prompt: '围绕当前分支目标，检查动作、负责人、验证节奏和上报口径是否完整。',
    source: '分支目标 / 负责人目录',
  },
  contacts: {
    title: '一级对接人诊断',
    prompt: '检查公司、品牌、模块是否都有唯一一级对接人，识别汇报链和责任口径风险。',
    source: '一级对接人总表',
  },
  brand: {
    title: '品牌经营诊断',
    prompt: '按品牌完成度、低完成度品牌、渠道和利润动作，输出经营纠偏建议。',
    source: '品牌经营台账',
  },
  tasks: {
    title: '任务推进诊断',
    prompt: '分析本周任务优先级、逾期/未完事项和一级负责人承接，输出周会追踪重点。',
    source: '经营 OS 任务台账',
  },
  risk: {
    title: '风险分流诊断',
    prompt: '区分李锦宁可协调事项和必须上报华哥拍板事项，输出决策包入口。',
    source: '风险 / 决策事项',
  },
  supply: {
    title: '供应链成本诊断',
    prompt: '按产品成本、物流成本、规格和成本预警，找出降本优先级和待补数据。',
    source: '供应链成本台账',
  },
  tax: {
    title: '财税合规诊断',
    prompt: '检查供应链公司、运营公司、开票流、资金合同流的合规关注点，只给经营检查建议。',
    source: '财税合规卡片',
  },
  daily: {
    title: '每日工作诊断',
    prompt: '分析每日目标、动作验证周期、填报完整度和未验证事项，输出今天的跟进清单。',
    source: '任务日历 / 每日填报',
  },
  decision: {
    title: '决策包生成',
    prompt: '汇总经营建议、异常提醒和下周重点，生成可复制给华哥的决策包草案。',
    source: '全局经营快照',
  },
  'subcompany-metrics': {
    title: '子公司总指标诊断',
    prompt: '分析集团目标、已完成、预计完成率、风险完成率和达标日均需求，输出监管重点。',
    source: '子公司监管汇总指标',
  },
  'subcompany-rank': {
    title: '监管排行诊断',
    prompt: '按预计完成率、3天完成率、周完成率和月缺口，排序识别最该追问的子公司。',
    source: '子公司监管排行',
  },
  'subcompany-company': {
    title: '单家公司诊断',
    prompt: '围绕当前子公司，分析月目标、完成率、三天/周完成率、动作验证和补救建议。',
    source: '单家子公司经营卡片',
  },
}

export function defaultAiSettings(): AiSettings {
  return {
    apiKey: '',
    model: DEFAULT_ARK_MODEL,
    baseUrl: DEFAULT_ARK_BASE_URL,
  }
}

export function normalizeAiSettings(value: Partial<AiSettings>): AiSettings {
  const fallback = defaultAiSettings()
  return {
    apiKey: String(value.apiKey ?? '').trim(),
    model: String(value.model ?? fallback.model).trim() || fallback.model,
    baseUrl: String(value.baseUrl ?? fallback.baseUrl).trim().replace(/\/$/, '') || fallback.baseUrl,
  }
}

export function loadSavedAiSettings(): AiSettings {
  if (typeof window === 'undefined') return defaultAiSettings()
  try {
    const saved = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY)
    if (!saved) return defaultAiSettings()
    return normalizeAiSettings(JSON.parse(saved) as Partial<AiSettings>)
  } catch {
    return defaultAiSettings()
  }
}

export function saveAiSettings(settings: AiSettings) {
  window.localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

export function clearAiSettings() {
  window.localStorage.removeItem(AI_SETTINGS_STORAGE_KEY)
}

export function clearCachedAuthToken() {
  cachedAuthToken = ''
  pendingAuthToken = null
}

export async function loginForToken(apiBaseUrl: string, signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('The operation was aborted.', 'AbortError')
  if (cachedAuthToken) return cachedAuthToken
  if (pendingAuthToken) return pendingAuthToken

  pendingAuthToken = requestLoginToken(apiBaseUrl)
    .then((token) => {
      cachedAuthToken = token
      return token
    })
    .finally(() => {
      pendingAuthToken = null
    })

  return pendingAuthToken
}

async function requestLoginToken(apiBaseUrl: string) {
  const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'user-lijinning', password: '123456' }),
  })
  if (!loginResponse.ok) throw new Error(`登录后端失败：${loginResponse.status}`)
  const login = (await loginResponse.json()) as { token?: string }
  if (!login.token) throw new Error('后端没有返回登录 token')
  return login.token
}

export async function loadAiInsights(
  apiBaseUrl: string,
  aiSettings: AiSettings,
  signal: AbortSignal,
  request: { section?: AiSectionKey; context?: AiSectionContext; refresh?: boolean } = {},
): Promise<AiInsights> {
  const settings = normalizeAiSettings(aiSettings)
  const body = JSON.stringify({
    refresh: request.refresh === true,
    section: request.section,
    context: request.context,
    aiSettings: settings.apiKey ? settings : { model: settings.model, baseUrl: settings.baseUrl },
  })
  const response = await fetchWithAuthRetry(apiBaseUrl, '/ai/insights', signal, { method: 'POST', body })
  if (!response.ok) throw new Error(`读取 Ark Coding Plan 分析失败：${response.status}`)
  return (await response.json()) as AiInsights
}

export async function loadCachedAiInsights(
  apiBaseUrl: string,
  signal: AbortSignal,
  request: { section?: AiSectionKey; context?: AiSectionContext } = {},
): Promise<AiInsights | null> {
  const response = await fetchWithAuthRetry(apiBaseUrl, '/ai/insights', signal, {
    method: 'POST',
    body: JSON.stringify({
      refresh: false,
      section: request.section,
      context: request.context,
    }),
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`读取已保存 AI 分析失败：${response.status}`)
  return (await response.json()) as AiInsights
}

export async function testAiConnection(
  apiBaseUrl: string,
  aiSettings: AiSettings,
  signal: AbortSignal,
): Promise<AiConnectionTestResult> {
  const settings = normalizeAiSettings(aiSettings)
  const response = await fetchWithAuthRetry(apiBaseUrl, '/ai/test-connection', signal, {
    method: 'POST',
    body: JSON.stringify({ aiSettings: settings }),
  })
  const result = (await response.json().catch(() => ({}))) as AiConnectionTestResult
  if (!response.ok) {
    return {
      ok: false,
      httpStatus: response.status,
      error: {
        code: String(result.error?.code ?? 'test_endpoint_failed'),
        message: String(result.error?.message ?? `测试连接接口失败：${response.status}`),
      },
    }
  }
  return result
}

export async function fetchWithAuthRetry(apiBaseUrl: string, path: string, signal: AbortSignal, init: RequestInit = {}) {
  let token = await loginForToken(apiBaseUrl, signal)
  let response = await fetchWithToken(apiBaseUrl, path, token, signal, init)
  if (response.status !== 401) return response

  clearCachedAuthToken()
  token = await loginForToken(apiBaseUrl, signal)
  response = await fetchWithToken(apiBaseUrl, path, token, signal, init)
  return response
}

function fetchWithToken(apiBaseUrl: string, path: string, token: string, signal: AbortSignal, init: RequestInit) {
  const headers = new Headers(init.headers)
  headers.set('Content-Type', headers.get('Content-Type') || 'application/json')
  headers.set('Authorization', `Bearer ${token}`)
  return fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
    signal,
  })
}
