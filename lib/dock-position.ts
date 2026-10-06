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
  viewport: { width: number; height: number },
  panelOpen: boolean,
  size: { width: number; height: number } = { width: DOCK_BUTTON_SIZE, height: DOCK_BUTTON_SIZE }
): { left: number; top: number } {
  const { width: vw, height: vh } = viewport
  // 展开时容器要让出面板宽度；窄屏上直接靠边
  const needed = panelOpen ? panelWidthFor(vw) : DOCK_BUTTON_SIZE
  const minLeft = Math.max(0, Math.min(DOCK_GAP, vw - size.width))
  const minTop = Math.max(0, Math.min(DOCK_GAP, vh - size.height))

  const clampX = (x: number) => Math.min(Math.max(x, minLeft), Math.max(minLeft, vw - size.width))
  const clampY = (y: number) => Math.min(Math.max(y, minTop), Math.max(minTop, vh - size.height))

  if (typeof dock !== 'string') {
    // 拖拽过的位置：始终夹回可视区内，旋转屏幕也不会丢
    return { left: clampX(dock.x), top: clampY(dock.y) }
  }

  switch (dock) {
    case 'bottom-left':
      return { left: minLeft, top: clampY(vh - needed - DOCK_GAP) }
    case 'top-right':
      return { left: clampX(vw - needed - DOCK_GAP), top: minTop }
    case 'top-left':
      return { left: minLeft, top: minTop }
    default:
      return {
        left: clampX(vw - needed - DOCK_GAP),
        top: clampY(vh - (panelOpen ? size.height : needed) - DOCK_GAP),
      }
  }
}