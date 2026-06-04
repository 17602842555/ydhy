import { useEffect, useMemo, useState } from 'react'
import { AiSectionPanel } from './AiSectionPanel'
import type { AiSettings } from './aiClient'
import { SELECTED_MONTH_STORAGE_KEY, currentMonth, isMonth, readSelectedMonth, writeSelectedMonth } from './selectedMonth'

type Metric = { label: string; value: string; note?: string }
type RankRow = { status: string; cells: string[] }
type BarItem = { label: string; value: string; width: string }
type FillField = { label: string; value: string; placeholder: string }
type FillModule = { title: string; hint?: string; fields: FillField[] }
type ActionVerification = {
  status: string
  label: string
  date?: string
  verifyDate?: string
  validationDays?: number
  verificationDue?: boolean
  periodStartDate?: string
  periodEndDate?: string
  baselineStartDate?: string
  baselineEndDate?: string
  action: string
  expectation?: string
  expectedGmvGrowthRate?: number | null
  actualGmvGrowthRate?: number | null
  complianceRate?: number | null
  baseGmv?: number | null
  verifyGmv?: number | null
  owner?: string
}
type CompanyCard = {
  name: string
  status: string
  score: string
  metrics: Metric[]
  summary: string
  bars: BarItem[]
  actionVerification?: ActionVerification | null
  actionVerifications?: ActionVerification[]
  fillModules: FillModule[]
  dailyHeaders: string[]
  dailyRows: RankRow[]
}
type SubcompanyDashboard = {
  title: string
  subtitle: string
  metrics: Metric[]
  rankHeaders: string[]
  rankRows: RankRow[]
  companies: CompanyCard[]
}

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: SubcompanyDashboard }
  | { status: 'error'; message: string }

const STATUS_LABELS: Record<string, string> = {
  good: '达标',
  warn: '关注',
  bad: '风险',
  zero: '未发生',
  empty: '待定',
}

function cleanText(value?: string | null) {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function getText(root: ParentNode, selector: string) {
  return cleanText(root.querySelector(selector)?.textContent)
}

function getStatus(className: string) {
  return ['good', 'warn', 'bad', 'zero', 'empty'].find((name) => className.split(/\s+/).includes(name)) ?? 'empty'
}

function parseTable(table: Element | null) {
  const headers = Array.from(table?.querySelectorAll('thead th') ?? []).map((cell) => cleanText(cell.textContent))
  const rows = Array.from(table?.querySelectorAll('tbody tr') ?? []).map((row) => ({
    status: getStatus(row.className),
    cells: Array.from(row.querySelectorAll('td')).map((cell) => cleanText(cell.textContent)),
  }))
  return { headers, rows }
}

function parseFillModule(module: Element): FillModule {
  const title = cleanText(module.querySelector('summary span')?.textContent || module.querySelector('summary')?.textContent)
  const hint = cleanText(module.querySelector('.fill-hint')?.textContent)
  const fields = Array.from(module.querySelectorAll('textarea')).map((field) => {
    const label = cleanText(field.closest('.fill-field')?.querySelector('label')?.textContent || field.parentElement?.querySelector('label')?.textContent)
    return {
      label,
      value: (field as HTMLTextAreaElement).value || cleanText(field.textContent),
      placeholder: field.getAttribute('placeholder') ?? '',
    }
  })

  return { title, hint, fields }
}

function parseDashboard(html: string): SubcompanyDashboard {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const rankTable = parseTable(doc.querySelector('.rank table'))

  const metrics = Array.from(doc.querySelectorAll('.hero-grid .hero-card')).map((card) => ({
    label: getText(card, 'span'),
    value: getText(card, 'b'),
    note: getText(card, 'small'),
  }))

  const companies = Array.from(doc.querySelectorAll('.company-card')).map((card) => {
    const bars = Array.from(card.querySelectorAll('.bars label')).map((label) => {
      const value = cleanText(label.querySelector('span')?.textContent)
      const labelClone = label.cloneNode(true) as HTMLElement
      labelClone.querySelector('span')?.remove()
      const progress = label.nextElementSibling?.querySelector('em') as HTMLElement | null
      return {
        label: cleanText(labelClone.textContent),
        value,
        width: progress?.style.width || '0%',
      }
    })
    const dailyTable = parseTable(card.querySelector('.daily-details table'))

    return {
      name: getText(card, '.card-head h2'),
      status: getStatus(card.className),
      score: getText(card, '.score'),
      metrics: Array.from(card.querySelectorAll('.metrics div')).map((metric) => ({
        label: getText(metric, 'span'),
        value: getText(metric, 'b'),
      })),
      summary: getText(card, '.summary-box p'),
      bars,
      fillModules: Array.from(card.querySelectorAll('.edit-module')).map(parseFillModule),
      dailyHeaders: dailyTable.headers,
      dailyRows: dailyTable.rows,
    }
  })

  return {
    title: getText(doc, 'h1') || doc.title,
    subtitle: getText(doc, '.subtitle'),
    metrics,
    rankHeaders: rankTable.headers,
    rankRows: rankTable.rows,
    companies,
  }
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? '待定'
}

function formatPercentValue(value?: number | null) {
  if (!Number.isFinite(Number(value))) return '待验证'
  const number = Number(value)
  if (Math.abs(number) >= 100) return `${number.toFixed(0)}%`
  if (Math.abs(number) >= 10) return `${number.toFixed(1).replace(/\.0$/, '')}%`
  return `${number.toFixed(1).replace(/\.0$/, '')}%`
}

function actionMetricValue(item: ActionVerification, field: 'actualGmvGrowthRate' | 'complianceRate') {
  if (item.status === 'pending' || item.verificationDue === false) {
    return field === 'complianceRate' ? '未到验证节点' : '验证中'
  }
  return formatPercentValue(item[field])
}

function formatMoneyValue(value?: number | null) {
  const number = Number(value || 0)
  if (Math.abs(number) >= 10000) return `${formatCompactNumber(number / 10000)}万`
  return `¥${formatCompactNumber(number)}`
}

function formatCompactNumber(value?: number | null) {
  const number = Number(value || 0)
  if (Math.abs(number) >= 100) return number.toFixed(0)
  if (Math.abs(number) >= 10) return number.toFixed(1).replace(/\.0$/, '')
  return number.toFixed(1).replace(/\.0$/, '')
}

function companyAnchor(name: string) {
  return `subcompany-${encodeURIComponent(name)}`
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split('-')
  if (!year || !monthNumber) return month
  return `${year}年${String(Number(monthNumber)).padStart(2, '0')}月`
}

function TableView({ headers, rows, compact = false }: { headers: readonly string[]; rows: readonly RankRow[]; compact?: boolean }) {
  return (
    <div className={`subcompany-table-wrap ${compact ? 'compact' : ''}`}>
      <table className="subcompany-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr className={`subcompany-row-${row.status}`} key={`${row.cells[0]}-${index}`}>
              {row.cells.map((cell, cellIndex) => (
                <td key={`${cell}-${cellIndex}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CompanySection({ company, apiBaseUrl, aiSettings }: { company: CompanyCard; apiBaseUrl: string; aiSettings: AiSettings }) {
  return (
    <article className={`subcompany-card status-${company.status}`} id={companyAnchor(company.name)}>
      <header className="subcompany-card-head">
        <div>
          <span>{statusLabel(company.status)}</span>
          <h3>{company.name}</h3>
        </div>
        <strong>{company.score}</strong>
      </header>

      <div className="subcompany-mini-metrics">
        {company.metrics.map((metric) => (
          <div key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>

      <p className="subcompany-summary">{company.summary}</p>

      <div className="subcompany-bars">
        {company.bars.map((bar) => (
          <div className="subcompany-bar" key={bar.label}>
            <div>
              <span>{bar.label}</span>
              <strong>{bar.value}</strong>
            </div>
            <i><em style={{ width: bar.width }} /></i>
          </div>
        ))}
      </div>

      <ActionVerificationCard verification={company.actionVerification} verifications={company.actionVerifications} />

      <AiSectionPanel
        compact
        section="subcompany-company"
        apiBaseUrl={apiBaseUrl}
        aiSettings={aiSettings}
        context={{ label: `${company.name}经营卡片`, companyName: company.name, company }}
      />

      {company.fillModules.length ? (
        <details className="subcompany-details">
          <summary>每日填写模块</summary>
          <div className="subcompany-fill-grid">
            {company.fillModules.map((module) => (
              <section key={module.title}>
                <h4>{module.title}</h4>
                {module.hint ? <p>{module.hint}</p> : null}
                {module.fields.map((field) => (
                  <label key={`${module.title}-${field.label || field.placeholder}`}>
                    {field.label || '填写项'}
                    <textarea defaultValue={field.value} placeholder={field.placeholder} />
                  </label>
                ))}
              </section>
            ))}
          </div>
        </details>
      ) : null}

      {company.dailyRows.length ? (
        <details className="subcompany-details">
          <summary>本月每日明细</summary>
          <TableView compact headers={company.dailyHeaders} rows={company.dailyRows} />
        </details>
      ) : null}
    </article>
  )
}

function ActionVerificationCard({ verification, verifications }: { verification?: ActionVerification | null; verifications?: ActionVerification[] }) {
  const items = verifications?.length ? verifications : (verification ? [verification] : [])
  const [index, setIndex] = useState(0)
  const safeIndex = items.length ? Math.min(index, items.length - 1) : 0
  const item = items[safeIndex] ?? {
    status: 'empty',
    label: '待填写动作',
    action: '暂无当日动作和预期。',
  }
  const periodStart = item.periodStartDate || item.date
  const periodEnd = item.periodEndDate || item.verifyDate
  const periodLabel = periodStart && periodEnd ? `${periodStart} → ${periodEnd}` : '等待填报'
  const canFlip = items.length > 1

  return (
    <section className={`subcompany-action-card status-${item.status}`}>
      <div className="subcompany-action-card-head">
        <div>
          <span>动作与验证</span>
          <strong>{item.label}</strong>
        </div>
        <em>{periodLabel}{item.validationDays ? ` · ${item.validationDays}天` : ''}</em>
      </div>
      {canFlip ? (
        <div className="subcompany-action-pager">
          <button type="button" onClick={() => setIndex((current) => (current <= 0 ? items.length - 1 : current - 1))}>上一个动作</button>
          <span>{safeIndex + 1} / {items.length}</span>
          <button type="button" onClick={() => setIndex((current) => (current + 1) % items.length)}>下一个动作</button>
        </div>
      ) : null}
      <p>{item.action}</p>
      {item.expectation ? <small>{item.expectation}</small> : null}
      <div className="subcompany-action-metrics">
        <div>
          <span>预期周期涨幅</span>
          <strong>{formatPercentValue(item.expectedGmvGrowthRate)}</strong>
        </div>
        <div>
          <span>实际周期涨幅</span>
          <strong>{actionMetricValue(item, 'actualGmvGrowthRate')}</strong>
        </div>
        <div>
          <span>符合预期</span>
          <strong>{actionMetricValue(item, 'complianceRate')}</strong>
        </div>
      </div>
      {Number.isFinite(Number(item.baseGmv)) || Number.isFinite(Number(item.verifyGmv)) ? (
        <footer>基准周期 GMV {formatMoneyValue(item.baseGmv)} · 验证周期 GMV {formatMoneyValue(item.verifyGmv)}</footer>
      ) : null}
    </section>
  )
}

export function SubcompanySupervisionPage({
  sourceUrl,
  apiBaseUrl,
  aiSettings,
  onBack,
  onOpenEntry,
}: {
  sourceUrl: string
  apiBaseUrl: string
  aiSettings: AiSettings
  onBack: () => void
  onOpenEntry: () => void
}) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [month, setMonth] = useState(readSelectedMonth)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  // Stay in sync with the month selected on the fill page (possibly in another
  // tab): pick up changes written to the shared localStorage key. The load
  // effect below refetches automatically when month changes.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key !== SELECTED_MONTH_STORAGE_KEY || !isMonth(event.newValue)) return
      const next = event.newValue
      setMonth((current) => (current === next ? current : next))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadDashboard({ apiBaseUrl, sourceUrl, month, signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setLoadState({ status: 'ready', data })
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return
        setLoadState({ status: 'error', message: error.message })
      })
    return () => controller.abort()
  }, [apiBaseUrl, sourceUrl, month])

  return (
    <section className="subcompany-page" id="subcompanySupervisionPage">
      <header className="subcompany-hero">
        <div>
          <p>JOSMAN目标金字塔 / 子公司监管分支 / 子公司监管目标</p>
          <h2>{loadState.status === 'ready' ? loadState.data.title : `${monthLabel(month)}子公司目标完成看板`}</h2>
          <span>{loadState.status === 'ready' ? loadState.data.subtitle : '后端数据库联动 / 数据来源：涌动花鱼任务管理经营填报 / 保存后自动重算'}</span>
        </div>
        <div className="subcompany-actions">
          <label className="subcompany-month-picker">
            <span>月份</span>
            <input
              type="month"
              value={month}
              max={currentMonth()}
              onChange={(event) => {
                const value = event.currentTarget.value
                if (!value || value === month) return
                setMonth(value)
                writeSelectedMonth(value)
                setLoadState({ status: 'loading' })
              }}
            />
          </label>
          <button className="btn secondary" type="button" onClick={onOpenEntry}>打开填报页</button>
          <a className="btn secondary subcompany-open-link" href={sourceUrl} target="_blank" rel="noreferrer">原始页面</a>
          <button className="btn secondary" type="button" onClick={onBack}>返回上级</button>
        </div>
      </header>

      {loadState.status === 'loading' ? (
        <div className="panel subcompany-loading">正在读取 {monthLabel(month)} 子公司监管数据...</div>
      ) : loadState.status === 'error' ? (
        <div className="panel subcompany-loading">{loadState.message}</div>
      ) : (
        <SupervisionBody data={loadState.data} apiBaseUrl={apiBaseUrl} aiSettings={aiSettings} />
      )}
    </section>
  )
}

function SupervisionBody({ data, apiBaseUrl, aiSettings }: { data: SubcompanyDashboard; apiBaseUrl: string; aiSettings: AiSettings }) {
  const [query, setQuery] = useState('')

  const filteredCompanies = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return data.companies
    return data.companies.filter((company) => [company.name, company.summary, company.score].join(' ').toLowerCase().includes(value))
  }, [data, query])

  return (
    <>
      <section className="subcompany-metric-grid">
        {data.metrics.map((metric) => (
          <article key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            {metric.note ? <p>{metric.note}</p> : null}
          </article>
        ))}
      </section>
      <AiSectionPanel
        section="subcompany-metrics"
        apiBaseUrl={apiBaseUrl}
        aiSettings={aiSettings}
        context={{ label: '子公司监管总指标', metrics: data.metrics, title: data.title, subtitle: data.subtitle }}
      />
      <AiSectionPanel
        section="subcompany-weekly-report"
        apiBaseUrl={apiBaseUrl}
        aiSettings={aiSettings}
        showDecisionPackage
        context={{
          label: '子公司监管AI周报',
          data: {
            title: data.title,
            subtitle: data.subtitle,
            metrics: data.metrics,
            rankHeaders: data.rankHeaders,
            rankRows: data.rankRows.slice(0, 12),
            companies: data.companies.slice(0, 12).map((company) => ({
              name: company.name,
              status: company.status,
              score: company.score,
              summary: company.summary,
              actionVerification: company.actionVerification,
            })),
          },
        }}
      />

      <section className="panel subcompany-rank-panel">
        <div className="panel-header">
          <div>
            <h3 className="panel-title">监督排行</h3>
            <p className="panel-subtitle">按预计完成率、3天完成率、周完成率和月缺口判断监管优先级</p>
          </div>
        </div>
        <div className="panel-body">
          <TableView headers={data.rankHeaders} rows={data.rankRows} />
          <AiSectionPanel
            section="subcompany-rank"
            apiBaseUrl={apiBaseUrl}
            aiSettings={aiSettings}
            context={{ label: '子公司监管排行', headers: data.rankHeaders, rows: data.rankRows }}
          />
        </div>
      </section>

      <div className="subcompany-toolbar">
        <div>
          <h3>子公司经营卡片</h3>
          <p>{filteredCompanies.length} / {data.companies.length} 个子公司</p>
        </div>
        <input value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="搜索子公司 / 总结 / 完成率" />
      </div>

      <nav className="subcompany-company-nav" aria-label="子公司锚点">
        {filteredCompanies.map((company) => (
          <a className={`status-${company.status}`} href={`#${companyAnchor(company.name)}`} key={company.name}>
            {company.name}
          </a>
        ))}
      </nav>

      <div className="subcompany-card-grid">
        {filteredCompanies.map((company) => (
          <CompanySection company={company} apiBaseUrl={apiBaseUrl} aiSettings={aiSettings} key={company.name} />
        ))}
      </div>
    </>
  )
}

async function loadDashboard({
  apiBaseUrl,
  sourceUrl,
  month,
  signal,
}: {
  apiBaseUrl: string
  sourceUrl: string
  month: string
  signal: AbortSignal
}) {
  try {
    const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user-lijinning', password: '123456' }),
      signal,
    })
    if (!loginResponse.ok) throw new Error(`登录后端失败：${loginResponse.status}`)
    const login = (await loginResponse.json()) as { token?: string }
    if (!login.token) throw new Error('后端没有返回登录 token')
    const response = await fetch(`${apiBaseUrl}/task-calendar/supervision?month=${encodeURIComponent(month)}`, {
      headers: { Authorization: `Bearer ${login.token}` },
      signal,
    })
    if (!response.ok) throw new Error(`读取后端监管数据失败：${response.status}`)
    return (await response.json()) as SubcompanyDashboard
  } catch (error) {
    if (signal.aborted) throw error
    const response = await fetch(sourceUrl, { signal })
    if (!response.ok) throw new Error(`读取下级页面失败：${response.status}`, { cause: error })
    return parseDashboard(await response.text())
  }
}
