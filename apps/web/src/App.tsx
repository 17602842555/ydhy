import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { BarChart3, CircleDot, ClipboardCheck, LayoutGrid, PackageCheck, ReceiptText, Settings, ShieldAlert, SquareKanban, Triangle } from 'lucide-react'
import './App.css'
import { AiSectionPanel } from './AiSectionPanel'
import { DailyWorkPage } from './DailyWorkPage'
import { SubcompanySupervisionPage } from './SubcompanySupervisionPage'
import { TaskCalendarEntryPage } from './TaskCalendarEntryPage'
import { VillaProjectPage } from './VillaProjectPage'
import {
  clearAiSettings,
  clearCachedAuthToken,
  defaultAiSettings,
  loadCachedAiInsights,
  loadAiInsights,
  loadSavedAiSettings,
  loginForToken,
  normalizeAiSettings,
  saveAiSettings,
  testAiConnection,
  type AiInsightItem,
  type AiInsights,
  type AiSettings,
} from './aiClient'
import type {
  AiConnectionTestState,
  AiLoadState,
  Brand,
  BranchAction,
  BranchTarget,
  Contact,
  Cost,
  DashboardData,
  DataConnection,
  GoalGroup,
  Kpi,
  LoadedDashboardState,
  OperatingSystemResponse,
  PyramidItem,
  RemoteBranchActionGroup,
  Risk,
  Task,
  TaskStatus,
  TaxCard,
  ViewKey,
} from './dashboardTypes'
import {
  brandColor,
  formatDateCode,
  formatDateTime,
  formatDayCode,
  formatDigitalSecond,
  formatDigitalTime,
  formatMeridiem,
  ownerDetail,
  statusPillClass,
  taskDueLabel,
  toCsv,
} from './dashboardUtils'
import {
  DEFAULT_CLOUD_API_BASE_URL,
  FALLBACK_BRANCH_TARGETS,
  FALLBACK_DATA,
  FALLBACK_GOAL_GROUPS,
  FALLBACK_OWNER_DIRECTORY,
  SUBCOMPANY_BRANCH_NAME,
  SUBCOMPANY_SUPERVISION_URL,
  SUBCOMPANY_TARGET_NAME,
  TASK_STATUSES,
  VIEW_COPY,
  VILLA_BRANCH_NAME,
  VILLA_TARGET_NAME,
} from './dashboardData'

const NAV_ITEMS: Array<{ key: ViewKey; label: string; icon: ReactNode }> = [
  { key: 'overview', label: '总览', icon: <LayoutGrid /> },
  { key: 'pyramid', label: 'JOSMAN目标金字塔', icon: <Triangle /> },
  { key: 'daily', label: 'JN每日工作跟进', icon: <SquareKanban /> },
  { key: 'brand', label: '品牌经营', icon: <BarChart3 /> },
  { key: 'tax', label: '财税合规', icon: <ReceiptText /> },
  { key: 'supply', label: '供应链', icon: <PackageCheck /> },
  { key: 'org', label: '组织协同', icon: <CircleDot /> },
  { key: 'risk', label: '风险预警', icon: <ShieldAlert /> },
  { key: 'decision', label: '决策包', icon: <ClipboardCheck /> },
]

function fallbackDashboardState(): LoadedDashboardState {
  return {
    data: FALLBACK_DATA,
    goalGroups: FALLBACK_GOAL_GROUPS,
    branchTargets: FALLBACK_BRANCH_TARGETS,
    ownerDirectory: FALLBACK_OWNER_DIRECTORY,
  }
}

function getApiBaseUrl() {
  const configured = import.meta.env.VITE_API_BASE_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://127.0.0.1:8787/api'
  }
  return DEFAULT_CLOUD_API_BASE_URL
}

async function loadOperatingSystem(signal: AbortSignal): Promise<LoadedDashboardState> {
  const apiBaseUrl = getApiBaseUrl()
  let token = await loginForToken(apiBaseUrl, signal)

  let response = await fetch(`${apiBaseUrl}/operating-system`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  })
  if (response.status === 401) {
    clearCachedAuthToken()
    token = await loginForToken(apiBaseUrl, signal)
    response = await fetch(`${apiBaseUrl}/operating-system`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  }
  if (!response.ok) throw new Error(`读取经营系统失败：${response.status}`)
  return normalizeOperatingSystem((await response.json()) as OperatingSystemResponse)
}

function normalizeOperatingSystem(payload: OperatingSystemResponse): LoadedDashboardState {
  const fallback = fallbackDashboardState()
  const goalGroups = (payload.goalBranches ?? []).map((branch) => ({
    no: String(branch.code),
    name: String(branch.name),
    summary: String(branch.summary ?? ''),
    goals: Array.isArray(branch.goals) && branch.goals.length > 0
      ? branch.goals.map(String)
      : (branch.objectives ?? []).map((objective) => String(objective.title)),
  }))
  const branchTargets = (payload.goalBranches ?? []).flatMap((branch) =>
    (branch.objectives ?? []).map((objective) => ({
      code: String(objective.code ?? branch.code),
      group: String(objective.group ?? branch.name),
      title: String(objective.title),
      children: Array.isArray(objective.children) ? objective.children.map(String) : [],
      actions: normalizeBranchActions(objective.actions ?? [], String(objective.owner ?? branch.owner ?? '系统')),
    })),
  )

  return {
    data: {
      kpis: payload.kpis?.length ? payload.kpis.map((item) => ({
        label: String(item.label),
        value: String(item.value),
        prefix: item.prefix ? String(item.prefix) : undefined,
        unit: item.unit ? String(item.unit) : undefined,
        trend: item.trend ? String(item.trend) : '',
        trendType: item.trendType === 'down' ? 'down' : 'up',
        target: String(item.target),
        progress: Number(item.progress) || 0,
      })) : fallback.data.kpis,
      pyramid: payload.goalPyramid?.length ? payload.goalPyramid.map((item) => ({
        level: String(item.level),
        title: String(item.title),
        desc: String(item.desc ?? item.description ?? ''),
      })) : fallback.data.pyramid,
      contacts: payload.contacts?.length ? payload.contacts.map((item) => ({
        module: String(item.module),
        company: String(item.company),
        contact: String(item.contact),
        reportsTo: String(item.reportsTo),
        status: item.status,
        remark: String(item.remark),
      })) : fallback.data.contacts,
      brands: payload.brands?.length ? payload.brands.map((item) => ({
        name: String(item.name),
        company: String(item.company),
        completion: Number(item.completion) || 0,
      })) : fallback.data.brands,
      tasks: payload.tasks?.length ? payload.tasks.map((item) => ({
        name: String(item.name),
        owner: String(item.owner),
        due: taskDueLabel(item),
        priority: item.priority,
        status: item.status,
      })) : fallback.data.tasks,
      risks: payload.risks?.length ? payload.risks.map((item) => ({
        type: item.type,
        text: String(item.text),
      })) : fallback.data.risks,
      costs: payload.costs?.length ? payload.costs.map((item) => ({
        brand: String(item.brand),
        product: Number(item.product) || 0,
        logistics: Number(item.logistics) || 0,
        total: Number(item.total) || 0,
        spec: String(item.spec),
      })) : fallback.data.costs,
      taxCards: payload.taxCards?.length ? payload.taxCards.map((item) => ({
        title: String(item.title),
        desc: String(item.desc ?? item.description ?? ''),
      })) : fallback.data.taxCards,
    },
    goalGroups: goalGroups.length ? goalGroups : fallback.goalGroups,
    branchTargets: branchTargets.length ? branchTargets.sort((a, b) => Number(a.code) - Number(b.code)) : fallback.branchTargets,
    ownerDirectory: payload.ownerDirectory ?? fallback.ownerDirectory,
  }
}

function normalizeBranchActions(actions: RemoteBranchActionGroup[], fallbackOwner: string): BranchAction[][] {
  return actions.map((items) => {
    if (Array.isArray(items)) {
      return items.map((item) => ({ action: String(item.action), owner: String(item.owner) }))
    }
    return [{ action: String(items), owner: fallbackOwner }]
  })
}

function insightItem(text: string, sourceRefs: string[] = ['dashboard.subsidiaries']): AiInsightItem {
  return { text, sourceRefs }
}

function buildAiInsights(data: DashboardData, tasks: readonly Task[]): AiInsights {
  const lowBrands = data.brands.filter((brand) => brand.completion < 70).map((brand) => brand.name)
  const decisionRisks = data.risks.filter((risk) => risk.type === 'decision')
  const openHighTasks = tasks.filter((task) => task.priority === '高' && task.status !== '已完成')

  return {
    provider: { status: 'client_fallback', reason: 'local_rule_analysis' },
    summary: '后端 AI 分析暂不可用，当前显示前端本地规则拆解。',
    advice: [
      insightItem(`将${lowBrands.join('、') || '低完成度品牌'}列为下周经营复盘重点，先拆GMV缺口、毛利缺口、渠道缺口。`, ['operatingSystem.brands']),
      insightItem('所有品牌统一提交“售价-佣金-广告-产品成本-物流-税费-退款损耗-净利润”单品模型。', ['operatingSystem.costs']),
      insightItem('一级对接人表需在本周内最终确认，未指定唯一接口的公司不得直接向华哥汇报执行问题。', ['operatingSystem.tasks']),
    ],
    warnings: [
      ...lowBrands.map((name) => insightItem(`${name}目标完成度低于70%，需形成专项纠偏动作。`, ['operatingSystem.brands'])),
      insightItem(`${decisionRisks.length}项事项需要形成华哥决策包，不能口头越级请示。`, ['operatingSystem.risks']),
      insightItem(`${openHighTasks.length}个高优先级任务未完成，建议纳入周会第一议题。`, ['operatingSystem.tasks']),
    ],
    next: [
      insightItem('确认每家公司/品牌唯一一级对接人及替补对接人。', ['operatingSystem.tasks']),
      insightItem('完成五大品牌Q2目标差距分析，并拆到周任务。', ['operatingSystem.brands']),
      insightItem('提交财税、供应链、BD资源三个专项风险清单。', ['operatingSystem.risks']),
    ],
    decisionPackage: buildDecisionPackage(data, tasks),
  }
}

function buildDecisionPackage(data: DashboardData, tasks: readonly Task[]) {
  const decisionRisks = data.risks.filter((risk) => risk.type === 'decision').map((risk) => `- ${risk.text}`).join('\n')
  const lowBrands = data.brands.filter((brand) => brand.completion < 70).map((brand) => `- ${brand.name}：${brand.completion}%`).join('\n')
  const highTasks = tasks.filter((task) => task.priority === '高' && task.status !== '已完成').map((task) => `- ${task.name}｜${task.owner}｜${task.due}`).join('\n')

  return `《华哥决策包》\n\n一、需华哥拍板事项\n${decisionRisks || '无'}\n\n二、低于70%目标完成度品牌\n${lowBrands || '无'}\n\n三、未完成高优先级任务\n${highTasks || '无'}\n\n四、李锦宁建议\n1. 执行类事项继续由李锦宁统一收口。\n2. 预算、人事、股权、重大合作、财税法务风险形成书面决策包后再上报。\n3. 各公司一级对接人每周固定提交经营数据、风险清单、资源需求。`
}

function KpiGrid({ kpis, apiBaseUrl, aiSettings }: { kpis: readonly Kpi[]; apiBaseUrl: string; aiSettings: AiSettings }) {
  return (
    <section className="grid kpi-grid" id="kpiGrid">
      {kpis.map((kpi) => (
        <article className="panel kpi-card" key={kpi.label}>
          <div>
            <div className="label">{kpi.label}</div>
            <div className={`kpi-value ${kpi.trendType === 'down' ? 'danger' : ''}`}>
              {'prefix' in kpi ? kpi.prefix : ''}
              {kpi.value}
              <small>{kpi.unit ?? ''}</small>
            </div>
            <div className="progress-track">
              <div className={`progress-fill ${kpi.trendType === 'down' ? 'risk-fill' : ''}`} style={{ width: `${Math.min(kpi.progress, 100)}%` }} />
            </div>
          </div>
          <div className="kpi-meta">
            <span>{kpi.target}</span>
            <span className={`trend ${kpi.trendType}`}>{kpi.trend} ↗</span>
          </div>
        </article>
      ))}
      <AiSectionPanel
        compact
        section="overview-kpis"
        apiBaseUrl={apiBaseUrl}
        aiSettings={aiSettings}
        context={{ label: '总览核心指标', kpis }}
      />
    </section>
  )
}

function PanelHeader({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  return (
    <div className="panel-header">
      <div>
        <h2 className="panel-title">{title}</h2>
        <p className="panel-subtitle">{subtitle}</p>
      </div>
      {action ? <div className="toolbar">{action}</div> : null}
    </div>
  )
}

function PyramidPanel({
  pyramid,
  goalGroups,
  selectedGroup,
  showBranches,
  onSelectGroup,
  apiBaseUrl,
  aiSettings,
}: {
  pyramid: readonly PyramidItem[]
  goalGroups: readonly GoalGroup[]
  selectedGroup: string
  showBranches: boolean
  onSelectGroup: (group: string) => void
  apiBaseUrl: string
  aiSettings: AiSettings
}) {
  return (
    <div className="panel pyramid-panel">
      <PanelHeader title="目标金字塔拆解" subtitle="华哥散目标先归集，再由总助承接，继续拆到分支目标与下层动作" />
      <div className="panel-body">
        <div className="pyramid">
          {pyramid.map((item, index) => (
            <div className="pyramid-row" key={item.level}>
              <span className="pyramid-level">{item.level}</span>
              <div className={`pyramid-block step-${index}`}>
                <span className="pyramid-mark">{index === 0 ? '◎' : index === 5 ? '☑' : '♙'}</span>
                <strong>{item.title}</strong>
              </div>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>

        {showBranches ? (
          <div className="goal-groups">
            {goalGroups.map((group) => {
              const isSelected = selectedGroup === group.name
              return (
                <button
                  className={`goal-group-card ${isSelected ? 'active' : ''} ${selectedGroup && !isSelected ? 'dim' : ''}`}
                  key={group.name}
                  type="button"
                  onClick={() => onSelectGroup(group.name)}
                >
                  <span>{group.no}</span>
                  <strong>{group.name}</strong>
                  <small>{group.summary}</small>
                  <em>{group.goals.join(' / ')}</em>
                </button>
              )
            })}
          </div>
        ) : null}
        <AiSectionPanel
          compact
          section="pyramid"
          apiBaseUrl={apiBaseUrl}
          aiSettings={aiSettings}
          context={{ label: selectedGroup || '目标金字塔', pyramid, goalGroups }}
        />
      </div>
    </div>
  )
}

function BranchDetailPanel({
  groupName,
  goalGroups,
  branchTargets,
  ownerDirectory,
  onOpenSubcompany,
  onOpenVilla,
  apiBaseUrl,
  aiSettings,
}: {
  groupName: string
  goalGroups: readonly GoalGroup[]
  branchTargets: readonly BranchTarget[]
  ownerDirectory: Record<string, string>
  onOpenSubcompany: () => void
  onOpenVilla: () => void
  apiBaseUrl: string
  aiSettings: AiSettings
}) {
  const group = goalGroups.find((item) => item.name === groupName) ?? goalGroups[0]
  const targets = branchTargets.filter((target) => target.group === group.name)

  return (
    <section className="branch-detail-panel" id="branchDetails">
      <header className="branch-detail-header">
        <div>
          <span>{group.no}</span>
          <strong>{group.name}</strong>
        </div>
        <em>{targets.length} 个大目标</em>
      </header>

      <div className="branch-target-list">
        {targets.map((target) => (
          <article className={`branch-target-row ${[SUBCOMPANY_TARGET_NAME, VILLA_TARGET_NAME].includes(target.title) ? 'has-drilldown' : ''}`} key={target.title}>
            <aside className="branch-target-rail">
              <span>{target.code}</span>
              <strong>{target.title}</strong>
              <em>系统</em>
              {target.title === SUBCOMPANY_TARGET_NAME ? (
                <button className="branch-drill-button" type="button" onClick={onOpenSubcompany}>
                  打开三级页面
                </button>
              ) : null}
              {target.title === VILLA_TARGET_NAME ? (
                <button className="branch-drill-button" type="button" onClick={onOpenVilla}>
                  打开三级页面
                </button>
              ) : null}
            </aside>
            <div className="branch-target-grid">
              {target.children.map((child, index) => (
                <section className="branch-detail-column" key={child}>
                  <h3>{child}</h3>
                  <div className="branch-action-list">
                    {(target.actions[index] ?? []).map((item) => (
                      <article className="branch-action-card" key={`${target.title}-${child}-${item.action}`}>
                        <strong>{item.action}</strong>
                        <span>{item.owner}</span>
                        <p>{ownerDetail(item.owner, ownerDirectory)}</p>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        ))}
      </div>
      <AiSectionPanel
        section="branch-detail"
        apiBaseUrl={apiBaseUrl}
        aiSettings={aiSettings}
        context={{ label: group.name, goalGroup: group, targets }}
      />
    </section>
  )
}

function ContactsPanel({
  keyword,
  rows,
  onKeywordChange,
  onExport,
  apiBaseUrl,
  aiSettings,
}: {
  keyword: string
  rows: readonly Contact[]
  onKeywordChange: (value: string) => void
  onExport: () => void
  apiBaseUrl: string
  aiSettings: AiSettings
}) {
  return (
    <div className="panel contact-panel section-anchor" id="org">
      <PanelHeader
        title="一级对接人总表"
        subtitle="执行类事项统一先对齐李锦宁，不能越级"
        action={
          <>
            <input className="input" value={keyword} onChange={(event) => onKeywordChange(event.currentTarget.value)} placeholder="搜索公司/品牌/负责人" />
            <button className="btn secondary" type="button" onClick={onExport}>
              导出CSV
            </button>
          </>
        }
      />
      <div className="panel-body contact-panel-body">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>模块</th>
                <th>公司/品牌</th>
                <th>一级对接人</th>
                <th>直接汇报对象</th>
                <th>状态</th>
                <th>备注</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={`${item.module}-${item.company}`}>
                  <td>{item.module}</td>
                  <td>
                    <strong>{item.company}</strong>
                  </td>
                  <td>{item.contact}</td>
                  <td>
                    <span className="pill pill-blue">{item.reportsTo}</span>
                  </td>
                  <td>
                    <span className={`pill ${statusPillClass(item.status)}`}>
                      <span className="dot" />
                      {item.status}
                    </span>
                  </td>
                  <td>{item.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AiSectionPanel
          compact
          section="contacts"
          apiBaseUrl={apiBaseUrl}
          aiSettings={aiSettings}
          context={{ label: '一级对接人总表', rows }}
        />
      </div>
    </div>
  )
}

function BrandPanel({ brands, apiBaseUrl, aiSettings }: { brands: readonly Brand[]; apiBaseUrl: string; aiSettings: AiSettings }) {
  return (
    <div className="panel brand-progress-panel">
      <PanelHeader title="品牌经营进度" subtitle="五大核心品牌目标完成度" />
      <div className="panel-body">
        <div className="brand-list">
          {brands.map((brand) => (
            <div className="brand-row" key={brand.name} title={brand.company}>
              <div className="brand-name">{brand.name}</div>
              <div className="bar">
                <span className={brandColor(brand.completion)} style={{ width: `${brand.completion}%` }} />
              </div>
              <div className="percent">{brand.completion}%</div>
            </div>
          ))}
        </div>
        <AiSectionPanel
          compact
          section="brand"
          apiBaseUrl={apiBaseUrl}
          aiSettings={aiSettings}
          context={{ label: '品牌经营进度', brands }}
        />
      </div>
    </div>
  )
}

function TasksPanel({
  tasks,
  activeStatus,
  onStatusChange,
  onTaskToggle,
  apiBaseUrl,
  aiSettings,
}: {
  tasks: readonly Task[]
  activeStatus: TaskStatus
  onStatusChange: (status: TaskStatus) => void
  onTaskToggle: (name: string, checked: boolean) => void
  apiBaseUrl: string
  aiSettings: AiSettings
}) {
  const visibleTasks = tasks.filter((task) => task.status === activeStatus)

  return (
    <div className="panel tasks-panel">
      <PanelHeader title="本周任务推进" subtitle="所有任务归口到一级对接人，不直接找华哥" />
      <div className="panel-body">
        <div className="task-tabs">
          {TASK_STATUSES.map((status) => (
            <button className={`tab ${activeStatus === status ? 'active' : ''}`} key={status} type="button" onClick={() => onStatusChange(status)}>
              {status}
            </button>
          ))}
        </div>
        <div className="task-list">
          {visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <label className="task-item" key={task.name}>
                <input checked={task.status === '已完成'} type="checkbox" onChange={(event) => onTaskToggle(task.name, event.currentTarget.checked)} />
                <strong>{task.name}</strong>
                <span className="task-meta">{task.owner}｜{task.due}</span>
                <span className={`pill ${task.priority === '高' ? 'pill-red' : 'pill-orange'}`}>{task.priority}</span>
              </label>
            ))
          ) : (
            <div className="task-item empty-task">
              <strong>当前无{activeStatus}任务</strong>
            </div>
          )}
        </div>
        <AiSectionPanel
          compact
          section="tasks"
          apiBaseUrl={apiBaseUrl}
          aiSettings={aiSettings}
          context={{ label: `本周任务-${activeStatus}`, activeStatus, tasks, visibleTasks }}
        />
      </div>
    </div>
  )
}

function RiskPanel({ risks, apiBaseUrl, aiSettings }: { risks: readonly Risk[]; apiBaseUrl: string; aiSettings: AiSettings }) {
  const localRisks = risks.filter((risk) => risk.type === 'local')
  const decisionRisks = risks.filter((risk) => risk.type === 'decision')

  return (
    <div className="panel risk-panel section-anchor" id="risk">
      <PanelHeader title="风险预警 / 待华哥决策事项" subtitle="区分“李锦宁协调”和“华哥拍板”" />
      <div className="panel-body">
        <div className="risk-wrap">
          <RiskBox title="可由李锦宁协调（需关注）" risks={localRisks} countLabel={`共 ${localRisks.length} 项`} type="local" />
          <RiskBox title="需上报华哥决策（待决策）" risks={decisionRisks} countLabel={`共 ${decisionRisks.length} 项`} type="decision" />
        </div>
        <AiSectionPanel
          compact
          section="risk"
          apiBaseUrl={apiBaseUrl}
          aiSettings={aiSettings}
          context={{ label: '风险预警与待决策事项', localRisks, decisionRisks }}
        />
      </div>
    </div>
  )
}

function RiskBox({ title, risks, countLabel, type }: { title: string; risks: readonly Risk[]; countLabel: string; type: 'local' | 'decision' }) {
  return (
    <div className={`risk-box risk-${type}`}>
      <h4>{title}</h4>
      <ul>
        {risks.map((risk) => (
          <li key={risk.text}>{risk.text}</li>
        ))}
      </ul>
      <div className="count">{countLabel}</div>
    </div>
  )
}

function SupplyPanel({ costs, apiBaseUrl, aiSettings }: { costs: readonly Cost[]; apiBaseUrl: string; aiSettings: AiSettings }) {
  return (
    <div className="panel">
      <PanelHeader title="供应链真实成本" subtitle="用于拆解“售价 - 佣金 - 成本 - 税费 - 净利”" />
      <div className="panel-body">
        <div className="cost-grid">
          {costs.map((item) => (
            <div className="cost-card" key={item.brand}>
              <strong>{item.brand}</strong>
              <div className="cost-line"><span>产品成本</span><span>{item.product.toFixed(1)} 元</span></div>
              <div className="cost-line"><span>物流成本</span><span>{item.logistics.toFixed(1)} 元</span></div>
              <div className="cost-line"><span>合计成本</span><span>{item.total.toFixed(1)} 元</span></div>
              <div className="cost-line"><span>规格</span><span>{item.spec}</span></div>
            </div>
          ))}
        </div>
        <AiSectionPanel
          section="supply"
          apiBaseUrl={apiBaseUrl}
          aiSettings={aiSettings}
          context={{ label: '供应链真实成本', costs }}
        />
      </div>
    </div>
  )
}

function TaxPanel({ taxCards, apiBaseUrl, aiSettings }: { taxCards: readonly TaxCard[]; apiBaseUrl: string; aiSettings: AiSettings }) {
  return (
    <div className="panel section-anchor" id="tax">
      <PanelHeader title="财税合规拆解" subtitle="供应链公司与运营公司两条模型分开看" />
      <div className="panel-body">
        <div className="governance-list">
          {taxCards.map((card) => (
            <div className="rule-card" key={card.title}>
              <h4>{card.title}</h4>
              <p>{card.desc}</p>
            </div>
          ))}
        </div>
        <AiSectionPanel
          section="tax"
          apiBaseUrl={apiBaseUrl}
          aiSettings={aiSettings}
          context={{ label: '财税合规拆解', taxCards }}
        />
      </div>
    </div>
  )
}

function DecisionPanel({
  data,
  tasks,
  apiBaseUrl,
  aiSettings,
  onCopy,
}: {
  data: DashboardData
  tasks: readonly Task[]
  apiBaseUrl: string
  aiSettings: AiSettings
  onCopy: (text?: string) => void
}) {
  const localInsights = useMemo(() => buildAiInsights(data, tasks), [data, tasks])
  const decisionContext = useMemo(() => ({ label: '全局决策包', data, tasks }), [data, tasks])
  const [loadState, setLoadState] = useState<AiLoadState>(() => ({ status: 'ready', insights: localInsights }))

  useEffect(() => {
    const controller = new AbortController()
    loadCachedAiInsights(apiBaseUrl, controller.signal, {
      section: 'decision',
      context: decisionContext,
    })
      .then((insights) => {
        if (controller.signal.aborted) return
        setLoadState({ status: 'ready', insights: insights ? normalizeAiInsights(insights, localInsights) : localInsights })
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return
        setLoadState({
          status: 'error',
          insights: {
            ...localInsights,
            provider: { status: 'client_fallback', reason: 'ai_endpoint_unavailable', error: error.message },
          },
          message: error.message,
        })
      })
    return () => controller.abort()
  }, [apiBaseUrl, decisionContext, localInsights])

  async function runDecisionAnalysis() {
    const controller = new AbortController()
    setLoadState({ status: 'loading', insights })
    try {
      const next = await loadAiInsights(apiBaseUrl, aiSettings, controller.signal, {
        section: 'decision',
        context: decisionContext,
        refresh: true,
      })
      setLoadState({ status: 'ready', insights: normalizeAiInsights(next, localInsights) })
    } catch (error) {
      setLoadState({
        status: 'error',
        insights: {
          ...localInsights,
          provider: { status: 'client_fallback', reason: 'ai_endpoint_unavailable', error: error instanceof Error ? error.message : String(error) },
        },
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const insights = loadState.insights
  const sourceLookup = useMemo(() => {
    return new Map((insights.sourceRefs ?? []).map((ref) => [ref.id, ref.label]))
  }, [insights.sourceRefs])
  const providerStatus = insights.provider?.status ?? 'client_fallback'
  const providerLabel = loadState.status === 'loading'
    ? 'Ark 分析中'
    : insights.cache?.status === 'hit'
      ? '已保存分析'
      : insights.cache?.status === 'saved'
        ? '已更新分析'
        : providerStatus === 'ark'
          ? `Ark ${insights.provider?.model ?? ''}`.trim()
        : providerStatus === 'not_configured'
          ? 'Ark 未配置'
          : '本地兜底'

  return (
    <section className="panel decision-panel section-anchor" id="decision">
      <PanelHeader
        title="AI 拆解建议与下周关注重点"
        subtitle={insights.summary}
        action={
          <>
            <span className={`ai-status ai-status-${providerStatus}`}>{providerLabel}</span>
            <button
              className="btn secondary"
              type="button"
              disabled={loadState.status === 'loading'}
              onClick={runDecisionAnalysis}
            >
              刷新分析
            </button>
            <button className="btn" type="button" onClick={() => onCopy(insights.decisionPackage)}>
              复制华哥决策包
            </button>
          </>
        }
      />
      <div className="panel-body">
        {loadState.status === 'error' ? <p className="ai-error">Ark 分析接口不可用：{loadState.message}</p> : null}
        {insights.provider?.status === 'fallback' && insights.provider.error ? (
          <p className="ai-error">Ark 请求失败，已切换本地兜底：{insights.provider.error}</p>
        ) : null}
        <div className="ai-panel">
          <div className="ai-orb"><span>{providerStatus === 'ark' ? 'ARK' : 'AI'}</span></div>
          <AiBlock title="经营建议" items={insights.advice} sourceLookup={sourceLookup} />
          <AiBlock title="异常提醒" items={insights.warnings} sourceLookup={sourceLookup} tone="warn" />
          <AiBlock title="下周关注重点" items={insights.next} sourceLookup={sourceLookup} tone="next" />
        </div>
      </div>
    </section>
  )
}

function normalizeAiInsights(payload: AiInsights, fallback: AiInsights): AiInsights {
  return {
    ...fallback,
    ...payload,
    advice: normalizeInsightItems(payload.advice, fallback.advice),
    warnings: normalizeInsightItems(payload.warnings, fallback.warnings),
    next: normalizeInsightItems(payload.next, fallback.next),
  }
}

function normalizeInsightItems(items: readonly (AiInsightItem | string)[] | undefined, fallback: readonly AiInsightItem[]) {
  if (!Array.isArray(items) || items.length === 0) return [...fallback]
  return items.map((item) => (typeof item === 'string' ? { text: item } : item)).filter((item) => item.text)
}

function AiBlock({
  title,
  items,
  sourceLookup,
  tone = '',
}: {
  title: string
  items: readonly AiInsightItem[]
  sourceLookup: Map<string, string>
  tone?: string
}) {
  return (
    <div className={`ai-block ${tone}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item.text}>
            <span>{item.text}</span>
            {item.sourceRefs?.length ? (
              <small>{item.sourceRefs.map((ref) => sourceLookup.get(ref) ?? ref).join(' / ')}</small>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function ApiSettingsPanel({
  open,
  draft,
  configured,
  testState = { status: 'idle' },
  onChange,
  onSave,
  onClear,
  onTest,
  onClose,
}: {
  open: boolean
  draft: AiSettings
  configured: boolean
  testState: AiConnectionTestState
  onChange: (settings: AiSettings) => void
  onSave: () => void
  onClear: () => void
  onTest: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="api-settings-popover" role="dialog" aria-label="Ark API 设置">
      <header>
        <div>
          <span>Ark Coding Plan</span>
          <h3>API 设置</h3>
        </div>
        <button className="api-settings-close" type="button" onClick={onClose} aria-label="关闭 API 设置">×</button>
      </header>
      <label>
        API Key
        <input
          autoComplete="off"
          placeholder="输入 ARK_API_KEY"
          type="password"
          value={draft.apiKey}
          onChange={(event) => onChange({ ...draft, apiKey: event.currentTarget.value })}
        />
      </label>
      <label>
        Model
        <input
          list="ark-model-options"
          value={draft.model}
          onChange={(event) => onChange({ ...draft, model: event.currentTarget.value })}
        />
      </label>
      <datalist id="ark-model-options">
        {[
          'ark-code-latest',
          'doubao-seed-2.0-code',
          'doubao-seed-2.0-pro',
          'doubao-seed-2.0-lite',
          'doubao-seed-code',
          'minimax-latest',
          'glm-5.1',
          'deepseek-v3.2',
          'deepseek-v4-flash',
          'deepseek-v4-pro',
          'kimi-k2.6',
        ].map((model) => (
          <option key={model} value={model} />
        ))}
      </datalist>
      <label>
        Base URL
        <input
          value={draft.baseUrl}
          onChange={(event) => onChange({ ...draft, baseUrl: event.currentTarget.value })}
        />
      </label>
      <p className="api-settings-state">
        {configured ? '已保存到本机浏览器；多人共用请配置后端 ARK_API_KEY' : '未配置本机 API Key；后端有 ARK_API_KEY 时所有用户可直接刷新分析'}
      </p>
      <ConnectionTestMessage state={testState} />
      <footer>
        <button className="btn secondary" type="button" onClick={onClear}>清除</button>
        <button className="btn secondary" type="button" disabled={testState.status === 'testing'} onClick={onTest}>
          {testState.status === 'testing' ? '测试中' : '测试连接'}
        </button>
        <button className="btn" type="button" onClick={onSave}>保存</button>
      </footer>
    </div>
  )
}

function ConnectionTestMessage({ state }: { state: AiConnectionTestState }) {
  if (state.status === 'idle') {
    return <p className="api-test-message">保存前可先测试 Ark Key、模型和 Base URL 是否可用。</p>
  }
  if (state.status === 'testing') {
    return <p className="api-test-message">正在通过后端测试 Ark chat/completions...</p>
  }

  const { result } = state
  const model = result.provider?.model ? `｜${result.provider.model}` : ''
  const latency = Number.isFinite(Number(result.latencyMs)) ? `｜${result.latencyMs}ms` : ''
  if (state.status === 'success') {
    return (
      <p className="api-test-message success">
        连接成功{model}{latency}。{result.sample ? `返回：${result.sample}` : ''}
      </p>
    )
  }

  const status = result.httpStatus ? `HTTP ${result.httpStatus}｜` : ''
  const code = result.error?.code ? `${result.error.code}｜` : ''
  return (
    <p className="api-test-message failure">
      连接失败：{status}{code}{result.error?.message || '未知错误'}{model}{latency}
    </p>
  )
}

function RulesPanel() {
  return (
    <section className="panel rules-panel" id="rules">
      <PanelHeader title="集团经营对齐规则" subtitle="制度上把“目标承接入口”和“重大决策入口”分开" />
      <div className="panel-body">
        <div className="governance-list">
          <div className="rule-card">
            <h4>01｜执行事项不越级</h4>
            <p>经营数据、周目标、跨公司协同、任务反馈，先向李锦宁提交。未形成决策包不得直接找华哥。</p>
          </div>
          <div className="rule-card">
            <h4>02｜每家公司一个口</h4>
            <p>每家公司或品牌只设置一名一级对接人；多人参与可以，但对集团只能输出一个口径。</p>
          </div>
          <div className="rule-card">
            <h4>03｜重大事项再上报</h4>
            <p>预算、人事、股权、重大合作、财税法务风险，由李锦宁汇总成“华哥决策包”后统一上报。</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function App() {
  const [dashboardState, setDashboardState] = useState<LoadedDashboardState>(() => fallbackDashboardState())
  const [connection, setConnection] = useState<DataConnection>(() => ({
    state: 'loading',
    apiBaseUrl: getApiBaseUrl(),
    message: '连接后端中',
  }))
  const [activeView, setActiveView] = useState<ViewKey>('overview')
  const [selectedGoalGroup, setSelectedGoalGroup] = useState('')
  const [contactKeyword, setContactKeyword] = useState('')
  const [taskStatus, setTaskStatus] = useState<TaskStatus>('待办')
  const [taskOverrides, setTaskOverrides] = useState<Record<string, TaskStatus>>({})
  const [subcompanyDrilldownOpen, setSubcompanyDrilldownOpen] = useState(false)
  const [villaDrilldownOpen, setVillaDrilldownOpen] = useState(false)
  const [taskCalendarEntryOpen, setTaskCalendarEntryOpen] = useState(false)
  const [aiSettings, setAiSettings] = useState<AiSettings>(() => loadSavedAiSettings())
  const [aiSettingsDraft, setAiSettingsDraft] = useState<AiSettings>(() => loadSavedAiSettings())
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false)
  const [aiTestState, setAiTestState] = useState<AiConnectionTestState>({ status: 'idle' })
  const [hashRoute, setHashRoute] = useState(() => {
    if (window.location.hash.startsWith('#/task-calendar')) return 'task-calendar'
    if (window.location.hash.startsWith('#/villa-project')) return 'villa-project'
    return ''
  })
  const [toast, setToast] = useState('')
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const syncHashRoute = () => {
      if (window.location.hash.startsWith('#/task-calendar')) setHashRoute('task-calendar')
      else if (window.location.hash.startsWith('#/villa-project')) setHashRoute('villa-project')
      else setHashRoute('')
    }
    window.addEventListener('hashchange', syncHashRoute)
    return () => window.removeEventListener('hashchange', syncHashRoute)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (hashRoute) {
      return
    }
    const controller = new AbortController()
    loadOperatingSystem(controller.signal)
      .then((loadedState) => {
        setDashboardState(loadedState)
        setConnection({
          state: 'cloud',
          apiBaseUrl: getApiBaseUrl(),
          message: '后端联动',
        })
      })
      .catch((error: Error) => {
        if (controller.signal.aborted) return
        console.warn('HUAGE operating-system API fallback:', error)
        setDashboardState(fallbackDashboardState())
        setConnection({
          state: 'fallback',
          apiBaseUrl: getApiBaseUrl(),
          message: '本地兜底',
        })
      })
    return () => controller.abort()
  }, [hashRoute])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 1800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const { data, goalGroups, branchTargets, ownerDirectory } = dashboardState

  const tasks = useMemo(
    () => data.tasks.map((task) => ({ ...task, status: taskOverrides[task.name] ?? task.status })) as Task[],
    [data.tasks, taskOverrides],
  )

  const filteredContacts = useMemo(() => {
    const query = contactKeyword.trim().toLowerCase()
    if (!query) return data.contacts
    return data.contacts.filter((item) => [item.module, item.company, item.contact, item.reportsTo, item.status, item.remark].join(' ').toLowerCase().includes(query))
  }, [contactKeyword, data.contacts])

  const showPyramidPanel = activeView === 'overview' || activeView === 'pyramid'
  const showContactsPanel = activeView === 'overview' || activeView === 'org'
  const showBrandPanel = activeView === 'overview' || activeView === 'brand'
  const showTaskPanel = activeView === 'overview' || activeView === 'brand'
  const showRiskPanel = activeView === 'overview' || activeView === 'risk'
  const showSupplyPanel = activeView === 'supply'
  const showTaxPanel = activeView === 'tax'
  const showDecisionPanel = activeView === 'overview' || activeView === 'decision'
  const showRulesPanel = activeView === 'decision'
  const viewCopy = VIEW_COPY[activeView]
  const detailGroupName = selectedGoalGroup || goalGroups[0]?.name || ''
  const showSubcompanyPage = activeView === 'pyramid' && detailGroupName === SUBCOMPANY_BRANCH_NAME && subcompanyDrilldownOpen
  const showVillaPage = activeView === 'pyramid' && detailGroupName === VILLA_BRANCH_NAME && villaDrilldownOpen
  const showTaskCalendarEntryPage = showSubcompanyPage && taskCalendarEntryOpen

  function activateView(view: ViewKey) {
    setActiveView(view)
    if (view !== 'pyramid') {
      setSelectedGoalGroup('')
      setSubcompanyDrilldownOpen(false)
      setVillaDrilldownOpen(false)
      setTaskCalendarEntryOpen(false)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function selectGoalGroup(group: string) {
    setActiveView('pyramid')
    setSelectedGoalGroup(group)
    if (group !== SUBCOMPANY_BRANCH_NAME) {
      setSubcompanyDrilldownOpen(false)
      setTaskCalendarEntryOpen(false)
    }
    if (group !== VILLA_BRANCH_NAME) {
      setVillaDrilldownOpen(false)
    }
  }

  function openSubcompanyDrilldown() {
    setActiveView('pyramid')
    setSelectedGoalGroup(SUBCOMPANY_BRANCH_NAME)
    setSubcompanyDrilldownOpen(true)
    setTaskCalendarEntryOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openVillaDrilldown() {
    setActiveView('pyramid')
    setSelectedGoalGroup(VILLA_BRANCH_NAME)
    setVillaDrilldownOpen(true)
    setSubcompanyDrilldownOpen(false)
    setTaskCalendarEntryOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleTaskToggle(name: string, checked: boolean) {
    setTaskOverrides((current) => ({ ...current, [name]: checked ? '已完成' : '待办' }))
    setToast('任务状态已更新')
  }

  function exportContacts() {
    const csv = `\ufeff${toCsv(data.contacts)}`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = '集团一级对接人总表.csv'
    link.click()
    URL.revokeObjectURL(url)
    setToast('一级对接人CSV已导出')
  }

  async function copyDecisionPackage(text?: string) {
    const decisionPackage = text || buildDecisionPackage(data, tasks)
    try {
      await navigator.clipboard.writeText(decisionPackage)
      setToast('华哥决策包已复制')
    } catch {
      setToast('浏览器限制复制，请在本地 HTTPS 或授权后重试')
    }
  }

  function openAiSettings() {
    setAiSettingsDraft(aiSettings)
    setAiTestState({ status: 'idle' })
    setAiSettingsOpen(true)
  }

  async function testCurrentAiSettings() {
    const controller = new AbortController()
    const next = normalizeAiSettings(aiSettingsDraft)
    setAiSettingsDraft(next)
    setAiTestState({ status: 'testing' })
    try {
      const result = await testAiConnection(getApiBaseUrl(), next, controller.signal)
      setAiTestState(result.ok ? { status: 'success', result } : { status: 'failure', result })
    } catch (error) {
      setAiTestState({
        status: 'failure',
        result: {
          ok: false,
          error: {
            code: 'test_connection_failed',
            message: error instanceof Error ? error.message : String(error),
          },
        },
      })
    }
  }

  function saveCurrentAiSettings() {
    const next = normalizeAiSettings(aiSettingsDraft)
    saveAiSettings(next)
    setAiSettings(next)
    setAiSettingsOpen(false)
    setToast('Ark API 设置已保存')
  }

  function clearCurrentAiSettings() {
    const next = defaultAiSettings()
    clearAiSettings()
    setAiSettings(next)
    setAiSettingsDraft(next)
    setAiTestState({ status: 'idle' })
    setToast('Ark API 设置已清除')
  }

  if (hashRoute === 'task-calendar') {
    return (
      <TaskCalendarEntryPage
        apiBaseUrl={getApiBaseUrl()}
        standalone
        onSaved={() => setToast('填报数据已同步')}
      />
    )
  }

  if (hashRoute === 'villa-project') {
    return (
      <VillaProjectPage
        apiBaseUrl={getApiBaseUrl()}
        onBack={() => {
          window.location.hash = ''
          window.scrollTo({ top: 0, behavior: 'smooth' })
        }}
      />
    )
  }

  return (
    <div className={`app ${showSubcompanyPage || showVillaPage ? 'subcompany-shell' : ''}`}>
      <aside className="sidebar">
        <div className="brand-logo">
          <div className="logo-mark" />
          <div className="brand-name">
            <strong>华哥集团</strong>
            <span>HUAGE GROUP</span>
          </div>
        </div>

        <nav className="nav" aria-label="集团看板导航">
          {NAV_ITEMS.map((item) => {
            if (item.key === 'pyramid') {
              const isExpanded = activeView === 'pyramid'
              return (
                <div className={`nav-group ${isExpanded ? 'expanded' : ''}`} key={item.key}>
                  <button className={`nav-item nav-parent ${activeView === item.key ? 'active' : ''}`} type="button" onClick={() => activateView(item.key)}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.label}
                  </button>
                  <div className="nav-sublist" aria-label="JOSMAN目标金字塔分支">
                    {goalGroups.map((group) => (
                      <button className={`nav-subitem ${selectedGoalGroup === group.name ? 'active' : ''}`} key={group.name} type="button" onClick={() => selectGoalGroup(group.name)}>
                        <span>{group.no}</span>
                        {group.name}
                      </button>
                    ))}
                  </div>
                </div>
              )
            }

            return (
              <button className={`nav-item ${activeView === item.key ? 'active' : ''}`} key={item.key} type="button" onClick={() => activateView(item.key)}>
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="avatar">李</div>
          <div className="user-meta">
            <strong>李锦宁</strong>
            <span>集团总助 / 经营承接</span>
          </div>
        </div>
      </aside>

      <main className={`main ${activeView === 'overview' && !showSubcompanyPage && !showVillaPage ? 'overview-main' : ''} ${showSubcompanyPage || showVillaPage ? 'subcompany-main' : ''}`}>
        {showTaskCalendarEntryPage ? (
          <TaskCalendarEntryPage
            apiBaseUrl={getApiBaseUrl()}
            onBack={() => {
              setTaskCalendarEntryOpen(false)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onSaved={() => setToast('填报数据已同步')}
          />
        ) : showSubcompanyPage ? (
          <SubcompanySupervisionPage
            sourceUrl={SUBCOMPANY_SUPERVISION_URL}
            apiBaseUrl={getApiBaseUrl()}
            aiSettings={aiSettings}
            onBack={() => {
              setSubcompanyDrilldownOpen(false)
              setTaskCalendarEntryOpen(false)
              setActiveView('pyramid')
              setSelectedGoalGroup(SUBCOMPANY_BRANCH_NAME)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            onOpenEntry={() => {
              const basePath = import.meta.env.BASE_URL || '/'
              window.open(`${window.location.origin}${basePath}#/task-calendar`, '_blank', 'noopener,noreferrer')
            }}
          />
        ) : showVillaPage ? (
          <VillaProjectPage
            apiBaseUrl={getApiBaseUrl()}
            onBack={() => {
              setVillaDrilldownOpen(false)
              setActiveView('pyramid')
              setSelectedGoalGroup(VILLA_BRANCH_NAME)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
          />
        ) : (
          <>
            <header className="topbar" id="overview">
          <div className="title-block">
            <h1>集团目标拆解与经营对齐看板</h1>
            <p>华哥定战略｜李锦宁承接拆解｜各公司一级对接｜重大事项形成决策包上报</p>
          </div>
          <div className="status-console" aria-label="系统状态台">
            <div className="digital-display digital-time" title={formatDateTime(now)}>
              <span>{formatMeridiem(now)}</span>
              <strong>{formatDigitalTime(now)}</strong>
              <em>{formatDigitalSecond(now)}</em>
            </div>
            <div className="digital-stack">
              <div>
                <div className="digital-display mini">{formatDayCode(now)}</div>
                <span>Day</span>
              </div>
              <div>
                <div className="digital-display mini">{formatDateCode(now)}</div>
                <span>Date</span>
              </div>
            </div>
          </div>
          <div className="top-actions">
            <span className={`badge-dark ${connection.state === 'fallback' ? 'badge-orange' : 'badge-green'}`}>● {connection.message}</span>
            <span className="badge-dark badge-blue">Ark AI</span>
            <span className="badge-dark" title={connection.apiBaseUrl}>{connection.state === 'cloud' ? 'Cloudflare D1' : connection.state === 'loading' ? '连接中' : '本地缓存'}</span>
            <span className="badge-dark">李锦宁</span>
          </div>
            </header>

        {activeView !== 'overview' ? (
          <section className="view-heading">
            <span className="view-kicker">当前大类</span>
            <h2>{viewCopy.title}</h2>
            <p>{viewCopy.desc}</p>
          </section>
        ) : null}

        {activeView === 'daily' ? (
          <>
            <DailyWorkPage />
            <AiSectionPanel
              section="daily"
              apiBaseUrl={getApiBaseUrl()}
              aiSettings={aiSettings}
              context={{ label: 'JN每日工作跟进', tasks }}
            />
          </>
        ) : null}

        {activeView === 'overview' ? <KpiGrid kpis={data.kpis} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} /> : null}

        {showPyramidPanel || showContactsPanel ? (
          <section className={`grid two-col section-anchor ${showPyramidPanel !== showContactsPanel ? 'single-view' : ''}`} id="pyramid">
            {showPyramidPanel ? <PyramidPanel pyramid={data.pyramid} goalGroups={goalGroups} selectedGroup={activeView === 'pyramid' ? detailGroupName : selectedGoalGroup} showBranches={activeView === 'pyramid'} onSelectGroup={selectGoalGroup} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} /> : null}
            {showContactsPanel ? <ContactsPanel keyword={contactKeyword} rows={filteredContacts} onKeywordChange={setContactKeyword} onExport={exportContacts} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} /> : null}
          </section>
        ) : null}

        {activeView === 'pyramid' ? (
          <BranchDetailPanel
            groupName={detailGroupName}
            goalGroups={goalGroups}
            branchTargets={branchTargets}
            ownerDirectory={ownerDirectory}
            onOpenSubcompany={openSubcompanyDrilldown}
            onOpenVilla={openVillaDrilldown}
            apiBaseUrl={getApiBaseUrl()}
            aiSettings={aiSettings}
          />
        ) : null}

        {showBrandPanel || showTaskPanel || showRiskPanel ? (
          <section className={`grid three-col section-anchor ${[showBrandPanel, showTaskPanel, showRiskPanel].filter(Boolean).length === 1 ? 'single-view' : ''}`} id="brand">
            {showBrandPanel ? <BrandPanel brands={data.brands} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} /> : null}
            {showTaskPanel ? <TasksPanel tasks={tasks} activeStatus={taskStatus} onStatusChange={setTaskStatus} onTaskToggle={handleTaskToggle} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} /> : null}
            {showRiskPanel ? <RiskPanel risks={data.risks} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} /> : null}
          </section>
        ) : null}

        {showSupplyPanel || showTaxPanel ? (
          <section className={`grid bottom-grid section-anchor ${showSupplyPanel !== showTaxPanel ? 'single-view' : ''}`} id="supply">
            {showSupplyPanel ? <SupplyPanel costs={data.costs} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} /> : null}
            {showTaxPanel ? <TaxPanel taxCards={data.taxCards} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} /> : null}
          </section>
        ) : null}

        {showDecisionPanel ? <DecisionPanel data={data} tasks={tasks} apiBaseUrl={getApiBaseUrl()} aiSettings={aiSettings} onCopy={copyDecisionPackage} /> : null}
        {showRulesPanel ? <RulesPanel /> : null}
          </>
        )}
      </main>

      <button
        className={`api-settings-button ${aiSettings.apiKey ? 'configured' : ''}`}
        type="button"
        title="Ark API 设置"
        aria-label="打开 Ark API 设置"
        onClick={openAiSettings}
      >
        <Settings />
      </button>
      <ApiSettingsPanel
        open={aiSettingsOpen}
        draft={aiSettingsDraft}
        configured={Boolean(aiSettings.apiKey)}
        testState={aiTestState}
        onChange={(settings) => {
          setAiSettingsDraft(settings)
          setAiTestState({ status: 'idle' })
        }}
        onSave={saveCurrentAiSettings}
        onClear={clearCurrentAiSettings}
        onTest={testCurrentAiSettings}
        onClose={() => setAiSettingsOpen(false)}
      />

      <div className={`toast ${toast ? 'show' : ''}`}>{toast || '已完成'}</div>
    </div>
  )
}

export default App
