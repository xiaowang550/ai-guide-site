import { siteConfig } from '@/lib/site'

export function BrandMark({ full = false }: { full?: boolean }) {
  return (
    <picture className={full ? 'brand-identity brand-identity-full' : 'brand-identity'}>
      <source
        media={full ? undefined : '(min-width: 1280px)'}
        srcSet="/brand/zhiya-wordmark-v1.webp"
      />
      {/* picture 按屏幕只加载一个 Logo，首屏优先显示 */}
      <img
        src="/brand/sprout-mark-v3.webp"
        alt={siteConfig.name}
        width={64}
        height={64}
        fetchPriority="high"
      />
    </picture>
  )
}
