export const dataStates = ['raw', 'validated', 'published', 'corrected', 'archived'] as const
export type DataState = (typeof dataStates)[number]

export const riskLevels = ['healthy', 'watch', 'risk', 'critical', 'unknown'] as const
export type RiskLevel = (typeof riskLevels)[number]

export const hevStates = [
  'draft',
  'submitted',
  'reviewed',
  'action_required',
  'verified',
  'archived',
] as const
export type HevState = (typeof hevStates)[number]

export const taskStates = [
  'created',
  'assigned',
  'in_progress',
  'blocked',
  'done',
  'accepted',
  'archived',
] as const
export type TaskState = (typeof taskStates)[number]

export const riskStates = [
  'identified',
  'triaged',
  'owner_assigned',
  'mitigation_in_progress',
  'escalated',
  'controlled',
  'closed',
  'archived',
] as const
export type RiskState = (typeof riskStates)[number]

export const decisionStates = [
  'proposed',
  'evidence_attached',
  'pending_decision',
  'decided',
  'action_created',
  'archived',
] as const
export type DecisionState = (typeof decisionStates)[number]

export type Subsidiary = {
  id: string
  name: string
  owner: string
  target: number
  actual: number
  forecastRate: number | null
  threeDayRate: number
  weekRate: number
  sourceBatchId: string
  sourceRow: number
  dataState: DataState
  riskLevel: RiskLevel
  hevState: HevState
  taskState: TaskState
  riskState: RiskState
  decisionState: DecisionState
  summary: string
}

export type ImportBatch = {
  id: string
  fileName: string
  source: string
  uploadedBy: string
  uploadedAt: string
  state: DataState
  hash: string
  rowCount: number
  errorCount: number
  objectKey?: string | null
  sourceFileSize?: number | null
  sourceMimeType?: string | null
}

export type DashboardPayload = {
  period: string
  organization: {
    name: string
    operator: string
    deployment: string
  }
  kpis: Array<{ label: string; value: string; tone: string }>
  lifecycle: Array<{ state: DataState; count: number }>
  subsidiaries: Subsidiary[]
  importBatches: ImportBatch[]
  validationIssues: Array<{
    id: string
    batchId: string
    severity: 'warning' | 'error'
    row: number
    field: string
    message: string
  }>
  auditLogs: Array<{
    id: string
    actor: string
    role: string
    action: string
    target: string
    before: string
    after: string
    reason: string
    timestamp: string
  }>
  decisionPackages: Array<{
    id: string
    title: string
    state: DecisionState
    owner: string
    evidence: string[]
    sourceRiskId?: string
    ownerPersonId?: string
    escalationReason?: string
    impactScope?: string
    decisionMakerPersonId?: string
    evidenceRefs?: string[]
    auditEventId?: string
    summary: string
  }>
}

export type AuditLog = DashboardPayload['auditLogs'][number]

export type SourceRow = {
  id: string
  batchId: string
  rowNumber: number
  rawPayload: Record<string, unknown>
  normalizedPayload: Record<string, unknown>
  validationState: 'valid' | 'warning' | 'error'
}

export type SubsidiaryDrilldownPayload = {
  subsidiary: Subsidiary
  source?: ImportBatch
  sourceRow?: SourceRow
  auditLogs: AuditLog[]
}

export type WorkflowType = 'hev' | 'task' | 'risk' | 'decision'

export type WorkflowMutationResult = {
  subsidiary: Subsidiary
  auditLog: AuditLog
  decisionPackage?: DashboardPayload['decisionPackages'][number] | null
  dashboard: DashboardPayload
}

export type OperatingSystemPayload = {
  period: string
  organization: DashboardPayload['organization']
  kpis: Array<{
    label: string
    value: string
    tone?: string
    prefix?: string
    unit?: string
    trend?: string
    trendType?: 'up' | 'down'
    target: string
    progress: number
  }>
  moduleHealth: Array<{
    id: string
    name: string
    owner: string
    status: 'healthy' | 'active' | 'watch' | 'risk' | 'critical'
    summary: string
    openItems: number
  }>
  goalPyramid: Array<{ level: string; title: string; description: string; desc?: string }>
  goalBranches: Array<{
    id: string
    code: string
    name: string
    owner: string
    status: 'healthy' | 'active' | 'watch' | 'risk' | 'critical'
    summary?: string
    goals?: string[]
    objectives: Array<{
      code?: string
      group?: string
      title: string
      metric?: string
      owner?: string
      children?: string[]
      actions: Array<string | Array<{ action: string; owner: string; ownerDetail?: string }>>
    }>
  }>
  ownerDirectory?: Record<string, string>
  contacts: Array<{
    id: string
    module: string
    company: string
    contact: string
    reportsTo: string
    status: '正常' | '预警' | '停用'
    remark: string
    updatedAt?: string
  }>
  brands: Array<{
    id: string
    name: string
    company: string
    completion: number
    status: 'healthy' | 'watch' | 'risk' | 'critical'
    owner: string
  }>
  tasks: Array<{
    id: string
    name: string
    owner: string
    due: string
    dueLabel?: string
    displayDue?: string
    priority: '高' | '中' | '低'
    status: '待办' | '进行中' | '已完成'
    module: string
    updatedAt?: string
  }>
  risks: Array<{
    id: string
    type: 'local' | 'decision'
    level: 'watch' | 'risk' | 'critical'
    text: string
    owner: string
    status?: 'open' | 'mitigating' | 'closed' | 'decided'
    updatedAt?: string
  }>
  costs: Array<{
    id: string
    brand: string
    product: number
    logistics: number
    total: number
    spec: string
    status: 'healthy' | 'watch' | 'risk' | 'critical'
  }>
  taxCards: Array<{ id: string; title: string; status: 'normal' | 'active' | 'watch' | 'risk'; description: string; desc?: string }>
  decisionRules: Array<{ id: string; title: string; description: string }>
  summaries: {
    openTasks: number
    highPriorityTasks: number
    decisionRisks: number
    weakBrands: number
    costWatchItems: number
    modulesAtRisk: number
  }
}

export type OperatingTaskMutationResult = {
  task: OperatingSystemPayload['tasks'][number]
  auditLog: AuditLog | null
  operatingSystem: OperatingSystemPayload
}

export type PeoplePayload = {
  people: Array<{
    id: string
    userId: string | null
    name: string
    roleCode: string
    title: string
    module: string
    active: boolean
  }>
  roles: Array<{ id: string; name: string; scope: string; permissions: string[] }>
  moduleResponsibilities: Array<{
    id: string
    module: string
    ownerPersonId: string
    accountablePersonId: string
    scope: string
  }>
  primaryContacts: OperatingSystemPayload['contacts']
  reportingLines: Array<{ id: string; fromPersonId: string; toPersonId: string; relation: string }>
  handoverEvents: Array<{
    id: string
    contactId: string
    beforeContact: string
    afterContact: string
    beforeStatus?: string
    afterStatus?: string
    reason: string
    actor: string
    timestamp: string
  }>
  auditEvents: AuditLog[]
}

export type PeopleContactMutationResult = {
  contact: OperatingSystemPayload['contacts'][number]
  handoverEvent: PeoplePayload['handoverEvents'][number] | null
  auditLog: AuditLog | null
  people: PeoplePayload
}

export type CommercialSystemPayload = {
  period: string
  organization: DashboardPayload['organization']
  readiness: Array<{
    id: string
    label: string
    completion: number
    status: 'active' | 'healthy' | 'watch' | 'risk' | 'critical' | 'scaffold' | 'manual_export' | 'planned' | 'draft'
    owner: string
    summary: string
  }>
  systemModules: Array<{
    id: string
    name: string
    layer: string
    owner: string
    status: 'active' | 'healthy' | 'watch' | 'risk' | 'critical' | 'scaffold' | 'manual_export' | 'planned' | 'draft'
    coverage: string
  }>
  masterData: {
    legalEntities: MasterDataRecord[]
    brands: MasterDataRecord[]
    channels: MasterDataRecord[]
    products: MasterDataRecord[]
    suppliers: MasterDataRecord[]
    warehouses: MasterDataRecord[]
  }
  approvalFlows: Array<{
    id: string
    title: string
    type: string
    state: string
    currentNode: string
    owner: string
    sla: string
    evidenceRefs: string[]
  }>
  workOrders: Array<{
    id: string
    title: string
    module: string
    owner: string
    priority: '高' | '中' | '低'
    status: '待办' | '进行中' | '阻塞' | '已完成'
    due: string
    source: string
    updatedAt?: string
  }>
  integrations: Array<{
    id: string
    name: string
    category: string
    status: 'active' | 'manual_export' | 'planned' | 'scaffold'
    adapter: string
    owner: string
    objects: string[]
  }>
  reportPacks: Array<{
    id: string
    name: string
    frequency: string
    owner: string
    status: 'active' | 'draft' | 'planned'
    sections: string[]
    recipients: string[]
  }>
  desktopClients: Array<{
    id: string
    name: string
    platform: string
    status: 'active' | 'scaffold' | 'planned'
    entry: string
    capability: string
  }>
  systemSettings: Array<{
    id: string
    name: string
    status: 'active' | 'watch' | 'planned'
    owner: string
    policy: string
  }>
  summaries: {
    readinessScore: number
    implementedModules: number
    plannedModules: number
    pendingApprovals: number
    openWorkOrders: number
    manualIntegrations: number
    softwareTargets: number
  }
}

export type MasterDataRecord = {
  id: string
  name: string
  status: string
  [key: string]: string | number | boolean | null | undefined
}

export type CommercialWorkOrderMutationResult = {
  workOrder: CommercialSystemPayload['workOrders'][number]
  auditLog: AuditLog | null
  commercialSystem: CommercialSystemPayload
}

export type RiskMutationResult = {
  risk: OperatingSystemPayload['risks'][number]
  decisionPackage?: DashboardPayload['decisionPackages'][number]
  auditLog: AuditLog | null
  operatingSystem: OperatingSystemPayload
  idempotent?: boolean
}
