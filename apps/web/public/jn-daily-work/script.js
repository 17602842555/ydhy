const seedData = {
  goals: [
    {
      id: "G01",
      name: "集团 OS 系统搭建",
      progress: 55,
      status: "进行中",
      owner: "技术 / 总助",
      due: "2026-06-28",
      summary: "集团 OS 已按系统菜单归档：AI管家、基础设置、影刀管理、运营管理、财务管理、数据管理、用户管理、系统管理、经营总控、公司股权、品牌渠道、财税供应链、组织协同、合同风险。已完成基础数据、供应链、影刀模块。",
      next: "剩余财务模块预计 1 周；审批流模块含行政、人事、税务预计 2 周；任务模块加知识库模块预计 1 周；最终交付时间 2026-06-28。"
    },
    {
      id: "G02",
      name: "降低人工成本 30%",
      progress: 0,
      status: "待启动",
      owner: "人事 / 财务",
      due: "待排期",
      summary: "建立人工成本基线，拆解岗位、流程、自动化替代空间。",
      next: "导入人员薪资、部门成本、岗位职责数据。"
    },
    {
      id: "G03",
      name: "别墅项目节点管理",
      progress: 0,
      status: "待启动",
      owner: "项目负责人",
      due: "待排期",
      summary: "按负一、夹层、一楼、二楼、三楼、四楼拆空间节点，并跟踪设计、采购、施工、验收。",
      next: "给每个空间补负责人、计划完成时间和当前施工状态。"
    },
    {
      id: "G04",
      name: "总助目标驾驶舱搭建",
      progress: 0,
      status: "待启动",
      owner: "总助",
      due: "待排期",
      summary: "承接老板目标、会议纪要、待办提醒、项目风险和周报输出。",
      next: "确定总助每日、每周、每月要看的指标。"
    },
    {
      id: "G05",
      name: "透明 AI 工厂港湾 8 号 1 栋规划",
      progress: 0,
      status: "待启动",
      owner: "规划负责人",
      due: "待排期",
      summary: "拆解空间规划、业务规划、动线规划、设备规划、预算规划与上线时间表。",
      next: "确认楼层面积、可用空间、核心功能区。"
    },
    {
      id: "G06",
      name: "12 楼办公室与车位重新规划",
      progress: 0,
      status: "待启动",
      owner: "行政",
      due: "待排期",
      summary: "根据现有 12 楼布局重新规划办公室、工位、会议室与负一车位。",
      next: "盘点当前工位、办公室、会议室、车位数量。"
    },
    {
      id: "G07",
      name: "别墅软装采购进度",
      progress: 0,
      status: "待启动",
      owner: "采购 / 项目负责人",
      due: "待排期",
      summary: "按空间梳理软装清单、预算、供应商、比价、下单、到货、安装和验收。",
      next: "先按楼层和空间输出软装采购清单与预算表。"
    },
    {
      id: "G08",
      name: "刘老师直播复盘跟进",
      progress: 98,
      status: "进行中",
      owner: "直播运营 / 总助",
      due: "本月",
      summary: "已调取刘老师 5 月直播日播数据：14 天抖音 GMV 15,813,197，GSV 13,143,763，退货 2,669,435；快手 GMV 292,817，GSV 233,697。",
      next: "重点复盘 5/15 大场峰值、5/25 高转化高退货、5/10 少播低谷；按每日数据继续跟进退货率、转化率、流量来源和次日动作验证。"
    }
  ],
  pages: [
    { name: "总览驾驶舱", goal: "全部", priority: "P0", status: "进行中", next: "集中展示 6 个目标的进度、风险和下一步。" },
    { name: "集团 OS 首页", goal: "集团 OS 系统搭建", priority: "P0", status: "进行中", next: "整合模块入口、权限入口和经营数据入口。" },
    { name: "品牌管理页", goal: "集团 OS 系统搭建", priority: "P0", status: "已完成", next: "确认品牌字段与后续运营维护人。" },
    { name: "店铺管理页", goal: "集团 OS 系统搭建", priority: "P0", status: "已完成", next: "补齐门店负责人、经营指标、巡店字段。" },
    { name: "供应链库存页", goal: "集团 OS 系统搭建", priority: "P0", status: "已完成", next: "增加库存预警规则和出入库审批。" },
    { name: "公司股份页", goal: "集团 OS 系统搭建", priority: "P1", status: "已完成", next: "确认股权变更记录和查看权限。" },
    { name: "AI管家页", goal: "集团 OS 系统搭建", priority: "P1", status: "待确认", next: "确认 AI 问答、数据读取、智能提醒和权限边界。" },
    { name: "基础设置页", goal: "集团 OS 系统搭建", priority: "P0", status: "已完成", next: "业务管理、公司管理、股份管理、达人管理、达人认领、品牌管理、产品管理已完成。" },
    { name: "影刀管理页", goal: "集团 OS 系统搭建", priority: "P0", status: "已完成", next: "确认影刀任务、自动化脚本、运行日志和异常提醒。" },
    { name: "运营管理页", goal: "集团 OS 系统搭建", priority: "P1", status: "待确认", next: "确认运营数据、达人/品牌/产品协同口径。" },
    { name: "财务数据页", goal: "集团 OS 系统搭建", priority: "P0", status: "待确认", next: "将已梳理业务口径转成页面字段。" },
    { name: "数据管理页", goal: "集团 OS 系统搭建", priority: "P1", status: "待确认", next: "确认数据导入、数据看板、口径字典和权限。" },
    { name: "用户管理页", goal: "集团 OS 系统搭建", priority: "P0", status: "待确认", next: "确认账号、角色、组织、权限、登录和停用规则。" },
    { name: "系统管理页", goal: "集团 OS 系统搭建", priority: "P1", status: "待确认", next: "确认系统配置、日志、消息、字典和后台管理。" },
    { name: "经营总控页", goal: "集团 OS 系统搭建", priority: "P1", status: "待确认", next: "确认经营看板指标、汇总层级和老板视图。" },
    { name: "品牌渠道页", goal: "集团 OS 系统搭建", priority: "P1", status: "已完成", next: "品牌管理已完成，渠道字段待最终确认。" },
    { name: "财税供应链页", goal: "集团 OS 系统搭建", priority: "P0", status: "进行中", next: "供应链已完成，财务/税务审批流待开发。" },
    { name: "组织协同页", goal: "集团 OS 系统搭建", priority: "P0", status: "待启动", next: "接入任务模块、知识库模块和跨部门协作事项。" },
    { name: "合同风险页", goal: "集团 OS 系统搭建", priority: "P1", status: "待启动", next: "确认合同台账、风险提醒、审批节点和归档规则。" },
    { name: "行政人事审批流页", goal: "集团 OS 系统搭建", priority: "P0", status: "待启动", next: "开发请假、报销、采购、入离职审批。" },
    { name: "人工成本分析页", goal: "降低人工成本 30%", priority: "P0", status: "待启动", next: "建立成本基线、部门成本、岗位成本。" },
    { name: "流程自动化页", goal: "降低人工成本 30%", priority: "P0", status: "待启动", next: "梳理可自动化事项和节省金额测算。" },
    { name: "别墅项目总览页", goal: "别墅项目节点管理", priority: "P0", status: "待启动", next: "按楼层查看空间进度、风险、验收状态。" },
    { name: "别墅空间节点页", goal: "别墅项目节点管理", priority: "P0", status: "待启动", next: "每个空间记录设计、材料、施工、验收。" },
    { name: "总助目标驾驶舱", goal: "总助目标驾驶舱搭建", priority: "P0", status: "待启动", next: "承接目标、待办、会议纪要、老板交办。" },
    { name: "AI 工厂规划页", goal: "透明 AI 工厂港湾 8 号 1 栋规划", priority: "P1", status: "待启动", next: "沉淀楼层、功能区、设备、预算和动线。" },
    { name: "12 楼办公室规划页", goal: "12 楼办公室与车位重新规划", priority: "P1", status: "待启动", next: "规划办公室、工位、会议室、车位。" },
    { name: "别墅软装采购页", goal: "别墅软装采购进度", priority: "P0", status: "待启动", next: "按空间跟踪软装清单、供应商、下单、到货、安装和验收。" },
    { name: "刘老师直播每日数据页", goal: "刘老师直播复盘跟进", priority: "P0", status: "进行中", next: "每天记录场次、GMV、观看、互动、转化、投流、成交和退款等指标。" },
    { name: "刘老师直播每日复盘页", goal: "刘老师直播复盘跟进", priority: "P0", status: "进行中", next: "每天沉淀亮点、问题、原因、优化动作和次日验证指标。" },
    { name: "直播复盘行动清单页", goal: "刘老师直播复盘跟进", priority: "P0", status: "待启动", next: "按责任人、截止时间、验证指标跟进每条优化动作。" },
    { name: "直播周复盘汇总页", goal: "刘老师直播复盘跟进", priority: "P1", status: "待启动", next: "每周汇总趋势、共性问题、有效动作和下周重点。" }
  ],
  tasks: [
    { name: "品牌模块", desc: "品牌档案、品牌定位、视觉资料、授权资料、品牌任务。", status: "已完成", group: "集团 OS", progress: 100, owner: "品牌负责人", due: "已完成", next: "确认维护责任人。" },
    { name: "店铺模块", desc: "门店档案、位置、负责人、经营指标、巡检记录。", status: "已完成", group: "集团 OS", progress: 100, owner: "运营负责人", due: "已完成", next: "补齐门店经营指标。" },
    { name: "供应链库存模块", desc: "供应商、采购单、库存台账、库存预警、出入库记录。", status: "已完成", group: "集团 OS", progress: 100, owner: "供应链负责人", due: "已完成", next: "确认库存预警规则。" },
    { name: "公司股份模块", desc: "股东信息、股份比例、变更记录、分红记录。", status: "已完成", group: "集团 OS", progress: 100, owner: "财务 / 法务", due: "已完成", next: "确认查看权限。" },
    { name: "财务数据模块", desc: "收入、支出、利润、现金流、业务数据口径。", status: "待确认", group: "集团 OS", progress: 70, owner: "财务", due: "待排期", next: "将业务口径转成页面字段。" },
    { name: "行政人事模块", desc: "员工档案、考勤、请假、报销、采购、入离职审批。", status: "待启动", group: "集团 OS", progress: 0, owner: "人事", due: "待排期", next: "梳理员工档案和审批字段。" },
    { name: "审批流模块", desc: "审批节点、审批角色、通知提醒、审批记录。", status: "进行中", group: "集团 OS", progress: 20, owner: "技术 / 总助", due: "待排期", next: "确认审批节点和通知方式。" },
    { name: "权限体系", desc: "管理员、部门负责人、普通员工、财务、人事权限。", status: "待启动", group: "集团 OS", progress: 0, owner: "技术", due: "待排期", next: "定义角色权限矩阵。" },
    { name: "OS菜单-AI管家", desc: "AI 问答、智能提醒、业务数据读取和管理驾驶舱辅助。", status: "待确认", group: "集团 OS", progress: 30, owner: "技术 / 总助", due: "待排期", next: "确认 AI 可读取的数据范围和权限。" },
    { name: "OS菜单-基础设置", desc: "业务管理、公司管理、股份管理、达人管理、达人认领、品牌管理、产品管理。", status: "已完成", group: "集团 OS", progress: 100, owner: "技术", due: "已完成", next: "进入最终验收。" },
    { name: "OS菜单-影刀管理", desc: "影刀自动化任务、脚本、运行日志、异常提醒。", status: "已完成", group: "集团 OS", progress: 100, owner: "技术", due: "已完成", next: "接入运行监控与异常记录。" },
    { name: "OS菜单-运营管理", desc: "运营数据、达人/品牌/产品协同、业务动作沉淀。", status: "待确认", group: "集团 OS", progress: 40, owner: "运营 / 技术", due: "待排期", next: "确认运营管理字段和页面层级。" },
    { name: "OS菜单-财务管理", desc: "财务模块，预计 1 周完成。", status: "进行中", group: "集团 OS", progress: 25, owner: "财务 / 技术", due: "2026-06-04", next: "完成财务字段、账务口径、报表和权限。" },
    { name: "OS菜单-数据管理", desc: "数据导入、数据看板、口径字典、数据权限。", status: "待确认", group: "集团 OS", progress: 40, owner: "技术", due: "待排期", next: "统一数据口径和导入模板。" },
    { name: "OS菜单-用户管理", desc: "账号、角色、组织、权限、登录和停用规则。", status: "待确认", group: "集团 OS", progress: 50, owner: "技术 / 人事", due: "待排期", next: "与审批流角色同步确认。" },
    { name: "OS菜单-系统管理", desc: "系统配置、日志、消息、字典、后台管理。", status: "待确认", group: "集团 OS", progress: 45, owner: "技术", due: "待排期", next: "确认系统配置项和日志追踪。" },
    { name: "OS菜单-经营总控", desc: "老板视角经营看板、核心指标、目标追踪。", status: "待确认", group: "集团 OS", progress: 35, owner: "总助 / 技术", due: "待排期", next: "确认经营总控指标。" },
    { name: "OS菜单-公司股权", desc: "公司股权、股份比例、股东信息、变更记录。", status: "已完成", group: "集团 OS", progress: 100, owner: "财务 / 法务", due: "已完成", next: "确认查看权限和变更归档。" },
    { name: "OS菜单-品牌渠道", desc: "品牌管理、渠道信息、品牌渠道关系。", status: "已完成", group: "集团 OS", progress: 90, owner: "品牌 / 技术", due: "已完成", next: "补齐渠道字段。" },
    { name: "OS菜单-财税供应链", desc: "供应链已完成，财务和税务审批流待完成。", status: "进行中", group: "集团 OS", progress: 60, owner: "财务 / 供应链 / 技术", due: "2026-06-18", next: "完成财务模块与税务审批流联动。" },
    { name: "OS菜单-组织协同", desc: "任务模块加知识库模块，预计 1 周完成。", status: "待启动", group: "集团 OS", progress: 0, owner: "总助 / 技术", due: "2026-06-11", next: "开发任务模块、知识库模块和协作入口。" },
    { name: "OS菜单-合同风险", desc: "合同台账、风险提醒、审批节点和归档规则。", status: "待启动", group: "集团 OS", progress: 0, owner: "法务 / 技术", due: "待排期", next: "确认合同风险字段和审批规则。" },
    { name: "当前人工成本统计", desc: "人员表、岗位表、薪资总额、部门成本。", status: "待启动", group: "降本", progress: 0, owner: "人事 / 财务", due: "待排期", next: "汇总人员和薪资数据。" },
    { name: "高成本岗位识别", desc: "岗位成本排名、可优化岗位清单。", status: "待启动", group: "降本", progress: 0, owner: "人事", due: "待排期", next: "按部门输出岗位成本排名。" },
    { name: "重复流程梳理", desc: "重复录入、人工统计、人工审批、人工沟通事项。", status: "待启动", group: "降本", progress: 0, owner: "总助", due: "待排期", next: "收集各部门重复工作。" },
    { name: "自动化事项判断", desc: "财务报表、库存预警、审批流、门店数据汇总。", status: "待启动", group: "降本", progress: 0, owner: "技术 / 业务", due: "待排期", next: "测算每项自动化可节省的人力。" },
    { name: "总助今日待办", desc: "今天必须处理的事项、截止时间、反馈结果。", status: "待启动", group: "总助", progress: 0, owner: "总助", due: "待排期", next: "确定每日待办字段。" },
    { name: "总助会议纪要", desc: "会议结论、责任人、截止时间、追踪状态。", status: "待启动", group: "总助", progress: 0, owner: "总助", due: "待排期", next: "建立会议纪要模板。" },
    { name: "AI 工厂空间规划", desc: "港湾 8 号 1 栋楼层、面积、功能分区。", status: "待启动", group: "AI 工厂", progress: 0, owner: "规划负责人", due: "待排期", next: "确认可用面积和功能区。" },
    { name: "AI 工厂设备规划", desc: "AI 展示设备、服务器、网络、安防、屏幕。", status: "待启动", group: "AI 工厂", progress: 0, owner: "技术 / 行政", due: "待排期", next: "列设备清单和预算。" },
    { name: "12 楼现状盘点", desc: "办公室数量、工位数量、会议室、公共区、车位。", status: "待启动", group: "12 楼", progress: 0, owner: "行政", due: "待排期", next: "输出现状盘点表。" },
    { name: "12 楼新布局", desc: "办公室、工位、会议室、财务、人事、总助区域。", status: "待启动", group: "12 楼", progress: 0, owner: "行政", due: "待排期", next: "形成新座位和车位方案。" },
    { name: "别墅软装采购模块", desc: "软装清单、预算、供应商、比价、下单、到货、安装、验收。", status: "待启动", group: "别墅软装", progress: 0, owner: "采购 / 项目负责人", due: "待排期", next: "输出各楼层软装采购明细和责任人。" },
    { name: "刘老师直播每日数据台账", desc: "已导入 5 月 14 天数据：抖音 GMV、GSV、退货、曝光、观看、成交、转化、互动、新粉，以及快手 GMV/GSV/退货。", status: "已完成", group: "直播复盘", progress: 100, owner: "直播运营 / 数据", due: "本月", next: "继续每日追加新数据，缺失投流 ROI 字段单独补录。" },
    { name: "刘老师直播每日复盘台账", desc: "已根据每日数据生成复盘：5/15 大场峰值、5/25 转化最好但退货率高、5/10 少播导致低谷。", status: "已完成", group: "直播复盘", progress: 100, owner: "直播运营 / 总助", due: "本月", next: "把每日复盘动作落到话术、排品、场控、投流和承接负责人。" },
    { name: "直播复盘跟进行动", desc: "把每日复盘动作拆成话术、排品、场控、投流、转化、承接、数据复盘和次日验证。", status: "进行中", group: "直播复盘", progress: 85, owner: "直播运营", due: "本月", next: "重点跟进 5/25 退货率、5/15 大场复用机制、短视频引流占比提升。" },
    { name: "直播周复盘趋势汇总", desc: "已完成 5 月阶段性汇总：14 天抖音 GMV 1581.32 万，GSV 1314.38 万，累计观看 114.8 万。", status: "进行中", group: "直播复盘", progress: 90, owner: "直播运营 / 数据", due: "本月", next: "沉淀大场 SOP、退货控制动作和次周数据对照。" }
  ],
  spaces: [
    ["负一层", ["入户", "鞋帽间", "电梯间", "电梯杂物间", "茶室", "卫生间一", "会客厅", "餐厅", "厨房", "过厅", "休闲杂物间", "洗衣房", "健身房", "卫生间二"]],
    ["夹层", ["电梯间", "卫生间", "书房", "影音室", "客房"]],
    ["一楼", ["入户", "客厅", "公区卫生间", "长辈房", "长辈房卫生间", "餐厅", "厨房"]],
    ["二楼", ["公区卫生间", "小儿童房", "大儿童房", "户外露台"]],
    ["三楼", ["主人房", "主人房卫生间 A", "主人房卫生间 B", "主人房户外露台"]],
    ["四楼", ["楼顶户外阳台"]]
  ],
  spaceStatus: {},
  rosterSummary: {
    source: "珠海涌动花鱼（珠海）科技有限公司花名册.xls",
    employeeCount: 72,
    organizationCount: 8,
    departmentCount: 10,
    positionCount: 22,
    salaryCount: 61,
    salaryTotal: 374400,
    avgSalary: 6138,
    targetSaving: 112320,
    commissionOnlyCount: 4,
    topDepartments: [
      { name: "直播部", count: 22, salary: 101000 },
      { name: "直播运营部", count: 14, salary: 92000 },
      { name: "客服部", count: 11, salary: 48100 },
      { name: "商务部", count: 7, salary: 16000 },
      { name: "人事行政部", count: 5, salary: 31400 }
    ],
    topPositions: [
      { name: "主播", count: 22 },
      { name: "售前客服", count: 7 },
      { name: "直播运营", count: 7 },
      { name: "商务BD", count: 6 },
      { name: "直播运营助理", count: 5 }
    ]
  },
  payrollSummary: {
    importVersion: "202603-202604-salary-v2",
    source: "202604集团薪资表合并版本.xlsx；202603集团薪资表最后核算个税 合并版本.xlsx",
    period: "2026年4月",
    employeeRows: 121,
    salaryTotal: 632818.38,
    costTotalFromRows: 754293.11,
    actualCostTotal: 806905.24,
    targetSaving30: 242071.57,
    leftCount: 17,
    leftCost: 139387.12,
    zeroCostCount: 11,
    companySummary: [
      { name: "赵宜主", count: 33, actualCost: 299701.67, rate: "2.09%", change: "-16%", leftCost: 91835.52 },
      { name: "无虑", count: 24, actualCost: 223654.81, rate: "13.77%", change: "-7%", leftCost: 26460.77 },
      { name: "竹蜻蜓", count: 25, actualCost: 157337.5, rate: "9.70%", change: "24%", leftCost: 2766.66 },
      { name: "逆戟鲸", count: 16, actualCost: 78016.95, rate: "12.99%", change: "-15%", leftCost: 17686.74 },
      { name: "谷春雨", count: 9, actualCost: 33001.38, rate: "5.61%", change: "-7%", leftCost: 1875 },
      { name: "空锦界", count: 2, actualCost: 9050.46, rate: "3.68%", change: "-28%", leftCost: 0 },
      { name: "元气甸甸", count: 2, actualCost: 4609.22, rate: "0.00%", change: "0%", leftCost: 0 },
      { name: "不拘一格", count: 1, actualCost: 1533.25, rate: "0.00%", change: "-100%", leftCost: 0 }
    ],
    topDepartments: [
      { name: "直播部", count: 37, cost: 338442.39, leftCost: 26426.98 },
      { name: "客服部", count: 12, cost: 78524.39, leftCost: 12231.71 },
      { name: "BD", count: 13, cost: 62962.22, leftCost: 12686.74 },
      { name: "总经办", count: 6, cost: 43888.92, leftCost: 31075.46 },
      { name: "财务部", count: 5, cost: 40926.38, leftCost: 18675.46 },
      { name: "行政部", count: 5, cost: 37425.02, leftCost: 0 },
      { name: "产品部", count: 3, cost: 31446.38, leftCost: 0 },
      { name: "店铺运营", count: 4, cost: 31115.85, leftCost: 25686.22 }
    ],
    topRoles: [
      { name: "主播", count: 24, cost: 245975.79, avgCost: 10248.99, leftCost: 16276.52 },
      { name: "客服", count: 10, cost: 59467.22, avgCost: 5946.72, leftCost: 0 },
      { name: "BD", count: 12, cost: 59016.03, avgCost: 4918, leftCost: 12686.74 },
      { name: "经理", count: 3, cost: 39426.38, avgCost: 13142.13, leftCost: 18675.46 },
      { name: "总经理", count: 3, cost: 34246.96, avgCost: 11415.65, leftCost: 31075.46 },
      { name: "直播运营", count: 4, cost: 33976.38, avgCost: 8494.09, leftCost: 0 },
      { name: "运营助理", count: 5, cost: 28043.59, avgCost: 5608.72, leftCost: 10150.46 },
      { name: "产品专员", count: 2, cost: 20130.92, avgCost: 10065.46, leftCost: 0 }
    ],
    salaryBands: {
      "10000+": 23,
      "7000-9999": 18,
      "5000-6999": 26,
      "1-4999": 43,
      "0": 11
    },
    reviewSegments: [
      { company: "赵宜主", department: "直播部", role: "主播", cost: 31239.51, left: false },
      { company: "赵宜主", department: "总经办", role: "总经理", cost: 31075.46, left: true },
      { company: "赵宜主", department: "直播部", role: "主播", cost: 24386.76, left: false },
      { company: "竹蜻蜓", department: "未标注部门", role: "未标注岗位", cost: 22756.71, left: false },
      { company: "赵宜主", department: "财务部", role: "经理", cost: 18675.46, left: true },
      { company: "无虑", department: "直播部", role: "主播", cost: 14846.15, left: false },
      { company: "逆戟鲸", department: "BD", role: "BD", cost: 12692.34, left: false },
      { company: "赵宜主", department: "直播部", role: "直播运营", cost: 12575.46, left: false }
    ],
    previousPeriod: {
      period: "2026年3月",
      employeeRows: 129,
      actualCostTotal: 839662.14,
      targetSaving30: 251898.64,
      leftCount: 22,
      leftCost: 67223.65,
      companySummary: [
        { name: "赵宜主", count: 32, actualCost: 327533.33, rate: "1.49%" },
        { name: "无虑", count: 25, actualCost: 243372.78, rate: "14.75%" },
        { name: "竹蜻蜓", count: 21, actualCost: 125864.78, rate: "8.69%" },
        { name: "逆戟鲸", count: 21, actualCost: 91627.16, rate: "15.25%" },
        { name: "谷春雨", count: 11, actualCost: 35567.98, rate: "6.04%" },
        { name: "设计公司", count: 4, actualCost: 12583.33, rate: "" },
        { name: "不拘一格", count: 5, actualCost: 3112.78, rate: "15.99%" }
      ],
      topDepartments: [
        { name: "直播部", count: 39, cost: 390083.31, leftCost: 8830.54 },
        { name: "BD", count: 18, cost: 74308.78, leftCost: 11491.99 },
        { name: "客服部", count: 11, cost: 73815.54, leftCost: 0 },
        { name: "总经办", count: 6, cost: 51431.13, leftCost: 31075.46 },
        { name: "设计部", count: 4, cost: 46734.25, leftCost: 0 },
        { name: "财务部", count: 6, cost: 45872.59, leftCost: 10046.21 }
      ],
      topRoles: [
        { name: "主播", count: 25, cost: 297749.07, avgCost: 11909.96, leftCost: 5950.54 },
        { name: "BD", count: 17, cost: 70853.91, avgCost: 4167.88, leftCost: 11491.99 },
        { name: "客服", count: 10, cost: 63940.08, avgCost: 6394.01, leftCost: 0 },
        { name: "经理", count: 3, cost: 55826.38, avgCost: 18608.79, leftCost: 0 },
        { name: "直播运营", count: 5, cost: 36155.46, avgCost: 7231.09, leftCost: 2880 }
      ]
    },
    comparison: {
      costChange: -32756.9,
      costChangeRate: -3.9,
      remainingSavingTo30: 209314.67,
      departmentChanges: [
        { name: "直播部", from: 390083.31, to: 338442.39, change: -51640.92 },
        { name: "BD", from: 74308.78, to: 62962.22, change: -11346.56 },
        { name: "客服部", from: 73815.54, to: 78524.39, change: 4708.85 },
        { name: "总经办", from: 51431.13, to: 43888.92, change: -7542.21 },
        { name: "财务部", from: 45872.59, to: 40926.38, change: -4946.21 },
        { name: "店铺运营", from: 23150.92, to: 31115.85, change: 7964.93 }
      ]
    },
    decision: {
      summary: "决策建议：不做一刀切裁员；启动 30 天降本专项，先冻结新增编制和补人，优先处理已离职/0 成本/未标注异常口径，再按部门人效和业务贡献复核直播部、客服部、BD、管理岗与职能岗。",
      actions: [
        "直播部：保留与收入强绑定的核心产能，复核主播排班、提成和低产出场次，目标先降 8%-12% 成本。",
        "客服部：4 月逆势增加约 4,709，优先用自动回复、工单分流、班次合并替代增员，先不扩编。",
        "BD：人数和成本已下降，但仍需按成交额/毛利/回款分层复核，低产出岗位优先转岗或调整提成结构。",
        "总经办/财务/行政：复核管理岗与重复职能，优先合并流程、自动化报表、减少重复审批。",
        "竹蜻蜓：4 月公司成本较 3 月增加约 31,473，先核验增员、未标注部门/岗位和发放口径。"
      ],
      guardrails: "任何个人调整都必须由人工结合绩效、合同、补偿成本、岗位必要性、业务收入贡献和劳动合规复核。"
    }
  },
  liveReviewSummary: {
    importVersion: "liu-live-review-202605-v1",
    source: "刘老师抖音基础数据2026年5月.xlsx；刘老师直播间5月gsv（每天）(1).xlsx",
    period: "2026年5月",
    totals: {
      days: 14,
      douyinGmv: 15813197.46,
      douyinGsv: 13143762.63,
      douyinRefund: 2669434.83,
      douyinRefundRate: "16.88%",
      kuaishouGmv: 292817,
      kuaishouGsv: 233697,
      kuaishouRefundRate: "20.19%",
      exposure: 31558500,
      viewers: 1148000,
      buyers: 33943,
      orders: 36593,
      newFans: 18696
    },
    highlights: {
      bestGmvDate: "2026-05-15",
      bestGmv: 3163167.3,
      bestGsvDate: "2026-05-15",
      bestGsv: 2616342.71,
      bestConversionDate: "2026-05-25",
      bestConversion: "3.89%",
      highestRefundDate: "2026-05-15",
      highestRefund: 546824.59,
      highestRefundRateDate: "2026-05-25",
      highestRefundRate: "21.07%",
      lowPointDate: "2026-05-10",
      lowPointReason: "母亲节少播约 2 小时，GMV/GSV/成交人数明显下滑"
    },
    daily: [
      { date: "2026-05-05", douyinGmv: 766005, douyinGsv: 626817.38, refundRate: "18.17%", kuaishouGsv: 57190, exposure: 2582300, viewers: 93000, buyers: 2882, orders: 3080, watchToPayRate: "3.10%", newFans: 1638, review: "开局稳定，曝光进入率 4.68%，退货率偏高；复盘重点是承接与退货原因。" },
      { date: "2026-05-06", douyinGmv: 665623, douyinGsv: 546328.55, refundRate: "17.92%", kuaishouGsv: 19050, exposure: 2212300, viewers: 80900, buyers: 2521, orders: 2725, watchToPayRate: "3.12%", newFans: 1417, review: "GMV 回落但转化基本稳定，需复盘流量下滑和商品点击承接。" },
      { date: "2026-05-07", douyinGmv: 774210, douyinGsv: 628153.48, refundRate: "18.87%", kuaishouGsv: 21603, exposure: 2854200, viewers: 92800, buyers: 3040, orders: 3328, watchToPayRate: "3.27%", newFans: 1764, review: "GMV 和成交回升，转化较好；但退货率升至 18.87%，需跟进品类与承诺一致性。" },
      { date: "2026-05-09", douyinGmv: 718196.5, douyinGsv: 601622.41, refundRate: "16.23%", kuaishouGsv: 22042, exposure: 2324000, viewers: 97100, buyers: 2753, orders: 2985, watchToPayRate: "2.83%", newFans: 1607, review: "观看人数高但转化下滑，需优化话术、逼单节点和商品点击路径。" },
      { date: "2026-05-10", douyinGmv: 329967, douyinGsv: 274185.53, refundRate: "16.91%", kuaishouGsv: 12113, exposure: 918200, viewers: 41900, buyers: 902, orders: 956, watchToPayRate: "2.15%", newFans: 615, review: "少播导致低谷，数据不可直接与全天场对比；复盘重点是短场效率和核心品承接。" },
      { date: "2026-05-11", douyinGmv: 598629, douyinGsv: 508773.42, refundRate: "15.01%", kuaishouGsv: 14886, exposure: 1927100, viewers: 77800, buyers: 2198, orders: 2359, watchToPayRate: "2.83%", newFans: 1343, review: "退货率较低，适合复用售后承诺和商品结构；仍需提升转化效率。" },
      { date: "2026-05-15", douyinGmv: 3163167.3, douyinGsv: 2616342.71, refundRate: "17.29%", kuaishouGsv: 31725, exposure: 2867800, viewers: 119500, buyers: 3802, orders: 4114, watchToPayRate: "3.18%", newFans: 1468, review: "大场峰值，GMV/GSV/观看最高；需沉淀大场排品、节奏、福利和老粉成交 SOP。" },
      { date: "2026-05-16", douyinGmv: 2011739.09, douyinGsv: 1709412.44, refundRate: "15.03%", kuaishouGsv: 11095, exposure: 2698500, viewers: 96600, buyers: 2748, orders: 2933, watchToPayRate: "2.84%", newFans: 1323, review: "大场第二天仍高位，退货率明显优于 5/15；复盘可复用低退货商品组合。" },
      { date: "2026-05-17", douyinGmv: 1521789.35, douyinGsv: 1285809.29, refundRate: "15.51%", kuaishouGsv: 5025, exposure: 2213700, viewers: 85600, buyers: 2211, orders: 2336, watchToPayRate: "2.58%", newFans: 1089, review: "大场第三天热度回落，老粉成交占比较高；需补新客转化和短视频引流。" },
      { date: "2026-05-18", douyinGmv: 1375459.78, douyinGsv: 1152469.1, refundRate: "16.21%", kuaishouGsv: 5278, exposure: 2076600, viewers: 67600, buyers: 1974, orders: 2122, watchToPayRate: "2.92%", newFans: 1052, review: "观看减少但成交效率回升，继续复盘高价值流量来源和留存话术。" },
      { date: "2026-05-19", douyinGmv: 1074143.28, douyinGsv: 894409.36, refundRate: "16.73%", kuaishouGsv: 9616, exposure: 1535800, viewers: 49500, buyers: 1388, orders: 1501, watchToPayRate: "2.80%", newFans: 606, review: "流量和新粉下降，老粉占比高；需补短视频引流和新增粉承接。" },
      { date: "2026-05-20", douyinGmv: 1074216.83, douyinGsv: 891606.18, refundRate: "17.00%", kuaishouGsv: 4670, exposure: 1747200, viewers: 67500, buyers: 1535, orders: 1646, watchToPayRate: "2.27%", newFans: 772, review: "GMV 持平但转化偏低，需复盘商品点击、逼单节奏和权益设计。" },
      { date: "2026-05-24", douyinGmv: 560807.25, douyinGsv: 477112.45, refundRate: "14.92%", kuaishouGsv: 10692, exposure: 2044400, viewers: 74400, buyers: 1942, orders: 2099, watchToPayRate: "2.61%", newFans: 1255, review: "退货率最低之一但 GMV 偏低，说明货盘/客单价或成交强度不足。" },
      { date: "2026-05-25", douyinGmv: 1179244.08, douyinGsv: 930720.33, refundRate: "21.07%", kuaishouGsv: 8712, exposure: 3556400, viewers: 103800, buyers: 4047, orders: 4409, watchToPayRate: "3.89%", newFans: 2747, review: "转化和新粉表现最好，但退货率最高；必须专项复盘售后、品控、承诺话术和冲动下单。" }
    ],
    actions: [
      "复用 5/15 大场排品、福利节奏、老粉成交机制，形成大场 SOP。",
      "专项压降 5/25 这类高转化高退货场次，核对承诺话术、尺码/功效预期和售后原因。",
      "5/10 短场单独建效率模型，不与全天场直接对比。",
      "提升短视频引流和新粉承接，重点观察新增粉丝、观看-关注率、观看-成交率。",
      "每日复盘固定输出：当天结论、问题原因、次日动作、负责人、验证指标。"
    ]
  }
};

const statusClass = {
  "待启动": "pending",
  "待确认": "confirm",
  "待验收": "confirm",
  "已完成": "done",
  "进行中": "doing"
};

const statusOptions = ["待启动", "进行中", "待确认", "待验收", "已完成"];
const storageKey = "project-dashboard-data";
const schemaVersion = 4;

let data = ensureData(JSON.parse(localStorage.getItem(storageKey) || "null") || structuredClone(seedData));
let activeStatus = "全部";
let keyword = "";
let editing = null;
let currentAttachments = [];

const goalGrid = document.querySelector("#goalGrid");
const pageTable = document.querySelector("#pageTable");
const taskBoard = document.querySelector("#taskBoard");
const spaceGrid = document.querySelector("#spaceGrid");
const searchInput = document.querySelector("#searchInput");
const modal = document.querySelector("#editModal");
const form = document.querySelector("#editorForm");

const fields = {
  type: document.querySelector("#editorType"),
  title: document.querySelector("#editorTitle"),
  name: document.querySelector("#editName"),
  status: document.querySelector("#editStatus"),
  progressWrap: document.querySelector("#progressEditor"),
  progress: document.querySelector("#editProgress"),
  progressNumber: document.querySelector("#editProgressNumber"),
  owner: document.querySelector("#editOwner"),
  dueMode: document.querySelector("#editDueMode"),
  due: document.querySelector("#editDue"),
  group: document.querySelector("#editGroup"),
  summary: document.querySelector("#editSummary"),
  next: document.querySelector("#editNext"),
  aiAnalyze: document.querySelector("#aiAnalyzeBtn"),
  aiPanel: document.querySelector("#aiPanel"),
  aiOutput: document.querySelector("#aiOutput"),
  applyAi: document.querySelector("#applyAiBtn"),
  imageUpload: document.querySelector("#editImages"),
  imageList: document.querySelector("#imageList"),
  stepEditor: document.querySelector("#stepEditor"),
  stepList: document.querySelector("#stepList")
};

let latestAiSuggestion = null;

function defaultStepsFor(name, progress = 0, context = "") {
  const done = progress >= 100 ? 100 : 0;

  if (name.includes("软装")) {
    return [
      { name: "软装范围确认", status: "待启动", progress: 0 },
      { name: "按楼层拆采购清单", status: "待启动", progress: 0 },
      { name: "按空间拆采购清单", status: "待启动", progress: 0 },
      { name: "品类清单确认", status: "待启动", progress: 0 },
      { name: "尺寸/数量复核", status: "待启动", progress: 0 },
      { name: "预算上限确认", status: "待启动", progress: 0 },
      { name: "供应商筛选", status: "待启动", progress: 0 },
      { name: "样品/图片确认", status: "待启动", progress: 0 },
      { name: "报价比价", status: "待启动", progress: 0 },
      { name: "采购方案确认", status: "待启动", progress: 0 },
      { name: "合同/付款节点", status: "待启动", progress: 0 },
      { name: "下单采购", status: "待启动", progress: 0 },
      { name: "生产/备货跟踪", status: "待启动", progress: 0 },
      { name: "物流到货跟踪", status: "待启动", progress: 0 },
      { name: "到货验收", status: "待启动", progress: 0 },
      { name: "现场摆放安装", status: "待启动", progress: 0 },
      { name: "软装效果复核", status: "待启动", progress: 0 },
      { name: "问题退换/补货", status: "待启动", progress: 0 },
      { name: "费用结算", status: "待启动", progress: 0 },
      { name: "最终验收归档", status: "待启动", progress: 0 }
    ];
  }

  if (context === "space") {
    return [
      { name: "空间功能确认", status: "待启动", progress: 0 },
      { name: "尺寸复核", status: "待启动", progress: 0 },
      { name: "平面/效果方案", status: "待启动", progress: 0 },
      { name: "水电/灯位/空调定位", status: "待启动", progress: 0 },
      { name: "主材确认", status: "待启动", progress: 0 },
      { name: "家具软装清单", status: "待启动", progress: 0 },
      { name: "采购下单", status: "待启动", progress: 0 },
      { name: "现场施工", status: "待启动", progress: 0 },
      { name: "安装调试", status: "待启动", progress: 0 },
      { name: "清洁验收", status: "待启动", progress: 0 },
      { name: "返工关闭", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("别墅")) {
    return [
      { name: "空间清单复核", status: "待启动", progress: 0 },
      { name: "每层负责人确认", status: "待启动", progress: 0 },
      { name: "每个空间功能确认", status: "待启动", progress: 0 },
      { name: "设计图/效果图确认", status: "待启动", progress: 0 },
      { name: "尺寸与现场复尺", status: "待启动", progress: 0 },
      { name: "水电/灯光/空调定位", status: "待启动", progress: 0 },
      { name: "主材清单确认", status: "待启动", progress: 0 },
      { name: "家具软装清单确认", status: "待启动", progress: 0 },
      { name: "预算确认", status: "待启动", progress: 0 },
      { name: "采购下单", status: "待启动", progress: 0 },
      { name: "材料到货检查", status: "待启动", progress: 0 },
      { name: "施工排期", status: "待启动", progress: 0 },
      { name: "负一层施工", status: "待启动", progress: 0 },
      { name: "夹层施工", status: "待启动", progress: 0 },
      { name: "一楼施工", status: "待启动", progress: 0 },
      { name: "二楼施工", status: "待启动", progress: 0 },
      { name: "三楼施工", status: "待启动", progress: 0 },
      { name: "四楼施工", status: "待启动", progress: 0 },
      { name: "分空间验收", status: "待启动", progress: 0 },
      { name: "问题返工关闭", status: "待启动", progress: 0 },
      { name: "整体验收交付", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("集团 OS") || name.includes("OS")) {
    return [
      { name: "AI管家", status: "待确认", progress: 30 },
      { name: "基础设置-业务管理", status: "已完成", progress: 100 },
      { name: "基础设置-公司管理", status: "已完成", progress: 100 },
      { name: "基础设置-股份管理", status: "已完成", progress: 100 },
      { name: "基础设置-达人管理", status: "已完成", progress: 100 },
      { name: "基础设置-达人认领", status: "已完成", progress: 100 },
      { name: "基础设置-品牌管理", status: "已完成", progress: 100 },
      { name: "基础设置-产品管理", status: "已完成", progress: 100 },
      { name: "影刀管理", status: "已完成", progress: 100 },
      { name: "运营管理", status: "待确认", progress: 40 },
      { name: "财务管理-财务模块（预计 1 周）", status: "进行中", progress: 25 },
      { name: "数据管理", status: "待确认", progress: 40 },
      { name: "用户管理", status: "待确认", progress: 50 },
      { name: "系统管理", status: "待确认", progress: 45 },
      { name: "经营总控", status: "待确认", progress: 35 },
      { name: "公司股权", status: "已完成", progress: 100 },
      { name: "品牌渠道", status: "已完成", progress: 90 },
      { name: "财税供应链-供应链模块", status: "已完成", progress: 100 },
      { name: "财税供应链-税务审批流（预计 2 周）", status: "待启动", progress: 0 },
      { name: "组织协同-任务模块（预计 1 周）", status: "待启动", progress: 0 },
      { name: "组织协同-知识库模块（预计 1 周）", status: "待启动", progress: 0 },
      { name: "审批流-行政（预计 2 周）", status: "待启动", progress: 0 },
      { name: "审批流-人事（预计 2 周）", status: "待启动", progress: 0 },
      { name: "合同风险", status: "待启动", progress: 0 },
      { name: "联调测试与上线验收", status: "待启动", progress: 0 },
      { name: "最终交付 2026-06-28", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("人工成本") || name.includes("降")) {
    return [
      { name: "人员花名册确认", status: "待启动", progress: 0 },
      { name: "薪资/社保/外包成本汇总", status: "待启动", progress: 0 },
      { name: "部门人工成本基线", status: "待启动", progress: 0 },
      { name: "岗位成本排名", status: "待启动", progress: 0 },
      { name: "低产出/重复岗位识别", status: "待启动", progress: 0 },
      { name: "重复流程梳理", status: "待启动", progress: 0 },
      { name: "系统自动化替代测算", status: "待启动", progress: 0 },
      { name: "外包/兼职/调岗方案", status: "待启动", progress: 0 },
      { name: "30%降本路径确认", status: "待启动", progress: 0 },
      { name: "月度节省金额追踪", status: "待启动", progress: 0 },
      { name: "风险与人员沟通", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("总助")) {
    return [
      { name: "老板目标清单录入", status: "待启动", progress: 0 },
      { name: "目标负责人绑定", status: "待启动", progress: 0 },
      { name: "截止时间与优先级", status: "待启动", progress: 0 },
      { name: "每日待办视图", status: "待启动", progress: 0 },
      { name: "老板交办事项追踪", status: "待启动", progress: 0 },
      { name: "会议纪要责任人追踪", status: "待启动", progress: 0 },
      { name: "逾期提醒", status: "待启动", progress: 0 },
      { name: "风险卡点记录", status: "待启动", progress: 0 },
      { name: "周报/月报输出", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("AI 工厂")) {
    return [
      { name: "楼栋面积/现状确认", status: "待启动", progress: 0 },
      { name: "功能区规划", status: "待启动", progress: 0 },
      { name: "客户参观动线", status: "待启动", progress: 0 },
      { name: "员工办公动线", status: "待启动", progress: 0 },
      { name: "物流/设备动线", status: "待启动", progress: 0 },
      { name: "AI展示区规划", status: "待启动", progress: 0 },
      { name: "研发/办公区规划", status: "待启动", progress: 0 },
      { name: "直播/会议区规划", status: "待启动", progress: 0 },
      { name: "设备清单", status: "待启动", progress: 0 },
      { name: "网络/安防/弱电", status: "待启动", progress: 0 },
      { name: "装修预算", status: "待启动", progress: 0 },
      { name: "设备预算", status: "待启动", progress: 0 },
      { name: "施工上线排期", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("12 楼") || name.includes("车位")) {
    return [
      { name: "现有办公室盘点", status: "待启动", progress: 0 },
      { name: "现有工位盘点", status: "待启动", progress: 0 },
      { name: "会议室/公共区盘点", status: "待启动", progress: 0 },
      { name: "部门人数需求统计", status: "待启动", progress: 0 },
      { name: "管理层办公室需求", status: "待启动", progress: 0 },
      { name: "总助/财务/人事位置", status: "待启动", progress: 0 },
      { name: "新平面布局方案", status: "待启动", progress: 0 },
      { name: "座位表输出", status: "待启动", progress: 0 },
      { name: "车位现状盘点", status: "待启动", progress: 0 },
      { name: "车位分配规则", status: "待启动", progress: 0 },
      { name: "物业协调", status: "待启动", progress: 0 },
      { name: "搬迁/标识落地", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("刘老师") || name.includes("直播复盘")) {
    return [
      { name: "飞书资料链接接入", status: "已完成", progress: 100 },
      { name: "每日数据字段设计", status: "进行中", progress: 40 },
      { name: "每日复盘字段设计", status: "进行中", progress: 40 },
      { name: "飞书正文逐日读取/粘贴", status: "待启动", progress: 0 },
      { name: "每日 GMV/成交数据录入", status: "待启动", progress: 0 },
      { name: "每日流量/互动数据录入", status: "待启动", progress: 0 },
      { name: "每日投流/ROI 数据录入", status: "待启动", progress: 0 },
      { name: "每日问题归因", status: "待启动", progress: 0 },
      { name: "每日优化动作", status: "待启动", progress: 0 },
      { name: "负责人/截止时间/验证指标", status: "待启动", progress: 0 },
      { name: "周复盘趋势汇总", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("品牌")) {
    return [
      { name: "品牌档案字段", status: "待启动", progress: 0 },
      { name: "品牌定位资料", status: "待启动", progress: 0 },
      { name: "视觉资料上传", status: "待启动", progress: 0 },
      { name: "授权资料管理", status: "待启动", progress: 0 },
      { name: "品牌任务跟踪", status: "待启动", progress: 0 },
      { name: "权限与维护人", status: "待启动", progress: 0 },
      { name: "模块验收", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("店铺") || name.includes("门店")) {
    return [
      { name: "门店档案字段", status: "待启动", progress: 0 },
      { name: "门店负责人绑定", status: "待启动", progress: 0 },
      { name: "经营指标字段", status: "待启动", progress: 0 },
      { name: "巡店记录字段", status: "待启动", progress: 0 },
      { name: "门店数据导入", status: "待启动", progress: 0 },
      { name: "门店权限设置", status: "待启动", progress: 0 },
      { name: "模块验收", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("供应链") || name.includes("库存")) {
    return [
      { name: "供应商档案", status: "待启动", progress: 0 },
      { name: "采购单流程", status: "待启动", progress: 0 },
      { name: "库存台账", status: "待启动", progress: 0 },
      { name: "出入库记录", status: "待启动", progress: 0 },
      { name: "库存预警规则", status: "待启动", progress: 0 },
      { name: "盘点机制", status: "待启动", progress: 0 },
      { name: "模块验收", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("财务")) {
    return [
      { name: "收入口径确认", status: "待启动", progress: 0 },
      { name: "支出口径确认", status: "待启动", progress: 0 },
      { name: "利润/现金流口径", status: "待启动", progress: 0 },
      { name: "业务数据映射", status: "待启动", progress: 0 },
      { name: "报表字段确认", status: "待启动", progress: 0 },
      { name: "审批/查看权限", status: "待启动", progress: 0 },
      { name: "数据导入测试", status: "待启动", progress: 0 },
      { name: "财务验收", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("行政人事")) {
    return [
      { name: "员工档案字段", status: "待启动", progress: 0 },
      { name: "考勤字段", status: "待启动", progress: 0 },
      { name: "请假流程", status: "待启动", progress: 0 },
      { name: "报销流程", status: "待启动", progress: 0 },
      { name: "采购流程", status: "待启动", progress: 0 },
      { name: "入职流程", status: "待启动", progress: 0 },
      { name: "离职流程", status: "待启动", progress: 0 },
      { name: "通知提醒", status: "待启动", progress: 0 },
      { name: "模块验收", status: "待启动", progress: 0 }
    ];
  }

  if (name.includes("审批流")) {
    return [
      { name: "审批类型清单", status: "待启动", progress: 0 },
      { name: "审批角色确认", status: "待启动", progress: 0 },
      { name: "请假审批节点", status: "待启动", progress: 0 },
      { name: "报销审批节点", status: "待启动", progress: 0 },
      { name: "采购审批节点", status: "待启动", progress: 0 },
      { name: "入离职审批节点", status: "待启动", progress: 0 },
      { name: "消息提醒", status: "待启动", progress: 0 },
      { name: "审批记录查询", status: "待启动", progress: 0 },
      { name: "联调测试", status: "待启动", progress: 0 }
    ];
  }

  return [
    { name: "需求确认", status: done ? "已完成" : "待启动", progress: done },
    { name: "方案确认", status: "待启动", progress: 0 },
    { name: "执行推进", status: "待启动", progress: 0 },
    { name: "验收交付", status: "待启动", progress: 0 }
  ];
}

function normalizeSteps(steps, name, progress, context = "") {
  if (!Array.isArray(steps) || !steps.length) {
    return distributeProgress(defaultStepsFor(name, 0, context), progress);
  }

  const source = steps;
  return source.map((step) => ({
    name: step.name || "未命名环节",
    status: statusOptions.includes(step.status) ? step.status : "待启动",
    progress: clampProgress(step.progress)
  }));
}

function distributeProgress(steps, progress) {
  const total = steps.length * clampProgress(progress);
  let remaining = total;

  return steps.map((step) => {
    const value = Math.min(100, Math.max(0, remaining));
    remaining -= value;
    return {
      ...step,
      progress: Math.round(value),
      status: value >= 100 ? "已完成" : value > 0 ? "进行中" : "待启动"
    };
  });
}

function ensureData(input) {
  const next = { ...structuredClone(seedData), ...input };
  const shouldUpgradeSteps = input?._schemaVersion !== schemaVersion;
  next.rosterSummary = structuredClone(seedData.rosterSummary);
  next.payrollSummary = structuredClone(seedData.payrollSummary);
  next.liveReviewSummary = structuredClone(seedData.liveReviewSummary);
  const shouldImportPayroll = next._payrollImportedVersion !== seedData.payrollSummary.importVersion;
  const liveReviewVersion = seedData.liveReviewSummary.importVersion;
  const shouldImportLiveReview = next._liveReviewVersion !== liveReviewVersion;
  const osVersion = "os-menu-progress-20260628-v2";
  const shouldImportOsProgress = next._osProgressVersion !== osVersion;

  if (shouldUpgradeSteps) {
    next.goals?.forEach((goal) => delete goal.steps);
    next.tasks?.forEach((task) => delete task.steps);
    Object.values(next.spaceStatus || {}).forEach((space) => delete space.steps);
  }

  next.goals = next.goals.map((goal) => ({
    ...goal,
    progress: clampProgress(goal.progress),
    steps: normalizeSteps(goal.steps, goal.name, goal.progress, "goal")
  }));

  if (Array.isArray(next.pages?.[0])) {
    next.pages = next.pages.map(([name, goal, priority, status, pageNext]) => ({
      name,
      goal,
      priority,
      status,
      next: pageNext
    }));
  }

  if (Array.isArray(next.tasks?.[0])) {
    next.tasks = next.tasks.map(([name, desc, status, group, percent]) => ({
      name,
      desc,
      status,
      group,
      progress: parseInt(percent, 10) || 0,
      owner: "",
      due: "待排期",
      next: ""
    }));
  }

  seedData.goals.forEach((seedGoal) => {
    if (!next.goals.some((goal) => goal.id === seedGoal.id || goal.name === seedGoal.name)) {
      next.goals.push(structuredClone(seedGoal));
    }
  });

  seedData.pages.forEach((seedPage) => {
    if (!next.pages.some((page) => page.name === seedPage.name)) {
      next.pages.push(structuredClone(seedPage));
    }
  });

  seedData.tasks.forEach((seedTask) => {
    if (!next.tasks.some((task) => task.name === seedTask.name)) {
      next.tasks.push(structuredClone(seedTask));
    }
  });

  const laborGoal = next.goals.find((goal) => goal.id === "G02");
  if (laborGoal && shouldImportPayroll) {
    laborGoal.progress = Math.max(laborGoal.progress || 0, 45);
    laborGoal.status = "进行中";
    laborGoal.summary = "已导入 202603/202604 集团薪资表：3 月实际人力成本约 839,662，4 月约 806,905，已下降约 32,757；4 月 30% 降本目标约 242,072，仍需进一步节省约 209,315。";
    laborGoal.next = "决策：不做一刀切裁员；启动 30 天降本专项，冻结新增编制，优先复核直播部、客服部、BD、管理岗/职能岗和竹蜻蜓增量口径。";
    laborGoal.steps = [
      { name: "薪资表口径确认", status: "已完成", progress: 100 },
      { name: "3 月与 4 月薪资表导入", status: "已完成", progress: 100 },
      { name: "集团实际人力成本对比", status: "已完成", progress: 100 },
      { name: "公司成本与人力成本率排名", status: "进行中", progress: 80 },
      { name: "部门成本热区分析", status: "进行中", progress: 75 },
      { name: "岗位成本与平均成本复核", status: "进行中", progress: 55 },
      { name: "已离职/0 成本/未标注异常剔除", status: "进行中", progress: 45 },
      { name: "30 天降本专项决策", status: "进行中", progress: 60 },
      { name: "合规与绩效人工复核清单", status: "待启动", progress: 10 }
    ];
  }

  const laborTask = next.tasks.find((task) => task.name === "当前人工成本统计");
  if (laborTask && shouldImportPayroll) {
    laborTask.progress = Math.max(laborTask.progress || 0, 65);
    laborTask.status = "进行中";
    laborTask.desc = "已导入 202603/202604 集团薪资表，完成月度成本对比、公司/部门/岗位成本热区、已离职成本与异常口径汇总。";
    laborTask.next = "按 30 天降本专项推进：冻结新增编制，先核验异常，再复核直播部、客服部、BD、管理岗/职能岗和竹蜻蜓增量。";
  }

  if (shouldImportPayroll) {
    next._payrollImportedVersion = seedData.payrollSummary.importVersion;
  }

  const liveGoal = next.goals.find((goal) => goal.id === "G08");
  if (liveGoal && shouldImportLiveReview) {
    const seedLiveGoal = seedData.goals.find((goal) => goal.id === "G08");
    Object.assign(liveGoal, structuredClone(seedLiveGoal));
  }

  const osGoal = next.goals.find((goal) => goal.id === "G01");
  if (osGoal && shouldImportOsProgress) {
    const seedOsGoal = seedData.goals.find((goal) => goal.id === "G01");
    Object.assign(osGoal, structuredClone(seedOsGoal));
  }

  if (shouldImportLiveReview) {
    ["刘老师直播每日数据台账", "刘老师直播每日复盘台账", "直播复盘跟进行动", "直播周复盘趋势汇总"].forEach((taskName) => {
      const seedTask = seedData.tasks.find((task) => task.name === taskName);
      const task = next.tasks.find((item) => item.name === taskName);
      if (seedTask && task) Object.assign(task, structuredClone(seedTask));
    });
    next._liveReviewVersion = liveReviewVersion;
  }

  if (shouldImportOsProgress) {
    [
      "OS菜单-AI管家",
      "OS菜单-基础设置",
      "OS菜单-影刀管理",
      "OS菜单-运营管理",
      "OS菜单-财务管理",
      "OS菜单-数据管理",
      "OS菜单-用户管理",
      "OS菜单-系统管理",
      "OS菜单-经营总控",
      "OS菜单-公司股权",
      "OS菜单-品牌渠道",
      "OS菜单-财税供应链",
      "OS菜单-组织协同",
      "OS菜单-合同风险"
    ].forEach((taskName) => {
      const seedTask = seedData.tasks.find((task) => task.name === taskName);
      const task = next.tasks.find((item) => item.name === taskName);
      if (seedTask && task) Object.assign(task, structuredClone(seedTask));
    });
    next._osProgressVersion = osVersion;
  }

  next.goals = next.goals.map((goal) => ({
    ...goal,
    progress: clampProgress(goal.progress),
    steps: normalizeSteps(goal.steps, goal.name, goal.progress, "goal")
  }));

  next.tasks = next.tasks.map((task) => ({
    ...task,
    progress: clampProgress(task.progress),
    steps: normalizeSteps(task.steps, task.name, task.progress, task.group)
  }));

  next.spaceStatus = next.spaceStatus || {};
  next.spaces.forEach(([floor, spaces]) => {
    spaces.forEach((space) => {
      const key = spaceKey(floor, space);
      next.spaceStatus[key] ||= {
        name: space,
        floor,
        status: "待启动",
        progress: 0,
        owner: "项目负责人",
        due: "待排期",
        summary: `${floor} - ${space} 的设计、材料、施工、验收节点。`,
        next: "补齐负责人、截止时间、材料状态和验收标准。"
      };
      next.spaceStatus[key].progress = clampProgress(next.spaceStatus[key].progress);
      next.spaceStatus[key].steps = normalizeSteps(
        next.spaceStatus[key].steps,
        next.spaceStatus[key].name,
        next.spaceStatus[key].progress,
        "space"
      );
    });
  });

  next._schemaVersion = schemaVersion;
  return next;
}

function spaceKey(floor, space) {
  return `${floor}::${space}`;
}

function saveData() {
  localStorage.setItem(storageKey, JSON.stringify(data));
}

function clampProgress(value) {
  const number = Number.parseInt(value, 10);
  if (Number.isNaN(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function normalize(text) {
  return String(text ?? "").toLowerCase();
}

function matchStatus(itemStatus) {
  return activeStatus === "全部" || itemStatus === activeStatus;
}

function matchKeyword(values) {
  if (!keyword) return true;
  return values.some((value) => normalize(value).includes(keyword));
}

function statusPill(status) {
  return `<span class="status-pill ${statusClass[status] || ""}">${status}</span>`;
}

function renderMetrics() {
  const avg = Math.round(data.goals.reduce((sum, goal) => sum + goal.progress, 0) / data.goals.length);
  const doing = data.goals.filter((goal) => goal.status === "进行中").length;
  const pending = data.goals.filter((goal) => goal.status === "待启动").length;
  const done = data.goals.filter((goal) => goal.status === "已完成").length;
  document.querySelector("#metricGoals").textContent = data.goals.length;
  document.querySelector("#metricAvg").textContent = `${avg}%`;
  document.querySelector("#metricDoing").textContent = doing;
  document.querySelector("#metricPending").textContent = pending;
  document.querySelector("#sideGoalTotal").textContent = data.goals.length;
  document.querySelector("#sidePageTotal").textContent = data.pages.length;
  document.querySelector("#sideTaskTotal").textContent = data.tasks.reduce((sum, task) => sum + (task.steps?.length || 1), 0);
  document.querySelector("#sideDoing").textContent = doing;
  document.querySelector("#sidePending").textContent = pending;
  document.querySelector("#sideDone").textContent = done;
}

function renderGoalMedia(goal) {
  const attachments = goal.attachments || [];
  if (!attachments.length) return "";
  const previews = attachments.slice(0, 4);
  const remaining = attachments.length - previews.length;

  return `
    <div class="goal-media-head">
      <span>图片资料</span>
      <small>${attachments.length} 张</small>
    </div>
    <div class="goal-media-grid">
      ${previews
        .map((image) => `<img src="${image.src}" alt="${escapeHtml(image.name)}" loading="lazy" />`)
        .join("")}
      ${remaining > 0 ? `<span class="goal-media-more">+${remaining}</span>` : ""}
    </div>
  `;
}

function renderGoals() {
  const template = document.querySelector("#goalTemplate");
  goalGrid.innerHTML = "";

  const goals = data.goals
    .map((goal, index) => ({ ...goal, index }))
    .filter((goal) => matchStatus(goal.status) && matchKeyword([goal.name, goal.owner, goal.summary, goal.next]));

  if (!goals.length) {
    goalGrid.innerHTML = `<div class="empty">没有匹配的目标</div>`;
    return;
  }

  goals.forEach((goal) => {
    const node = template.content.cloneNode(true);
    const card = node.querySelector(".goal-card");
    card.dataset.type = "goal";
    card.dataset.index = goal.index;
    node.querySelector(".badge").textContent = goal.id;
    node.querySelector(".goal-status").textContent = goal.status;
    node.querySelector(".goal-status").classList.add(statusClass[goal.status] || "");
    node.querySelector("h3").textContent = goal.name;
    node.querySelector("p").textContent = goal.summary;
    node.querySelector(".progress span").style.setProperty("--value", `${goal.progress}%`);
    node.querySelector(".progress-row strong").textContent = `${goal.progress}%`;
    node.querySelector("dl").innerHTML = `
      <dt>负责人</dt><dd>${goal.owner}</dd>
      <dt>截止时间</dt><dd>${goal.due}</dd>
      <dt>拆分环节</dt><dd>${goal.steps?.length || 0} 个</dd>
      <dt>图片资料</dt><dd>${goal.attachments?.length || 0} 张</dd>
      <dt>下一步</dt><dd>${goal.next}</dd>
    `;
    node.querySelector(".goal-media").innerHTML = renderGoalMedia(goal);
    goalGrid.appendChild(node);
  });
}

function renderPages() {
  const rows = data.pages
    .map((page, index) => ({ ...page, index }))
    .filter((page) => matchStatus(page.status) && matchKeyword([page.name, page.goal, page.priority, page.status, page.next]));

  document.querySelector("#pageCount").textContent = `${rows.length} 项`;
  pageTable.innerHTML = rows
    .map((page) => {
      return `
        <tr data-type="page" data-index="${page.index}">
          <td><strong>${page.name}</strong></td>
          <td>${page.goal}</td>
          <td><span class="priority">${page.priority}</span></td>
          <td>${statusPill(page.status)}</td>
          <td>${page.next}</td>
        </tr>
      `;
    })
    .join("");

  if (!rows.length) {
    pageTable.innerHTML = `<tr><td colspan="5"><div class="empty">没有匹配的网页</div></td></tr>`;
  }
}

function renderTasks() {
  const columns = ["待启动", "进行中", "待确认", "待验收", "已完成"];
  const filteredTasks = data.tasks
    .map((task, index) => ({ ...task, index }))
    .filter((task) => matchStatus(task.status) && matchKeyword([task.name, task.desc, task.status, task.group, task.progress, task.owner, task.next]));

  document.querySelector("#taskCount").textContent = `${filteredTasks.length} 项`;
  taskBoard.innerHTML = columns
    .filter((column) => activeStatus === "全部" || activeStatus === column)
    .map((column) => {
      const tasks = filteredTasks.filter((task) => task.status === column);
      const cards = tasks
        .map((task) => {
          return `
            <article class="task-card" data-type="task" data-index="${task.index}">
              <strong>${task.name}</strong>
              <p>${task.desc}</p>
              <div class="progress-row">
                <div class="progress"><span style="--value: ${task.progress}%"></span></div>
                <strong>${task.progress}%</strong>
              </div>
              <div class="task-meta">
                <span>${task.group}</span>
                <span>${task.owner || "待定负责人"}</span>
                <span>${task.steps?.length || 0} 个环节</span>
                <span>${task.status}</span>
              </div>
            </article>
          `;
        })
        .join("");

      return `
        <section class="task-column">
          <h3>${column}<span>${tasks.length}</span></h3>
          ${cards || `<div class="empty">暂无事项</div>`}
        </section>
      `;
    })
    .join("");
}

function renderSpaces() {
  const groups = data.spaces
    .map(([floor, spaces]) => {
      const filteredSpaces = spaces.filter((space) => {
        const record = data.spaceStatus[spaceKey(floor, space)];
        return matchStatus(record.status) && matchKeyword([floor, space, record.name, record.status, record.owner, record.next]);
      });
      return [floor, filteredSpaces];
    })
    .filter(([, spaces]) => spaces.length);

  const total = groups.reduce((sum, [, spaces]) => sum + spaces.length, 0);
  document.querySelector("#spaceCount").textContent = `${total} 个空间`;
  spaceGrid.innerHTML = groups
    .map(([floor, spaces]) => {
      return `
        <article class="space-group">
          <h3>${floor}</h3>
          <ul>
            ${spaces
              .map((space) => {
                const key = spaceKey(floor, space);
                const record = data.spaceStatus[key];
                return `<li data-type="space" data-key="${key}"><span>${record.name}</span><small>${record.progress}% · ${record.steps?.length || 0}环节</small></li>`;
              })
              .join("")}
          </ul>
        </article>
      `;
    })
    .join("");

  if (!groups.length) {
    spaceGrid.innerHTML = `<div class="empty">没有匹配的空间节点</div>`;
  }
}

function renderFocus() {
  const roster = data.rosterSummary;
  const payroll = data.payrollSummary;
  const live = data.liveReviewSummary;
  const payrollSummary = payroll
    ? [
        "2026年3-4月薪资表成本决策",
        `3 月约 ${Number(payroll.previousPeriod.actualCostTotal).toLocaleString()}，4 月约 ${Number(payroll.actualCostTotal).toLocaleString()}，已下降 ${Math.abs(payroll.comparison.costChange).toLocaleString()}；仍需节省约 ${Number(payroll.comparison.remainingSavingTo30).toLocaleString()}。优先看 ${payroll.topDepartments
          .slice(0, 3)
          .map((item) => `${item.name} ${Number(item.cost).toLocaleString()}`)
          .join("、")}。`
      ]
    : null;
  const rosterSummary = roster
    ? [
        "花名册人工成本基线",
        `${roster.employeeCount} 人 / ${roster.departmentCount} 个部门 / ${roster.positionCount} 类岗位；可解析薪资 ${roster.salaryCount} 条，基线约 ${roster.salaryTotal.toLocaleString()}，30% 目标约 ${roster.targetSaving.toLocaleString()}。`
      ]
    : null;
  const liveSummary = live
    ? [
        "刘老师直播复盘数据",
        `已导入 ${live.totals.days} 天日报：抖音 GMV ${Number(live.totals.douyinGmv).toLocaleString()}，GSV ${Number(live.totals.douyinGsv).toLocaleString()}，退货率 ${live.totals.douyinRefundRate}%。峰值在 ${live.highlights.bestGmvDate}，最高转化在 ${live.highlights.bestConversionDate}。`
      ]
    : null;

  const focusItems = [
    payrollSummary,
    rosterSummary,
    liveSummary,
    ["行政人事审批流", "先确认请假、报销、采购、入离职的审批角色和字段。"],
    ["人工成本基线", "收集部门、岗位、薪资、社保和外包成本，形成 30% 降本起点。"],
    ["别墅空间节点", "给每个空间补齐负责人、截止时间、材料状态和验收标准。"],
    ["12 楼现状盘点", "输出办公室、工位、会议室、车位现状表，作为重新规划依据。"]
  ].filter(Boolean);

  document.querySelector("#focusList").innerHTML = focusItems
    .map(([title, desc]) => `<article class="focus-item"><strong>${title}</strong><p>${desc}</p></article>`)
    .join("");
}

function renderAll() {
  keyword = normalize(searchInput.value.trim());
  renderMetrics();
  renderGoals();
  renderPages();
  renderTasks();
  renderSpaces();
  renderFocus();
  saveData();
}

function getEditable(type, key) {
  if (type === "goal") {
    const item = data.goals[Number(key)];
    return {
      title: "目标进度",
      item,
      values: {
        name: item.name,
        status: item.status,
        progress: item.progress,
        owner: item.owner,
        due: item.due,
        group: item.id,
        summary: item.summary,
        next: item.next,
        steps: item.steps,
        attachments: item.attachments || []
      }
    };
  }

  if (type === "page") {
    const item = data.pages[Number(key)];
    return {
      title: "网页清单",
      item,
      values: {
        name: item.name,
        status: item.status,
        progress: "",
        owner: "",
        due: "",
        group: item.goal,
        summary: `优先级：${item.priority}`,
        next: item.next,
        steps: [],
        attachments: item.attachments || []
      }
    };
  }

  if (type === "task") {
    const item = data.tasks[Number(key)];
    return {
      title: "模块进度",
      item,
      values: {
        name: item.name,
        status: item.status,
        progress: item.progress,
        owner: item.owner,
        due: item.due,
        group: item.group,
        summary: item.desc,
        next: item.next,
        steps: item.steps,
        attachments: item.attachments || []
      }
    };
  }

  const item = data.spaceStatus[key];
  return {
    title: "空间节点",
    item,
    values: {
      name: item.name,
      status: item.status,
      progress: item.progress,
      owner: item.owner,
      due: item.due,
      group: item.floor,
      summary: item.summary,
      next: item.next,
      steps: item.steps,
      attachments: item.attachments || []
    }
  };
}

function averageSteps(steps) {
  if (!steps.length) return 0;
  return Math.round(steps.reduce((sum, step) => sum + clampProgress(step.progress), 0) / steps.length);
}

function parseDueValue(value) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return { mode: "具体日期", date: value };
  }

  if (["待排期", "本周", "本月"].includes(value)) {
    return { mode: value, date: "" };
  }

  return { mode: "待排期", date: "" };
}

function getDueValue() {
  return fields.dueMode.value === "具体日期" ? fields.due.value || "待排期" : fields.dueMode.value;
}

function syncDueMode() {
  const isDate = fields.dueMode.value === "具体日期";
  fields.due.disabled = !isDate;
  if (!isDate) fields.due.value = "";
}

function formatRosterList(items, withSalary = false) {
  return items
    .map((item) => {
      const salary = withSalary && item.salary ? `，薪资约 ${Number(item.salary).toLocaleString()}` : "";
      return `${item.name} ${item.count} 人${salary}`;
    })
    .join("；");
}

function formatCostList(items, valueKey = "cost") {
  return items
    .map((item) => `${item.name} ${item.count} 人，成本约 ${Number(item[valueKey] || 0).toLocaleString()}`)
    .join("；");
}

function formatReviewSegments(items) {
  return items
    .map((item) => `${item.company}/${item.department}/${item.role}，单月成本约 ${Number(item.cost || 0).toLocaleString()}${item.left ? "（已离职口径，先剔除或核验）" : ""}`)
    .join("；");
}

function generateLaborAiSuggestion() {
  const payroll = data.payrollSummary;
  const roster = data.rosterSummary;
  if (!payroll && !roster) {
    return {
      summary: "当前模块适合接入 AI 分析，但尚未导入薪资表或人工成本基线。",
      next: "先导入公司、部门、岗位、薪资、社保和人力成本口径，再生成降本分析。",
      output: "未找到薪资表汇总数据。"
    };
  }

  if (payroll) {
    const companyList = formatCostList(payroll.companySummary.slice(0, 4), "actualCost");
    const departmentList = formatCostList(payroll.topDepartments.slice(0, 5), "cost");
    const changes = payroll.comparison.departmentChanges
      .map((item) => `${item.name}${item.change >= 0 ? "增加" : "下降"} ${Math.abs(item.change).toLocaleString()}`)
      .join("；");
    const roleList = payroll.topRoles
      .slice(0, 6)
      .map((item) => `${item.name} ${item.count} 人，成本约 ${Number(item.cost).toLocaleString()}，人均约 ${Number(item.avgCost).toLocaleString()}`)
      .join("；");
    const reviewSegments = formatReviewSegments(payroll.reviewSegments.slice(0, 6));
    const summary = `AI 已基于 202603/202604 集团薪资表做成本结构分析：3 月实际人力成本约 ${Number(payroll.previousPeriod.actualCostTotal).toLocaleString()}，4 月约 ${Number(payroll.actualCostTotal).toLocaleString()}，已下降约 ${Math.abs(payroll.comparison.costChange).toLocaleString()}（${Math.abs(payroll.comparison.costChangeRate)}%）；若按 4 月成本继续打 30%，仍需进一步节省约 ${Number(payroll.comparison.remainingSavingTo30).toLocaleString()}。`;
    const next = payroll.decision.summary;
    const output = [
      "AI 成本结构分析与决策建议（不作个人裁员决定）",
      `1. 月度趋势：3 月 ${Number(payroll.previousPeriod.actualCostTotal).toLocaleString()}，4 月 ${Number(payroll.actualCostTotal).toLocaleString()}，下降 ${Math.abs(payroll.comparison.costChange).toLocaleString()}，降幅约 ${Math.abs(payroll.comparison.costChangeRate)}%。`,
      `2. 缺口判断：4 月 30% 降本目标约 ${Number(payroll.targetSaving30).toLocaleString()}，当前只完成约 ${Math.abs(payroll.comparison.costChange).toLocaleString()} 的自然下降，仍需节省约 ${Number(payroll.comparison.remainingSavingTo30).toLocaleString()}。`,
      `3. 公司成本集中：${companyList}。`,
      `4. 部门变化：${changes}。`,
      `5. 部门成本热区：${departmentList}。`,
      `6. 岗位成本热区：${roleList}。`,
      `7. 数据先剔除：4 月已离职 ${payroll.leftCount} 条、成本约 ${Number(payroll.leftCost).toLocaleString()}；0 成本/未标注 ${payroll.zeroCostCount} 条，先核对后再进入决策。`,
      `8. 人工复核队列（匿名到公司/部门/岗位段）：${reviewSegments}。`,
      `9. 决策：${payroll.decision.summary}`,
      `10. 执行动作：${payroll.decision.actions.join("；")}`,
      `11. 合规底线：${payroll.decision.guardrails}`
    ].join("\n");

    return { summary, next, output };
  }

  const topDepartments = formatRosterList(roster.topDepartments, true);
  const topPositions = formatRosterList(roster.topPositions);
  const summary = `AI 已基于花名册做初步诊断：当前 ${roster.employeeCount} 人，覆盖 ${roster.departmentCount} 个部门、${roster.positionCount} 类岗位；可解析薪资 ${roster.salaryCount} 条，薪资基线约 ${Number(roster.salaryTotal).toLocaleString()}，30% 降本目标约 ${Number(roster.targetSaving).toLocaleString()}。人员集中在 ${topDepartments}。`;
  const next = "先核验薪资、提成、分成、兼职口径；再优先分析直播部、直播运营部、客服部的排班效率、重复岗位、客服自动化、直播运营流程自动化和绩效产出。";
  const output = [
    "AI 分析结论",
    `1. 人员集中度：${topDepartments}。`,
    `2. 高频岗位：${topPositions}。`,
    `3. 降本目标：以可解析薪资基线 ${Number(roster.salaryTotal).toLocaleString()} 估算，30% 目标约 ${Number(roster.targetSaving).toLocaleString()}。`,
    `4. 数据风险：${roster.commissionOnlyCount} 人为纯提成/分成或无法直接解析薪资，需要人工核验；提成制岗位不建议只按底薪判断成本。`,
    "5. 建议优先级：先看直播部、直播运营部、客服部，因为人数占比高，自动化和排班优化空间更大。",
    "6. 可落地动作：建立部门人效表、岗位成本排名、重复流程清单、客服自动回复/工单分流、直播排班与绩效看板。"
  ].join("\n");

  return { summary, next, output };
}

function generateLiveReviewAiSuggestion() {
  const live = data.liveReviewSummary;
  const steps = getCurrentStepsForAi();
  const stepStats = summarizeStepsForAi(steps);

  if (!live) {
    return {
      summary: "AI 分析：当前还没有导入刘老师直播日报和复盘数据。",
      next: "先接入每日 GMV、GSV、退货、观看、成交、转化、新粉和复盘动作，再生成逐日判断。",
      output: "未找到直播复盘数据源。"
    };
  }

  const dailyLines = live.daily
    .map((day) => {
      const gmv = Number(day.douyinGmv || 0).toLocaleString();
      const gsv = Number(day.douyinGsv || 0).toLocaleString();
      const refundRate = day.refundRate ?? "-";
      const viewers = Number(day.viewers || 0).toLocaleString();
      const buyers = Number(day.buyers || 0).toLocaleString();
      const conversion = day.conversionRate ?? "-";
      return `- ${day.date}：GMV ${gmv}，GSV ${gsv}，退货率 ${refundRate}%，观看 ${viewers}，成交人数 ${buyers}，观看成交率 ${conversion}%。${day.review}`;
    })
    .join("\n");
  const actionLines = live.actions.map((action, index) => `${index + 1}. ${action}`).join("\n");
  const summary = `AI 已调取刘老师直播复盘数据：共 ${live.totals.days} 天，抖音 GMV ${Number(live.totals.douyinGmv).toLocaleString()}，抖音 GSV ${Number(live.totals.douyinGsv).toLocaleString()}，退货率 ${live.totals.douyinRefundRate}%；快手 GMV ${Number(live.totals.kuaishouGmv).toLocaleString()}，快手 GSV ${Number(live.totals.kuaishouGsv).toLocaleString()}。当前拆分环节 ${stepStats.total} 个，已完成 ${stepStats.done} 个，进行中 ${stepStats.doing} 个。`;
  const next = `优先复用 ${live.highlights.bestGmvDate} 的大场节奏，同时专项复盘 ${live.highlights.highestRefundDate} 的高退货原因；每天继续固定记录 GMV/GSV/退货率/观看/成交/转化/新粉，并把次日验证动作写入复盘。`;
  const output = [
    "AI 直播数据复盘",
    `1. 汇总：抖音 GMV ${Number(live.totals.douyinGmv).toLocaleString()}，GSV ${Number(live.totals.douyinGsv).toLocaleString()}，退货 ${Number(live.totals.douyinRefund).toLocaleString()}，退货率 ${live.totals.douyinRefundRate}%。`,
    `2. 关键判断：${live.highlights.bestGmvDate} 是 GMV/GSV 峰值；${live.highlights.bestConversionDate} 观看成交率最高；${live.highlights.lowestGmvDate} 是低谷，需要单独看开播时长、货盘和流量质量；${live.highlights.highestRefundDate} 退货率最高，需要复盘售前承诺、尺码/功效预期和售后原因。`,
    "3. 每日复盘：",
    dailyLines,
    "4. 下一步动作：",
    actionLines
  ].join("\n");

  return { summary, next, output };
}

function getCurrentStepsForAi() {
  const steps = collectSteps();
  if (steps.length) return steps;
  return [];
}

function summarizeStepsForAi(steps) {
  if (!steps.length) {
    return { total: 0, done: 0, doing: 0, pending: 0, lowProgress: [] };
  }

  return {
    total: steps.length,
    done: steps.filter((step) => step.status === "已完成" || step.progress >= 100).length,
    doing: steps.filter((step) => step.status === "进行中" || (step.progress > 0 && step.progress < 100)).length,
    pending: steps.filter((step) => step.status === "待启动" || step.progress === 0).length,
    lowProgress: steps.filter((step) => step.progress < 30).slice(0, 5)
  };
}

function classifyModule() {
  const text = [fields.name.value, fields.group.value, fields.summary.value, fields.next.value].join(" ");
  if (/人工成本|降本|薪资|花名册|人力|岗位|部门成本/.test(text)) return "labor";
  if (/刘老师|直播复盘|场控|投流|转化|排品|话术|直播运营/.test(text)) return "liveReview";
  if (/软装|采购|供应商|下单|到货|物流|比价/.test(text)) return "procurement";
  if (/别墅|空间|施工|验收|材料|楼层/.test(text)) return "villa";
  if (/集团 OS|OS|系统|审批|权限|财务|行政人事|供应链|库存|店铺|品牌/.test(text)) return "system";
  if (/总助|会议|待办|老板|周报|提醒/.test(text)) return "assistant";
  if (/AI 工厂|港湾|设备|动线|展厅|直播区/.test(text)) return "factory";
  if (/12 楼|办公室|车位|工位|会议室/.test(text)) return "office";
  return "general";
}

function generateGenericAiSuggestion() {
  const name = fields.name.value.trim();
  const hasProgress = editing?.type !== "page";
  const progress = hasProgress ? clampProgress(fields.progressNumber.value) : 0;
  const status = fields.status.value;
  const steps = getCurrentStepsForAi();
  const stepStats = summarizeStepsForAi(steps);
  const blockers = stepStats.lowProgress.map((step) => step.name).join("、") || "暂无明确卡点";
  const moduleType = classifyModule();

  if (moduleType === "labor") return generateLaborAiSuggestion();
  if (moduleType === "liveReview") return generateLiveReviewAiSuggestion();

  const playbooks = {
    procurement: {
      focus: "采购清单、预算、供应商、下单、到货、安装验收",
      risk: "预算超支、供应商交期不稳、尺寸数量不准、到货后退换补货拖慢整体交付",
      next: "先锁定按楼层/空间的采购清单、预算上限、供应商负责人和到货时间，再每周追踪下单、物流、安装、验收。"
    },
    villa: {
      focus: "空间负责人、设计确认、材料采购、施工排期、分空间验收",
      risk: "空间多、责任人分散，容易出现材料未到、施工排期冲突、验收问题无人关闭",
      next: "先给每个空间绑定负责人和截止时间，再按设计、采购、施工、验收四条线推进。"
    },
    system: {
      focus: "业务字段、页面、接口、权限、审批流、数据导入、联调验收",
      risk: "业务口径未确认会导致返工，权限和审批流若后置容易影响上线",
      next: "先确认字段和角色权限矩阵，再推进页面/接口联调，并用真实业务数据做验收。"
    },
    assistant: {
      focus: "目标承接、老板交办、会议纪要、逾期提醒、周报输出",
      risk: "事项入口分散、责任人和截止时间不完整，会导致总助追踪成本升高",
      next: "先统一目标入口，要求每条事项都有负责人、截止时间、状态和反馈记录。"
    },
    factory: {
      focus: "空间规划、功能分区、参观动线、设备清单、预算和施工上线",
      risk: "功能区和动线未锁定前采购设备，容易造成预算浪费和后续改造",
      next: "先确认楼层面积、功能区和参观动线，再输出设备清单与预算。"
    },
    office: {
      focus: "现状盘点、部门需求、办公室/工位/会议室布局、车位规则、搬迁落地",
      risk: "未先盘点人数和高频协作关系，容易出现工位不够、会议室不够或车位分配争议",
      next: "先完成现状表和部门需求表，再形成座位图、车位表和搬迁执行清单。"
    },
    liveReview: {
      focus: "每日直播数据、每日复盘结论、每日问题归因、每日优化动作、责任人和次日验证指标",
      risk: "如果只做总复盘，不按天记录数据和动作，就看不出哪一天的调整有效，也无法追踪问题是否复现",
      next: "先建立每日数据表和每日复盘表；每天固定记录 GMV、成交、观看、互动、转粉、投流、ROI、客单价、退款、问题、动作和次日验证指标。"
    },
    general: {
      focus: "目标、负责人、截止时间、关键环节和验收标准",
      risk: "任务拆解不够细或责任人不清，会导致进度百分比失真",
      next: "先补齐负责人、截止时间和验收标准，再按低进度环节逐项推进。"
    }
  };

  const playbook = playbooks[moduleType];
  const progressText = hasProgress ? `总进度 ${progress}%` : "当前为网页/页面事项";
  const stepText = stepStats.total
    ? `当前共有 ${stepStats.total} 个拆分环节，已完成 ${stepStats.done} 个，进行中 ${stepStats.doing} 个，待启动 ${stepStats.pending} 个。`
    : "当前未配置拆分环节，建议先补齐页面字段、负责人和验收标准。";
  const summary = `AI 分析：${name} 当前状态为「${status}」，${progressText}。本模块重点应围绕 ${playbook.focus} 推进；${stepText}主要风险是：${playbook.risk}。`;
  const next = `${playbook.next} 优先处理低进度环节：${blockers}。`;
  const output = [
    "AI 分析结论",
    `1. 模块类型：${playbook.focus}。`,
    `2. 当前状态：${status}${hasProgress ? `，进度 ${progress}%` : ""}。`,
    `3. 环节结构：${stepStats.total ? `共 ${stepStats.total} 个环节，已完成 ${stepStats.done} 个，进行中 ${stepStats.doing} 个，待启动 ${stepStats.pending} 个。` : "尚未配置拆分环节。"}`,
    `4. 优先卡点：${blockers}。`,
    `5. 主要风险：${playbook.risk}。`,
    `6. 建议下一步：${playbook.next}`
  ].join("\n");

  return { summary, next, output };
}

function updateAiVisibility() {
  const visible = Boolean(editing);
  fields.aiAnalyze.style.display = visible ? "inline-flex" : "none";
  fields.aiPanel.classList.toggle("is-visible", visible);
}

function stepRowTemplate(step = { name: "", status: "待启动", progress: 0 }) {
  const options = statusOptions
    .map((status) => `<option ${status === step.status ? "selected" : ""}>${status}</option>`)
    .join("");

  return `
    <article class="step-row">
      <input class="step-name" value="${escapeHtml(step.name)}" placeholder="环节名称" />
      <select class="step-status">${options}</select>
      <input class="step-progress" type="range" min="0" max="100" step="5" value="${clampProgress(step.progress)}" />
      <input class="step-number" type="number" min="0" max="100" step="5" value="${clampProgress(step.progress)}" />
      <button type="button" class="delete-step" title="删除环节" aria-label="删除环节">×</button>
    </article>
  `;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatFileSize(bytes = 0) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function renderAttachmentEditor() {
  fields.imageList.innerHTML = currentAttachments.length
    ? currentAttachments
        .map(
          (image, index) => `
            <article class="image-card">
              <img src="${image.src}" alt="${escapeHtml(image.name)}" />
              <footer>
                <strong title="${escapeHtml(image.name)}">${escapeHtml(image.name)}</strong>
                <small>${formatFileSize(image.size)} · ${image.createdAt || ""}</small>
              </footer>
              <button type="button" class="delete-image" data-image-index="${index}" title="删除图片" aria-label="删除图片">×</button>
            </article>
          `
        )
        .join("")
    : `<div class="image-empty">还没有上传图片</div>`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function prepareAttachment(file) {
  const original = await readFileAsDataUrl(file);
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      src: original,
      createdAt: new Date().toLocaleDateString("zh-CN")
    };
  }

  const image = await loadImage(original);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  const src = canvas.toDataURL("image/jpeg", 0.82);

  return {
    name: file.name,
    size: Math.round((src.length * 3) / 4),
    type: "image/jpeg",
    src,
    createdAt: new Date().toLocaleDateString("zh-CN")
  };
}

function renderStepEditor(type, steps) {
  const canEditSteps = type !== "page";
  fields.stepEditor.style.display = canEditSteps ? "grid" : "none";
  fields.stepList.innerHTML = canEditSteps
    ? normalizeSteps(steps, fields.name.value, fields.progressNumber.value, editing?.type || "").map(stepRowTemplate).join("")
    : "";
  updateProgressFromStepRows();
}

function collectSteps() {
  return [...fields.stepList.querySelectorAll(".step-row")]
    .map((row) => ({
      name: row.querySelector(".step-name").value.trim(),
      status: row.querySelector(".step-status").value,
      progress: clampProgress(row.querySelector(".step-number").value)
    }))
    .filter((step) => step.name);
}

function updateProgressFromStepRows() {
  if (!editing || editing.type === "page") return;
  const steps = collectSteps();
  if (!steps.length) return;
  const avg = averageSteps(steps);
  fields.progress.value = avg;
  fields.progressNumber.value = avg;
}

function openEditor(type, key) {
  const editable = getEditable(type, key);
  editing = { type, key };

  fields.type.textContent = editable.title;
  fields.title.textContent = editable.values.name;
  fields.name.value = editable.values.name;
  fields.status.value = statusOptions.includes(editable.values.status) ? editable.values.status : "待启动";
  fields.owner.value = editable.values.owner;
  const due = parseDueValue(editable.values.due);
  fields.dueMode.value = due.mode;
  fields.due.value = due.date;
  syncDueMode();
  fields.group.value = editable.values.group;
  fields.summary.value = editable.values.summary;
  fields.next.value = editable.values.next;

  const hasProgress = type !== "page";
  fields.progressWrap.style.display = hasProgress ? "grid" : "none";
  fields.progress.value = hasProgress ? editable.values.progress : 0;
  fields.progressNumber.value = hasProgress ? editable.values.progress : 0;
  currentAttachments = structuredClone(editable.values.attachments || []);
  renderAttachmentEditor();
  renderStepEditor(type, editable.values.steps || []);
  latestAiSuggestion = null;
  fields.aiOutput.textContent = "点击右上角 AI 分析，基于当前模块数据生成建议。";
  updateAiVisibility();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  fields.name.focus();
}

function closeEditor() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  editing = null;
  currentAttachments = [];
}

function applyEditor(event) {
  event.preventDefault();
  if (!editing) return;

  const type = editing.type;
  const key = editing.key;
  const steps = type === "page" ? [] : collectSteps();
  const progress = steps.length ? averageSteps(steps) : clampProgress(fields.progressNumber.value);

  if (type === "goal") {
    const item = data.goals[Number(key)];
    item.name = fields.name.value.trim();
    item.status = fields.status.value;
    item.progress = progress;
    item.steps = steps;
    item.owner = fields.owner.value.trim();
    item.due = getDueValue();
    item.summary = fields.summary.value.trim();
    item.next = fields.next.value.trim();
    item.attachments = structuredClone(currentAttachments);
  } else if (type === "page") {
    const item = data.pages[Number(key)];
    item.name = fields.name.value.trim();
    item.status = fields.status.value;
    item.goal = fields.group.value.trim();
    item.next = fields.next.value.trim();
    item.attachments = structuredClone(currentAttachments);
    const priorityMatch = fields.summary.value.match(/P[0-9]/i);
    if (priorityMatch) item.priority = priorityMatch[0].toUpperCase();
  } else if (type === "task") {
    const item = data.tasks[Number(key)];
    item.name = fields.name.value.trim();
    item.status = fields.status.value;
    item.progress = progress;
    item.steps = steps;
    item.owner = fields.owner.value.trim();
    item.due = getDueValue();
    item.group = fields.group.value.trim();
    item.desc = fields.summary.value.trim();
    item.next = fields.next.value.trim();
    item.attachments = structuredClone(currentAttachments);
  } else if (type === "space") {
    const item = data.spaceStatus[key];
    item.name = fields.name.value.trim();
    item.status = fields.status.value;
    item.progress = progress;
    item.steps = steps;
    item.owner = fields.owner.value.trim();
    item.due = getDueValue();
    item.floor = fields.group.value.trim();
    item.summary = fields.summary.value.trim();
    item.next = fields.next.value.trim();
    item.attachments = structuredClone(currentAttachments);
  }

  closeEditor();
  renderAll();
}

function syncProgressInputs(source) {
  const value = clampProgress(source.value);
  fields.progress.value = value;
  fields.progressNumber.value = value;
}

function scrollToSection(id) {
  const target = document.querySelector(`#${id}`);
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function setActiveStatus(status) {
  activeStatus = status;
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.status === status);
  });
  renderAll();
}

document.querySelector(".workspace-nav").addEventListener("click", (event) => {
  const navButton = event.target.closest("[data-nav-target], [data-nav-status]");
  const docItem = event.target.closest("[data-doc-search]");

  if (navButton) {
    document.querySelectorAll(".workspace-nav .nav-item").forEach((item) => item.classList.toggle("is-active", item === navButton));

    if (navButton.dataset.navStatus) {
      setActiveStatus(navButton.dataset.navStatus);
      scrollToSection("dashboard");
      return;
    }

    if (navButton.dataset.navTarget) {
      if (navButton.dataset.navTarget === "dashboard") setActiveStatus("全部");
      scrollToSection(navButton.dataset.navTarget);
      return;
    }
  }

  if (docItem) {
    searchInput.value = docItem.dataset.docSearch;
    setActiveStatus("全部");
    scrollToSection("dashboard");
  }
});

document.querySelector("#statusTabs").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  setActiveStatus(button.dataset.status);
});

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-type]");
  if (!trigger || trigger.classList.contains("tab")) return;
  const type = trigger.dataset.type;
  const key = trigger.dataset.key ?? trigger.dataset.index;
  if (!type || key === undefined) return;
  openEditor(type, key);
});

searchInput.addEventListener("input", renderAll);
form.addEventListener("submit", applyEditor);
fields.progress.addEventListener("input", () => syncProgressInputs(fields.progress));
fields.progressNumber.addEventListener("input", () => syncProgressInputs(fields.progressNumber));
fields.dueMode.addEventListener("change", syncDueMode);
fields.name.addEventListener("input", updateAiVisibility);
fields.group.addEventListener("input", updateAiVisibility);
fields.aiAnalyze.addEventListener("click", () => {
  latestAiSuggestion = generateGenericAiSuggestion();
  fields.aiOutput.textContent = latestAiSuggestion.output;
});
fields.applyAi.addEventListener("click", () => {
  if (!latestAiSuggestion) {
    latestAiSuggestion = generateGenericAiSuggestion();
    fields.aiOutput.textContent = latestAiSuggestion.output;
  }
  fields.summary.value = latestAiSuggestion.summary;
  fields.next.value = latestAiSuggestion.next;
});
fields.imageUpload.addEventListener("change", async (event) => {
  const files = [...event.target.files].filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;
  fields.imageList.innerHTML = `<div class="image-empty">图片处理中...</div>`;
  try {
    const prepared = [];
    for (const file of files) {
      prepared.push(await prepareAttachment(file));
    }
    currentAttachments = [...currentAttachments, ...prepared];
    renderAttachmentEditor();
  } catch (error) {
    renderAttachmentEditor();
    alert("图片读取失败，请换一张图片再试。");
  } finally {
    fields.imageUpload.value = "";
  }
});
fields.imageList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest(".delete-image");
  if (!deleteButton) return;
  currentAttachments.splice(Number(deleteButton.dataset.imageIndex), 1);
  renderAttachmentEditor();
});
fields.stepList.addEventListener("input", (event) => {
  const row = event.target.closest(".step-row");
  if (!row) return;

  if (event.target.classList.contains("step-progress")) {
    row.querySelector(".step-number").value = clampProgress(event.target.value);
  }

  if (event.target.classList.contains("step-number")) {
    row.querySelector(".step-progress").value = clampProgress(event.target.value);
  }

  updateProgressFromStepRows();
});
fields.stepList.addEventListener("change", updateProgressFromStepRows);
fields.stepList.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-step");
  if (!button) return;
  button.closest(".step-row").remove();
  updateProgressFromStepRows();
});
document.querySelector("#addStepBtn").addEventListener("click", () => {
  fields.stepList.insertAdjacentHTML("beforeend", stepRowTemplate({ name: "新环节", status: "待启动", progress: 0 }));
  updateProgressFromStepRows();
});
document.querySelector("#closeEditor").addEventListener("click", closeEditor);
document.querySelector("#cancelEditor").addEventListener("click", closeEditor);
modal.addEventListener("click", (event) => {
  if (event.target.dataset.close) closeEditor();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal.classList.contains("is-open")) closeEditor();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  data = ensureData(structuredClone(seedData));
  localStorage.removeItem(storageKey);
  searchInput.value = "";
  activeStatus = "全部";
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.status === "全部"));
  renderAll();
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "project-dashboard-data.json";
  link.click();
  URL.revokeObjectURL(url);
});

renderAll();
