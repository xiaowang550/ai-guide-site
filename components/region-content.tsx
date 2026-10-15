'use client'
import { CustomModuleContent } from './module-content'
import type { PageRegion } from '@/lib/site-modules'
export default function RegionContent({ region }: { region: PageRegion }) {
  return (
    <div className="managed-region-content">
      <CustomModuleContent
        module={{
          ...region,
          kind:
            region.kind === 'native'
              ? region.id === 'selection'
                ? 'steps'
                : 'cards'
              : region.kind,
          blocks: region.blocks ?? [],
          home: false,
          navigation: false,
          order: 0,
          version: 1,
          updatedAt: '',
        }}
      />
    </div>
  )
}
