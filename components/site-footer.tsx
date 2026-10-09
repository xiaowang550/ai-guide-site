import { siteConfig } from '@/lib/site'
import { latestUpdatedAt } from '@/lib/score'
import { tools } from '@/data'
import { FooterLinks } from './site-footer-links'

export function SiteFooter() {
  const updated = latestUpdatedAt(tools)
  return (
    <footer className="mt-14 border-t border-border/70 bg-accent/25">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <p className="text-sm font-semibold">{siteConfig.name}</p>
            <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              用清晰的能力地图和实用方法， 把 AI 变成日常学习与工作里顺手的工具。
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              全站数据最后更新于 {updated.slice(0, 10)} · 资讯定期同步，价格与版本以官方为准
            </p>
          </div>

          <FooterLinks />
        </div>

        <div className="mt-6 flex flex-col gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>本站为独立编辑的第三方指南，不隶属于任何 AI 厂商；所有商标归各自权利人所有。</p>
          <p>评分方法与勘误入口见 /about</p>
        </div>
      </div>
    </footer>
  )
}
