'use client'
import { useSiteModules } from '@/components/site-module-context'
import { CustomModuleContent } from '@/components/module-content'
import { moduleAudience } from '@/lib/site-modules'
export function SchoolHomeModules() {
  const { config, preview } = useSiteModules()
  return (
    <div className="container space-y-10 py-7">
      {config.modules
        .filter(
          (m) =>
            m.kind !== 'builtin' &&
            moduleAudience(m) === 'school' &&
            m.home &&
            (m.enabled || preview),
        )
        .map((m) => (
          <CustomModuleContent key={m.id} module={m} />
        ))}
    </div>
  )
}
