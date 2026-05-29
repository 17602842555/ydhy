import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react'
import { Building2, ChevronLeft, ChevronRight, ClipboardCheck, LogOut, Save, Target, Trash2 } from 'lucide-react'

type BusinessUnit = { id: string; company: string; type: 'store' | 'business'; name: string }
type BusinessMetric = {
  id: string
  company: string
  unitId: string
  unitName: string
  unitType: 'store' | 'business'
  date: string
  gmv?: number
  gsv?: number
  estimatedGsv?: number
  returnRate?: number
  promotionFee?: number
  impressions?: number
  revenue?: number
  costExpense?: number
  revenueAmount?: number
  income?: number
  note?: string
}
type MonthlyTarget = {
  id: string
  company: string
  month: string
  monthlyTarget: number
  allocationMode: 'daily' | 'none'
  dailyTarget: number
  updatedAt?: string
}
type CalendarEntry = {
  id: string
  company: string
  date: string
  task: string
  status?: string
  revenueTarget?: number
  revenueActual?: number
  progress?: number
  action?: string
  owner?: string
  risk?: string
  source?: string
  businessMetricId?: string
}
type DailyActionPlan = {
  id: string
  company: string
  date: string
  action: string
  expectedGmvGrowthRate: number
  validationDays?: number
  periodEndDate?: string
  expectation?: string
  owner?: string
  updatedAt?: string
}
type CompanySummary = {
  company: string
  targetWan: number
  actualWan: number
  completionRate: number | null
  forecastRate: number | null
  threeDayRate: number | null
  weekRate: number | null
  gapWan: number
  dailyNeedWan: number
  status: 'good' | 'watch' | 'risk' | 'pending'
  rowCount: number
  unitCount: number
  summary: string
}
type TaskCalendarData = {
  period: { month: string; generatedAt: string }
  companies: string[]
  units: BusinessUnit[]
  metrics: BusinessMetric[]
  entries: CalendarEntry[]
  actionPlans?: DailyActionPlan[]
  monthlyTargets: MonthlyTarget[]
  summaries: CompanySummary[]
}
type AuthUser = {
  id: string
  displayName: string
  roleCode: string
  roleName: string
  subsidiaryId?: string | null
  companyName?: string | null
}
type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: TaskCalendarData }
  | { status: 'error'; message: string }

const storeFields = [
  { key: 'gmv', label: 'GMV' },
  { key: 'gsv', label: 'GSV' },
  { key: 'returnRate', label: '退货率 %' },
  { key: 'promotionFee', label: '推广费' },
  { key: 'impressions', label: '曝光量' },
] as const
const businessFields = [
  { key: 'revenue', label: '营收' },
  { key: 'costExpense', label: '成本支出' },
] as const
const allFields = [...storeFields, ...businessFields] as const
const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const allCompaniesLabel = '全部子公司'
const actionCycleColors = ['#2bbfc7', '#4f8cff', '#d18424', '#15a779', '#d7536f', '#7c65d8']
const actionValidationDayOptions = [1, 3, 7]

type CalendarActionPeriod = {
  id: string
  company: string
  start: string
  end: string
  validationDays: number
  color: string
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function monthOf(date: string) {
  return date.slice(0, 7)
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-')
  return `${year}年${Number(monthNumber)}月`
}

function daysInMonth(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber, 0).getDate()
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(year, monthNumber - 1 + offset, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function shiftDate(date: string, offset: number) {
  const nextDate = new Date(`${date}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + offset)
  return dateKey(nextDate)
}

function daysBetween(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`).getTime()
  const end = new Date(`${endDate}T00:00:00`).getTime()
  return Math.round((end - start) / 86400000)
}

function datesInRange(startDate: string, endDate: string) {
  const dates: string[] = []
  let current = startDate
  while (current <= endDate) {
    dates.push(current)
    current = shiftDate(current, 1)
  }
  return dates
}

function actionPlanValidationDays(plan?: Pick<DailyActionPlan, 'validationDays'> | null) {
  const days = Math.trunc(Number(plan?.validationDays || 1))
  return Number.isFinite(days) && days > 0 ? days : 1
}

function actionPlanEndDate(plan: DailyActionPlan) {
  return plan.periodEndDate || shiftDate(plan.date, actionPlanValidationDays(plan) - 1)
}

function isDateInActionPlan(date: string, plan: DailyActionPlan) {
  return plan.date <= date && date <= actionPlanEndDate(plan)
}

function actionPeriodText(plan: DailyActionPlan) {
  const endDate = actionPlanEndDate(plan)
  return plan.date === endDate ? plan.date : `${plan.date} → ${endDate}`
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  const week = ['日', '一', '二', '三', '四', '五', '六'][parsed.getDay()]
  return `${parsed.getFullYear()}年${parsed.getMonth() + 1}月${parsed.getDate()}日周${week}`
}

function formatMoney(value?: number | null) {
  const number = Number(value || 0)
  if (Math.abs(number) >= 10000) return `${formatNumber(number / 10000)}万`
  return `¥${formatNumber(number)}`
}

function formatWan(value?: number | null) {
  if (!Number.isFinite(Number(value))) return '目标待定'
  return `${formatNumber(Number(value))}万`
}

function formatPercent(value?: number | null) {
  if (!Number.isFinite(Number(value))) return '0%'
  return `${formatNumber(Number(value))}%`
}

function formatNumber(value?: number | null) {
  const number = Number(value || 0)
  if (Math.abs(number) >= 100) return number.toFixed(0)
  if (Math.abs(number) >= 10) return number.toFixed(1).replace(/\.0$/, '')
  return number.toFixed(1).replace(/\.0$/, '')
}

function performanceTone(rate: number, target = 0, actual = 0) {
  if (target <= 0) return 'is-empty'
  if (actual <= 0) return 'is-idle'
  if (rate >= 100) return 'is-good'
  if (rate >= 80) return 'is-watch'
  return 'is-risk'
}

function performanceLabel(rate: number, target = 0, actual = 0) {
  if (target <= 0) return '未设置'
  if (actual <= 0) return '未填报'
  if (rate >= 100) return '已达成'
  if (rate >= 80) return '跟进中'
  return '需关注'
}

function actionValidationTone(complianceRate: number | null, actualGrowthRate: number | null) {
  if (!Number.isFinite(Number(complianceRate)) || !Number.isFinite(Number(actualGrowthRate))) return 'is-empty'
  if (Number(actualGrowthRate) <= 0 || Number(complianceRate) < 20) return 'is-risk'
  if (Number(complianceRate) < 60) return 'is-invalid'
  if (Number(complianceRate) < 90) return 'is-watch'
  return 'is-good'
}

function actionValidationLabel(complianceRate: number | null, actualGrowthRate: number | null) {
  if (!Number.isFinite(Number(complianceRate)) || !Number.isFinite(Number(actualGrowthRate))) return '待验证'
  if (Number(actualGrowthRate) <= 0 || Number(complianceRate) < 20) return '动作无效需要预警'
  if (Number(complianceRate) < 60) return '动作基本无效'
  if (Number(complianceRate) < 90) return '需要优化'
  return '动作有效'
}

function metricRevenue(metric: BusinessMetric) {
  if (Number.isFinite(Number(metric.revenueAmount))) return Number(metric.revenueAmount || 0)
  if (metric.unitType === 'business') return Number(metric.revenue || metric.income || 0)
  return Number(metric.gmv || 0)
}

function calendarDays(month: string) {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(year, monthNumber - 1, 1)
  const startOffset = (first.getDay() + 6) % 7
  const start = new Date(year, monthNumber - 1, 1 - startOffset)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return dateKey(date)
  })
}

function weekDays(selectedDate: string) {
  const current = new Date(`${selectedDate}T00:00:00`)
  const offset = (current.getDay() + 6) % 7
  const start = new Date(current)
  start.setDate(current.getDate() - offset)
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return dateKey(date)
  })
}

function shortDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`)
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`
}

function weekRangeLabel(dates: string[]) {
  const start = dates[0]
  const end = dates[dates.length - 1]
  if (!start || !end) return '周趋势'
  return `${shortDateLabel(start)} - ${shortDateLabel(end)} 周趋势`
}

function metricForm(metric?: BusinessMetric) {
  const nextForm: Record<string, string> = {}
  for (const field of allFields) {
    const value = metric ? (metric as unknown as Record<string, number | string | undefined>)[field.key] : undefined
    nextForm[field.key] = Number.isFinite(Number(value)) && Number(value) !== 0 ? String(value) : ''
  }
  nextForm.note = metric?.note ?? ''
  return nextForm
}

function accountCompany(user: AuthUser) {
  if (user.companyName) return user.companyName
  return user.displayName.replace(/填报账号|账号/g, '').trim()
}

function preferredCompanyFromHash() {
  const [, query = ''] = window.location.hash.split('?')
  return new URLSearchParams(query).get('company') || ''
}

async function login(apiBaseUrl: string, userId: string, password: string, signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, password }),
    signal,
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { reason?: string; error?: string }
    throw new Error(error.reason || error.error || `登录后端失败：${response.status}`)
  }
  const result = (await response.json()) as { token?: string; user?: AuthUser }
  if (!result.token || !result.user) throw new Error('后端没有返回登录会话')
  return { token: result.token, user: result.user }
}

async function fetchTaskCalendar(apiBaseUrl: string, sessionToken: string, month: string, signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/task-calendar?month=${month}`, {
    headers: { Authorization: `Bearer ${sessionToken}` },
    signal,
  })
  if (!response.ok) throw new Error(`读取填报数据失败：${response.status}`)
  return (await response.json()) as TaskCalendarData
}

async function fetchTaskCalendarWindow(apiBaseUrl: string, sessionToken: string, month: string, signal?: AbortSignal) {
  const [previous, current, next] = await Promise.all([
    fetchTaskCalendar(apiBaseUrl, sessionToken, shiftMonth(month, -1), signal),
    fetchTaskCalendar(apiBaseUrl, sessionToken, month, signal),
    fetchTaskCalendar(apiBaseUrl, sessionToken, shiftMonth(month, 1), signal),
  ])
  return mergeTaskCalendarWindow(current, [previous, next])
}

function mergeTaskCalendarWindow(current: TaskCalendarData, adjacent: TaskCalendarData[]): TaskCalendarData {
  return {
    ...current,
    companies: uniqueValues([current, ...adjacent].flatMap((data) => data.companies)),
    units: mergeById([current, ...adjacent].flatMap((data) => data.units)),
    metrics: mergeById([current, ...adjacent].flatMap((data) => data.metrics)),
    entries: mergeById([current, ...adjacent].flatMap((data) => data.entries)),
    actionPlans: mergeById([current, ...adjacent].flatMap((data) => data.actionPlans ?? [])),
    monthlyTargets: mergeById([current, ...adjacent].flatMap((data) => data.monthlyTargets)),
  }
}

function mergeById<T extends { id: string }>(items: T[]) {
  const map = new Map<string, T>()
  for (const item of items) map.set(item.id, item)
  return [...map.values()]
}

function uniqueValues(values: string[]) {
  return [...new Set(values)]
}

export function TaskCalendarEntryPage({
  apiBaseUrl,
  onBack,
  onSaved,
  standalone = false,
}: {
  apiBaseUrl: string
  onBack?: () => void
  onSaved?: () => void
  standalone?: boolean
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [loginUsers, setLoginUsers] = useState<AuthUser[]>([])
  const [loginUserId, setLoginUserId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginBusy, setLoginBusy] = useState(false)
  const [activeUser, setActiveUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(monthOf(today()))
  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedCompany, setSelectedCompany] = useState('')
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'year' | 'business'>('month')
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({})
  const [unitDraft, setUnitDraft] = useState('')
  const [unitType, setUnitType] = useState<'store' | 'business'>('store')
  const [targetEditor, setTargetEditor] = useState<'monthly' | 'daily' | null>(null)
  const [targetAmount, setTargetAmount] = useState('')
  const [targetMode, setTargetMode] = useState<'daily' | 'none'>('daily')
  const [actionEditor, setActionEditor] = useState(false)
  const [actionText, setActionText] = useState('')
  const [actionExpectedGrowth, setActionExpectedGrowth] = useState('')
  const [actionValidationDays, setActionValidationDays] = useState('1')
  const [actionExpectation, setActionExpectation] = useState('')
  const [actionEditorPlanId, setActionEditorPlanId] = useState('')
  const [actionEditorPlanDate, setActionEditorPlanDate] = useState('')
  const [actionSaving, setActionSaving] = useState(false)
  const [actionDeleting, setActionDeleting] = useState(false)
  const [actionDeleteConfirming, setActionDeleteConfirming] = useState(false)
  const [savingUnitId, setSavingUnitId] = useState('')
  const [clearingMonth, setClearingMonth] = useState(false)
  const [businessDetailOpen, setBusinessDetailOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    fetch(`${apiBaseUrl}/auth/users`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`读取账号失败：${response.status}`)
        const data = (await response.json()) as { users: AuthUser[] }
        const taskUsers = data.users.filter((user) => user.roleCode === 'subsidiary_owner' || user.id === 'user-lijinning')
        setLoginUsers(taskUsers)
        const preferredCompany = preferredCompanyFromHash()
        const preferred = taskUsers.find((user) => accountCompany(user) === preferredCompany)
          ?? taskUsers.find((user) => user.id === 'user-lijinning')
          ?? taskUsers.find((user) => user.id === 'user-kongjinjie-task-owner')
          ?? taskUsers.find((user) => user.roleCode === 'subsidiary_owner')
          ?? taskUsers[0]
        setLoginUserId(preferred?.id || '')
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return
        setLoadState({ status: 'error', message: error.message })
      })
    return () => controller.abort()
  }, [apiBaseUrl])

  const activeData = loadState.status === 'ready' ? loadState.data : null
  const canViewAllCompanies = activeUser?.roleCode !== 'subsidiary_owner'
  const companyOptions = useMemo(
    () => activeData ? (canViewAllCompanies ? [allCompaniesLabel, ...activeData.companies] : activeData.companies) : [],
    [activeData, canViewAllCompanies],
  )
  const targetCompanies = useMemo(
    () => activeData ? (selectedCompany === allCompaniesLabel ? activeData.companies : [selectedCompany].filter(Boolean)) : [],
    [activeData, selectedCompany],
  )
  const companyUnits = useMemo(() => activeData?.units.filter((unit) => targetCompanies.includes(unit.company)) ?? [], [activeData, targetCompanies])
  const monthMetrics = useMemo(
    () => activeData?.metrics.filter((metric) => targetCompanies.includes(metric.company) && monthOf(metric.date) === visibleMonth) ?? [],
    [activeData, targetCompanies, visibleMonth],
  )
  const actionPeriods = useMemo<CalendarActionPeriod[]>(
    () => (activeData?.actionPlans ?? [])
      .filter((plan) => targetCompanies.includes(plan.company))
      .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || a.company.localeCompare(b.company))
      .map((plan, index) => ({
        id: plan.id,
        company: plan.company,
        start: plan.date,
        end: actionPlanEndDate(plan),
        validationDays: actionPlanValidationDays(plan),
        color: actionCycleColors[index % actionCycleColors.length],
      })),
    [activeData, targetCompanies],
  )
  const selectedDateMetrics = monthMetrics.filter((metric) => metric.date === selectedDate)
  const selectedSummary = activeData?.summaries.find((item) => item.company === selectedCompany)
  const selectedTarget = activeData?.monthlyTargets.find((target) => target.company === selectedCompany && target.month === visibleMonth)
  const monthTarget = targetCompanies.reduce((sum, company) => sum + targetForCompany(company), 0)
  const monthActual = targetCompanies.reduce((sum, company) => sum + actualForCompany(company), 0)
  const monthRate = monthTarget > 0 ? (monthActual / monthTarget) * 100 : 0
  const canEdit = activeUser?.roleCode === 'subsidiary_owner' && Boolean(token)

  useEffect(() => {
    if (!activeData) return
    const nextForms: Record<string, Record<string, string>> = {}
    for (const unit of companyUnits) {
      const existing = activeData.metrics.find((metric) => metric.unitId === unit.id && metric.date === selectedDate)
      nextForms[unit.id] = metricForm(existing)
    }
    const timer = window.setTimeout(() => setForms(nextForms), 0)
    return () => window.clearTimeout(timer)
  }, [activeData, companyUnits, selectedDate])

  function openTargetEditor() {
    setTargetAmount(selectedTarget?.monthlyTarget ? String(selectedTarget.monthlyTarget) : '')
    setTargetMode(selectedTarget?.allocationMode ?? 'daily')
    setTargetEditor('monthly')
  }

  function openDailyTargetEditor() {
    const currentTarget = dayTarget(selectedDate)
    setTargetAmount(currentTarget > 0 ? String(Math.round(currentTarget * 100) / 100) : '')
    setTargetMode('none')
    setTargetEditor('daily')
  }

  function openActionEditor() {
    const existing = actionPlanForDate(selectedDate, selectedCompany) ?? actionPlanCoveringDate(selectedDate, selectedCompany)
    setActionText(existing?.action || '')
    setActionExpectedGrowth(existing?.expectedGmvGrowthRate ? String(existing.expectedGmvGrowthRate) : '')
    setActionValidationDays(String(actionPlanValidationDays(existing)))
    setActionExpectation(existing?.expectation || '')
    setActionEditorPlanId(existing?.id || '')
    setActionEditorPlanDate(existing?.date || selectedDate)
    setActionDeleteConfirming(false)
    setActionEditor(true)
  }

  function metricRowsForCompany(company: string) {
    return activeData?.metrics.filter((metric) => metric.company === company && monthOf(metric.date) === visibleMonth) ?? []
  }

  function entryRowsForCompany(company: string) {
    return activeData?.entries.filter((entry) => entry.company === company && monthOf(entry.date) === visibleMonth) ?? []
  }

  function targetForCompany(company: string) {
    const summaryTarget = activeData?.summaries.find((item) => item.company === company)?.targetWan
    if (Number(summaryTarget) > 0) return Number(summaryTarget) * 10000
    return entryRowsForCompany(company).reduce((sum, entry) => sum + Number(entry.revenueTarget || 0), 0)
  }

  function actualForCompany(company: string) {
    const rows = metricRowsForCompany(company)
    if (rows.length) return rows.reduce((sum, metric) => sum + metricRevenue(metric), 0)
    return entryRowsForCompany(company).reduce((sum, entry) => sum + Number(entry.revenueActual || 0), 0)
  }

  function dayMetricRows(date: string) {
    return activeData?.metrics.filter((metric) => targetCompanies.includes(metric.company) && metric.date === date) ?? []
  }

  function dayEntryRows(date: string) {
    return activeData?.entries.filter((entry) => targetCompanies.includes(entry.company) && entry.date === date) ?? []
  }

  function actionPlanForDate(date: string, company: string) {
    return (activeData?.actionPlans ?? []).find((plan) => plan.company === company && plan.date === date)
  }

  function actionPlansCoveringDate(date: string) {
    return (activeData?.actionPlans ?? []).filter((plan) => targetCompanies.includes(plan.company) && isDateInActionPlan(date, plan))
  }

  function actionPlanCoveringDate(date: string, company: string) {
    return (activeData?.actionPlans ?? []).find((plan) => plan.company === company && isDateInActionPlan(date, plan))
  }

  function monthlyTargetForCompany(company: string, month = visibleMonth) {
    return activeData?.monthlyTargets.find((target) => target.company === company && target.month === month)
  }

  function dayActual(date: string) {
    const metrics = dayMetricRows(date)
    if (metrics.length) return metrics.reduce((sum, metric) => sum + metricRevenue(metric), 0)
    return dayEntryRows(date).reduce((sum, entry) => sum + Number(entry.revenueActual || 0), 0)
  }

  function dayActualForCompany(date: string, company: string) {
    const metrics = activeData?.metrics.filter((metric) => metric.company === company && metric.date === date) ?? []
    if (metrics.length) return metrics.reduce((sum, metric) => sum + metricRevenue(metric), 0)
    return activeData?.entries.filter((entry) => entry.company === company && entry.date === date).reduce((sum, entry) => sum + Number(entry.revenueActual || 0), 0) ?? 0
  }

  function hasActualRowsForCompany(date: string, company: string) {
    return Boolean(activeData?.metrics.some((metric) => metric.company === company && metric.date === date)
      || activeData?.entries.some((entry) => entry.company === company && entry.date === date))
  }

  function actionPeriodActual(plan: DailyActionPlan, startDate: string, endDate: string) {
    return datesInRange(startDate, endDate).reduce((sum, date) => sum + dayActualForCompany(date, plan.company), 0)
  }

  function actionPeriodHasRows(plan: DailyActionPlan, startDate: string, endDate: string) {
    return datesInRange(startDate, endDate).some((date) => hasActualRowsForCompany(date, plan.company))
  }

  function dayTarget(date: string) {
    const entryTarget = dayEntryRows(date).reduce((sum, entry) => sum + Number(entry.revenueTarget || 0), 0)
    if (entryTarget > 0) return entryTarget
    const targetMonth = monthOf(date)
    return targetCompanies.reduce((sum, company) => {
      const target = monthlyTargetForCompany(company, targetMonth)
      return sum + (target?.allocationMode === 'daily' && target.dailyTarget > 0 ? target.dailyTarget : 0)
    }, 0)
  }

  async function saveUnitMetric(unit: BusinessUnit) {
    if (!token || !canEdit) return
    setSavingUnitId(unit.id)
    setNotice('')
    try {
      const form = forms[unit.id] ?? {}
      const payload = {
        unitId: unit.id,
        date: selectedDate,
        note: form.note ?? '',
        ...Object.fromEntries(allFields.map((field) => [field.key, Number(form[field.key] || 0)])),
      }
      const response = await fetch(`${apiBaseUrl}/task-calendar/metrics`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.reason || error.error || `保存失败：${response.status}`)
      }
      const result = await response.json() as { taskCalendar: TaskCalendarData; rollup?: { linked?: boolean } }
      setLoadState({ status: 'ready', data: result.taskCalendar })
      setNotice(result.rollup?.linked ? '已保存，并同步到子公司监管看板。' : '已保存，当前公司未绑定监管档案。')
      onSaved?.()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
    } finally {
      setSavingUnitId('')
    }
  }

  async function addUnit() {
    const name = unitDraft.trim()
    if (!name || !token || !canEdit) return
    const response = await fetch(`${apiBaseUrl}/task-calendar/units`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: selectedCompany, name, type: unitType, month: visibleMonth }),
    })
    if (!response.ok) {
      setNotice('新增经营主体失败')
      return
    }
    const result = await response.json() as { taskCalendar: TaskCalendarData }
    setLoadState({ status: 'ready', data: result.taskCalendar })
    setUnitDraft('')
    setNotice('经营主体已新增')
  }

  async function saveMonthlyTarget() {
    if (!token || !canEdit) return
    const amount = Number(targetAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('请填写正确的月度目标')
      return
    }
    const response = await fetch(`${apiBaseUrl}/task-calendar/monthly-targets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: selectedCompany, month: visibleMonth, monthlyTarget: amount, allocationMode: targetMode }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      setNotice(error.reason || error.error || '保存月度目标失败')
      return
    }
    const result = await response.json() as { taskCalendar: TaskCalendarData }
    setLoadState({ status: 'ready', data: result.taskCalendar })
    setTargetEditor(null)
    setNotice('月度目标已保存，并同步重算监管看板。')
    onSaved?.()
  }

  async function saveDailyTarget() {
    if (!token || !canEdit) return
    const amount = Number(targetAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setNotice('请填写正确的当日目标')
      return
    }
    const response = await fetch(`${apiBaseUrl}/task-calendar/daily-targets`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ company: selectedCompany, date: selectedDate, revenueTarget: amount }),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      setNotice(error.reason || error.error || '保存当日目标失败')
      return
    }
    const result = await response.json() as { taskCalendar: TaskCalendarData }
    setLoadState({ status: 'ready', data: result.taskCalendar })
    setTargetEditor(null)
    setNotice('当日目标已保存，并同步重算监管看板。')
    onSaved?.()
  }

  async function saveActionPlan() {
    if (!token || !canEdit || actionSaving) return
    const expectedGmvGrowthRate = Number(actionExpectedGrowth)
    const validationDays = Number(actionValidationDays)
    if (actionEditorPlanId && actionEditorPlanDate && actionEditorPlanDate !== selectedDate) {
      setNotice(`当前日期在 ${actionEditorPlanDate} 开始的验证周期内，不能填写新的当日动作。`)
      return
    }
    if (!actionText.trim() || !Number.isFinite(expectedGmvGrowthRate) || expectedGmvGrowthRate <= 0) {
      setNotice('请填写当日动作，并设置大于 0 的预期 GMV 涨幅。')
      return
    }
    if (!Number.isFinite(validationDays) || validationDays < 1) {
      setNotice('请选择正确的验证周期。')
      return
    }
    setActionSaving(true)
    try {
      const response = await fetch(`${apiBaseUrl}/task-calendar/action-plans`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany,
          date: selectedDate,
          action: actionText,
          expectedGmvGrowthRate,
          validationDays,
          expectation: actionExpectation,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        setNotice(error.reason || error.error || '保存当日动作失败')
        return
      }
      const result = await response.json() as { taskCalendar: TaskCalendarData }
      setLoadState((current) => current.status === 'ready'
        ? { status: 'ready', data: mergeTaskCalendarWindow(current.data, [result.taskCalendar]) }
        : { status: 'ready', data: result.taskCalendar })
      setActionEditor(false)
      setActionEditorPlanId('')
      setActionEditorPlanDate('')
      setActionDeleteConfirming(false)
      setNotice(`已保存 ${formatDate(selectedDate)} 的动作和 ${validationDays} 天验证周期。`)
    } finally {
      setActionSaving(false)
    }
  }

  async function deleteActionPlan() {
    if (!token || !canEdit || actionDeleting || !actionEditorPlanId) return
    if (!actionDeleteConfirming) {
      setActionDeleteConfirming(true)
      setNotice('再次点击“确认删除”会删除这个动作和预期。')
      return
    }
    setActionDeleting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/task-calendar/action-plans/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: selectedCompany,
          id: actionEditorPlanId,
          date: actionEditorPlanDate || selectedDate,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        setNotice(error.reason || error.error || '删除动作失败')
        return
      }
      const result = await response.json() as { taskCalendar: TaskCalendarData }
      setLoadState({ status: 'ready', data: result.taskCalendar })
      setActionEditor(false)
      setActionEditorPlanId('')
      setActionEditorPlanDate('')
      setActionDeleteConfirming(false)
      setNotice('已删除动作和预期，验证周期已解除。')
    } finally {
      setActionDeleting(false)
    }
  }

  async function clearCurrentMonthData() {
    if (!token || !canEdit || clearingMonth) return
    const confirmed = window.confirm(`确定清空 ${selectedCompany} ${monthLabel(visibleMonth)} 的全部数据和目标吗？这个操作会删除月度目标、当日目标和填报数据。`)
    if (!confirmed) return
    setClearingMonth(true)
    setNotice('')
    try {
      const response = await fetch(`${apiBaseUrl}/task-calendar/month-data/clear`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: selectedCompany, month: visibleMonth }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.reason || error.error || '清空当月数据失败')
      }
      const result = await response.json() as { taskCalendar: TaskCalendarData; cleared?: { monthlyTargets?: number; metrics?: number; entries?: number } }
      setLoadState({ status: 'ready', data: result.taskCalendar })
      setNotice(`已清空 ${monthLabel(visibleMonth)}：${result.cleared?.monthlyTargets ?? 0} 个目标、${result.cleared?.metrics ?? 0} 条填报、${result.cleared?.entries ?? 0} 条日历记录。`)
      onSaved?.()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '清空当月数据失败')
    } finally {
      setClearingMonth(false)
    }
  }

  function updateForm(unitId: string, key: string, value: string) {
    setForms((current) => ({
      ...current,
      [unitId]: {
        ...(current[unitId] ?? {}),
        [key]: value,
      },
    }))
  }

  function changeMonth(nextMonth: string) {
    setVisibleMonth(nextMonth)
    setSelectedDate(`${nextMonth}-01`)
    if (token && activeUser) void refreshCalendar(nextMonth)
  }

  function changeDate(nextDate: string) {
    const nextMonth = monthOf(nextDate)
    setSelectedDate(nextDate)
    if (nextMonth !== visibleMonth) {
      setVisibleMonth(nextMonth)
      if (token && activeUser) void refreshCalendar(nextMonth)
    }
  }

  function shiftToolbar(offset: number) {
    if (viewMode === 'business') {
      changeDate(shiftDate(selectedDate, offset))
      return
    }
    if (viewMode === 'week') {
      changeDate(shiftDate(selectedDate, offset * 7))
      return
    }
    changeMonth(shiftMonth(visibleMonth, offset))
  }

  function applyCalendarData(data: TaskCalendarData, user: AuthUser) {
    setLoadState({ status: 'ready', data })
    setSelectedCompany((current) => {
      const preferredCompany = preferredCompanyFromHash()
      if (user.roleCode !== 'subsidiary_owner' && (!preferredCompany || preferredCompany === allCompaniesLabel)) return allCompaniesLabel
      if (preferredCompany && data.companies.includes(preferredCompany)) return preferredCompany
      if (current === allCompaniesLabel && user.roleCode !== 'subsidiary_owner') return current
      if (data.companies.includes(current)) return current
      return data.companies[0] || ''
    })
  }

  async function refreshCalendar(month = visibleMonth, sessionToken = token, sessionUser = activeUser) {
    if (!sessionToken || !sessionUser) return
    setLoadState({ status: 'loading' })
    try {
      const data = await fetchTaskCalendarWindow(apiBaseUrl, sessionToken, month)
      applyCalendarData(data, sessionUser)
    } catch (error) {
      setLoadState({ status: 'error', message: error instanceof Error ? error.message : '读取填报数据失败' })
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!loginUserId || !loginPassword || loginBusy) return
    setLoginBusy(true)
    setLoginError('')
    setNotice('')
    setLoadState({ status: 'loading' })
    try {
      const session = await login(apiBaseUrl, loginUserId, loginPassword)
      const data = await fetchTaskCalendarWindow(apiBaseUrl, session.token, visibleMonth)
      setToken(session.token)
      setActiveUser(session.user)
      setLoginPassword('')
      applyCalendarData(data, session.user)
    } catch (error) {
      setToken('')
      setActiveUser(null)
      setLoginError(error instanceof Error ? error.message : '登录失败')
    } finally {
      setLoginBusy(false)
    }
  }

  async function logoutFromEntry() {
    if (token) {
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => undefined)
    }
    setToken('')
    setActiveUser(null)
    setLoginPassword('')
    setSelectedCompany('')
    setNotice('')
    setLoadState({ status: 'loading' })
  }

  if (loadState.status === 'error') {
    return (
      <section className={`task-calendar-shell ${standalone ? 'task-calendar-standalone' : ''}`}>
        <div className="task-calendar-error">{loadState.message}</div>
      </section>
    )
  }

  if (!token || !activeUser) {
    return (
      <section className={`task-calendar-shell ${standalone ? 'task-calendar-standalone' : ''}`}>
        <div className="task-calendar-login-shell">
          <div className="task-calendar-login-intro">
            <div className="task-calendar-brandmark" aria-hidden="true">J</div>
            <p>涌动花鱼（珠海）网络科技有限公司</p>
            <h1>任务填报登录</h1>
            <span>账号登录后只加载对应公司的目标、日数据和完成率；集团账号仅用于查看汇总。</span>
          </div>
          <form className="task-calendar-login-card" onSubmit={submitLogin}>
            <label className="task-calendar-field">
              账号
              <select value={loginUserId} disabled={!loginUsers.length || loginBusy} onChange={(event) => setLoginUserId(event.currentTarget.value)}>
                {!loginUsers.length ? <option value="">读取账号中</option> : null}
                {loginUsers.map((user) => (
                  <option value={user.id} key={user.id}>
                    {user.displayName}{user.companyName ? ` / ${user.companyName}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="task-calendar-field">
              密码
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.currentTarget.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                disabled={loginBusy}
              />
            </label>
            {loginError ? <p className="task-calendar-login-error">{loginError}</p> : null}
            <button className="task-calendar-primary full" type="submit" disabled={!loginUserId || !loginPassword || loginBusy}>
              {loginBusy ? '登录中' : '登录填报'}
            </button>
            <p className="task-calendar-login-hint">当前演示账号密码统一为 123456。子公司账号只能看到和修改本公司数据。</p>
          </form>
        </div>
      </section>
    )
  }

  if (!activeData) {
    return (
      <section className={`task-calendar-shell ${standalone ? 'task-calendar-standalone' : ''}`}>
        <div className="task-calendar-error task-calendar-loading">正在读取填报数据...</div>
      </section>
    )
  }

  const selectedDateActual = dayActual(selectedDate)
  const selectedDateTarget = dayTarget(selectedDate)
  const selectedDateRate = selectedDateTarget > 0 ? (selectedDateActual / selectedDateTarget) * 100 : 0
  const selectedActionPlans = actionPlansCoveringDate(selectedDate)
  const actionBaseGmv = selectedActionPlans.reduce((sum, plan) => {
    const validationDays = actionPlanValidationDays(plan)
    return sum + actionPeriodActual(plan, shiftDate(plan.date, -validationDays), shiftDate(plan.date, -1))
  }, 0)
  const actionPeriodGmv = selectedActionPlans.reduce((sum, plan) => sum + actionPeriodActual(plan, plan.date, actionPlanEndDate(plan)), 0)
  const hasActionPeriodRows = selectedActionPlans.some((plan) => actionPeriodHasRows(plan, plan.date, actionPlanEndDate(plan)))
  const expectedGmvGrowthRate = selectedActionPlans.length
    ? selectedActionPlans.reduce((sum, plan) => sum + Number(plan.expectedGmvGrowthRate || 0), 0) / selectedActionPlans.length
    : null
  const actualGmvGrowthRate = hasActionPeriodRows
    ? (actionBaseGmv > 0 ? ((actionPeriodGmv - actionBaseGmv) / actionBaseGmv) * 100 : (actionPeriodGmv > 0 ? 100 : 0))
    : null
  const actionComplianceRate = expectedGmvGrowthRate && expectedGmvGrowthRate > 0 && actualGmvGrowthRate !== null ? (actualGmvGrowthRate / expectedGmvGrowthRate) * 100 : null
  const actionVerificationTone = actionValidationTone(actionComplianceRate, actualGmvGrowthRate)
  const actionVerificationLabel = actionValidationLabel(actionComplianceRate, actualGmvGrowthRate)
  const actionCycleLabel = selectedActionPlans.length === 1
    ? `${selectedActionPlans[0].company} · ${actionPeriodText(selectedActionPlans[0])}`
    : selectedActionPlans.length
      ? `${selectedActionPlans.length} 个动作周期覆盖 ${selectedDate}`
      : `${selectedDate} 暂无动作周期`
  const editingActionPlan = actionEditorPlanId ? (activeData.actionPlans ?? []).find((plan) => plan.id === actionEditorPlanId) : null
  const actionEditorLocked = Boolean(editingActionPlan && actionEditorPlanDate && actionEditorPlanDate !== selectedDate)
  const selectedWeekDates = weekDays(selectedDate)
  const toolbarTitle = viewMode === 'business'
    ? `${selectedDate} 经营数据`
    : viewMode === 'week'
      ? weekRangeLabel(selectedWeekDates)
      : monthLabel(visibleMonth)
  const previousLabel = viewMode === 'business' ? '前一天' : viewMode === 'week' ? '上一周' : '上个月'
  const nextLabel = viewMode === 'business' ? '后一天' : viewMode === 'week' ? '下一周' : '下个月'
  const monthTone = performanceTone(monthRate, monthTarget, monthActual)
  const selectedDateTone = performanceTone(selectedDateRate, selectedDateTarget, selectedDateActual)
  const allocatedTarget = activeData.entries
    .filter((entry) => targetCompanies.includes(entry.company) && monthOf(entry.date) === visibleMonth)
    .reduce((sum, entry) => sum + Number(entry.revenueTarget || 0), 0)
  const unallocatedTarget = Math.max(monthTarget - allocatedTarget, 0)
  const targetAmountValue = Number.isFinite(Number(targetAmount)) && Number(targetAmount) > 0 ? Number(targetAmount) : 0
  const projectedAllocatedTarget = targetEditor === 'daily'
    ? Math.max(allocatedTarget - selectedDateTarget + targetAmountValue, 0)
    : allocatedTarget
  const projectedUnallocatedTarget = Math.max(monthTarget - projectedAllocatedTarget, 0)

  return (
    <section className={`task-calendar-shell ${standalone ? 'task-calendar-standalone' : ''}`} id="taskCalendarEntryPage">
      <header className="task-calendar-hero">
        <div className="task-calendar-brandmark" aria-hidden="true">J</div>
        <div>
          <p>涌动花鱼（珠海）网络科技有限公司</p>
          <h1>涌动花鱼任务管理</h1>
          <span>集团主账号仅查看，子公司账号负责填报；保存后自动进入后端数据库并联动监管看板。</span>
        </div>
        <div className="task-calendar-account">
          <div className="task-calendar-session-card">
            <span>当前账号</span>
            <strong>{activeUser.displayName}</strong>
            <em>{activeUser.roleCode === 'subsidiary_owner' ? `${activeUser.companyName || accountCompany(activeUser)} · 独立填报` : '全部子公司 · 只读汇总'}</em>
          </div>
          <button className="task-calendar-light-button" type="button" onClick={logoutFromEntry}><LogOut size={16} /> 退出登录</button>
          {onBack ? <button className="task-calendar-light-button" type="button" onClick={onBack}>返回监管看板</button> : null}
        </div>
      </header>

      <main className="task-calendar-workspace">
        <aside className="task-calendar-sidebar">
          <section className="task-calendar-panel">
            <label className="task-calendar-field">
              月份
              <input type="month" value={visibleMonth} onChange={(event) => changeMonth(event.currentTarget.value)} />
            </label>
            <button className="task-calendar-primary full" type="button" disabled={!canEdit} onClick={openTargetEditor}>
              <Target size={16} /> 填写月度目标
            </button>
            <button className="task-calendar-danger full" type="button" disabled={!canEdit || clearingMonth} onClick={clearCurrentMonthData}>
              {clearingMonth ? '清空中' : '清空当月数据'}
            </button>
            <p className="task-calendar-clear-note">清除当月月度目标、当日目标、填报与同步数据。</p>
          </section>

          <section className="task-calendar-panel">
            <div className="task-calendar-section-title"><Building2 size={14} /> 子公司</div>
            <div className="task-calendar-company-list">
              {companyOptions.map((company) => {
                const summary = activeData?.summaries.find((item) => item.company === company)
                const target = company === allCompaniesLabel ? monthTarget : Number(summary?.targetWan || 0) * 10000
                return (
                  <button className={company === selectedCompany ? 'active' : ''} type="button" key={company} onClick={() => setSelectedCompany(company)}>
                    <span>{company}</span>
                    <em>{company === allCompaniesLabel ? formatMoney(target) : formatWan(summary?.targetWan)}</em>
                  </button>
                )
              })}
            </div>
          </section>

          <section className="task-calendar-panel compact">
            <div className="task-calendar-section-title">本月汇总</div>
            <div className="task-calendar-metrics">
              <article>
                <span>目标额</span>
                <strong>{formatMoney(monthTarget)}</strong>
              </article>
              <article>
                <span>完成额</span>
                <strong>{formatMoney(monthActual)}</strong>
              </article>
            </div>
            <div className="task-calendar-progress-line"><i style={{ width: `${Math.min(monthRate, 100)}%` }} /></div>
            <p>{selectedSummary?.summary || `${selectedCompany} 月完成 ${formatMoney(monthActual)}，完成率 ${formatPercent(monthRate)}。`}</p>
          </section>

          <section className={`task-calendar-panel compact task-calendar-action-verify ${actionVerificationTone}`}>
            <div className="task-calendar-section-title"><ClipboardCheck size={14} /> 动作周期验证</div>
            <div className="task-calendar-action-verify-head">
              <span>{actionCycleLabel}</span>
              <b>{selectedActionPlans.length ? actionVerificationLabel : '未填写动作'}</b>
            </div>
            <div className="task-calendar-action-verify-metrics">
              <article>
                <span>周期GMV涨幅</span>
                <strong>{selectedActionPlans.length ? formatPercent(actualGmvGrowthRate) : '待填'}</strong>
              </article>
              <article>
                <span>符合预期</span>
                <strong>{selectedActionPlans.length ? formatPercent(actionComplianceRate) : '待填'}</strong>
              </article>
            </div>
            {selectedActionPlans.length ? (
              <>
                <p className="task-calendar-action-verify-copy">{selectedActionPlans.map((plan) => `${plan.company}：${plan.action}`).join(' / ')}</p>
                <p>预期周期涨幅 {formatPercent(expectedGmvGrowthRate)}；基准周期 GMV {formatMoney(actionBaseGmv)}，验证周期 GMV {formatMoney(actionPeriodGmv)}。</p>
              </>
            ) : (
              <p>选择日期后，这里会显示该日期所在动作周期，并用整个周期 GMV 涨幅验证预期。</p>
            )}
          </section>
        </aside>

        <section className="task-calendar-main-panel">
          <div className="task-calendar-toolbar">
            <button className="task-calendar-icon-button" type="button" onClick={() => shiftToolbar(-1)} aria-label={previousLabel}>
              <ChevronLeft size={18} />
            </button>
            <div>
              <h2>{toolbarTitle}</h2>
              <div className="task-calendar-tabs">
                {[
                  ['month', '月'],
                  ['week', '周'],
                  ['year', '年'],
                  ['business', '经营数据'],
                ].map(([key, label]) => (
                  <button className={viewMode === key ? 'active' : ''} type="button" key={key} onClick={() => setViewMode(key as typeof viewMode)}>{label}</button>
                ))}
              </div>
            </div>
            <button className="task-calendar-icon-button" type="button" onClick={() => shiftToolbar(1)} aria-label={nextLabel}>
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="task-calendar-overview-strip">
            <article className={monthTone}>
              <span>本月完成率</span>
              <strong>{formatPercent(monthRate)}</strong>
              <em>{formatMoney(monthActual)} / {formatMoney(monthTarget)}</em>
            </article>
            <article className={selectedDateTone}>
              <span>当前日期完成</span>
              <strong>{formatPercent(selectedDateRate)}</strong>
              <em>{formatMoney(selectedDateActual)} / {formatMoney(selectedDateTarget)}</em>
            </article>
            <article>
              <span>经营主体</span>
              <strong>{companyUnits.length}</strong>
              <em>{selectedCompany} 已接入主体</em>
            </article>
            <article>
              <span>填报记录</span>
              <strong>{monthMetrics.length}</strong>
              <em>{selectedDateMetrics.length} 条当天业务数据</em>
            </article>
          </div>

          {viewMode === 'business' ? (
            <BusinessDataBoard
              canEdit={canEdit}
              companyUnits={companyUnits}
              forms={forms}
              metrics={monthMetrics}
              notice={notice}
              onAddUnit={addUnit}
              onSaveUnit={saveUnitMetric}
              onUpdateForm={updateForm}
              savingUnitId={savingUnitId}
              selectedCompany={selectedCompany}
              selectedDate={selectedDate}
              setUnitDraft={setUnitDraft}
              setUnitType={setUnitType}
              unitDraft={unitDraft}
              unitType={unitType}
            />
          ) : viewMode === 'week' ? (
            <WeekTrendBoard dates={selectedWeekDates} month={visibleMonth} selectedDate={selectedDate} actionPeriods={actionPeriods} dayActual={dayActual} dayTarget={dayTarget} onSelectDate={changeDate} />
          ) : viewMode === 'year' ? (
            <YearBoard month={visibleMonth} monthActual={monthActual} monthTarget={monthTarget} company={selectedCompany} />
          ) : (
            <>
              <div className="task-calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
              <CalendarGrid dates={calendarDays(visibleMonth)} month={visibleMonth} selectedDate={selectedDate} actionPeriods={actionPeriods} mode="month" dayActual={dayActual} dayTarget={dayTarget} onSelectDate={changeDate} />
            </>
          )}
        </section>

        <aside className="task-calendar-detail">
          <section className="task-calendar-panel detail">
            <div className="task-calendar-date-head">
              <div>
                <p>当前日期</p>
                <h2>{formatDate(selectedDate)}</h2>
              </div>
              <div className="task-calendar-date-actions">
                <button className="task-calendar-primary" type="button" disabled={!canEdit} onClick={openDailyTargetEditor}>设置当日目标</button>
                <button className="task-calendar-light-button" type="button" disabled={!canEdit} onClick={openActionEditor}>
                  <ClipboardCheck size={15} /> 填写当日动作和预期
                </button>
              </div>
              <p className="task-calendar-allocation-hint">
                当月未分配目标：{formatMoney(unallocatedTarget)} · 已分配 {formatMoney(allocatedTarget)}
              </p>
            </div>
            <div className={`task-calendar-target-card ${selectedDateTone}`}>
              <div className="task-calendar-target-title">
                <strong>当日总体营业额目标</strong>
                <b>{performanceLabel(selectedDateRate, selectedDateTarget, selectedDateActual)}</b>
              </div>
              <span>{selectedCompany} · {activeUser?.displayName || '填报账号'}</span>
              <p>目标营业额：{formatMoney(selectedDateTarget)} · 已完成：{formatMoney(selectedDateActual)} · 完成率：{formatPercent(selectedDateRate)}</p>
              <div className="task-calendar-progress-line"><i style={{ width: `${Math.min(selectedDateRate, 100)}%` }} /></div>
              <button className="task-calendar-business-toggle" type="button" onClick={() => setBusinessDetailOpen((current) => !current)}>
                {businessDetailOpen ? '收起业务明细' : `展开业务明细（${selectedDateMetrics.length}）`}
              </button>
            </div>
            {businessDetailOpen ? (
              <div className="task-calendar-business-detail-list">
                {selectedDateMetrics.length ? selectedDateMetrics
                  .slice()
                  .sort((a, b) => metricRevenue(b) - metricRevenue(a))
                  .map((metric) => (
                    <article className="task-calendar-business-metric-row" key={metric.id}>
                      <strong>{metric.unitName}</strong>
                      <dl>
                        <div><dt>GMV</dt><dd>{formatMoney(metric.gmv || metric.revenue || metric.revenueAmount || 0)}</dd></div>
                        <div><dt>GSV</dt><dd>{formatMoney(metric.gsv ?? metric.estimatedGsv ?? 0)}</dd></div>
                        <div><dt>退货率</dt><dd>{formatPercent(metric.returnRate)}</dd></div>
                      </dl>
                    </article>
                  )) : <p className="task-calendar-empty">当天暂无业务销售数据，切换到“经营数据”填报。</p>}
              </div>
            ) : null}
          </section>
        </aside>
      </main>

      {targetEditor ? (
        <div className="task-calendar-modal" role="dialog" aria-modal="true">
          <div className="task-calendar-modal-card">
            <div className="task-calendar-modal-head">
              <Target size={20} />
              <div>
                <h2>{targetEditor === 'daily' ? '设置当日目标' : '填写月度目标'}</h2>
                <p>{selectedCompany} / {targetEditor === 'daily' ? formatDate(selectedDate) : monthLabel(visibleMonth)}</p>
              </div>
            </div>
            <label className="task-calendar-field">
              {targetEditor === 'daily' ? '当日目标营业额（元）' : '月度目标营业额（元）'}
              <input type="number" min="1" step="1" value={targetAmount} onChange={(event) => setTargetAmount(event.currentTarget.value)} placeholder={targetEditor === 'daily' ? '例如：40000' : '例如：1000000'} />
            </label>
            {targetEditor === 'monthly' ? (
              <label className="task-calendar-field">
                分配方式
                <select value={targetMode} onChange={(event) => setTargetMode(event.currentTarget.value as 'daily' | 'none')}>
                  <option value="daily">平均分到每日</option>
                  <option value="none">只保存月度目标</option>
                </select>
              </label>
            ) : null}
            {targetEditor === 'daily' ? (
              <div className="task-calendar-target-balance">
                <article>
                  <span>当月目标</span>
                  <strong>{formatMoney(monthTarget)}</strong>
                </article>
                <article>
                  <span>当前已分配</span>
                  <strong>{formatMoney(allocatedTarget)}</strong>
                </article>
                <article>
                  <span>保存后未分配剩余</span>
                  <strong>{formatMoney(projectedUnallocatedTarget)}</strong>
                </article>
              </div>
            ) : null}
            <p className="task-calendar-target-preview">
              {targetEditor === 'daily'
                ? (targetAmount
                    ? `保存后 ${formatDate(selectedDate)} 的目标为 ${formatMoney(Number(targetAmount))}，当月未分配目标额剩余 ${formatMoney(projectedUnallocatedTarget)}。`
                    : `填写后只修改 ${formatDate(selectedDate)} 的目标，不改变月度目标总额。当前未分配 ${formatMoney(unallocatedTarget)}。`)
                : (targetAmount
                    ? (targetMode === 'daily'
                        ? `保存后本月目标 ${formatMoney(Number(targetAmount))}，日历会按 ${formatMoney(Number(targetAmount) / daysInMonth(visibleMonth))} 自动拆到每日。`
                        : `保存后本月目标 ${formatMoney(Number(targetAmount))}，不会自动填写每天目标。`)
                    : '填写后将自动重算月目标、完成额和监管看板完成率。')}
            </p>
            <div className="task-calendar-modal-actions">
              <button className="task-calendar-light-button" type="button" onClick={() => setTargetEditor(null)}>取消</button>
              <button className="task-calendar-primary" type="button" onClick={targetEditor === 'daily' ? saveDailyTarget : saveMonthlyTarget}><Save size={16} /> 保存目标</button>
            </div>
          </div>
        </div>
      ) : null}

      {actionEditor ? (
        <div className="task-calendar-modal" role="dialog" aria-modal="true">
          <div className="task-calendar-modal-card">
            <div className="task-calendar-modal-head">
              <ClipboardCheck size={20} />
              <div>
                <h2>填写当日动作和预期</h2>
                <p>{selectedCompany} / {formatDate(selectedDate)}</p>
              </div>
            </div>
            {actionEditorLocked && editingActionPlan ? (
              <p className="task-calendar-target-preview">
                当前日期属于 {editingActionPlan.date} 开始的 {actionPlanValidationDays(editingActionPlan)} 天验证周期，周期内不能新增当日动作。可切换到起始日修改，或删除该动作周期。
              </p>
            ) : null}
            <label className="task-calendar-field">
              当日动作
              <textarea disabled={actionEditorLocked} value={actionText} onChange={(event) => setActionText(event.currentTarget.value)} placeholder="例如：加大直播间投放、补达人短视频、调整货盘主推款" />
            </label>
            <label className="task-calendar-field">
              验证周期
              <select disabled={actionEditorLocked} value={actionValidationDays} onChange={(event) => setActionValidationDays(event.currentTarget.value)}>
                {actionValidationDayOptions.map((days) => (
                  <option value={days} key={days}>{days}天</option>
                ))}
              </select>
            </label>
            <label className="task-calendar-field">
              预期周期 GMV 涨幅（%）
              <input disabled={actionEditorLocked} type="number" min="1" step="1" value={actionExpectedGrowth} onChange={(event) => setActionExpectedGrowth(event.currentTarget.value)} placeholder="例如：30" />
            </label>
            <label className="task-calendar-field">
              预期说明
              <textarea disabled={actionEditorLocked} value={actionExpectation} onChange={(event) => setActionExpectation(event.currentTarget.value)} placeholder="可填写预期来源、关键业务或负责人" />
            </label>
            <p className="task-calendar-target-preview">
              保存后，{formatDate(actionEditorPlanDate || selectedDate)} 到 {formatDate(shiftDate(actionEditorPlanDate || selectedDate, Number(actionValidationDays || 1) - 1))} 会被标成同一个动作周期；周期内不能再填写新的当日动作。验证会用该周期 GMV 对比前一个同长度周期，90%以上为有效，60-90为需要优化，20-60为基本无效，低于20或负增长会预警。
            </p>
            <div className="task-calendar-modal-actions">
              {actionEditorPlanId ? (
                <button className="task-calendar-danger" type="button" disabled={actionDeleting} onClick={deleteActionPlan}>
                  <Trash2 size={16} /> {actionDeleting ? '删除中' : actionDeleteConfirming ? '确认删除' : '删除动作'}
                </button>
              ) : null}
              <button className="task-calendar-light-button" type="button" onClick={() => { setActionDeleteConfirming(false); setActionEditor(false) }}>取消</button>
              <button className="task-calendar-primary" type="button" disabled={actionSaving || actionEditorLocked} onClick={saveActionPlan}><Save size={16} /> {actionSaving ? '保存中' : '保存动作'}</button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? <div className="task-calendar-toast" role="status">{notice}</div> : null}
    </section>
  )
}

function WeekTrendBoard({
  dates,
  month,
  selectedDate,
  actionPeriods,
  dayActual,
  dayTarget,
  onSelectDate,
}: {
  dates: string[]
  month: string
  selectedDate: string
  actionPeriods: CalendarActionPeriod[]
  dayActual: (date: string) => number
  dayTarget: (date: string) => number
  onSelectDate: (date: string) => void
}) {
  const rows = dates.map((date, index) => {
    const actual = dayActual(date)
    const target = dayTarget(date)
    const rate = target > 0 ? (actual / target) * 100 : 0
    return { actual, date, index, rate, target }
  })
  const weekActual = rows.reduce((sum, row) => sum + row.actual, 0)
  const weekTarget = rows.reduce((sum, row) => sum + row.target, 0)
  const weekRate = weekTarget > 0 ? (weekActual / weekTarget) * 100 : 0
  const bestDay = rows.reduce((best, row) => (row.actual > best.actual ? row : best), rows[0] ?? { actual: 0, date: selectedDate, index: 0, rate: 0, target: 0 })
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.actual, row.target]))
  const chart = { height: 260, left: 48, right: 24, top: 24, bottom: 48, width: 720 }
  const innerWidth = chart.width - chart.left - chart.right
  const innerHeight = chart.height - chart.top - chart.bottom
  const xFor = (index: number) => chart.left + (rows.length <= 1 ? innerWidth / 2 : (innerWidth / (rows.length - 1)) * index)
  const yFor = (value: number) => chart.top + (1 - Math.min(value / maxValue, 1)) * innerHeight
  const pathFor = (key: 'actual' | 'target') => rows.map((row, index) => `${index === 0 ? 'M' : 'L'} ${xFor(row.index).toFixed(1)} ${yFor(row[key]).toFixed(1)}`).join(' ')

  return (
    <section className="task-calendar-week-trend-board">
      <div className="task-calendar-week-trend-head">
        <article>
          <span>本周完成额</span>
          <strong>{formatMoney(weekActual)}</strong>
          <em>目标 {formatMoney(weekTarget)} · 完成率 {formatPercent(weekRate)}</em>
        </article>
        <article>
          <span>最高完成日</span>
          <strong>{shortDateLabel(bestDay.date)}</strong>
          <em>{formatMoney(bestDay.actual)} · {formatPercent(bestDay.rate)}</em>
        </article>
        <div className="task-calendar-week-legend" aria-hidden="true">
          <span><i className="actual" />完成额</span>
          <span><i className="target" />目标额</span>
        </div>
      </div>
      <div className="task-calendar-week-chart">
        <svg viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label="一周营业额趋势图">
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chart.top + ratio * innerHeight
            const value = maxValue * (1 - ratio)
            return (
              <g key={ratio}>
                <line className="grid" x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} />
                <text className="axis-label" x={chart.left - 10} y={y + 4} textAnchor="end">{formatMoney(value)}</text>
              </g>
            )
          })}
          {rows.map((row) => {
            const x = xFor(row.index)
            const y = yFor(row.actual)
            const targetY = yFor(row.target)
            return (
              <g key={row.date}>
                <line className="day-guide" x1={x} x2={x} y1={chart.top} y2={chart.height - chart.bottom} />
                <rect className="actual-bar" x={x - 10} y={y} width="20" height={chart.height - chart.bottom - y} rx="8" />
                <circle className={row.date === selectedDate ? 'actual-point active' : 'actual-point'} cx={x} cy={y} r={row.date === selectedDate ? 6 : 4.5} />
                <circle className="target-point" cx={x} cy={targetY} r="3.5" />
                <text className={row.date === selectedDate ? 'date-label active' : 'date-label'} x={x} y={chart.height - 18} textAnchor="middle">{shortDateLabel(row.date)}</text>
              </g>
            )
          })}
          <path className="target-line" d={pathFor('target')} />
          <path className="actual-line" d={pathFor('actual')} />
        </svg>
      </div>
      <div className="task-calendar-week-day-list">
        {rows.map((row) => {
          const tone = performanceTone(row.rate, row.target, row.actual)
          const isMuted = monthOf(row.date) !== month
          const isSelected = row.date === selectedDate
          const actionPeriod = actionPeriods.find((period) => period.start <= row.date && row.date <= period.end)
          const cycleIndex = actionPeriod ? daysBetween(actionPeriod.start, row.date) + 1 : 0
          const cycleStyle = actionPeriod ? ({ '--cycle-color': actionPeriod.color } as CSSProperties) : undefined
          return (
            <button className={`${tone} ${isMuted ? 'muted' : ''} ${isSelected ? 'selected' : ''} ${actionPeriod ? 'action-cycle' : ''}`} type="button" key={row.date} style={cycleStyle} onClick={() => onSelectDate(row.date)}>
              <span>{weekdays[row.index]}</span>
              <strong>{shortDateLabel(row.date)}</strong>
              <em>{formatMoney(row.actual)} / {formatMoney(row.target)}</em>
              {actionPeriod ? <small>{actionPeriod.company} {cycleIndex}/{actionPeriod.validationDays}</small> : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function CalendarGrid({
  dates,
  month,
  selectedDate,
  actionPeriods,
  mode,
  dayActual,
  dayTarget,
  onSelectDate,
}: {
  dates: string[]
  month: string
  selectedDate: string
  actionPeriods: CalendarActionPeriod[]
  mode: 'month' | 'week'
  dayActual: (date: string) => number
  dayTarget: (date: string) => number
  onSelectDate: (date: string) => void
}) {
  return (
    <div className={mode === 'week' ? 'task-calendar-week-board' : 'task-calendar-grid'}>
      {dates.map((date) => {
        const actual = dayActual(date)
        const target = dayTarget(date)
        const rate = target > 0 ? (actual / target) * 100 : 0
        const isMuted = monthOf(date) !== month
        const isSelected = date === selectedDate
        const isToday = date === today()
        const tone = performanceTone(rate, target, actual)
        const actionPeriod = actionPeriods.find((period) => period.start <= date && date <= period.end)
        const cycleIndex = actionPeriod ? daysBetween(actionPeriod.start, date) + 1 : 0
        const cycleStyle = actionPeriod ? ({ '--cycle-color': actionPeriod.color } as CSSProperties) : undefined
        return (
          <button className={`${tone} ${isMuted ? 'muted' : ''} ${isSelected ? 'selected' : ''} ${actionPeriod ? 'action-cycle' : ''}`} type="button" key={date} style={cycleStyle} onClick={() => onSelectDate(date)}>
            <div className="task-calendar-day-number">
              <strong>{Number(date.slice(8, 10))}</strong>
              {isToday ? <span>今天</span> : null}
            </div>
            <div className="task-calendar-day-card">
              {actionPeriod ? <b className="task-calendar-day-cycle">{actionPeriod.company}动作 {cycleIndex}/{actionPeriod.validationDays}</b> : null}
              <span>{performanceLabel(rate, target, actual)} · 目标 {formatMoney(target)}</span>
              <strong>{formatPercent(rate)}</strong>
              <i><em style={{ width: `${Math.min(rate, 100)}%` }} /></i>
              <small>完成 {formatMoney(actual)}</small>
            </div>
          </button>
        )
      })}
    </div>
  )
}

function YearBoard({ month, company, monthActual, monthTarget }: { month: string; company: string; monthActual: number; monthTarget: number }) {
  const currentMonthNumber = Number(month.slice(5, 7))
  return (
    <div className="task-calendar-year-board">
      {Array.from({ length: 12 }, (_, index) => {
        const monthNumber = index + 1
        const active = monthNumber === currentMonthNumber
        const rate = active && monthTarget > 0 ? (monthActual / monthTarget) * 100 : 0
        return (
          <article className={active ? 'active' : ''} key={monthNumber}>
            <span>{monthNumber}月</span>
            <strong>{active ? formatPercent(rate) : '待接入'}</strong>
            <p>{active ? `${company} ${formatMoney(monthActual)} / ${formatMoney(monthTarget)}` : '切换月份后读取数据'}</p>
          </article>
        )
      })}
    </div>
  )
}

function BusinessDataBoard({
  canEdit,
  companyUnits,
  forms,
  metrics,
  notice,
  onAddUnit,
  onSaveUnit,
  onUpdateForm,
  savingUnitId,
  selectedCompany,
  selectedDate,
  setUnitDraft,
  setUnitType,
  unitDraft,
  unitType,
}: {
  canEdit: boolean
  companyUnits: BusinessUnit[]
  forms: Record<string, Record<string, string>>
  metrics: BusinessMetric[]
  notice: string
  onAddUnit: () => void
  onSaveUnit: (unit: BusinessUnit) => void
  onUpdateForm: (unitId: string, key: string, value: string) => void
  savingUnitId: string
  selectedCompany: string
  selectedDate: string
  setUnitDraft: (value: string) => void
  setUnitType: (value: 'store' | 'business') => void
  unitDraft: string
  unitType: 'store' | 'business'
}) {
  const monthlyRevenue = metrics.reduce((sum, metric) => sum + metricRevenue(metric), 0)
  const monthlyCost = metrics.reduce((sum, metric) => sum + Number(metric.costExpense || metric.promotionFee || 0), 0)
  const totalImpressions = metrics.reduce((sum, metric) => sum + Number(metric.impressions || 0), 0)

  return (
    <section className="task-calendar-business-board">
      <div className="task-calendar-business-summary">
        <article><span>月度营收</span><strong>{formatMoney(monthlyRevenue)}</strong></article>
        <article><span>成本/推广</span><strong>{formatMoney(monthlyCost)}</strong></article>
        <article><span>曝光量</span><strong>{formatNumber(totalImpressions)}</strong></article>
      </div>
      {canEdit ? (
        <div className="task-calendar-add-unit">
          <select value={unitType} onChange={(event) => setUnitType(event.currentTarget.value as 'store' | 'business')}>
            <option value="store">店铺</option>
            <option value="business">业务</option>
          </select>
          <input value={unitDraft} onChange={(event) => setUnitDraft(event.currentTarget.value)} placeholder="例如：最家西子抖音旗舰店" />
          <button className="task-calendar-primary" type="button" onClick={onAddUnit}>添加</button>
        </div>
      ) : null}
      <div className="task-calendar-business-entry">
        <div>
          <h3>当日填报</h3>
          <p>{selectedCompany} / {selectedDate}</p>
        </div>
        {companyUnits.map((unit) => {
          const fields = unit.type === 'business' ? businessFields : storeFields
          return (
            <article className="task-calendar-business-row" key={unit.id}>
              <div className="task-calendar-business-title">
                <strong>{unit.name}</strong>
                <span>{unit.type === 'business' ? '业务' : '店铺'} · {unit.company}</span>
              </div>
              <div className="task-calendar-business-fields">
                {fields.map((field) => (
                  <label key={field.key}>
                    {field.label}
                    <input type="number" step="0.01" disabled={!canEdit} value={forms[unit.id]?.[field.key] ?? ''} onChange={(event) => onUpdateForm(unit.id, field.key, event.currentTarget.value)} />
                  </label>
                ))}
                <label className="note">
                  备注
                  <input disabled={!canEdit} value={forms[unit.id]?.note ?? ''} onChange={(event) => onUpdateForm(unit.id, 'note', event.currentTarget.value)} placeholder="数据来源 / 异常说明" />
                </label>
              </div>
              {canEdit ? (
                <button className="task-calendar-light-button" type="button" onClick={() => onSaveUnit(unit)} disabled={savingUnitId === unit.id}>
                  {savingUnitId === unit.id ? '保存中' : '保存'}
                </button>
              ) : null}
            </article>
          )
        })}
        {!companyUnits.length ? <p className="task-calendar-empty">当前公司暂无经营主体，请先新增店铺或业务。</p> : null}
        {notice ? <p className="task-calendar-inline-notice">{notice}</p> : null}
      </div>
      <div className="task-calendar-record-table">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>经营主体</th>
              <th>类型</th>
              <th>GMV</th>
              <th>GSV</th>
              <th>退货率</th>
              <th>推广费</th>
              <th>曝光</th>
              <th>营收</th>
              <th>成本</th>
              <th>折算完成</th>
            </tr>
          </thead>
          <tbody>
            {metrics.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 60).map((metric) => (
              <tr key={metric.id}>
                <td>{metric.date}</td>
                <td>{metric.unitName}</td>
                <td>{metric.unitType === 'business' ? '业务' : '店铺'}</td>
                <td>{formatNumber(metric.gmv)}</td>
                <td>{formatNumber(metric.gsv ?? metric.estimatedGsv)}</td>
                <td>{formatNumber(metric.returnRate)}%</td>
                <td>{formatNumber(metric.promotionFee)}</td>
                <td>{formatNumber(metric.impressions)}</td>
                <td>{formatNumber(metric.revenue)}</td>
                <td>{formatNumber(metric.costExpense)}</td>
                <td>{formatMoney(metricRevenue(metric))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
