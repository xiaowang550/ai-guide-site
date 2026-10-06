import { describe, expect, it } from 'vitest'
import { computeDockPosition, DOCK_BUTTON_SIZE, DOCK_GAP, panelWidthFor } from '../dock-position'

const VIEWPORTS = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: '常见安卓', width: 360, height: 800 },
  { name: 'iPhone 12/13', width: 375, height: 812 },
  { name: 'iPhone Pro Max', width: 414, height: 896 },
  { name: 'iPad 竖屏', width: 768, height: 1024 },
  { name: '桌面', width: 1440, height: 900 },
]

describe('panelWidthFor', () => {
  it('宽屏固定 352px', () => {
    expect(panelWidthFor(1440)).toBe(352)
    expect(panelWidthFor(768)).toBe(352)
  })

  it('窄屏自动收窄且不贴边', () => {
    expect(panelWidthFor(375)).toBe(343)
    expect(panelWidthFor(320)).toBe(288)
  })

  it('极窄屏也不小于 240（否则输入框没法用）', () => {
    expect(panelWidthFor(200)).toBe(240)
  })
})

describe('computeDockPosition：所有屏宽都在可视区内', () => {
  it.each(VIEWPORTS)('$name 折叠态不越界', ({ width, height }) => {
    const p = computeDockPosition('bottom-right', { width, height }, false)
    expect(p.left).toBeGreaterThanOrEqual(0)
    expect(p.top).toBeGreaterThanOrEqual(0)
    expect(p.left + DOCK_BUTTON_SIZE).toBeLessThanOrEqual(width)
    expect(p.top + DOCK_BUTTON_SIZE).toBeLessThanOrEqual(height)
  })

  it.each(VIEWPORTS)('$name 展开态面板完整可见（这是修掉的真实 bug）', ({ width, height }) => {
    const panelW = panelWidthFor(width)
    const panelH = 460
    const p = computeDockPosition(
      'bottom-right',
      { width, height },
      true,
      { width: panelW, height: panelH }
    )
    expect(p.left, `${width}px 屏上 left 不能为负`).toBeGreaterThanOrEqual(0)
    expect(p.left + panelW, `${width}px 屏上面板右缘不能超出`).toBeLessThanOrEqual(width)
    expect(p.top).toBeGreaterThanOrEqual(0)
    expect(p.top + panelH).toBeLessThanOrEqual(height)
  })
})

describe('computeDockPosition：四个预设方位', () => {
  const vp = { width: 1440, height: 900 }
  const size = { width: 52, height: 52 }

  it('右下角贴右下', () => {
    const p = computeDockPosition('bottom-right', vp, false, size)
    expect(p.left).toBe(vp.width - size.width - DOCK_GAP)
    expect(p.top).toBe(vp.height - size.height - DOCK_GAP)
  })

  it('左下角贴左下', () => {
    const p = computeDockPosition('bottom-left', vp, false, size)
    expect(p.left).toBe(DOCK_GAP)
    expect(p.top).toBe(vp.height - size.height - DOCK_GAP)
  })

  it('右上角贴右上', () => {
    const p = computeDockPosition('top-right', vp, false, size)
    expect(p.left).toBe(vp.width - size.width - DOCK_GAP)
    expect(p.top).toBe(DOCK_GAP)
  })

  it('左上角贴左上', () => {
    const p = computeDockPosition('top-left', vp, false, size)
    expect(p.left).toBe(DOCK_GAP)
    expect(p.top).toBe(DOCK_GAP)
  })
})

describe('computeDockPosition：拖拽后的自定义坐标会被夹回可视区', () => {
  it('超出右边 → 拉回', () => {
    const p = computeDockPosition({ x: 5000, y: 100 }, { width: 1440, height: 900 }, false)
    expect(p.left).toBeLessThanOrEqual(1440 - DOCK_BUTTON_SIZE)
  })

  it('超出下边 → 拉回', () => {
    const p = computeDockPosition({ x: 100, y: 5000 }, { width: 1440, height: 900 }, false)
    expect(p.top).toBeLessThanOrEqual(900 - DOCK_BUTTON_SIZE)
  })

  it('负坐标 → 归位到最小边距', () => {
    const p = computeDockPosition({ x: -300, y: -300 }, { width: 375, height: 812 }, false)
    expect(p.left).toBeGreaterThanOrEqual(0)
    expect(p.top).toBeGreaterThanOrEqual(0)
  })

  it('旋转屏幕（视口变小）后仍在可视区', () => {
    // 竖屏时放在右下，横屏后视口变宽变小
    const p = computeDockPosition({ x: 360, y: 780 }, { width: 812, height: 375 }, false)
    expect(p.left).toBeLessThanOrEqual(812 - DOCK_BUTTON_SIZE)
    expect(p.top).toBeLessThanOrEqual(375 - DOCK_BUTTON_SIZE)
  })
})