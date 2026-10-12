import { megaNav, schoolNavigation, type NavItem } from './site'
import {
  moduleHref,
  moduleForPath,
  pathEnabled,
  moduleAudience,
  type PublicSiteConfig,
} from './site-modules'
import { layoutOf, orderedIds } from './site-modules'

/** 以最具体的子页确定所属栏目，避免 /learn/access 同时误选知识库。 */
export function activeNavigationHref(pathname: string, items: readonly NavItem[]): string | null {
  const clean = (value: string) => value.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  const path = clean(pathname)
  const routeModule = moduleForPath(path)
  let active: string | null = null,
    score = -1
  for (const item of items) {
    for (const href of [item.href, ...(item.children ?? []).map((child) => child.href)]) {
      if (href.startsWith('#') || href.includes('?')) continue
      const target = clean(href)
      if (path !== target && (target === '/' || !path.startsWith(`${target}/`))) continue
      if (
        href === item.href &&
        routeModule &&
        moduleForPath(target) &&
        routeModule !== moduleForPath(target)
      )
        continue
      const rank = target.length * 2 + Number(href === item.href)
      if (rank > score) {
        active = item.href
        score = rank
      }
    }
  }
  return active
}
export function siteNavigation(config: PublicSiteConfig): NavItem[] {
  const layout = layoutOf(config)
  const catalog = [...megaNav, schoolNavigation]
  return orderedIds(layout.navigation, [
    { id: 'home' },
    ...config.modules.filter((item) => item.kind === 'builtin' || item.navigation),
  ])
    .filter((id) => !layout.hiddenNavigation.includes(id))
    .flatMap((id) => {
      if (id === 'home') return [megaNav.find((item) => item.href === '/')!]
      const entry = config.modules.find((item) => item.id === id)
      if (!entry?.enabled || moduleAudience(entry) === 'school') return []
      const href = moduleHref(entry)
      if (!pathEnabled(config, href)) return []
      return [
        catalog.find((item) => moduleForPath(item.href) === id) ?? {
          href,
          label: entry.title,
          hint: entry.description,
        },
      ]
    })
}
