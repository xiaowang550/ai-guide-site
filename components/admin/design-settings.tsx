'use client'
import { useState } from 'react'
import { apiSend } from './api-client'
import type { PublicSiteConfig } from '@/lib/site-modules'
type Design = NonNullable<PublicSiteConfig['features']['design']>
const editions: { id: Design; name: string; note: string }[] = [
  { id: 'classic', name: '原版 · 小芽', note: '保留现有布局、插画和文字。' },
  { id: 'studio', name: '清晰 · 工作台', note: '紧凑导航，任务优先，低干扰配色。' },
  { id: 'editorial', name: '留白 · 阅读版', note: '纸感底色，分栏阅读，清楚的内容层级。' },
]
export function DesignSettings({
  config,
  onChange,
}: {
  config: PublicSiteConfig | null
  onChange: (c: PublicSiteConfig) => void
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  async function choose(design: Design) {
    if (!config || busy) return
    setBusy(true)
    setMessage('')
    try {
      const features = await apiSend<PublicSiteConfig['features']>(
        '/api/admin/site-settings',
        'PATCH',
        { design },
      )
      onChange({ ...config, features })
      window.dispatchEvent(new CustomEvent('zhiya:design', { detail: design }))
      setMessage('已应用。网页、教师端和后台刷新后使用此方案。')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="admin-card design-settings" aria-labelledby="design-settings-title">
      <div>
        <h2 id="design-settings-title">界面方案</h2>
        <p>三个端一起切换。原版保留，随时可切回。</p>
      </div>
      <div className="design-options">
        {editions.map((d) => (
          <article key={d.id} data-edition={d.id} className="design-option">
            <div className="design-thumbnail" aria-hidden="true">
              <i />
              <div>
                <b />
                <span />
                <span />
                <span />
              </div>
            </div>
            <h3>{d.name}</h3>
            <p>{d.note}</p>
            <div className="design-preview-links">
              {[
                ['/', '网页'],
                ['/edu/', '教师端'],
                ['/admin/', '后台'],
              ].map(([url, label]) => (
                <a key={url} href={`${url}?design-preview=${d.id}`} target="_blank" rel="noopener">
                  预览{label} ↗
                </a>
              ))}
            </div>
            <button
              type="button"
              disabled={!config || busy || (config.features.design ?? 'classic') === d.id}
              onClick={() => void choose(d.id)}
            >
              {(config?.features.design ?? 'classic') === d.id
                ? '当前方案'
                : busy
                  ? '正在保存…'
                  : '应用到三个端'}
            </button>
          </article>
        ))}
      </div>
      <p role="status">{message}</p>
      <style>{`.design-settings{padding:24px}.design-settings h2{font-size:20px}.design-settings p{color:hsl(var(--muted-foreground));font-size:13px;margin:8px 0;line-height:1.7}.design-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:24px}.design-option{border:1px solid hsl(var(--border));border-radius:12px;padding:16px;min-width:0}.design-option h3{margin-top:16px;font-size:16px}.design-thumbnail{height:130px;background:#edf5ef;border:1px solid #dce3df;border-radius:6px;display:flex;gap:10px;padding:12px}.design-thumbnail i{width:20%;background:#d4e5da;border-radius:4px}.design-thumbnail>div{flex:1;display:flex;flex-wrap:wrap;gap:8px}.design-thumbnail b{width:100%;height:24px;background:#476c59;border-radius:4px}.design-thumbnail span{flex:1;background:white;border-radius:6px}.design-option[data-edition=editorial] .design-thumbnail{background:#f4efe5;display:block}.design-option[data-edition=editorial] .design-thumbnail i{display:block;width:100%;height:8px;background:#373d32;margin-bottom:14px}.design-option[data-edition=editorial] .design-thumbnail b{background:#d8d1c1}.design-option[data-edition=editorial] .design-thumbnail span{height:55px;border-radius:0}.design-option[data-edition=classic] .design-thumbnail{background:radial-gradient(circle,#d5ead9,#fafcf9)}.design-option[data-edition=classic] .design-thumbnail i{border-radius:50%;width:40%;height:90px}.design-preview-links{display:flex;flex-wrap:wrap;gap:10px;font-size:12px;margin:14px 0}.design-preview-links a{color:hsl(var(--primary));text-decoration:underline;text-underline-offset:3px}.design-option button{width:100%;padding:12px;border-radius:7px;background:hsl(var(--primary));color:hsl(var(--primary-foreground));font-size:13px}.design-option button:disabled{opacity:.55}@media(max-width:900px){.design-options{grid-template-columns:1fr}.design-thumbnail{height:100px}}`}</style>
    </section>
  )
}
