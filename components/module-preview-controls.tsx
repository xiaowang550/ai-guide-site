'use client'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { moduleForPath, type SiteModule } from '@/lib/site-modules'
import { useSiteModules } from './site-module-context'
export function PreviewControls() {
  const { config, preview, refresh } = useSiteModules(),
    pathname = usePathname(),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  const id = moduleForPath(pathname),
    customId =
      typeof window === 'undefined' ? null : new URLSearchParams(location.search).get('id'),
    current = config.modules.find((module) => module.id === (id ?? customId))
  if (!preview) return null
  async function toggle(module: SiteModule) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/modules/${module.id}`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !module.enabled, version: module.version }),
      })
      if (!response.ok) throw new Error((await response.json()).error)
      await refresh()
      window.parent.postMessage({ type: 'site-modules-changed' }, location.origin)
    } catch (error) {
      setError(error instanceof Error ? error.message : '更新失败')
    } finally {
      setBusy(false)
    }
  }
  return (
    <aside className="module-preview-controls" aria-label="管理员预览栏目开关">
      <span>管理员预览</span>
      {current ? (
        <button disabled={busy} onClick={() => void toggle(current)}>
          {current.enabled ? '关闭' : '开放'} {current.title}
        </button>
      ) : (
        <details>
          <summary>栏目开关</summary>
          {config.modules.map((module) => (
            <button disabled={busy} key={module.id} onClick={() => void toggle(module)}>
              {module.enabled ? '●' : '○'} {module.title}
            </button>
          ))}
        </details>
      )}
      {error && <p role="alert">{error}</p>}
    </aside>
  )
}
