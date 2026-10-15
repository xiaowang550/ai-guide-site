export const BEGINNER_TASK_KEY = 'zhiya:beginner-task:v1'
export const BEGINNER_RESULT_KEY = 'zhiya:beginner-result:v1'
export const beginnerTasks = [
  {
    id: 'ask',
    label: '直接问 AI',
    benefit: '问攻略、做计划，或者问你自己的问题',
    cover: 'document-review',
    action: '发送给 AI',
    material: '请给我一份北京三天的旅游攻略。第一次去，主要乘地铁，希望行程轻松一些。',
    recipient: '自己',
    question: '攻略里的票价或开放时间没有核实，你会怎么做？',
  },
  {
    id: 'message',
    label: '写一条消息',
    benefit: '把已有信息写成能发出去的草稿',
    cover: 'campus-notice',
    action: '帮我写成消息',
    material: '周五下午3点，在会议室讨论本周进展。每人准备一条需要大家协助的事。',
    recipient: '同事',
    question: '如果草稿多写了一个原文没有的联系人，你会怎么做？',
  },
  {
    id: 'todo',
    label: '整理待办',
    benefit: '把零散笔记变成一项项要做的事',
    cover: 'team-meeting',
    action: '帮我整理待办',
    material: '周五下午3点开讨论会。提前确认会议室。每人准备一条本周进展。',
    recipient: '自己',
    question: '如果待办里多了一件原文没有的事，你会怎么做？',
  },
  {
    id: 'read',
    label: '读懂一段话',
    benefit: '把一段通知拆开，弄清自己要做什么',
    cover: 'document-review',
    action: '帮我拆开读',
    material: '请在周五下班前提交本周进展，未完成的事项说明原因，并附上下周安排。',
    recipient: '自己',
    question: 'AI 解释出了原文没有的截止时间，你会怎么做？',
  },
] as const
export type BeginnerTaskId = (typeof beginnerTasks)[number]['id']
export type BeginnerFormat = 'short' | 'list' | 'sections'
export type BeginnerDraft = {
  task: BeginnerTaskId
  material: string
  recipient: string
  format: BeginnerFormat
}
export type BeginnerEvidence = BeginnerDraft & { output: string; kind: 'ai' | 'example' }
/** Recognize explicit first-person requests; an ordinary notice starting with 请 stays material. */
export function beginnerDirectQuestion(draft: BeginnerDraft) {
  return (
    draft.task === 'ask' ||
    /^(?:你好[，,！!。\s]*)?(?:请)?(?:给我|帮我|为我|我想|我打算|我准备|能不能|可以帮我|怎么|如何|什么是|为什么)/.test(
      draft.material.trim(),
    )
  )
}
export function beginnerEvidence(value: unknown): BeginnerEvidence | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<BeginnerEvidence>
  if (typeof v.output !== 'string' || !v.output.trim() || !['ai', 'example'].includes(v.kind ?? ''))
    return null
  return { ...beginnerDraft(v), output: v.output.slice(0, 5000), kind: v.kind! }
}
export function beginnerTask(id: unknown) {
  return beginnerTasks.find((t) => t.id === id) ?? beginnerTasks.find((t) => t.id === 'message')!
}
export function beginnerDraft(value: unknown): BeginnerDraft {
  const v = value && typeof value === 'object' ? (value as Partial<BeginnerDraft>) : {}
  const task = beginnerTask(v.task)
  return {
    task: task.id,
    material: typeof v.material === 'string' ? v.material.slice(0, 1200) : task.material,
    recipient: typeof v.recipient === 'string' ? v.recipient.slice(0, 60) : task.recipient,
    format: ['short', 'list', 'sections'].includes(v.format ?? '') ? v.format! : 'short',
  }
}
export function beginnerPrompt(draft: BeginnerDraft) {
  const task = beginnerTask(draft.task)
  const direct = beginnerDirectQuestion(draft)
  const format =
    draft.format === 'list'
      ? '逐条列出，最多五条'
      : draft.format === 'sections'
        ? '分成【内容】【要做的事】【待确认】三部分'
        : direct
          ? '用容易读懂的中文，先给具体方案，400字以内'
          : '用简短、容易读懂的中文，120字以内'
  if (direct)
    return (
      '请直接回答下面的问题或完成这个请求。可以使用一般知识。缺少关键条件时先问一个简短问题，不替用户决定；条件足够再给简短方案。不要把问题当作原文做摘要，也不要以本站没有资料为由拒绝回答。涉及实时票价、开放时间等请提醒核对官方信息，不假装已经联网。给' +
      (draft.recipient.trim() || '我') +
      '看。' +
      format +
      '。\n我的问题：\n' +
      draft.material.trim()
    )
  return (
    '请' +
    task.action +
    '，给' +
    (draft.recipient.trim() || '我') +
    '看。' +
    format +
    '。只使用下面的材料，不增加时间、地点、联系人或任务。没有说清楚的信息标【待确认】。\n材料：\n' +
    draft.material.trim()
  )
}
/** Teaching layout only: retains supplied facts and is always labelled as an example. */
export function beginnerExample(draft: BeginnerDraft) {
  const text = draft.material.trim()
  if (beginnerDirectQuestion(draft))
    return (
      '你的问题：\n' +
      text +
      '\n\n可以这样补充要求：\n说明天数、预算或使用对象，再写清希望的格式。\n\n这是提问练习示例，没有生成真实答案。点击“发送给 AI”获取回答。'
    )
  const parts = text
    .split(draft.task === 'read' ? /[。，；;\n]/ : /[。；;\n]/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (draft.format === 'sections')
    return (
      '【内容】\n' +
      text +
      '\n\n【要做的事】\n请对照原文核对时间和准备事项。\n\n【待确认】\n未提供的信息请先确认，再补充。'
    )
  if (draft.task !== 'message' || draft.format === 'list')
    return parts.map((p, i) => i + 1 + '. ' + p).join('\n')
  return (
    '给' +
    (draft.recipient.trim() || '大家') +
    '的消息：\n' +
    text +
    '\n\n未说明的信息，确认后再补充。'
  )
}
