import { megaNav, schoolNavigation, type NavItem } from './site'
import { moduleHref, moduleForPath, pathEnabled, type PublicSiteConfig } from './site-modules'
import { layoutOf, orderedIds } from './site-modules'
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
      if (!entry?.enabled) return []
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
