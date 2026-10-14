export const BEGINNER_TASK_KEY = 'zhiya:beginner-task:v1'
export const BEGINNER_RESULT_KEY = 'zhiya:beginner-result:v1'
export const beginnerTasks = [
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
export function beginnerEvidence(value: unknown): BeginnerEvidence | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Partial<BeginnerEvidence>
  if (typeof v.output !== 'string' || !v.output.trim() || !['ai', 'example'].includes(v.kind ?? ''))
    return null
  return { ...beginnerDraft(v), output: v.output.slice(0, 5000), kind: v.kind! }
}
export function beginnerTask(id: unknown) {
  return beginnerTasks.find((t) => t.id === id) ?? beginnerTasks[0]
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
  const format =
    draft.format === 'list'
      ? '逐条列出，最多五条'
      : draft.format === 'sections'
        ? '分成【内容】【要做的事】【待确认】三部分'
        : '用简短、容易读懂的中文，120字以内'
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
