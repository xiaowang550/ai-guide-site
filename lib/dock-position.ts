/**
 * 助手浮窗的定位计算（纯函数，抽出来是为了能单测）。
 *
 * 为什么必须单独抽：这段数学在手机上有真实 bug ——
 * 展开面板时容器宽度按 384px 算，屏宽 375px 时 left 变成负数，
 * 面板和折叠按钮都会被推出屏幕外，用户以为助手不见了。
 */
export const DOCK_GAP = 16

/** 面板在窄屏上的实际宽度：最多 352px，且不贴边 */
export function panelWidthFor(viewportWidth: number): number {
  return Math.min(352, Math.max(240, viewportWidth - DOCK_GAP * 2))
}

/** 折叠按钮的尺寸 */
export const DOCK_BUTTON_SIZE = 52

/**
 * 计算浮窗容器位置。
 *
 * @param dock 预设方位或拖拽后的自定义坐标
 * @param viewport 视口尺寸
 * @param panelOpen 面板是否展开（展开时容器要按面板宽度让位）
 * @param size 拖拽后容器实际尺寸（宽高），展开时用于夹紧
 */
export function computeDockPosition(
  dock: string | { x: number; y: number },
  viewport: {
    width: number
    height: number
    left?: number
    top?: number
    gap?: number
    insets?: { top: number; right: number; bottom: number; left: number }
  },
  panelOpen: boolean,
  size: { width: number; height: number } = { width: DOCK_BUTTON_SIZE, height: DOCK_BUTTON_SIZE },
): { left: number; top: number } {
  const { width: vw, height: vh, left = 0, top = 0, insets } = viewport
  const gap = viewport.gap ?? DOCK_GAP
  // 展开时容器要让出面板宽度；窄屏上直接靠边
  const needed = panelOpen ? panelWidthFor(vw) : DOCK_BUTTON_SIZE
  const minLeft = left + Math.max(0, Math.min(Math.max(gap, insets?.left ?? 0), vw - size.width))
  const minTop = top + Math.max(0, Math.min(Math.max(gap, insets?.top ?? 0), vh - size.height))
  const maxLeft = Math.max(minLeft, left + vw - size.width - Math.max(gap, insets?.right ?? 0))
  const maxTop = Math.max(minTop, top + vh - size.height - Math.max(gap, insets?.bottom ?? 0))

  const clampX = (x: number) => Math.min(Math.max(x, minLeft), maxLeft)
  const clampY = (y: number) => Math.min(Math.max(y, minTop), maxTop)

  if (typeof dock !== 'string') {
    // 拖拽过的位置：始终夹回可视区内，旋转屏幕也不会丢
    return { left: clampX(dock.x), top: clampY(dock.y) }
  }

  switch (dock) {
    case 'bottom-left':
      return { left: minLeft, top: maxTop }
    case 'top-right':
      return { left: clampX(left + vw - needed - gap), top: minTop }
    case 'top-left':
      return { left: minLeft, top: minTop }
    default:
      return {
        left: clampX(left + vw - needed - gap),
        top: maxTop,
      }
  }
}
