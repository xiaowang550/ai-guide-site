'use client'
import { lazy, Suspense, type ReactNode } from 'react'
import { useSiteModules } from './site-module-context'
const Content = lazy(() => import('./region-content'))
import type { PageRegion } from '@/lib/site-modules'

export function RegionContent({ region }: { region: PageRegion }) {
  return (
    <Suspense
      fallback={
        <p className="p-4 text-sm text-muted-foreground" role="status">
          正在加载内容…
        </p>
      }
    >
      <Content region={region} />
    </Suspense>
  )
}

/** Native controls stay mounted in their own section; extra content uses the same editor. */
export function PageRegions({
  moduleId,
  sections,
  className,
}: {
  moduleId: string
  sections: { id: string; content: ReactNode }[]
  className?: string
}) {
  const { config } = useSiteModules()
  const configured = config.modules.find((module) => module.id === moduleId)?.regions ?? []
  const ids = [
    ...configured.map((region) => region.id),
    ...sections
      .map((section) => section.id)
      .filter((id) => !configured.some((region) => region.id === id)),
  ]
  return (
    <div className={className} data-managed-page={moduleId}>
      {ids.map((id) => {
        const region = configured.find((item) => item.id === id)
        if (region && (!region.enabled || region.deleted)) return null
        const native = sections.find((item) => item.id === id)
        if (!native && (!region || region.kind === 'native')) return null
        return (
          <div key={id} data-page-region={id}>
            {region?.blocks !== undefined ? <RegionContent region={region} /> : native?.content}
          </div>
        )
      })}
    </div>
  )
}

export function RegionSlot({
  moduleId,
  id,
  children,
}: {
  moduleId: string
  id: string
  children: ReactNode
}) {
  const { config } = useSiteModules()
  const region = config.modules
    .find((module) => module.id === moduleId)
    ?.regions?.find((item) => item.id === id)
  if (region && (!region.enabled || region.deleted)) return null
  return region?.blocks !== undefined ? <RegionContent region={region} /> : <>{children}</>
}
