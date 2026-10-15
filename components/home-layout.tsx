'use client'
import type { ReactNode } from 'react'
import { useSiteModules } from './site-module-context'
import { CustomModuleContent } from './module-content'
import { homeCandidates, layoutOf, orderedIds } from '@/lib/site-layout'
import { RegionContent, RegionSlot } from './page-regions'
export function HomeLayout({ sections }: { sections: { id: string; content: ReactNode }[] }) {
  const { config, preview } = useSiteModules()
  const layout = layoutOf(config)
  const regions = config.modules.find((module) => module.id === 'home')?.regions ?? []
  const base = orderedIds(layout.home, homeCandidates(config.modules))
  const ids = [
    ...regions.map((region) => region.id),
    ...base.filter((id) => !regions.some((region) => region.id === id)),
  ]
  return (
    <div className="home-layout">
      {ids
        .filter((id) => regions.some((region) => region.id === id) || !layout.hiddenHome.includes(id))
        .filter(
          (id) =>
            preview ||
            !['tools', 'guides', 'school', 'news'].includes(id) ||
            config.modules.some((module) => module.id === id && module.enabled),
        )
        .map((id) => {
          const region = regions.find((item) => item.id === id)
          if (region && (!region.enabled || region.deleted)) return null
          const section = sections.find((item) => item.id === id)
          const custom = config.modules.find(
            (module) =>
              module.id === id &&
              module.kind !== 'builtin' &&
              module.home &&
              (preview || module.enabled),
          )
          if (!section && !custom && (!region || region.kind === 'native')) return null
          return (
            <div
              key={id}
              data-home-section={id}
              data-region-edited={region?.blocks !== undefined}
              className={
                id === 'hero'
                  ? ''
                  : custom || (region && region.kind !== 'native')
                    ? 'container py-10 sm:py-12'
                    : 'container'
              }
            >
              {section ? (
                <RegionSlot moduleId="home" id={id}>
                  {section.content}
                </RegionSlot>
              ) : custom ? (
                <CustomModuleContent module={custom} />
              ) : (
                region && <RegionContent region={region} />
              )}
            </div>
          )
        })}
    </div>
  )
}
