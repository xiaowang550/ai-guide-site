'use client'
import type { PublicSiteConfig } from '@/lib/site-modules'
export function DesignSettings({
  config: _config,
  onChange: _onChange,
}: {
  config: PublicSiteConfig | null
  onChange: (c: PublicSiteConfig) => void
}) {
  void _config
  void _onChange
  return (
    <section className="admin-card p-6" aria-labelledby="design-settings-title">
      <p className="text-xs text-primary">XIAN / DESIGN SYSTEM</p>
      <h2 id="design-settings-title" className="mt-3 text-xl font-semibold">
        弦域 · 当前界面
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        网页、教师空间和管理工作台使用同一套视觉系统。页面区块与内容仍可在模块管理中调整。
      </p>
      <div className="mt-5 flex flex-wrap gap-5 text-sm text-primary">
        <a href="/" target="_blank" rel="noreferrer">
          打开网站 ↗
        </a>
        <a href="/edu/" target="_blank" rel="noreferrer">
          教师空间 ↗
        </a>
        <a href="/admin/?tab=modules">管理页面内容 →</a>
      </div>
    </section>
  )
}
