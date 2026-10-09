export type DiagramIcon = 'material' | 'model' | 'search' | 'check' | 'output' | 'tool'
export interface GuideVisual {
  title: string
  steps: { label: string; detail: string; icon: DiagramIcon }[]
  note: string
}
const step = (label: string, detail: string, icon: DiagramIcon) => ({ label, detail, icon })
export const guideVisuals: Record<string, GuideVisual> = {
  'model-task-audit': {
    title: '同一任务，按同一标准比较',
    steps: [
      step('固定材料', '三份不同难点的记录', 'material'),
      step('两个候选', '同一提示词与入口记录', 'model'),
      step('对照标准', '字段、依据、耗时与返工', 'check'),
      step('写选择规则', '标明升级和人工处理条件', 'output'),
    ],
    note: '这是你自己任务的比较，不是厂商模型排名。',
  },
  'structured-handoff': {
    title: '能读进去，也要内容正确',
    steps: [
      step('约定字段', '任务、负责人、日期、依据', 'material'),
      step('生成清单', '未知信息保留 null', 'model'),
      step('两次核对', '结构校验，再核对原文', 'check'),
      step('再交接', '不合格的结果退回修改', 'output'),
    ],
    note: '格式通过不代表事实通过；缺项不能靠猜测补齐。',
  },
  'knowledge-workflow': {
    title: '资料 → 片段 → 回答 → 原文核验',
    steps: [
      step('确认资料', '版本、范围与允许用途', 'material'),
      step('找到片段', '相关节选与明确出处', 'search'),
      step('形成回答', '仅使用当前片段的依据', 'model'),
      step('回原文核对', '无依据或冲突时停止', 'check'),
    ],
    note: '学习练习用公开或脱敏资料，不上传学生个人信息。',
  },
  'agent-first-workflow': {
    title: 'Agent 的每一步都要看得见',
    steps: [
      step('写任务单', '目标、范围与退出条件', 'material'),
      step('工具调用', '程序验证后才执行', 'tool'),
      step('形成草稿', '保留依据与待确认项', 'model'),
      step('人来验收', '检查具体版本再决定', 'check'),
    ],
    note: '是否真实执行，以工具结果为准；本页走读是设计练习。',
  },
  'agent-failure-review': {
    title: '先定位原因，再决定是否重跑',
    steps: [
      step('看运行记录', '找最早出错的一步', 'material'),
      step('分清原因', '资料、参数、权限或判断', 'search'),
      step('确认状态', '检查是否已执行外部动作', 'check'),
      step('小范围复测', '一次只改一个因素', 'output'),
    ],
    note: '超时不表示一定没有执行，状态不明时先暂停。',
  },
  'agent-evaluation-cost': {
    title: '四类样本，分别检查',
    steps: [
      step('准备样本', '正常、缺项、冲突、夹带指令', 'material'),
      step('检查结果', '字段、来源与操作范围', 'check'),
      step('看完整过程', '失败处理与真实消耗', 'tool'),
      step('保留版本', '记录改善与未解决问题', 'output'),
    ],
    note: '未运行或没有账单的消耗标为未测，不估造数字。',
  },
  'long-pdf-summary': {
    title: '长文摘要，先拆开再合并',
    steps: [
      step('先看目录', '确认问题和相关章节', 'material'),
      step('按章节提取', '保留页码与限定条件', 'search'),
      step('核对原文', '检查关键事实与遗漏', 'check'),
      step('合并摘要', '只汇总已确认的内容', 'output'),
    ],
    note: '抽查通过不代表整份摘要全部可靠，关键结论仍需核对。',
  },
  'excel-analysis': {
    title: '先把数据弄对，再让 AI 解释',
    steps: [
      step('保存副本', '原表与处理过程可回看', 'material'),
      step('统一口径', '字段、单位与缺失值', 'tool'),
      step('独立验算', '抽算关键数字和公式', 'check'),
      step('整理结论', '区分数据与解释', 'output'),
    ],
    note: '图表好看不能代替口径一致和计算正确。',
  },
  'ppt-from-outline': {
    title: '汇报从一个判断开始',
    steps: [
      step('明确受众', '希望对方作什么决定', 'material'),
      step('提炼主张', '每页只围绕一个判断', 'model'),
      step('安排证据', '数字、图表与出处对应', 'search'),
      step('检查成品', '内容、结构与排版', 'check'),
    ],
    note: '先确认要说什么，再选择生成演示文稿的工具。',
  },
  'market-research': {
    title: '调研不是把搜索结果拼起来',
    steps: [
      step('限定问题', '地区、时间与统计口径', 'material'),
      step('找原始来源', '优先可核对的一手资料', 'search'),
      step('比较口径', '不同数据不能直接相加', 'check'),
      step('写结论边界', '保留分歧和未确认项', 'output'),
    ],
    note: 'AI 帮助整理线索，关键结论仍需回到原始来源。',
  },
}
