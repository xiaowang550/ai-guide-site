import Link from 'next/link'
import { primaryNav, secondaryNav, siteConfig } from '@/lib/site'
import { CAPABILITY_META } from '@/lib/score'
import { latestUpdatedAt } from '@/lib/score'
import { tools } from '@/data'

export function SiteFooter() {
  const updated = latestUpdatedAt(tools)
  return (
    <footer className="mt-20 border-t bg-muted/30">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-sm font-semibold">{siteConfig.name}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              {siteConfig.description}
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              全站数据最后更新于 {updated.slice(0, 10)}（本站不实时同步厂商信息，请以工具官方页面为准）
            </p>
          </div>

          <nav aria-label="页脚主导航">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              主导航
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="页脚次级导航">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              更多
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {secondaryNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-8 border-t pt-5">
          <p className="text-xs text-muted-foreground">评分维度（14 项，全站统一口径）</p>
          <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            {CAPABILITY_META.map((c) => (
              <li key={c.key}>{c.label}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            本站为独立编辑的第三方指南，不隶属于任何 AI 厂商；所有商标归各自权利人所有。
          </p>
          <p>评分方法与勘误入口见 /about</p>
        </div>
      </div>
    </footer>
  )
}