import { describe, expect, it } from 'vitest'
import { sidebarBounds, sidebarOffset } from '../scroll-sidebar'

describe('侧栏随页面双向滚动', () => {
  it('比可用高度短的侧栏一直停在顶栏下方', () => {
    const bounds = sidebarBounds(300, 800, 76)
    expect(bounds).toEqual({ top: 92, bottom: 92 })
    expect(sidebarOffset(92, 500, bounds)).toBe(92)
    expect(sidebarOffset(92, -500, bounds)).toBe(92)
  })
  it('向下逐步露出底部，抵达底边后不再移动', () => {
    const bounds = sidebarBounds(900, 650, 76)
    let top = sidebarOffset(bounds.top, 100, bounds)
    expect(top).toBe(-8)
    top = sidebarOffset(top, 1000, bounds)
    expect(top).toBe(-266)
    expect(top + 900).toBe(650 - 16)
    expect(sidebarOffset(top, 100, bounds)).toBe(top)
  })
  it('反向滚动立即开始恢复上方内容，不从底部突然跳到顶部', () => {
    const bounds = sidebarBounds(900, 650, 76)
    expect(sidebarOffset(bounds.bottom, -60, bounds)).toBe(-206)
    expect(sidebarOffset(-206, -400, bounds)).toBe(bounds.top)
  })
  it('缩放、窗口和内容高度变化后重新约束停靠范围', () => {
    const old = sidebarBounds(900, 650, 76)
    const expanded = sidebarBounds(900, 1000, 100)
    expect(sidebarOffset(old.bottom, 0, expanded)).toBe(84)
    expect(sidebarOffset(84, 0, sidebarBounds(1100, 600, 76))).toBe(84)
  })
})
