import { siteConfig } from '@/lib/site'

export function BrandMark({ full = false }: { full?: boolean }) {
  return (
    <span className={full ? 'xian-brand xian-brand-full' : 'xian-brand'}>
      {/* eslint-disable-next-line @next/next/no-img-element -- compact code-native SVG identity */}
      <img
        src="/brand/xian/logo.svg"
        alt={siteConfig.name}
        width={150}
        height={38}
        fetchPriority="high"
      />
    </span>
  )
}
