// Shared domain types for the group dashboard (App.tsx and helpers).
// Extracted from App.tsx to separate type declarations from view logic.
import type { AiConnectionTestResult, AiInsights } from './aiClient'

export type ViewKey = 'overview' | 'pyramid' | 'daily' | 'brand' | 'tax' | 'supply' | 'org' | 'risk' | 'decision'
export type TaskStatus = '待办' | '进行中' | '已完成'
export type Kpi = { label: string; value: string; prefix?: string; unit?: string; trend?: string; trendType?: 'up' | 'down'; target: string; progress: number }
export type PyramidItem = { level: string; title: string; desc: string }
export type Contact = { module: string; company: string; contact: string; reportsTo: string; status: '正常' | '预警' | '停用'; remark: string }
export type Brand = { name: string; company: string; completion: number }
export type Task = { name: string; owner: string; due: string; priority: '高' | '中' | '低'; status: TaskStatus }
export type Risk = { type: 'local' | 'decision'; text: string }
export type Cost = { brand: string; product: number; logistics: number; total: number; spec: string }
export type TaxCard = { title: string; desc: string }
export type GoalGroup = { no: string; name: string; summary: string; goals: string[] }
export type AiLoadState =
  | { status: 'loading'; insights: AiInsights }
  | { status: 'ready'; insights: AiInsights }
  | { status: 'error'; insights: AiInsights; message: string }
export type AiConnectionTestState =
  | { status: 'idle' }
  | { status: 'testing' }
  | { status: 'success'; result: AiConnectionTestResult }
  | { status: 'failure'; result: AiConnectionTestResult }
export type DashboardData = {
  kpis: Kpi[]
  pyramid: PyramidItem[]
  contacts: Contact[]
  brands: Brand[]
  tasks: Task[]
  risks: Risk[]
  costs: Cost[]
  taxCards: TaxCard[]
}

export type BranchAction = { action: string; owner: string }
export type BranchTarget = {
  code: string
  group: string
  title: string
  children: string[]
  actions: BranchAction[][]
}

export type OperatingSystemResponse = {
  kpis?: Array<Kpi & { tone?: string }>
  goalPyramid?: Array<{ level: string; title: string; desc?: string; description?: string }>
  goalBranches?: Array<{
    code: string
    name: string
    summary?: string
    goals?: string[]
    owner?: string
    objectives?: Array<{
      code?: string
      group?: string
      title: string
      owner?: string
      children?: string[]
      actions?: Array<string | Array<{ action: string; owner: string; ownerDetail?: string }>>
    }>
  }>
  ownerDirectory?: Record<string, string>
  contacts?: Array<Contact & { id?: string }>
  brands?: Array<Brand & { id?: string; status?: string; owner?: string }>
  tasks?: Array<Omit<Task, 'due'> & { id?: string; due?: string; dueLabel?: string; displayDue?: string; module?: string }>
  risks?: Array<Risk & { id?: string; level?: string; owner?: string; status?: string }>
  costs?: Array<Cost & { id?: string; status?: string }>
  taxCards?: Array<{ id?: string; title: string; desc?: string; description?: string; status?: string }>
}

export type LoadedDashboardState = {
  data: DashboardData
  goalGroups: GoalGroup[]
  branchTargets: BranchTarget[]
  ownerDirectory: Record<string, string>
}

export type RemoteBranchActionGroup = string | Array<{ action: string; owner: string; ownerDetail?: string }>

export type DataConnection = {
  state: 'loading' | 'cloud' | 'fallback'
  apiBaseUrl: string
  message: string
}
