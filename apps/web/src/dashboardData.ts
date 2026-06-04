// Static seed / fallback data and view constants for the group dashboard.
// Extracted from App.tsx to separate data from view logic. Pure data only
// (NAV_ITEMS stays in App.tsx because it embeds JSX icons).
import type { BranchTarget, DashboardData, GoalGroup, TaskStatus, ViewKey } from './dashboardTypes'

export const FALLBACK_DATA: DashboardData = {
  kpis: [
    { label: '年度目标完成率', value: '62.7', unit: '%', trend: '+8.6pct', trendType: 'up', target: '年度目标：100%', progress: 62.7 },
    { label: '本月GMV', value: '2.83', prefix: '¥', unit: '亿', trend: '+15.4%', trendType: 'up', target: '目标：¥3.20亿｜完成88.4%', progress: 88.4 },
    { label: '本月净利润', value: '3,307', prefix: '¥', unit: '万', trend: '+12.7%', trendType: 'up', target: '目标：¥4,000万｜完成82.7%', progress: 82.7 },
    { label: '现金流健康度', value: '84', unit: '分', trend: '+6分', trendType: 'up', target: '80分以上为健康', progress: 84 },
    { label: '税务合规率', value: '98.3', unit: '%', trend: '+1.2pct', trendType: 'up', target: '90%以上为合规', progress: 98.3 },
    { label: '一级风险事项', value: '6', unit: '项', trend: '+2', trendType: 'down', target: '需重点关注与跟进', progress: 60 },
  ],
  pyramid: [
    { level: 'L0', title: '华哥战略目标', desc: '集团长期愿景、年度方向、重大资源与红线' },
    { level: 'L1', title: '李锦宁经营承接', desc: '承接集团目标，拆解经营路径、指标、节奏' },
    { level: 'L2', title: '五大模块目标', desc: '品牌经营 / 财税合规 / 供应链 / 组织协同 / 风险管控' },
    { level: 'L3', title: '公司/品牌目标', desc: '各公司、各品牌年度与月度经营目标' },
    { level: 'L4', title: '负责人目标', desc: '一级对接人的关键结果、资源需求与风险项' },
    { level: 'L5', title: '周任务/日动作', desc: '周计划、日动作、数据回收、异常预警' },
  ],
  contacts: [
    { module: '品牌经营', company: '赵宜主', contact: '待确认', reportsTo: '李锦宁', status: '正常', remark: '全渠道运营销售' },
    { module: '品牌经营', company: '最家西子', contact: '珠海无虑传媒负责人', reportsTo: '李锦宁', status: '正常', remark: '抖音自营运营' },
    { module: '品牌经营', company: '花木轻妍', contact: '珠海谷春雨负责人', reportsTo: '李锦宁', status: '预警', remark: '新品节奏与达人投放' },
    { module: '品牌经营', company: '控驻', contact: '杭州涌动花鱼负责人', reportsTo: '李锦宁', status: '预警', remark: '库存周转与毛利压力' },
    { module: '品牌经营', company: '元气甸甸', contact: '珠海元气甸甸负责人', reportsTo: '李锦宁', status: '正常', remark: '饮品渠道与复购' },
    { module: '货架电商', company: '珠海空锦界', contact: '空锦界运营负责人', reportsTo: '李锦宁', status: '正常', remark: '赵宜主货架代运营' },
    { module: 'BD拓展', company: '珠海逆戟鲸', contact: '李冬或指定负责人', reportsTo: '李锦宁', status: '正常', remark: '全品牌BD业务拓展' },
    { module: 'BD拓展', company: '深圳赫拉文化', contact: '深圳团队负责人', reportsTo: '李锦宁', status: '正常', remark: '全品牌BD协同' },
    { module: 'AI/技术/MCN', company: '广州竹蜻蜓', contact: '技术/MCN负责人', reportsTo: '李锦宁', status: '正常', remark: 'AI漫剧、广告、技术开发、跨境' },
    { module: '财税合规', company: '集团财务中心', contact: '财务负责人', reportsTo: '李锦宁', status: '正常', remark: '开票流、税负、返税、现金流' },
    { module: '供应链', company: '供应链中心', contact: '各品牌供应链接口', reportsTo: '李锦宁', status: '正常', remark: '产品成本、物流、损耗' },
    { module: '组织协同', company: '人事行政中心', contact: '人事行政负责人', reportsTo: '李锦宁', status: '正常', remark: '组织、绩效、编制' },
  ],
  brands: [
    { name: '赵宜主', company: '横琴/安吉/珠海涌动花鱼', completion: 78.6 },
    { name: '最家西子', company: '珠海无虑传媒', completion: 91.2 },
    { name: '花木轻妍', company: '珠海谷春雨', completion: 63.4 },
    { name: '控驻', company: '杭州涌动花鱼', completion: 48.7 },
    { name: '元气甸甸', company: '珠海元气甸甸', completion: 82.9 },
  ],
  tasks: [
    { name: '618大促预算复盘与资源调整', owner: '品牌经营-最家西子', due: '05-21', priority: '高', status: '待办' },
    { name: '花木轻妍新品上市营销方案确认', owner: '品牌经营-花木轻妍', due: '05-21', priority: '高', status: '待办' },
    { name: '控驻库存周转优化方案制定', owner: '品牌经营-控驻', due: '05-22', priority: '中', status: '待办' },
    { name: '元气甸甸达人合作效果复盘', owner: '品牌经营-元气甸甸', due: '05-22', priority: '中', status: '进行中' },
    { name: '税务风险自查与报告提交', owner: '财税合规', due: '05-23', priority: '高', status: '进行中' },
    { name: '一级对接人名单最终确认', owner: '组织协同', due: '05-24', priority: '高', status: '待办' },
    { name: '供应链成本复盘表提交', owner: '供应链', due: '05-24', priority: '中', status: '已完成' },
  ],
  risks: [
    { type: 'local', text: '花木轻妍新品节奏延迟，需协调供应链与产品团队' },
    { type: 'local', text: '控驻库存周转天数上升，需优化促销策略' },
    { type: 'local', text: '部分品牌费用超预算，建议调整投放节奏' },
    { type: 'local', text: '人力编制与目标责任未完全绑定，需优化绩效机制' },
    { type: 'decision', text: '是否追加618大促预算（需测算ROI后上报）' },
    { type: 'decision', text: '是否调整低毛利品牌资源优先级' },
  ],
  costs: [
    { brand: '赵宜主', product: 10.0, logistics: 7.0, total: 17.0, spec: '男女包/盒' },
    { brand: '花木轻妍', product: 4.1, logistics: 5.5, total: 9.6, spec: '超模碗/盒' },
    { brand: '控驻', product: 17.0, logistics: 4.0, total: 21.0, spec: '洗护/套' },
    { brand: '元气甸甸4瓶装', product: 3.2, logistics: 4.4, total: 7.6, spec: '饮品/瓶' },
    { brand: '元气甸甸8瓶装', product: 3.2, logistics: 8.8, total: 11.9, spec: '饮品/瓶' },
  ],
  taxCards: [
    { title: '供应链公司', desc: '供应链侧按13%销项与进项抵扣核算，需按资金流、合同流、发票流统一复盘。' },
    { title: '运营公司', desc: '运营侧采用差额服务费开票，按6%缴纳增值税，重点监控佣金、广告、服务费。' },
    { title: '优化目标', desc: '建立集团统一财务中心，标准化发票流转，实现100%合规与税负最优化。' },
  ],
}

export const SUBCOMPANY_BRANCH_NAME = '子公司监管分支'
export const SUBCOMPANY_TARGET_NAME = '子公司监管目标'
export const SUBCOMPANY_SUPERVISION_URL = `${import.meta.env.BASE_URL}subcompany-supervision/index.html`
export const VILLA_BRANCH_NAME = '专项项目分支'
export const VILLA_TARGET_NAME = '别墅项目目标'

const ROSTER_MAP = {
  brandOwners: '赵宜主：李锦宁；最家西子：负责人待确认；花木轻妍：负责人待确认；控驻：负责人待确认；元气甸甸：梁燕红',
  brandOps: '无虑传媒：陈裕豪/刘富铭；谷春雨：黄伟宁/温国森；涌动花鱼：沈启明/秦俏敏',
  channelOwners: '货架电商：李锦宁；BD：李冬；直播渠道：无虑传媒负责人待确认',
  hrLead: '人事行政：陈思尧',
  financeLead: '财务：余婷 / 王畅 / 温昌凤 / 戴慧敏',
  legalLead: '法务：王诗雅',
  supplyLead: '供应链：李磊磊 / 梁燕红 / 蔡秀玲',
  aiTechLead: 'AI/技术/MCN：负责人待确认',
  villaLead: '别墅项目：项目负责人待确认；施工负责人待确认',
  lijinning: '李锦宁',
} as const

export const FALLBACK_OWNER_DIRECTORY: Record<string, string> = {
  '各品牌一级负责人': ROSTER_MAP.brandOwners,
  品牌运营负责人: ROSTER_MAP.brandOps,
  '品牌负责人 + 财务负责人': `${ROSTER_MAP.brandOwners}；${ROSTER_MAP.financeLead}`,
  '品牌负责人 + 供应链': `${ROSTER_MAP.brandOwners}；${ROSTER_MAP.supplyLead}`,
  '货架电商 / BD 负责人': ROSTER_MAP.channelOwners,
  渠道负责人: ROSTER_MAP.channelOwners,
  人事行政负责人: ROSTER_MAP.hrLead,
  '人事行政 + 财务负责人': `${ROSTER_MAP.hrLead}；${ROSTER_MAP.financeLead}`,
  '技术/MCN 负责人': ROSTER_MAP.aiTechLead,
  'AI/技术/MCN 负责人': ROSTER_MAP.aiTechLead,
  'AI/技术负责人': ROSTER_MAP.aiTechLead,
  财务负责人: ROSTER_MAP.financeLead,
  集团财务中心: `${ROSTER_MAP.financeLead}；${ROSTER_MAP.legalLead}`,
  供应链中心: ROSTER_MAP.supplyLead,
  供应链接口: ROSTER_MAP.supplyLead,
  供应链负责人: ROSTER_MAP.supplyLead,
  各公司负责人: `${ROSTER_MAP.brandOwners}；${ROSTER_MAP.channelOwners}`,
  各模块负责人: `品牌：${ROSTER_MAP.brandOwners}；人事：${ROSTER_MAP.hrLead}；财务：${ROSTER_MAP.financeLead}；供应链：${ROSTER_MAP.supplyLead}；法务：${ROSTER_MAP.legalLead}`,
  各公司一级对接人: `${ROSTER_MAP.brandOwners}；${ROSTER_MAP.channelOwners}；${ROSTER_MAP.hrLead}；${ROSTER_MAP.financeLead}；${ROSTER_MAP.legalLead}`,
  风险责任人: '李锦宁统筹，预警事项对应模块负责人承接',
  别墅项目负责人: ROSTER_MAP.villaLead,
  施工负责人: ROSTER_MAP.villaLead,
  李锦宁统筹: ROSTER_MAP.lijinning,
}

export const FALLBACK_BRANCH_TARGETS: BranchTarget[] = [
  {
    code: '01',
    group: '集团增长分支',
    title: '品牌增长目标',
    children: ['GMV 增长', '利润增长', '渠道增长'],
    actions: [
      [
        { action: '拆品牌月 GMV 目标', owner: '各品牌一级负责人' },
        { action: '拆渠道 GMV 贡献', owner: '货架电商 / BD 负责人' },
        { action: '每日回收成交数据', owner: '品牌运营负责人' },
      ],
      [
        { action: '拆毛利与净利目标', owner: '品牌负责人 + 财务负责人' },
        { action: '核算投放 ROI', owner: '品牌运营负责人' },
        { action: '输出低利润纠偏动作', owner: '李锦宁统筹' },
      ],
      [
        { action: '拆抖音/货架/BD 渠道', owner: '渠道负责人' },
        { action: '确认达人与投放节奏', owner: '品牌运营负责人' },
        { action: '每周复盘渠道增长', owner: '李锦宁统筹' },
      ],
    ],
  },
  {
    code: '02',
    group: '集团增长分支',
    title: '产品与客户体验目标',
    children: ['产品结构', '客户体验', '复购口碑'],
    actions: [
      [
        { action: '梳理爆品/利润款/引流款', owner: '品牌运营负责人' },
        { action: '建立 SKU 分层表', owner: '供应链中心' },
        { action: '淘汰低效 SKU', owner: '品牌负责人 + 财务负责人' },
      ],
      [
        { action: '整理售前售后问题', owner: '品牌运营负责人' },
        { action: '建立客服问题分类', owner: '各模块负责人' },
        { action: '输出体验改进清单', owner: '李锦宁统筹' },
      ],
      [
        { action: '拆复购率目标', owner: '品牌运营负责人' },
        { action: '收集差评与退款原因', owner: '各公司一级对接人' },
        { action: '制定复购与口碑动作', owner: '品牌运营负责人' },
      ],
    ],
  },
  {
    code: '03',
    group: '降本增效分支',
    title: '组织人效目标',
    children: ['人工降 30%', '岗位盘点', '绩效重估'],
    actions: [
      [
        { action: '盘点现有人力成本', owner: '人事行政负责人' },
        { action: '测算降 30% 后编制', owner: '人事行政 + 财务负责人' },
        { action: '形成裁撤/合并建议', owner: '李锦宁统筹' },
      ],
      [
        { action: '列岗位价值清单', owner: '人事行政负责人' },
        { action: '标记重复与低效岗位', owner: '各公司负责人' },
        { action: '确认保留/替换/外包', owner: '李锦宁统筹' },
      ],
      [
        { action: '重做绩效指标', owner: '人事行政负责人' },
        { action: '绑定经营结果', owner: '各模块负责人' },
        { action: '周度考核与问责', owner: '李锦宁统筹' },
      ],
    ],
  },
  {
    code: '04',
    group: '降本增效分支',
    title: '人才梯队目标',
    children: ['负责人梯队', '关键岗位备份', '培训复制'],
    actions: [
      [
        { action: '明确每个模块第一负责人', owner: '李锦宁统筹' },
        { action: '标记可培养二号位', owner: '人事行政负责人' },
        { action: '建立负责人考核表', owner: '人事行政 + 财务负责人' },
      ],
      [
        { action: '列关键岗位不可断点清单', owner: '人事行政负责人' },
        { action: '每岗设置备份人', owner: '各模块负责人' },
        { action: '交接资料归档', owner: '李锦宁统筹' },
      ],
      [
        { action: '沉淀岗位 SOP', owner: '各模块负责人' },
        { action: '安排月度训练', owner: '人事行政负责人' },
        { action: '用结果检验复制效果', owner: '李锦宁统筹' },
      ],
    ],
  },
  {
    code: '05',
    group: '集团 OS 分支',
    title: '集团 OS 目标',
    children: ['数据入口', '流程看板', '权限体系'],
    actions: [
      [
        { action: '确定数据入口清单', owner: '技术/MCN 负责人' },
        { action: '统一品牌数据口径', owner: '品牌负责人 + 财务负责人' },
        { action: '建立每日数据回收', owner: '李锦宁统筹' },
      ],
      [
        { action: '搭建经营看板', owner: '技术/MCN 负责人' },
        { action: '搭建风险预警看板', owner: '技术/MCN 负责人' },
        { action: '搭建决策包输出页', owner: '李锦宁统筹' },
      ],
      [
        { action: '设计华哥/总助/负责人权限', owner: '技术/MCN 负责人' },
        { action: '区分查看与编辑权限', owner: '李锦宁统筹' },
        { action: '沉淀集团 OS 规则', owner: '李锦宁统筹' },
      ],
    ],
  },
  {
    code: '06',
    group: '集团 OS 分支',
    title: '数据资产目标',
    children: ['指标字典', '数据质量', '数据留痕'],
    actions: [
      [
        { action: '定义 GMV/利润/成本口径', owner: '财务负责人' },
        { action: '建立指标字典', owner: '技术/MCN 负责人' },
        { action: '统一各公司填报模板', owner: '李锦宁统筹' },
      ],
      [
        { action: '设置数据校验规则', owner: '技术/MCN 负责人' },
        { action: '每天检查异常数据', owner: '各公司一级对接人' },
        { action: '追责漏报错报', owner: '李锦宁统筹' },
      ],
      [
        { action: '保留数据修改记录', owner: '技术/MCN 负责人' },
        { action: '沉淀决策依据附件', owner: '各模块负责人' },
        { action: '形成可追溯经营档案', owner: '李锦宁统筹' },
      ],
    ],
  },
  {
    code: '07',
    group: '集团 OS 分支',
    title: 'AI 透明工厂',
    children: ['AI 工作流', '透明数据', '自动化生产'],
    actions: [
      [
        { action: '梳理可 AI 化流程', owner: '技术/MCN 负责人' },
        { action: '接入内容/广告/数据流程', owner: 'AI/技术/MCN 负责人' },
        { action: '输出 AI 工作流清单', owner: '李锦宁统筹' },
      ],
      [
        { action: '公开经营关键数据', owner: '各模块负责人' },
        { action: '建立异常自动提醒', owner: '技术/MCN 负责人' },
        { action: '形成透明工厂日报', owner: '李锦宁统筹' },
      ],
      [
        { action: '识别可自动化生产环节', owner: '技术/MCN 负责人' },
        { action: '拆自动化上线节点', owner: 'AI/技术负责人' },
        { action: '复盘节省人力成本', owner: '财务负责人' },
      ],
    ],
  },
  {
    code: '08',
    group: '降本增效分支',
    title: '财税合规目标',
    children: ['少交税合规', '发票流', '资金合同流'],
    actions: [
      [
        { action: '设计合规节税方案', owner: '集团财务中心' },
        { action: '测算税负优化空间', owner: '财务负责人' },
        { action: '形成华哥决策包', owner: '李锦宁统筹' },
      ],
      [
        { action: '检查发票开具路径', owner: '财务负责人' },
        { action: '核对进销项抵扣', owner: '集团财务中心' },
        { action: '标记异常发票风险', owner: '财务负责人' },
      ],
      [
        { action: '核对资金流', owner: '财务负责人' },
        { action: '核对合同流', owner: '各公司负责人' },
        { action: '做到三流一致', owner: '集团财务中心' },
      ],
    ],
  },
  {
    code: '09',
    group: '降本增效分支',
    title: '现金流与预算目标',
    children: ['现金流预测', '预算审批', '费用预警'],
    actions: [
      [
        { action: '做 13 周现金流预测', owner: '财务负责人' },
        { action: '标记资金缺口日期', owner: '集团财务中心' },
        { action: '提前提交资金方案', owner: '李锦宁统筹' },
      ],
      [
        { action: '建立预算申请口径', owner: '财务负责人' },
        { action: '区分必要/可延后/禁止费用', owner: '李锦宁统筹' },
        { action: '重大预算形成决策包', owner: '集团财务中心' },
      ],
      [
        { action: '设置费用超支阈值', owner: '财务负责人' },
        { action: '周度推送费用预警', owner: '集团财务中心' },
        { action: '要求负责人给纠偏动作', owner: '李锦宁统筹' },
      ],
    ],
  },
  {
    code: '10',
    group: '子公司监管分支',
    title: '法务合同目标',
    children: ['合同台账', '风险条款', '证据留存'],
    actions: [
      [
        { action: '汇总所有合同台账', owner: '集团财务中心' },
        { action: '标记合同主体与期限', owner: '各公司负责人' },
        { action: '补齐缺失合同', owner: '风险责任人' },
      ],
      [
        { action: '检查付款/违约/税务条款', owner: '集团财务中心' },
        { action: '标记高风险条款', owner: '风险责任人' },
        { action: '重大合同上报决策', owner: '李锦宁统筹' },
      ],
      [
        { action: '归档聊天/订单/付款证据', owner: '各公司一级对接人' },
        { action: '建立证据留存规则', owner: '集团财务中心' },
        { action: '形成纠纷应对包', owner: '风险责任人' },
      ],
    ],
  },
  {
    code: '11',
    group: '降本增效分支',
    title: '供应链降本目标',
    children: ['产品成本', '物流成本', '库存损耗'],
    actions: [
      [
        { action: '拆 SKU 产品成本', owner: '供应链中心' },
        { action: '比价供应商方案', owner: '供应链接口' },
        { action: '输出降本清单', owner: '李锦宁统筹' },
      ],
      [
        { action: '拆仓储物流成本', owner: '供应链中心' },
        { action: '优化发货路径', owner: '供应链接口' },
        { action: '周度复盘物流成本', owner: '供应链负责人' },
      ],
      [
        { action: '盘点库存周转', owner: '供应链中心' },
        { action: '标记滞销与损耗', owner: '品牌负责人 + 供应链' },
        { action: '制定清库存动作', owner: '品牌运营负责人' },
      ],
    ],
  },
  {
    code: '12',
    group: '子公司监管分支',
    title: '子公司监管目标',
    children: ['经营日报', '异常预警', '问责机制'],
    actions: [
      [
        { action: '建立子公司经营日报', owner: '各公司一级对接人' },
        { action: '回收 GMV/利润/现金流', owner: '财务负责人' },
        { action: '总助汇总给华哥', owner: '李锦宁统筹' },
      ],
      [
        { action: '设置异常阈值', owner: '李锦宁统筹' },
        { action: '标记成本/税务/人效异常', owner: '各模块负责人' },
        { action: '输出风险预警清单', owner: '风险责任人' },
      ],
      [
        { action: '明确问责规则', owner: '李锦宁统筹' },
        { action: '绑定负责人结果', owner: '各公司负责人' },
        { action: '周会追责闭环', owner: '李锦宁统筹' },
      ],
    ],
  },
  {
    code: '13',
    group: '子公司监管分支',
    title: '决策闭环目标',
    children: ['议题收口', '决策包标准', '闭环复盘'],
    actions: [
      [
        { action: '统一收集团队议题', owner: '李锦宁统筹' },
        { action: '区分执行/风险/资源议题', owner: '各模块负责人' },
        { action: '筛出需华哥拍板事项', owner: '风险责任人' },
      ],
      [
        { action: '统一决策包模板', owner: '李锦宁统筹' },
        { action: '补齐背景/测算/选项/风险', owner: '各模块负责人' },
        { action: '重大事项会前预审', owner: '集团财务中心' },
      ],
      [
        { action: '记录华哥最终意见', owner: '李锦宁统筹' },
        { action: '拆成责任人与截止日', owner: '各公司一级对接人' },
        { action: '周会检查闭环结果', owner: '李锦宁统筹' },
      ],
    ],
  },
  {
    code: '14',
    group: '专项项目分支',
    title: '别墅项目目标',
    children: ['完工时间', '预算控制', '节点验收'],
    actions: [
      [
        { action: '确认最终完工日期', owner: '别墅项目负责人' },
        { action: '拆施工周节点', owner: '施工负责人' },
        { action: '延期风险提前上报', owner: '李锦宁统筹' },
      ],
      [
        { action: '复核预算总额', owner: '财务负责人' },
        { action: '跟踪增项费用', owner: '别墅项目负责人' },
        { action: '形成预算预警', owner: '李锦宁统筹' },
      ],
      [
        { action: '列验收标准', owner: '施工负责人' },
        { action: '节点拍照留档', owner: '别墅项目负责人' },
        { action: '质量问题闭环', owner: '李锦宁统筹' },
      ],
    ],
  },
] as const

export const FALLBACK_GOAL_GROUPS: GoalGroup[] = [
  { no: '01', name: '集团增长分支', summary: '增长、利润、现金流', goals: ['品牌增长目标', '产品与客户体验目标'] },
  { no: '02', name: '集团 OS 分支', summary: '目标、数据、流程、预警', goals: ['集团 OS 目标', '数据资产目标', 'AI 透明工厂'] },
  { no: '03', name: '子公司监管分支', summary: '经营、财务、人效、风险', goals: ['法务合同目标', '子公司监管目标', '决策闭环目标'] },
  { no: '04', name: '降本增效分支', summary: '人工成本、财税、供应链', goals: ['组织人效目标', '人才梯队目标', '财税合规目标', '现金流与预算目标', '供应链降本目标'] },
  { no: '05', name: '专项项目分支', summary: '专项项目节点管控', goals: ['别墅项目目标'] },
]

export const VIEW_COPY: Record<ViewKey, { title: string; desc: string }> = {
  overview: { title: '总览', desc: '集团经营核心指标、运行状态和对齐规则。' },
  pyramid: { title: '目标金字塔', desc: '从华哥战略目标向下拆到模块、品牌、负责人和周任务。' },
  daily: { title: 'JN每日工作跟进', desc: '每日目标、网页清单、任务拆解和项目空间节点跟进。' },
  brand: { title: '品牌经营', desc: '集中查看品牌目标完成度和本周推进事项。' },
  tax: { title: '财税合规', desc: '区分供应链公司与运营公司的财税模型、开票、税负和现金流要点。' },
  supply: { title: '供应链', desc: '查看各品牌真实成本、物流成本和规格拆解。' },
  org: { title: '组织协同', desc: '查看集团一级对接人总表，搜索公司、品牌、负责人，并导出对接清单。' },
  risk: { title: '风险预警', desc: '分清可由李锦宁协调的事项和需要形成华哥决策包的重大事项。' },
  decision: { title: '决策包', desc: '汇总 AI 拆解建议、异常提醒和下周关注重点。' },
}

export const DEFAULT_CLOUD_API_BASE_URL = 'https://ydhy-api.2445776963.workers.dev/api'

export const TASK_STATUSES: TaskStatus[] = ['待办', '进行中', '已完成']
