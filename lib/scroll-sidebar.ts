export function sidebarBounds(height: number, viewport: number, headerBottom: number, gap = 16) {
  const top = Math.max(0, headerBottom) + gap
  return { top, bottom: Math.min(top, viewport - gap - height) }
}

/** Tall columns travel with the page between the top and bottom viewport edges. */
export function sidebarOffset(
  previous: number,
  delta: number,
  bounds: ReturnType<typeof sidebarBounds>,
) {
  return Math.max(bounds.bottom, Math.min(bounds.top, previous - delta))
}
