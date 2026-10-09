'use client'
import type { ReactNode } from 'react'
import { useSiteModules } from './site-module-context'
import { CustomModuleContent } from './module-content'
import { homeCandidates, layoutOf, orderedIds } from '@/lib/site-layout'
export function HomeLayout({ sections }: { sections: { id: string; content: ReactNode }[] }) {
  const { config, preview } = useSiteModules()
  const layout = layoutOf(config)
  return (
    <div className="home-layout">
      {orderedIds(layout.home, homeCandidates(config.modules))
        .filter((id) => !layout.hiddenHome.includes(id))
        .filter(
          (id) =>
            preview ||
            !['tools', 'guides', 'school', 'news'].includes(id) ||
            config.modules.some((module) => module.id === id && module.enabled),
        )
        .map((id) => {
          const section = sections.find((item) => item.id === id)
          const custom = config.modules.find(
            (module) =>
              module.id === id &&
              module.kind !== 'builtin' &&
              module.home &&
              (preview || module.enabled),
          )
          if (!section && !custom) return null
          return (
            <div
              key={id}
              data-home-section={id}
              className={id === 'hero' ? '' : custom ? 'container py-10 sm:py-12' : 'container'}
            >
              {section?.content ?? (custom && <CustomModuleContent module={custom} />)}
            </div>
          )
        })}
    </div>
  )
}
