import type { GuideVisual } from './guide-visuals'

export const caseVisuals: Record<string, GuideVisual> = {
  'weekly-report-ops': {
    title: '这个周报方法，复用的是四个动作',
    steps: [
      { label: '收集客观记录', detail: '数据、进展和原始问题', icon: 'material' },
      { label: '按结构起草', detail: '进展、问题、下周计划', icon: 'model' },
      { label: '保留真实问题', detail: '金额、责任与影响不模糊', icon: 'check' },
      { label: '核对后交付', detail: '确认数字和待确认事项', icon: 'output' },
    ],
    note: '省下整理与改写的时间；关键数字、原因和责任仍由人确认。',
  },
  'teaching-materials': {
    title: '分层任务单，从学情走到可检查的活动',
    steps: [
      { label: '提供课文与学情', detail: '初二语文，明确课时目标', icon: 'material' },
      { label: '设计三档任务', detail: '读、圈、填、说、写等动作', icon: 'model' },
      { label: '核对用时与难度', detail: '每档有可观察的完成标准', icon: 'check' },
      { label: '教师取舍', detail: '重写偏浅题目，确认答案', icon: 'output' },
    ],
    note: '图中的 AI 是教师备课助手；学生不需要注册或联网使用。',
  },
  'excel-cleaning': {
    title: '清洗可以重做，也要可以回查',
    steps: [
      { label: '保存原始副本', detail: '原表不直接覆盖', icon: 'material' },
      { label: '先写清洗规则', detail: '字段类型与去重口径', icon: 'model' },
      { label: '记录每步变更', detail: '保留规则与处理结果', icon: 'tool' },
      { label: '抽样对账', detail: '关键金额与原记录核对', icon: 'check' },
    ],
    note: '抽样核对并不能证明全表无误；重要金额需按实际对账要求验收。',
  },
  'campus-notice-check': {
    title: '从资料到通知，先看清冲突',
    steps: [
      { label: '对照三份资料', detail: '保留版本与段落编号', icon: 'material' },
      { label: '提取通知字段', detail: '每个值带来源', icon: 'model' },
      { label: '标记冲突和缺失', detail: '日期、地点不猜测', icon: 'check' },
      { label: '负责人确认', detail: '确认后再形成发布稿', icon: 'output' },
    ],
    note: '演示案例：流程可以帮助整理，活动决定仍由负责人确认。',
  },
  'workorder-triage': {
    title: '报修分类与真正派单，是两个步骤',
    steps: [
      { label: '接收虚构表单', detail: '原始编号与问题描述', icon: 'material' },
      { label: '分类并查缺失', detail: '缺地点就提问', icon: 'model' },
      { label: '查重与人工确认', detail: '重复编号不重复建单', icon: 'check' },
      { label: '形成待办草稿', detail: '失败保留原状态', icon: 'output' },
    ],
    note: '先练普通、缺失、重复和失败四类样例，再连接真实系统。',
  },
  'meeting-action-review': {
    title: '会议记录先核对，再安排执行',
    steps: [
      { label: '区分讨论和决定', detail: '逐段保留证据', icon: 'material' },
      { label: '提取行动字段', detail: '责任人和日期不补猜', icon: 'model' },
      { label: '暂停等待确认', detail: '人工回复与任务对应', icon: 'check' },
      { label: '恢复形成草稿', detail: '保留状态和版本', icon: 'output' },
    ],
    note: '演示案例：状态恢复不能替代人工确认，也不能证明外部写入成功。',
  },
}
