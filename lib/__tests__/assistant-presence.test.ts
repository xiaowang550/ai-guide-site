import { describe, expect, it } from 'vitest'
import {
  canShowAssistantHint,
  assistantBubblePosition,
  assistantHint,
  ASSISTANT_REMINDER_MS,
} from '../assistant-presence'

const quietPage = {
  now: 1000000,
  lastShown: 0,
  lastInteraction: 0,
  quietUntil: 0,
  hello: false,
  hidden: false,
  panelOpen: false,
  typing: false,
  modal: false,
  dragging: false,
}
describe('助手提醒的打扰控制', () => {
  it.each(['hidden', 'panelOpen', 'typing', 'modal', 'dragging'] as const)(
    '%s 时不出现提示，初次介绍也遵守',
    (key) => {
      expect(canShowAssistantHint({ ...quietPage, [key]: true })).toBe(false)
      expect(canShowAssistantHint({ ...quietPage, hello: true, [key]: true })).toBe(false)
    },
  )
  it('关闭提示后的静默期生效，到期才恢复', () => {
    expect(canShowAssistantHint({ ...quietPage, quietUntil: 1000001 })).toBe(false)
    expect(canShowAssistantHint({ ...quietPage, quietUntil: 1000000 })).toBe(true)
  })
  it('三分钟间隔并且停顿三秒后才显示，短提示不会过早反复出现', () => {
    expect(
      canShowAssistantHint({ ...quietPage, lastShown: quietPage.now - ASSISTANT_REMINDER_MS + 1 }),
    ).toBe(false)
    expect(canShowAssistantHint({ ...quietPage, lastInteraction: quietPage.now - 2999 })).toBe(
      false,
    )
    expect(
      canShowAssistantHint({
        ...quietPage,
        lastShown: quietPage.now - ASSISTANT_REMINDER_MS,
        lastInteraction: quietPage.now - 3000,
      }),
    ).toBe(true)
  })
  it('首次介绍不需要等三分钟，但避开刚开始操作的瞬间', () => {
    expect(
      canShowAssistantHint({
        ...quietPage,
        hello: true,
        lastShown: quietPage.now,
        lastInteraction: quietPage.now - 1199,
      }),
    ).toBe(false)
    expect(
      canShowAssistantHint({
        ...quietPage,
        hello: true,
        lastShown: quietPage.now,
        lastInteraction: quietPage.now - 1200,
      }),
    ).toBe(true)
  })
})
describe('气泡边界及情境文案', () => {
  it.each([
    { left: 0, top: 0 },
    { left: 248, top: 0 },
    { left: 0, top: 496 },
    { left: 248, top: 496 },
  ])('320px 小屏四角都完整可见 %j', (point) => {
    const p = assistantBubblePosition(
      { ...point, width: 72, height: 72 },
      { width: 320, height: 568 },
      { width: 248, height: 140 },
    )
    expect(p.left).toBeGreaterThanOrEqual(12)
    expect(p.left + 248).toBeLessThanOrEqual(308)
    expect(p.top).toBeGreaterThanOrEqual(12)
    expect(p.top + 140).toBeLessThanOrEqual(556)
    expect(p.above).toBe(point.top > 0)
  })
  it('手机键盘与缩放偏移也使用可视视口', () => {
    const p = assistantBubblePosition(
      { left: 210, top: 270, width: 72, height: 72 },
      { width: 320, height: 350, left: 20, top: 30 },
      { width: 248, height: 140 },
    )
    expect(p.left).toBeGreaterThanOrEqual(32)
    expect(p.left + 248).toBeLessThanOrEqual(328)
    expect(p.top + 140).toBeLessThanOrEqual(368)
  })
  it('跟随当前内容给出不同帮助，一个轮换周期内不重复', () => {
    expect(assistantHint('/cases/', 0)).toContain('案例')
    expect(assistantHint('/compare/', 0)).toContain('选工具')
    expect(assistantHint('/learn/', 0)).toContain('概念')
    expect(assistantHint('/edu/programs/', 0)).toContain('课程')
    expect(assistantHint('/updates/', 0)).toContain('消息')
    expect(new Set(Array.from({ length: 8 }, (_, i) => assistantHint('/cases/', i))).size).toBe(8)
    expect(assistantHint('/cases/', 8)).toBe(assistantHint('/cases/', 0))
  })
})
