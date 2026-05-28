import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Download, Hammer, Plus, ShieldAlert, WalletCards } from 'lucide-react'

type VillaPhase = {
  id: string
  name: string
  zone: string
  owner: string
  start: string
  end: string
  progress: number
  status: string
  acceptance: string
  next: string
}
type VillaIssue = {
  id: string
  title: string
  zone: string
  owner: string
  due: string
  severity: '高' | '中' | '低'
  status: string
  note: string
}
type VillaBudget = { category: string; budget: number }
type VillaExpense = {
  id: string
  date: string
  category: string
  item: string
  vendor: string
  amount: number
  status: string
  voucherType: string
  voucherNo: string
  note: string
}
type VillaZoneSummary = {
  key: string
  title: string
  roomCount: number
  phaseCount: number
  progress: number
  status: 'good' | 'watch' | 'risk' | 'pending'
}
type VillaSummary = {
  overallProgress: number
  activePhases: number
  weekTasks: number
  openIssues: number
  urgentIssues: number
  budgetTotal: number
  expenseTotal: number
  budgetRate: number
}
type VillaProject = {
  title: string
  subtitle: string
  phases: VillaPhase[]
  issues: VillaIssue[]
  budgets: VillaBudget[]
  expenses: VillaExpense[]
  summary: VillaSummary
  zoneSummaries: VillaZoneSummary[]
  generatedAt?: string
}
type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; data: VillaProject }
  | { status: 'error'; message: string }

type AuthSession = { token: string }
type VillaTab = 'overview' | 'construction' | 'inspection' | 'budget'

const demoPassword = '123456'
const statusOptions = ['未开始', '施工中', '待验收', '已完成']
const issueStatusOptions = ['待整改', '整改中', '待复验', '已关闭']
const todayValue = () => new Date().toISOString().slice(0, 10)

export function VillaProjectPage({ apiBaseUrl, onBack }: { apiBaseUrl: string; onBack: () => void }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [token, setToken] = useState('')
  const [activeTab, setActiveTab] = useState<VillaTab>('overview')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [issueFilter, setIssueFilter] = useState('open')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadVillaProject(apiBaseUrl, controller.signal)
      .then(({ session, data }) => {
        setToken(session.token)
        setLoadState({ status: 'ready', data })
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return
        setLoadState({ status: 'error', message: error.message })
      })
    return () => controller.abort()
  }, [apiBaseUrl])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 1800)
    return () => window.clearTimeout(timer)
  }, [notice])

  const data = loadState.status === 'ready' ? loadState.data : null
  const filteredPhases = useMemo(() => {
    if (!data) return []
    if (phaseFilter === 'all') return data.phases
    return data.phases.filter((phase) => phase.status === phaseFilter)
  }, [data, phaseFilter])
  const filteredIssues = useMemo(() => {
    if (!data) return []
    if (issueFilter === 'open') return data.issues.filter((issue) => issue.status !== '已关闭')
    if (issueFilter === 'all') return data.issues
    return data.issues.filter((issue) => issue.severity === issueFilter || issue.status === issueFilter)
  }, [data, issueFilter])
  const upcomingPhases = useMemo(() => (data?.phases ?? []).filter((phase) => phase.status !== '已完成').slice(0, 8), [data])

  async function postProject(path: string, body: Record<string, FormDataEntryValue | number>) {
    if (!token) return
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(await response.text())
    const result = await response.json() as { villaProject: VillaProject }
    setLoadState({ status: 'ready', data: result.villaProject })
  }

  async function patchProject(path: string, body: Record<string, string | number>) {
    if (!token) return
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!response.ok) throw new Error(await response.text())
    const result = await response.json() as { villaProject: VillaProject }
    setLoadState({ status: 'ready', data: result.villaProject })
  }

  async function handlePhaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    try {
      await postProject('/villa-project/phases', { ...payload, progress: Number(payload.progress || 0) })
      form.reset()
      setNotice('施工任务已写入后端')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
    }
  }

  async function handleIssueSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    try {
      await postProject('/villa-project/issues', payload)
      form.reset()
      setNotice('整改问题已写入后端')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
    }
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    try {
      await postProject('/villa-project/expenses', { ...payload, amount: Number(payload.amount || 0) })
      form.reset()
      setNotice('预算支出已写入后端')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
    }
  }

  async function updatePhase(phase: VillaPhase, next: Partial<VillaPhase>) {
    try {
      await patchProject(`/villa-project/phases/${encodeURIComponent(phase.id)}`, { ...phase, ...next })
      setNotice('施工进度已同步')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新失败')
    }
  }

  async function updateIssue(issue: VillaIssue, next: Partial<VillaIssue>) {
    try {
      await patchProject(`/villa-project/issues/${encodeURIComponent(issue.id)}`, { ...issue, ...next })
      setNotice('整改状态已同步')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新失败')
    }
  }

  function exportCsv() {
    if (!data) return
    const rows = [
      ['类型', '日期/开始', '截止', '区域/分类', '事项', '负责人/供应商', '进度/金额', '状态', '备注'],
      ...data.phases.map((phase) => ['施工', phase.start, phase.end, phase.zone, phase.name, phase.owner, `${phase.progress}%`, phase.status, `${phase.acceptance}；${phase.next}`]),
      ...data.issues.map((issue) => ['整改', '', issue.due, issue.zone, issue.title, issue.owner, issue.severity, issue.status, issue.note]),
      ...data.expenses.map((expense) => ['预算', expense.date, '', expense.category, expense.item, expense.vendor, String(expense.amount), expense.status, `${expense.voucherType} ${expense.voucherNo}；${expense.note}`]),
    ]
    const csv = `\ufeff${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = '华哥别墅项目看板.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  if (loadState.status === 'loading') {
    return (
      <section className="subcompany-page villa-page">
        <button className="btn secondary" type="button" onClick={onBack}>返回专项项目分支</button>
        <div className="panel subcompany-loading">正在读取别墅项目后端数据...</div>
      </section>
    )
  }

  if (loadState.status === 'error') {
    return (
      <section className="subcompany-page villa-page">
        <button className="btn secondary" type="button" onClick={onBack}>返回专项项目分支</button>
        <div className="panel subcompany-loading">{loadState.message}</div>
      </section>
    )
  }

  if (!data) return null

  return (
    <section className="subcompany-page villa-page" id="villaProjectPage">
      <header className="subcompany-hero villa-hero">
        <div>
          <p>JOSMAN目标金字塔 / 专项项目分支 / 别墅项目目标</p>
          <h2>{data.title}</h2>
          <span>{data.subtitle}。新增或修改施工、整改和预算数据后，会直接写入 Cloudflare 后端数据库。</span>
        </div>
        <div className="subcompany-actions">
          <button className="btn secondary" type="button" onClick={exportCsv}><Download size={16} /> 导出CSV</button>
          <button className="btn secondary" type="button" onClick={onBack}>返回上级</button>
        </div>
      </header>

      <section className="subcompany-metric-grid villa-metric-grid">
        <MetricCard label="总体进度" value={`${formatNumber(data.summary.overallProgress)}%`} note={`${data.summary.activePhases} 项未完成`} icon={<Hammer size={17} />} />
        <MetricCard label="7天内节点" value={String(data.summary.weekTasks)} note="需盯紧交付" />
        <MetricCard label="待整改问题" value={String(data.summary.openIssues)} note={`${data.summary.urgentIssues} 个高风险`} icon={<ShieldAlert size={17} />} />
        <MetricCard label="预算使用率" value={`${formatNumber(data.summary.budgetRate)}%`} note={`已登记 ${formatMoney(data.summary.expenseTotal)}`} icon={<WalletCards size={17} />} />
      </section>

      <div className="villa-tabs" role="tablist" aria-label="别墅项目模块">
        {[
          ['overview', '总览'],
          ['construction', '施工进度'],
          ['inspection', '监督整改'],
          ['budget', '预算支出'],
        ].map(([key, label]) => (
          <button className={activeTab === key ? 'active' : ''} type="button" key={key} onClick={() => setActiveTab(key as VillaTab)}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div className="villa-overview-grid">
          <section className="panel villa-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">别墅施工热区</h3>
                <p className="panel-subtitle">按楼层/空间汇总施工任务与进度</p>
              </div>
            </div>
            <div className="villa-zone-grid">
              {data.zoneSummaries.map((zone) => (
                <article className={`villa-zone-card status-${zone.status}`} key={zone.key}>
                  <div>
                    <strong>{zone.title}</strong>
                    <span>{zone.roomCount} 个空间 / {zone.phaseCount} 项任务</span>
                  </div>
                  <em>{formatNumber(zone.progress)}%</em>
                  <i><b style={{ width: `${Math.min(zone.progress, 100)}%` }} /></i>
                </article>
              ))}
            </div>
          </section>

          <section className="panel villa-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">本周盯办</h3>
                <p className="panel-subtitle">按当前未完成任务取前 8 项</p>
              </div>
            </div>
            <div className="villa-compact-list">
              {upcomingPhases.map((phase) => <PhaseMini phase={phase} key={phase.id} />)}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === 'construction' ? (
        <>
          <section className="panel villa-panel">
            <div className="villa-toolbar">
              <div>
                <h3>施工任务</h3>
                <p>{filteredPhases.length} / {data.phases.length} 项</p>
              </div>
              <select value={phaseFilter} onChange={(event) => setPhaseFilter(event.currentTarget.value)}>
                <option value="all">全部状态</option>
                {statusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
              </select>
            </div>
            <div className="villa-phase-list">
              {filteredPhases.map((phase) => <PhaseRow key={phase.id} phase={phase} onUpdate={updatePhase} />)}
            </div>
          </section>
          <VillaFormPanel title="新增施工任务">
            <form className="villa-entry-form" onSubmit={handlePhaseSubmit}>
              <input name="name" required placeholder="工序，如：中央空调安装" />
              <input name="zone" required placeholder="区域，如：2F 主卧" />
              <input name="owner" required placeholder="负责人" />
              <input name="start" type="date" defaultValue={todayValue()} required />
              <input name="end" type="date" defaultValue={todayValue()} required />
              <input name="progress" type="number" min="0" max="100" defaultValue="0" required />
              <select name="status" defaultValue="施工中">{statusOptions.map((status) => <option key={status}>{status}</option>)}</select>
              <input className="wide" name="acceptance" required placeholder="验收口径" />
              <input className="wide" name="next" required placeholder="下一步动作" />
              <button className="btn primary wide" type="submit"><Plus size={16} /> 添加任务</button>
            </form>
          </VillaFormPanel>
        </>
      ) : null}

      {activeTab === 'inspection' ? (
        <>
          <section className="panel villa-panel">
            <div className="villa-toolbar">
              <div>
                <h3>整改问题池</h3>
                <p>{filteredIssues.length} / {data.issues.length} 条</p>
              </div>
              <select value={issueFilter} onChange={(event) => setIssueFilter(event.currentTarget.value)}>
                <option value="open">未关闭</option>
                <option value="all">全部</option>
                <option value="高">高风险</option>
                {issueStatusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
              </select>
            </div>
            <div className="villa-issue-grid">
              {filteredIssues.map((issue) => <IssueCard key={issue.id} issue={issue} onUpdate={updateIssue} />)}
            </div>
          </section>
          <VillaFormPanel title="新增监督问题">
            <form className="villa-entry-form" onSubmit={handleIssueSubmit}>
              <input className="wide" name="title" required placeholder="问题标题" />
              <input name="zone" required placeholder="区域" />
              <input name="owner" required placeholder="负责人" />
              <input name="due" type="date" defaultValue={todayValue()} required />
              <select name="severity" defaultValue="中"><option>高</option><option>中</option><option>低</option></select>
              <select name="status" defaultValue="待整改">{issueStatusOptions.map((status) => <option key={status}>{status}</option>)}</select>
              <input className="wide" name="note" required placeholder="整改说明 / 验收口径" />
              <button className="btn primary wide" type="submit"><Plus size={16} /> 添加问题</button>
            </form>
          </VillaFormPanel>
        </>
      ) : null}

      {activeTab === 'budget' ? (
        <>
          <section className="panel villa-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">预算分类</h3>
                <p className="panel-subtitle">预算总额 {formatMoney(data.summary.budgetTotal)}，已登记 {formatMoney(data.summary.expenseTotal)}</p>
              </div>
            </div>
            <div className="villa-budget-grid">
              {data.budgets.map((budget) => {
                const used = data.expenses.filter((expense) => expense.category === budget.category).reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
                const rate = budget.budget > 0 ? used / budget.budget * 100 : 0
                return (
                  <article key={budget.category}>
                    <span>{budget.category}</span>
                    <strong>{formatMoney(used)}</strong>
                    <em>/ {formatMoney(budget.budget)}</em>
                    <i><b style={{ width: `${Math.min(rate, 100)}%` }} /></i>
                  </article>
                )
              })}
            </div>
          </section>
          <section className="panel villa-panel">
            <div className="villa-table-wrap">
              <table className="subcompany-table villa-table">
                <thead><tr><th>日期</th><th>分类</th><th>事项</th><th>供应商</th><th>金额</th><th>状态</th><th>凭证</th></tr></thead>
                <tbody>
                  {data.expenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{expense.date}</td>
                      <td>{expense.category}</td>
                      <td>{expense.item}</td>
                      <td>{expense.vendor}</td>
                      <td>{formatMoney(expense.amount)}</td>
                      <td>{expense.status}</td>
                      <td>{expense.voucherType} / {expense.voucherNo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <VillaFormPanel title="新增预算支出">
            <form className="villa-entry-form" onSubmit={handleExpenseSubmit}>
              <input name="date" type="date" defaultValue={todayValue()} required />
              <input name="category" required placeholder="分类，如：基础施工" />
              <input name="item" required placeholder="事项" />
              <input name="vendor" required placeholder="供应商" />
              <input name="amount" type="number" min="0" step="0.01" required placeholder="金额" />
              <select name="status" defaultValue="已付"><option>已付</option><option>合同</option><option>待付</option><option>已取消</option></select>
              <input name="voucherType" placeholder="凭证类型" />
              <input name="voucherNo" placeholder="凭证号" />
              <input className="wide" name="note" placeholder="备注" />
              <button className="btn primary wide" type="submit"><Plus size={16} /> 添加支出</button>
            </form>
          </VillaFormPanel>
        </>
      ) : null}

      {notice ? <div className="task-calendar-toast" role="status">{notice}</div> : null}
    </section>
  )
}

function MetricCard({ label, value, note, icon }: { label: string; value: string; note: string; icon?: ReactNode }) {
  return (
    <article>
      <span>{icon}{label}</span>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  )
}

function PhaseMini({ phase }: { phase: VillaPhase }) {
  return (
    <article>
      <strong>{phase.name}</strong>
      <span>{phase.zone} · {phase.owner} · 截止 {phase.end}</span>
      <i><b style={{ width: `${Math.min(phase.progress, 100)}%` }} /></i>
    </article>
  )
}

function PhaseRow({ phase, onUpdate }: { phase: VillaPhase; onUpdate: (phase: VillaPhase, next: Partial<VillaPhase>) => void }) {
  return (
    <article className="villa-phase-row">
      <div>
        <span>{phase.zone} · {phase.owner}</span>
        <strong>{phase.name}</strong>
        <p>{phase.acceptance}</p>
        <em>下一步：{phase.next}</em>
      </div>
      <div className="villa-row-progress">
        <strong>{formatNumber(phase.progress)}%</strong>
        <i><b style={{ width: `${Math.min(phase.progress, 100)}%` }} /></i>
        <span>{phase.start} - {phase.end} · {phase.status}</span>
      </div>
      <div className="villa-row-actions">
        <button className="btn secondary" type="button" onClick={() => onUpdate(phase, { status: '待验收', progress: Math.max(phase.progress, 90) })}>待验收</button>
        <button className="btn secondary" type="button" onClick={() => onUpdate(phase, { status: '已完成', progress: 100 })}><CheckCircle2 size={15} /> 完成</button>
      </div>
    </article>
  )
}

function IssueCard({ issue, onUpdate }: { issue: VillaIssue; onUpdate: (issue: VillaIssue, next: Partial<VillaIssue>) => void }) {
  return (
    <article className={`villa-issue-card severity-${issue.severity}`}>
      <div>
        <span>{issue.severity}风险 · {issue.status}</span>
        <strong>{issue.title}</strong>
        <p>{issue.zone} · {issue.owner} · 截止 {issue.due}</p>
        <em>{issue.note}</em>
      </div>
      <div className="villa-row-actions">
        <button className="btn secondary" type="button" onClick={() => onUpdate(issue, { status: '整改中' })}>整改中</button>
        <button className="btn secondary" type="button" onClick={() => onUpdate(issue, { status: '已关闭' })}>关闭</button>
      </div>
    </article>
  )
}

function VillaFormPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="panel villa-panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">{title}</h3>
          <p className="panel-subtitle">提交后立即进入后端数据库和审计记录</p>
        </div>
      </div>
      {children}
    </section>
  )
}

async function loadVillaProject(apiBaseUrl: string, signal: AbortSignal) {
  const session = await login(apiBaseUrl, signal)
  const response = await fetch(`${apiBaseUrl}/villa-project`, {
    headers: { Authorization: `Bearer ${session.token}` },
    signal,
  })
  if (!response.ok) throw new Error(`读取别墅项目失败：${response.status}`)
  return { session, data: await response.json() as VillaProject }
}

async function login(apiBaseUrl: string, signal: AbortSignal): Promise<AuthSession> {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 'user-lijinning', password: demoPassword }),
    signal,
  })
  if (!response.ok) throw new Error(`登录后端失败：${response.status}`)
  const result = await response.json() as AuthSession
  if (!result.token) throw new Error('后端没有返回登录 token')
  return result
}

function formatMoney(value: number) {
  const number = Number(value || 0)
  if (Math.abs(number) >= 10000) return `¥${formatNumber(number / 10000)}万`
  return `¥${formatNumber(number)}`
}

function formatNumber(value: number) {
  const number = Number(value || 0)
  if (Math.abs(number) >= 100) return number.toFixed(0)
  if (Math.abs(number) >= 10) return number.toFixed(1).replace(/\.0$/, '')
  return number.toFixed(1).replace(/\.0$/, '')
}
