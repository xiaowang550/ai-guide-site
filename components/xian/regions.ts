import type { PublicSiteConfig } from '@/lib/site-modules'

/** A custom block replaces the native section, including its anchor and controls. */
export function hasNativeHomeRegion(config: PublicSiteConfig, id: string) {
  const region = config.modules
    .find((module) => module.id === 'home')
    ?.regions?.find((r) => r.id === id)
  return !region || (region.enabled && !region.deleted && region.blocks === undefined)
}
