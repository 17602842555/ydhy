import { useEffect, useMemo, useState } from 'react'
import { Building2, ChevronLeft, ChevronRight, Save, Target } from 'lucide-react'

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

async function login(apiBaseUrl: string, userId: string, signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId }),
    signal,
  })
  if (!response.ok) throw new Error(`登录后端失败：${response.status}`)
  const result = (await response.json()) as { token?: string; user?: AuthUser }
  if (!result.token || !result.user) throw new Error('后端没有返回登录会话')
  return { token: result.token, user: result.user }
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
  const [activeUserId, setActiveUserId] = useState('')
  const [activeUser, setActiveUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState('')
  const [visibleMonth, setVisibleMonth] = useState(monthOf(today()))
  const [selectedDate, setSelectedDate] = useState(today())
  const [selectedCompany, setSelectedCompany] = useState('')
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'year' | 'business'>('month')
  const [forms, setForms] = useState<Record<string, Record<string, string>>>({})
  const [unitDraft, setUnitDraft] = useState('')
  const [unitType, setUnitType] = useState<'store' | 'business'>('store')
  const [targetOpen, setTargetOpen] = useState(false)
  const [targetAmount, setTargetAmount] = useState('')
  const [targetMode, setTargetMode] = useState<'daily' | 'none'>('daily')
  const [savingUnitId, setSavingUnitId] = useState('')
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
        setActiveUserId(preferred?.id || '')
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return
        setLoadState({ status: 'error', message: error.message })
      })
    return () => controller.abort()
  }, [apiBaseUrl])

  useEffect(() => {
    if (!activeUserId) return
    const controller = new AbortController()
    login(apiBaseUrl, activeUserId, controller.signal)
      .then(async (session) => {
        const response = await fetch(`${apiBaseUrl}/task-calendar?month=${visibleMonth}`, {
          headers: { Authorization: `Bearer ${session.token}` },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`读取填报数据失败：${response.status}`)
        const data = (await response.json()) as TaskCalendarData
        setToken(session.token)
        setActiveUser(session.user)
        setLoadState({ status: 'ready', data })
        setSelectedCompany((current) => {
          const preferredCompany = preferredCompanyFromHash()
          if (session.user.roleCode !== 'subsidiary_owner' && (!preferredCompany || preferredCompany === allCompaniesLabel)) return allCompaniesLabel
          if (preferredCompany && data.companies.includes(preferredCompany)) return preferredCompany
          if (current === allCompaniesLabel && session.user.roleCode !== 'subsidiary_owner') return current
          if (data.companies.includes(current)) return current
          return data.companies[0] || ''
        })
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return
        setLoadState({ status: 'error', message: error.message })
      })
    return () => controller.abort()
  }, [activeUserId, apiBaseUrl, visibleMonth])

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
    () => activeData?.metrics.filter((metric) => targetCompanies.includes(metric.company)) ?? [],
    [activeData, targetCompanies],
  )
  const selectedEntries = useMemo(
    () => activeData?.entries.filter((entry) => targetCompanies.includes(entry.company) && entry.date === selectedDate) ?? [],
    [activeData, targetCompanies, selectedDate],
  )
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
    setTargetOpen(true)
  }

  function metricRowsForCompany(company: string) {
    return activeData?.metrics.filter((metric) => metric.company === company) ?? []
  }

  function entryRowsForCompany(company: string) {
    return activeData?.entries.filter((entry) => entry.company === company) ?? []
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

  function dayActual(date: string) {
    const metrics = dayMetricRows(date)
    if (metrics.length) return metrics.reduce((sum, metric) => sum + metricRevenue(metric), 0)
    return dayEntryRows(date).reduce((sum, entry) => sum + Number(entry.revenueActual || 0), 0)
  }

  function dayTarget(date: string) {
    const entryTarget = dayEntryRows(date).reduce((sum, entry) => sum + Number(entry.revenueTarget || 0), 0)
    if (entryTarget > 0) return entryTarget
    if (!monthTarget) return 0
    return selectedTarget?.allocationMode === 'daily' && selectedTarget.dailyTarget > 0 && selectedCompany !== allCompaniesLabel
      ? selectedTarget.dailyTarget
      : monthTarget / daysInMonth(visibleMonth)
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
    setTargetOpen(false)
    setNotice('月度目标已保存，并同步重算监管看板。')
    onSaved?.()
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
  }

  if (loadState.status === 'error') {
    return (
      <section className={`task-calendar-shell ${standalone ? 'task-calendar-standalone' : ''}`}>
        <div className="task-calendar-error">{loadState.message}</div>
      </section>
    )
  }

  const selectedDateActual = dayActual(selectedDate)
  const selectedDateTarget = dayTarget(selectedDate)
  const selectedDateRate = selectedDateTarget > 0 ? (selectedDateActual / selectedDateTarget) * 100 : 0

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
          <label>
            当前账号
            <select value={activeUserId} onChange={(event) => setActiveUserId(event.currentTarget.value)}>
              {loginUsers.map((user) => <option value={user.id} key={user.id}>{user.displayName}</option>)}
            </select>
          </label>
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
        </aside>

        <section className="task-calendar-main-panel">
          <div className="task-calendar-toolbar">
            <button className="task-calendar-icon-button" type="button" onClick={() => changeMonth(shiftMonth(visibleMonth, -1))} aria-label="上个月">
              <ChevronLeft size={18} />
            </button>
            <div>
              <h2>{viewMode === 'business' ? `${visibleMonth} 经营数据` : monthLabel(visibleMonth)}</h2>
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
            <button className="task-calendar-icon-button" type="button" onClick={() => changeMonth(shiftMonth(visibleMonth, 1))} aria-label="下个月">
              <ChevronRight size={18} />
            </button>
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
            <CalendarGrid dates={weekDays(selectedDate)} month={visibleMonth} selectedDate={selectedDate} mode="week" dayActual={dayActual} dayTarget={dayTarget} onSelectDate={setSelectedDate} />
          ) : viewMode === 'year' ? (
            <YearBoard month={visibleMonth} monthActual={monthActual} monthTarget={monthTarget} company={selectedCompany} />
          ) : (
            <>
              <div className="task-calendar-weekdays">{weekdays.map((day) => <span key={day}>{day}</span>)}</div>
              <CalendarGrid dates={calendarDays(visibleMonth)} month={visibleMonth} selectedDate={selectedDate} mode="month" dayActual={dayActual} dayTarget={dayTarget} onSelectDate={setSelectedDate} />
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
              <button className="task-calendar-primary" type="button" disabled={!canEdit} onClick={openTargetEditor}>设置目标</button>
            </div>
            <div className="task-calendar-target-card">
              <strong>当日总体营业额目标</strong>
              <span>{selectedCompany} · {activeUser?.displayName || '填报账号'}</span>
              <p>目标营业额：{formatMoney(selectedDateTarget)} · 已完成：{formatMoney(selectedDateActual)} · 完成率：{formatPercent(selectedDateRate)}</p>
              <div className="task-calendar-progress-line"><i style={{ width: `${Math.min(selectedDateRate, 100)}%` }} /></div>
            </div>
            <div className="task-calendar-entry-list">
              {selectedEntries.length ? selectedEntries.slice(0, 14).map((entry) => (
                <article key={entry.id}>
                  <strong>{entry.task}</strong>
                  <span>{entry.company} · {entry.owner || '填报账号'} · {formatMoney(entry.revenueActual || 0)}</span>
                  <em>目标 {formatMoney(entry.revenueTarget || 0)}{entry.risk ? ` · 风险：${entry.risk}` : entry.action ? ` · ${entry.action}` : ''}</em>
                </article>
              )) : <p className="task-calendar-empty">当天暂无经营数据，切换到“经营数据”填报。</p>}
            </div>
          </section>
        </aside>
      </main>

      {targetOpen ? (
        <div className="task-calendar-modal" role="dialog" aria-modal="true">
          <div className="task-calendar-modal-card">
            <div className="task-calendar-modal-head">
              <Target size={20} />
              <div>
                <h2>填写月度目标</h2>
                <p>{selectedCompany} / {monthLabel(visibleMonth)}</p>
              </div>
            </div>
            <label className="task-calendar-field">
              月度目标营业额（元）
              <input type="number" min="1" step="1" value={targetAmount} onChange={(event) => setTargetAmount(event.currentTarget.value)} placeholder="例如：1000000" />
            </label>
            <label className="task-calendar-field">
              分配方式
              <select value={targetMode} onChange={(event) => setTargetMode(event.currentTarget.value as 'daily' | 'none')}>
                <option value="daily">平均分到每日</option>
                <option value="none">只保存月度目标</option>
              </select>
            </label>
            <p className="task-calendar-target-preview">
              {targetAmount ? `保存后本月目标 ${formatMoney(Number(targetAmount))}，日历会按 ${formatMoney(Number(targetAmount) / daysInMonth(visibleMonth))} 估算每日进度。` : '填写后将自动重算月目标、完成额和监管看板完成率。'}
            </p>
            <div className="task-calendar-modal-actions">
              <button className="task-calendar-light-button" type="button" onClick={() => setTargetOpen(false)}>取消</button>
              <button className="task-calendar-primary" type="button" onClick={saveMonthlyTarget}><Save size={16} /> 保存目标</button>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? <div className="task-calendar-toast" role="status">{notice}</div> : null}
    </section>
  )
}

function CalendarGrid({
  dates,
  month,
  selectedDate,
  mode,
  dayActual,
  dayTarget,
  onSelectDate,
}: {
  dates: string[]
  month: string
  selectedDate: string
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
        return (
          <button className={`${isMuted ? 'muted' : ''} ${isSelected ? 'selected' : ''}`} type="button" key={date} onClick={() => onSelectDate(date)}>
            <div className="task-calendar-day-number">
              <strong>{Number(date.slice(8, 10))}</strong>
              {isToday ? <span>今天</span> : null}
            </div>
            <div className="task-calendar-day-card">
              <span>目标 {formatMoney(target)}</span>
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
