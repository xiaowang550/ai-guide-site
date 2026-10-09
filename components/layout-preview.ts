import type { SiteLayout } from '@/lib/site-layout'
/** 仅已认证的同源管理员预览加载，不增加普通页面的校验代码。 */
export function applyLayoutPreview(value: unknown, apply: (layout: SiteLayout) => void) {
  const layout = value as SiteLayout | null
  if (
    layout &&
    ['navigation', 'home', 'hiddenNavigation', 'hiddenHome'].every((field) => {
      const ids = layout[field as 'navigation']
      return Array.isArray(ids) && ids.length <= 100 && ids.every((id) => typeof id === 'string')
    })
  )
    apply(layout)
}
