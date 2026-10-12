/** 小助手提示策略：不调用模型、不打开面板，仅在安静的页面显示短提示。 */
export const ASSISTANT_HELLO_MS = 1800
export const ASSISTANT_REMINDER_MS = 4 * 60 * 1000
export const ASSISTANT_QUIET_MS = 30 * 60 * 1000
export interface HintContext {
  now: number
  lastInteraction: number
  lastShown: number
  quietUntil: number
  hello: boolean
  hidden: boolean
  panelOpen: boolean
  typing: boolean
  modal: boolean
  dragging: boolean
}
export function canShowAssistantHint(c: HintContext): boolean {
  if (c.hidden || c.panelOpen || c.typing || c.modal || c.dragging || c.now < c.quietUntil)
    return false
  if (c.now - c.lastInteraction < (c.hello ? 1200 : 15000)) return false
  return c.hello || c.now - c.lastShown >= ASSISTANT_REMINDER_MS
}
export function assistantHint(path: string, index: number) {
  const context = path.startsWith('/cases')
    ? '看中了一个案例？我可以帮你换成自己的任务。'
    : path.startsWith('/tools') || path.startsWith('/compare')
      ? '选工具拿不准？告诉我你想完成什么。'
      : path.startsWith('/learn')
        ? '概念有点难懂？我可以举个日常例子。'
        : path.startsWith('/edu')
          ? '在准备课程吗？我可以陪你整理思路和材料。'
          : '需要帮忙吗？告诉我你现在想完成什么。'
  return [
    context,
    '一句想法也可以。我能陪你把提示词写得更清楚。',
    '想练一下？我们可以比较简单提问和详细要求的效果。',
    '我可以帮你起草材料，再一起核对重点。',
  ][index % 4]
}
export function assistantBubblePosition(
  anchor: { left: number; top: number; width: number; height: number },
  viewport: { width: number; height: number; left?: number; top?: number },
  size: { width: number; height: number },
) {
  const x = viewport.left ?? 0,
    y = viewport.top ?? 0,
    gap = 12
  const left = Math.max(
    x + gap,
    Math.min(anchor.left + anchor.width - size.width, x + viewport.width - size.width - gap),
  )
  const above = anchor.top - size.height - 10 >= y + gap
  const top = Math.max(
    y + gap,
    Math.min(
      above ? anchor.top - size.height - 10 : anchor.top + anchor.height + 10,
      y + viewport.height - size.height - gap,
    ),
  )
  return {
    left,
    top,
    above,
    tail: Math.max(18, Math.min(anchor.left + anchor.width / 2 - left, size.width - 18)),
  }
}
