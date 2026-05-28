import { type CSSProperties, type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CircleAlert,
  Download,
  Hammer,
  LayoutDashboard,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  WalletCards,
} from 'lucide-react'
import './villa-original.css'

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
type VillaZone = {
  key: string
  title: string
  aliases: string[]
  rooms: string[]
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
  villaZones?: VillaZone[]
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
type KpiSummary = {
  overall: number
  activeCount: number
  weekCount: number
  openIssues: number
  urgentCount: number
  spent: number
  paid: number
  budget: number
  budgetRate: number
}

const DAY_MS = 24 * 60 * 60 * 1000
const demoPassword = '123456'
const statusOptions = ['未开始', '施工中', '待验收', '已完成']
const issueStatusOptions = ['待整改', '整改中', '待复验', '已关闭']
const expenseStatusOptions = ['已付', '待付', '预留', '合同']
const voucherTypeOptions = ['电子发票', '银行回执', '合同', '收据', '无']
const viewTitles: Record<VillaTab, string> = {
  overview: '项目总览',
  construction: '施工进度',
  inspection: '监督整改',
  budget: '预算支出',
}
const statusTone: Record<string, string> = {
  未开始: 'blue',
  施工中: 'amber',
  待验收: 'blue',
  已完成: 'green',
  待整改: 'red',
  整改中: 'amber',
  待复验: 'blue',
  已关闭: 'green',
  已付: 'green',
  待付: 'amber',
  预留: 'blue',
  合同: 'blue',
}
const severityTone: Record<string, string> = {
  高: 'red',
  中: 'amber',
  低: 'blue',
}

const todayValue = () => new Date().toISOString().slice(0, 10)
const addDaysValue = (days: number) => {
  const next = new Date()
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

export function VillaProjectPage({ apiBaseUrl, onBack }: { apiBaseUrl: string; onBack: () => void }) {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [token, setToken] = useState('')
  const [activeTab, setActiveTab] = useState<VillaTab>('overview')
  const [overviewIssueFilter, setOverviewIssueFilter] = useState('open')
  const [phaseStatusFilter, setPhaseStatusFilter] = useState('all')
  const [phaseZoneFilter, setPhaseZoneFilter] = useState('all')
  const [issueStatusFilter, setIssueStatusFilter] = useState('all')
  const [issueSeverityFilter, setIssueSeverityFilter] = useState('all')
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('all')
  const [notice, setNotice] = useState('')
  const [resetArmed, setResetArmed] = useState(false)

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

  useEffect(() => {
    if (!resetArmed) return
    const timer = window.setTimeout(() => setResetArmed(false), 3000)
    return () => window.clearTimeout(timer)
  }, [resetArmed])

  const data = loadState.status === 'ready' ? loadState.data : null
  const villaZones = useMemo(() => buildVillaZones(data), [data])
  const categories = useMemo(() => data?.budgets.map((budget) => budget.category) ?? [], [data])
  const kpis = useMemo(() => (data ? buildKpis(data) : null), [data])
  const upcomingPhases = useMemo(() => {
    if (!data) return []
    return data.phases
      .filter((phase) => phase.status !== '已完成')
      .map((phase) => ({ ...phase, left: daysUntil(phase.end) }))
      .filter((phase) => phase.left <= 14)
      .sort((a, b) => a.left - b.left)
      .slice(0, 6)
  }, [data])
  const overviewIssues = useMemo(() => {
    if (!data) return []
    let issues = [...data.issues]
    if (overviewIssueFilter === 'open') issues = issues.filter((issue) => issue.status !== '已关闭')
    if (overviewIssueFilter === '高') issues = issues.filter((issue) => issue.severity === '高')
    return issues.sort((a, b) => parseLocalDate(a.due).getTime() - parseLocalDate(b.due).getTime()).slice(0, 6)
  }, [data, overviewIssueFilter])
  const filteredPhases = useMemo(() => {
    if (!data) return []
    let phases = [...data.phases]
    if (phaseStatusFilter !== 'all') phases = phases.filter((phase) => phase.status === phaseStatusFilter)
    if (phaseZoneFilter !== 'all') {
      const zone = villaZones.find((item) => item.key === phaseZoneFilter)
      phases = zone ? phases.filter((phase) => phaseMatchesZone(phase, zone)) : phases.filter((phase) => phase.zone === phaseZoneFilter)
    }
    return phases
  }, [data, phaseStatusFilter, phaseZoneFilter, villaZones])
  const filteredIssues = useMemo(() => {
    if (!data) return []
    let issues = [...data.issues]
    if (issueStatusFilter !== 'all') issues = issues.filter((issue) => issue.status === issueStatusFilter)
    if (issueSeverityFilter !== 'all') issues = issues.filter((issue) => issue.severity === issueSeverityFilter)
    return issues.sort((a, b) => parseLocalDate(a.due).getTime() - parseLocalDate(b.due).getTime())
  }, [data, issueStatusFilter, issueSeverityFilter])
  const voucherExpenses = useMemo(() => {
    if (!data) return []
    return [...data.expenses]
      .filter((expense) => expense.voucherType || expense.voucherNo || expense.note)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
  }, [data])
  const filteredExpenses = useMemo(() => {
    if (!data) return []
    return [...data.expenses]
      .filter((expense) => expenseCategoryFilter === 'all' || expense.category === expenseCategoryFilter)
      .sort((a, b) => parseLocalDate(b.date).getTime() - parseLocalDate(a.date).getTime())
  }, [data, expenseCategoryFilter])

  function setProjectData(updater: (project: VillaProject) => VillaProject) {
    setLoadState((current) => (current.status === 'ready' ? { status: 'ready', data: updater(current.data) } : current))
  }

  async function mutateProject(path: string, method: 'POST' | 'PATCH' | 'DELETE', body?: Record<string, unknown>) {
    if (!token) return null
    const response = await fetch(`${apiBaseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) throw new Error(await response.text())
    const result = await response.json() as { villaProject?: VillaProject }
    if (result.villaProject) setLoadState({ status: 'ready', data: result.villaProject })
    return result
  }

  async function handlePhaseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    try {
      await mutateProject('/villa-project/phases', 'POST', {
        ...payload,
        progress: Number(payload.progress || 0),
      })
      form.reset()
      setNotice('施工任务已添加')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
    }
  }

  async function handleIssueSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    try {
      await mutateProject('/villa-project/issues', 'POST', payload)
      form.reset()
      setNotice('监督问题已添加')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
    }
  }

  async function handleExpenseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const payload = Object.fromEntries(new FormData(form))
    try {
      await mutateProject('/villa-project/expenses', 'POST', {
        ...payload,
        amount: Number(payload.amount || 0),
      })
      form.reset()
      setNotice('预算支出已添加')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '保存失败')
    }
  }

  function updatePhaseLocal(id: string, patch: Partial<VillaPhase>) {
    setProjectData((project) => ({
      ...project,
      phases: project.phases.map((phase) => (phase.id === id ? { ...phase, ...patch } : phase)),
    }))
  }

  async function commitPhase(phase: VillaPhase, patch: Partial<VillaPhase>) {
    try {
      await mutateProject(`/villa-project/phases/${encodeURIComponent(phase.id)}`, 'PATCH', { ...phase, ...patch })
      setNotice('施工状态已更新')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新失败')
    }
  }

  async function commitIssue(issue: VillaIssue, status: string) {
    try {
      await mutateProject(`/villa-project/issues/${encodeURIComponent(issue.id)}`, 'PATCH', { ...issue, status })
      setNotice('整改状态已更新')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新失败')
    }
  }

  function updateBudgetLocal(category: string, budget: number) {
    setProjectData((project) => ({
      ...project,
      budgets: project.budgets.map((item) => (item.category === category ? { ...item, budget } : item)),
    }))
  }

  async function commitBudget(category: string, budget: number) {
    try {
      await mutateProject(`/villa-project/budgets/${encodeURIComponent(category)}`, 'PATCH', { budget })
      setNotice('预算已更新')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新失败')
    }
  }

  function updateExpenseLocal(id: string, patch: Partial<VillaExpense>) {
    setProjectData((project) => ({
      ...project,
      expenses: project.expenses.map((expense) => (expense.id === id ? { ...expense, ...patch } : expense)),
    }))
  }

  async function commitExpense(expense: VillaExpense, patch: Partial<VillaExpense>) {
    try {
      await mutateProject(`/villa-project/expenses/${encodeURIComponent(expense.id)}`, 'PATCH', { ...expense, ...patch })
      setNotice('金额已更新')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '更新失败')
    }
  }

  async function deleteExpense(expense: VillaExpense) {
    try {
      await mutateProject(`/villa-project/expenses/${encodeURIComponent(expense.id)}`, 'DELETE')
      setNotice('支出已删除')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '删除失败')
    }
  }

  async function resetData() {
    if (!resetArmed) {
      setResetArmed(true)
      setNotice('再次点击确认恢复演示数据')
      return
    }
    try {
      await mutateProject('/villa-project/sync-source', 'POST')
      setResetArmed(false)
      setNotice('已恢复演示数据')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '重置失败')
    }
  }

  function exportCsv() {
    if (!data) return
    const rows = [
      ['模块', '名称/问题/项目', '区域/分类', '负责人/供应商', '状态', '开始/日期', '截止', '进度/金额', '备注'],
      ...data.phases.map((phase) => ['施工', phase.name, phase.zone, phase.owner, phase.status, phase.start, phase.end, `${phase.progress}%`, `验收:${phase.acceptance}; 下一步:${phase.next}`]),
      ...data.issues.map((issue) => ['监督', issue.title, issue.zone, issue.owner, issue.status, '', issue.due, issue.severity, issue.note]),
      ...data.expenses.map((expense) => ['预算', expense.item, expense.category, expense.vendor, expense.status, expense.date, '', expense.amount, `凭证:${expense.voucherType || ''} ${expense.voucherNo || ''}; ${expense.note || ''}`]),
    ]
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `华哥别墅装修看板-${todayValue()}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    setNotice('CSV 已导出')
  }

  function jumpToZone(zoneKey: string) {
    setActiveTab('construction')
    setPhaseZoneFilter(zoneKey)
  }

  if (loadState.status !== 'ready' || !data || !kpis) {
    return (
      <section className="villa-original" id="villaProjectPage">
        <div className="app-shell" style={{ gridTemplateColumns: '1fr' }}>
          <main className="workspace">
            <button className="icon-button secondary villa-back-button" type="button" onClick={onBack}>
              <ArrowLeft /> <span>返回专项项目分支</span>
            </button>
            <section className="section-panel">
              <div className="empty">{loadState.status === 'error' ? loadState.message : '正在读取别墅项目后端数据...'}</div>
            </section>
          </main>
        </div>
      </section>
    )
  }

  return (
    <section className="villa-original" id="villaProjectPage">
      <div className="app-shell">
        <aside className="sidebar" aria-label="项目导航">
          <div className="brand">
            <div className="brand-mark">华</div>
            <div>
              <p className="eyebrow">Villa Renovation</p>
              <h1>华哥别墅装修看板</h1>
            </div>
          </div>

          <nav className="nav-tabs" aria-label="看板模块">
            <VillaNavButton active={activeTab === 'overview'} icon={<LayoutDashboard />} label="总览" onClick={() => setActiveTab('overview')} />
            <VillaNavButton active={activeTab === 'construction'} icon={<Hammer />} label="施工" onClick={() => setActiveTab('construction')} />
            <VillaNavButton active={activeTab === 'inspection'} icon={<ShieldCheck />} label="监督" onClick={() => setActiveTab('inspection')} />
            <VillaNavButton active={activeTab === 'budget'} icon={<WalletCards />} label="预算" onClick={() => setActiveTab('budget')} />
          </nav>

          <div className="project-meta">
            <div><span>项目地址</span><strong>华哥别墅</strong></div>
            <div><span>今日</span><strong>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}</strong></div>
            <div><span>云端同步</span><strong>Cloudflare D1</strong></div>
          </div>
        </aside>

        <main className="workspace">
          <header className="topbar">
            <div>
              <p className="eyebrow">JOSMAN目标金字塔 / 专项项目分支 / 别墅项目目标</p>
              <h2>{viewTitles[activeTab]}</h2>
            </div>
            <div className="toolbar">
              <button className="icon-button secondary villa-back-button" type="button" onClick={onBack} title="返回上级">
                <ArrowLeft /><span>返回</span>
              </button>
              <button className="icon-button" type="button" onClick={exportCsv} title="导出CSV">
                <Download /><span>导出</span>
              </button>
              <button className={`icon-button secondary ${resetArmed ? 'armed' : ''}`} type="button" onClick={resetData} title="恢复演示数据">
                <RotateCcw /><span>{resetArmed ? '确认重置' : '重置'}</span>
              </button>
            </div>
          </header>

          <section className="kpi-grid" aria-label="核心指标">
            <Metric icon={<Activity />} tone="green" label="总体进度" value={`${kpis.overall}%`} note={`${kpis.activeCount} 项施工中`} onClick={() => setActiveTab('construction')} />
            <Metric icon={<CalendarDays />} tone="amber" label="7天内节点" value={String(kpis.weekCount)} note="需盯紧交付" onClick={() => setActiveTab('construction')} />
            <Metric icon={<CircleAlert />} tone="red" label="待整改问题" value={String(kpis.openIssues)} note={`${kpis.urgentCount} 个高风险`} onClick={() => setActiveTab('inspection')} />
            <Metric icon={<BarChart3 />} tone="blue" label="预算使用率" value={`${kpis.budgetRate}%`} note={`已付 ${money(kpis.paid)} / 已登记 ${money(kpis.spent)}`} onClick={() => setActiveTab('budget')} />
          </section>

          <section className={`view ${activeTab === 'overview' ? 'active' : ''}`} data-view-panel="overview">
            <div className="overview-layout">
              <section className="section-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">现场分区</p>
                    <h3>别墅施工热区</h3>
                  </div>
                </div>
                <div className="villa-map" aria-label="别墅分区进度">
                  {villaZones.map((zone) => {
                    const progress = zoneProgress(data.phases, zone)
                    return <ZoneTile key={zone.key} zone={zone} progress={progress} onClick={() => jumpToZone(zone.key)} />
                  })}
                </div>
              </section>

              <section className="section-panel">
                <div className="section-head">
                  <div>
                    <p className="eyebrow">本周盯办</p>
                    <h3>近期节点</h3>
                  </div>
                </div>
                <div className="compact-list">
                  {upcomingPhases.length ? upcomingPhases.map((phase) => <CompactPhase phase={phase} key={phase.id} />) : <Empty text="暂无 14 天内节点" />}
                </div>
              </section>
            </div>

            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">风险</p>
                  <h3>监督整改队列</h3>
                </div>
                <select value={overviewIssueFilter} aria-label="整改状态筛选" onChange={(event) => setOverviewIssueFilter(event.currentTarget.value)}>
                  <option value="open">未关闭</option>
                  <option value="all">全部</option>
                  <option value="高">高风险</option>
                </select>
              </div>
              <div className="issue-board">
                {overviewIssues.length ? overviewIssues.map((issue) => <IssueCard issue={issue} key={issue.id} onStatusChange={commitIssue} />) : <Empty text="当前没有匹配的整改项" />}
              </div>
            </section>
          </section>

          <section className={`view ${activeTab === 'construction' ? 'active' : ''}`} data-view-panel="construction">
            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">施工计划</p>
                  <h3>工序进度表</h3>
                </div>
                <div className="inline-filters">
                  <select value={phaseStatusFilter} aria-label="施工状态筛选" onChange={(event) => setPhaseStatusFilter(event.currentTarget.value)}>
                    <option value="all">全部状态</option>
                    {statusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
                  </select>
                  <select value={phaseZoneFilter} aria-label="施工区域筛选" onChange={(event) => setPhaseZoneFilter(event.currentTarget.value)}>
                    <option value="all">全部区域</option>
                    {villaZones.map((zone) => <option value={zone.key} key={zone.key}>{zone.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="phase-list">
                {filteredPhases.length ? filteredPhases.map((phase) => (
                  <PhaseCard
                    key={phase.id}
                    phase={phase}
                    onProgressChange={(progress) => updatePhaseLocal(phase.id, { progress })}
                    onProgressCommit={(progress) => commitPhase(phase, { progress })}
                    onStatusChange={(status) => {
                      const nextProgress = status === '已完成' ? 100 : status === '未开始' ? 0 : phase.progress
                      updatePhaseLocal(phase.id, { status, progress: nextProgress })
                      void commitPhase(phase, { status, progress: nextProgress })
                    }}
                  />
                )) : <Empty text="当前筛选下暂无施工任务" />}
              </div>
            </section>

            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">新增</p>
                  <h3>施工任务</h3>
                </div>
              </div>
              <form className="entry-form" onSubmit={handlePhaseSubmit}>
                <label>工序<input name="name" required placeholder="如：中央空调安装" /></label>
                <label>区域<input name="zone" required placeholder="如：2F 主卧" /></label>
                <label>负责人<input name="owner" required placeholder="如：王工" /></label>
                <label>开始<input name="start" type="date" defaultValue={todayValue()} required /></label>
                <label>截止<input name="end" type="date" defaultValue={addDaysValue(7)} required /></label>
                <label>进度<input name="progress" type="number" min="0" max="100" defaultValue="0" required /></label>
                <label>状态<select name="status" defaultValue="施工中">{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="wide">验收口径<input name="acceptance" required placeholder="如：试压合格、隐蔽工程拍照归档" /></label>
                <label className="wide">下一步<input name="next" required placeholder="如：监理复核后通知泥工进场" /></label>
                <button className="primary-action" type="submit"><Plus /><span>添加任务</span></button>
              </form>
            </section>
          </section>

          <section className={`view ${activeTab === 'inspection' ? 'active' : ''}`} data-view-panel="inspection">
            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">监督施工</p>
                  <h3>整改问题池</h3>
                </div>
                <div className="inline-filters">
                  <select value={issueStatusFilter} aria-label="整改状态筛选" onChange={(event) => setIssueStatusFilter(event.currentTarget.value)}>
                    <option value="all">全部状态</option>
                    {issueStatusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
                  </select>
                  <select value={issueSeverityFilter} aria-label="风险等级筛选" onChange={(event) => setIssueSeverityFilter(event.currentTarget.value)}>
                    <option value="all">全部等级</option>
                    <option value="高">高</option>
                    <option value="中">中</option>
                    <option value="低">低</option>
                  </select>
                </div>
              </div>
              <div className="issue-board">
                {filteredIssues.length ? filteredIssues.map((issue) => <IssueCard issue={issue} key={issue.id} onStatusChange={commitIssue} />) : <Empty text="当前筛选下暂无问题" />}
              </div>
            </section>

            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">新增</p>
                  <h3>监督问题</h3>
                </div>
              </div>
              <form className="entry-form" onSubmit={handleIssueSubmit}>
                <label>问题<input name="title" required placeholder="如：水管走顶固定间距过大" /></label>
                <label>区域<input name="zone" required placeholder="如：1F 厨房" /></label>
                <label>责任人<input name="owner" required placeholder="如：水电班组" /></label>
                <label>截止<input name="due" type="date" defaultValue={addDaysValue(3)} required /></label>
                <label>等级<select name="severity" defaultValue="中"><option>高</option><option>中</option><option>低</option></select></label>
                <label>状态<select name="status" defaultValue="待整改">{issueStatusOptions.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label className="wide">备注<input name="note" required placeholder="写清检查口径、照片位置、复验要求" /></label>
                <button className="primary-action" type="submit"><Plus /><span>添加问题</span></button>
              </form>
            </section>
          </section>

          <section className={`view ${activeTab === 'budget' ? 'active' : ''}`} data-view-panel="budget">
            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">预算支出</p>
                  <h3>分项预算执行</h3>
                </div>
              </div>
              <div className="budget-grid">
                {data.budgets.map((budget) => (
                  <BudgetCard
                    key={budget.category}
                    budget={budget}
                    expenses={data.expenses}
                    onBudgetChange={(value) => updateBudgetLocal(budget.category, value)}
                    onBudgetCommit={(value) => commitBudget(budget.category, value)}
                  />
                ))}
              </div>
            </section>

            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">凭证</p>
                  <h3>预算凭证台账</h3>
                </div>
              </div>
              <div className="voucher-grid">
                {voucherExpenses.length ? voucherExpenses.map((expense) => <VoucherCard expense={expense} key={expense.id} />) : <Empty text="暂无凭证摘要" />}
              </div>
            </section>

            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">流水</p>
                  <h3>支出明细</h3>
                </div>
                <select value={expenseCategoryFilter} aria-label="支出分类筛选" onChange={(event) => setExpenseCategoryFilter(event.currentTarget.value)}>
                  <option value="all">全部分类</option>
                  {categories.map((category) => <option value={category} key={category}>{category}</option>)}
                </select>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>日期</th><th>分类</th><th>项目</th><th>供应商</th><th>金额</th><th>状态</th><th>凭证</th><th>操作</th></tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length ? filteredExpenses.map((expense) => (
                      <ExpenseRow
                        expense={expense}
                        key={expense.id}
                        onAmountChange={(amount) => updateExpenseLocal(expense.id, { amount })}
                        onAmountCommit={(amount) => commitExpense(expense, { amount })}
                        onDelete={() => deleteExpense(expense)}
                      />
                    )) : <tr><td colSpan={8}><Empty text="当前分类暂无支出" /></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="section-panel">
              <div className="section-head">
                <div>
                  <p className="eyebrow">新增</p>
                  <h3>预算支出</h3>
                </div>
              </div>
              <form className="entry-form" onSubmit={handleExpenseSubmit}>
                <label>日期<input name="date" type="date" defaultValue={todayValue()} required /></label>
                <label>分类<select name="category" defaultValue={categories[0] ?? ''}>{categories.map((category) => <option value={category} key={category}>{category}</option>)}</select></label>
                <label>项目<input name="item" required placeholder="如：瓷砖定金" /></label>
                <label>供应商<input name="vendor" required placeholder="如：蒙娜丽莎门店" /></label>
                <label>金额<input name="amount" type="number" min="0" step="0.01" required /></label>
                <label>状态<select name="status" defaultValue="已付">{expenseStatusOptions.map((status) => <option key={status}>{status}</option>)}</select></label>
                <label>凭证类型<select name="voucherType" defaultValue="电子发票">{voucherTypeOptions.map((type) => <option key={type}>{type}</option>)}</select></label>
                <label>凭证号<input name="voucherNo" placeholder="如：发票号码或回执号" /></label>
                <label className="wide">凭证备注<input name="note" placeholder="如：税额、付款节点、合同尾款" /></label>
                <button className="primary-action" type="submit"><Plus /><span>添加支出</span></button>
              </form>
            </section>
          </section>
        </main>
      </div>

      <div className={`toast ${notice ? 'show' : ''}`} role="status" aria-live="polite">{notice}</div>
    </section>
  )
}

function VillaNavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return (
    <button className={`nav-tab ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      {icon}<span>{label}</span>
    </button>
  )
}

function Metric({ icon, tone, label, value, note, onClick }: { icon: ReactNode; tone: string; label: string; value: string; note: string; onClick: () => void }) {
  return (
    <article className="metric" tabIndex={0} role="button" aria-label={`打开${label}`} onClick={onClick} onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick()
      }
    }}>
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  )
}

function ZoneTile({ zone, progress, onClick }: { zone: VillaZone; progress: number; onClick: () => void }) {
  return (
    <button className="zone-tile" style={{ '--fill': `${progress}%` } as CSSProperties} type="button" onClick={onClick}>
      <span className="zone-head">
        <strong>{zone.title}</strong>
        <span className="zone-progress">{progress}% 完成</span>
      </span>
      <span className="room-list">
        {zone.rooms.map((room) => <span className="room-chip" key={room}>{room}</span>)}
      </span>
    </button>
  )
}

function CompactPhase({ phase }: { phase: VillaPhase & { left: number } }) {
  const dueText = phase.left < 0 ? `超期 ${Math.abs(phase.left)} 天` : `${phase.left} 天后`
  return (
    <article className="compact-item">
      <div>
        <strong>{phase.name}</strong>
        <span>{phase.zone} · {formatShortDate(phase.end)} · {dueText}</span>
      </div>
      <ProgressBar value={phase.progress} />
    </article>
  )
}

function PhaseCard({
  phase,
  onProgressChange,
  onProgressCommit,
  onStatusChange,
}: {
  phase: VillaPhase
  onProgressChange: (progress: number) => void
  onProgressCommit: (progress: number) => void
  onStatusChange: (status: string) => void
}) {
  const progress = clampPercent(phase.progress)
  const commitFromInput = (target: HTMLInputElement) => onProgressCommit(clampPercent(target.value))
  return (
    <article className="phase-card">
      <div className="phase-card-head">
        <div>
          <h4>{phase.name}</h4>
          <div className="meta-line"><span>{phase.zone}</span><span>{phase.owner}</span><span>{formatShortDate(phase.start)} - {formatShortDate(phase.end)}</span></div>
        </div>
        <Badge label={phase.status} tone={statusTone[phase.status]} />
      </div>
      <div>
        <div className="budget-numbers"><span>进度</span><strong className="phase-progress-text">{progress}%</strong></div>
        <ProgressBar value={progress} />
      </div>
      <p className="note">验收：{phase.acceptance}</p>
      <p className="note">下一步：{phase.next}</p>
      <div className="phase-controls">
        <input
          className="phase-progress"
          type="range"
          min="0"
          max="100"
          value={progress}
          aria-label={`${phase.name}进度`}
          onChange={(event) => onProgressChange(clampPercent(event.currentTarget.value))}
          onBlur={(event) => commitFromInput(event.currentTarget)}
          onPointerUp={(event) => commitFromInput(event.currentTarget)}
          onKeyUp={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter' || event.key.startsWith('Arrow')) commitFromInput(event.currentTarget)
          }}
        />
        <select className="phase-status" value={phase.status} aria-label={`${phase.name}状态`} onChange={(event) => onStatusChange(event.currentTarget.value)}>
          {statusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
        </select>
      </div>
    </article>
  )
}

function IssueCard({ issue, onStatusChange }: { issue: VillaIssue; onStatusChange: (issue: VillaIssue, status: string) => void }) {
  const left = daysUntil(issue.due)
  const dueText = left < 0 ? `超期 ${Math.abs(left)} 天` : left === 0 ? '今日到期' : `${left} 天后`
  return (
    <article className="issue-card">
      <div className="issue-card-head">
        <div>
          <h4>{issue.title}</h4>
          <div className="meta-line"><span>{issue.zone}</span><span>{issue.owner}</span><span>{formatShortDate(issue.due)} · {dueText}</span></div>
        </div>
        <Badge label={issue.severity} tone={severityTone[issue.severity]} />
      </div>
      <p className="note">{issue.note}</p>
      <div className="issue-controls">
        <Badge label={issue.status} tone={statusTone[issue.status]} />
        <select className="issue-status" value={issue.status} aria-label={`${issue.title}状态`} onChange={(event) => onStatusChange(issue, event.currentTarget.value)}>
          {issueStatusOptions.map((status) => <option value={status} key={status}>{status}</option>)}
        </select>
      </div>
    </article>
  )
}

function BudgetCard({ budget, expenses, onBudgetChange, onBudgetCommit }: { budget: VillaBudget; expenses: VillaExpense[]; onBudgetChange: (budget: number) => void; onBudgetCommit: (budget: number) => void }) {
  const registered = getSpentTotal(expenses, budget.category)
  const paid = getPaidTotal(expenses, budget.category)
  const rate = budget.budget ? Math.round((registered / budget.budget) * 100) : 0
  const remaining = budget.budget - registered
  const tone = rate >= 95 ? 'red' : rate >= 75 ? 'amber' : 'green'
  const commit = (target: HTMLInputElement) => onBudgetCommit(Number(target.value) || 0)
  return (
    <article className="budget-card">
      <div className="budget-card-head">
        <div>
          <h4>{budget.category}</h4>
          <strong>{money(registered)}</strong>
        </div>
        <Badge label={`${rate}%`} tone={tone} />
      </div>
      <ProgressBar value={Math.min(rate, 100)} />
      <div className="budget-numbers"><span>预算 {money(budget.budget)}</span><span>{remaining >= 0 ? '剩余' : '超支'} {money(Math.abs(remaining))}</span></div>
      <div className="budget-numbers"><span>已付 {money(paid)}</span><span>合同/待付 {money(Math.max(registered - paid, 0))}</span></div>
      <label className="budget-edit">
        <span>调整预算</span>
        <input
          className="budget-limit"
          type="number"
          min="0"
          step="1000"
          value={Number(budget.budget)}
          onChange={(event) => onBudgetChange(Number(event.currentTarget.value) || 0)}
          onBlur={(event) => commit(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit(event.currentTarget)
          }}
        />
      </label>
    </article>
  )
}

function VoucherCard({ expense }: { expense: VillaExpense }) {
  return (
    <article className="voucher-card">
      <div className="voucher-topline">
        <Badge label={expense.voucherType || '凭证'} tone={expense.voucherType === '合同' ? 'blue' : 'green'} />
        <Badge label={expense.status} tone={statusTone[expense.status]} />
      </div>
      <h4>{expense.item}</h4>
      <div className="voucher-amount">{money(expense.amount)}</div>
      <div className="meta-line"><span>{formatShortDate(expense.date)}</span><span>{expense.category}</span></div>
      <p className="note">{expense.vendor}</p>
      <p className="note">凭证号：{expense.voucherNo || '未录入'}</p>
      {expense.note ? <p className="note">{expense.note}</p> : null}
    </article>
  )
}

function ExpenseRow({ expense, onAmountChange, onAmountCommit, onDelete }: { expense: VillaExpense; onAmountChange: (amount: number) => void; onAmountCommit: (amount: number) => void; onDelete: () => void }) {
  const commit = (target: HTMLInputElement) => onAmountCommit(Number(target.value) || 0)
  return (
    <tr>
      <td>{formatShortDate(expense.date)}</td>
      <td>{expense.category}</td>
      <td>{expense.item}</td>
      <td>{expense.vendor}</td>
      <td>
        <input
          className="expense-amount-input"
          type="number"
          min="0"
          step="0.01"
          value={Number(expense.amount || 0)}
          aria-label={`${expense.item}金额`}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onAmountChange(Number(event.currentTarget.value) || 0)}
          onBlur={(event) => commit(event.currentTarget)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit(event.currentTarget)
          }}
        />
      </td>
      <td><Badge label={expense.status} tone={statusTone[expense.status]} /></td>
      <td>{expense.voucherType || '-'}{expense.voucherNo ? <><br /><small>{expense.voucherNo}</small></> : null}</td>
      <td>
        <button className="row-action" type="button" onClick={onDelete}>
          <Trash2 /><span>删除</span>
        </button>
      </td>
    </tr>
  )
}

function Badge({ label, tone }: { label: string; tone?: string }) {
  return <span className={`badge ${tone || 'blue'}`}>{label}</span>
}

function ProgressBar({ value }: { value: number }) {
  return <div className="progress-track"><div className="progress-bar" style={{ '--value': `${clampPercent(value)}%` } as CSSProperties} /></div>
}

function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>
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

function buildVillaZones(project: VillaProject | null): VillaZone[] {
  if (project?.villaZones?.length) return project.villaZones
  return (project?.zoneSummaries ?? []).map((zone) => ({
    key: zone.key,
    title: zone.title,
    aliases: [zone.key, zone.title],
    rooms: Array.from({ length: zone.roomCount }, (_, index) => `空间${index + 1}`),
  }))
}

function buildKpis(project: VillaProject): KpiSummary {
  const phaseCount = project.phases.length || 1
  const overall = Math.round(project.phases.reduce((total, phase) => total + clampPercent(phase.progress), 0) / phaseCount)
  const activeCount = project.phases.filter((phase) => phase.status === '施工中').length
  const weekCount = project.phases.filter((phase) => {
    const left = daysUntil(phase.end)
    return phase.status !== '已完成' && left >= 0 && left <= 7
  }).length
  const openIssues = project.issues.filter((issue) => issue.status !== '已关闭')
  const urgentCount = openIssues.filter((issue) => issue.severity === '高').length
  const spent = getSpentTotal(project.expenses)
  const paid = getPaidTotal(project.expenses)
  const budget = project.budgets.reduce((total, item) => total + Number(item.budget || 0), 0)
  const budgetRate = budget ? Math.round((spent / budget) * 100) : 0
  return { overall, activeCount, weekCount, openIssues: openIssues.length, urgentCount, spent, paid, budget, budgetRate }
}

function phaseMatchesZone(phase: VillaPhase, zone: VillaZone) {
  return zone.aliases.some((alias) => phase.zone.includes(alias))
}

function zoneProgress(phases: VillaPhase[], zone: VillaZone) {
  const matches = phases.filter((phase) => phaseMatchesZone(phase, zone))
  if (!matches.length) return 0
  return Math.round(matches.reduce((total, phase) => total + clampPercent(phase.progress), 0) / matches.length)
}

function getSpentTotal(expenses: VillaExpense[], category?: string) {
  return expenses.filter((expense) => !category || expense.category === category).reduce((total, expense) => total + Number(expense.amount || 0), 0)
}

function getPaidTotal(expenses: VillaExpense[], category?: string) {
  return expenses
    .filter((expense) => (!category || expense.category === category) && expense.status === '已付')
    .reduce((total, expense) => total + Number(expense.amount || 0), 0)
}

function clampPercent(value: unknown) {
  return Math.max(0, Math.min(100, Number(value) || 0))
}

function money(value: number) {
  return `¥${Number(value || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })}`
}

function parseLocalDate(value: string) {
  return new Date(`${value}T00:00:00`)
}

function todayStart() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function daysUntil(value: string) {
  return Math.ceil((parseLocalDate(value).getTime() - todayStart().getTime()) / DAY_MS)
}

function formatShortDate(value: string) {
  return parseLocalDate(value).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
