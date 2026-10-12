'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { SiteContext } from '@/components/site-module-context'
import {
  builtinModules,
  DEFAULT_SITE_CONFIG,
  MODULE_POLL_MS,
  SITE_SYNC_CHANNEL,
  type PublicSiteConfig,
} from '@/lib/site-modules'
const AssistantDock = dynamic(
  () => import('@/components/assistant/assistant-dock').then((m) => m.AssistantDock),
  { ssr: false },
)
const PreviewControls = dynamic(
  () => import('@/components/module-preview-controls').then((m) => m.PreviewControls),
  { ssr: false },
)
/** School-only fetching stays out of the public site's first load. */
export function SchoolProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PublicSiteConfig>({
      ...DEFAULT_SITE_CONFIG,
      modules: builtinModules,
    }),
    [ready, setReady] = useState(false),
    [preview, setPreview] = useState(false)
  useEffect(() => {
    let active = true,
      previewMode = new URLSearchParams(location.search).get('admin-preview') === '1'
    async function refresh() {
      try {
        let r = await fetch(previewMode ? '/api/admin/modules' : '/api/school/config', {
          credentials: 'same-origin',
          cache: 'no-store',
        })
        if (previewMode && r.status === 401) {
          previewMode = false
          r = await fetch('/api/school/config', { credentials: 'same-origin', cache: 'no-store' })
        }
        if (r.status === 401) {
          location.replace(
            '/school/login/?next=' + encodeURIComponent(location.pathname + location.search),
          )
          return
        }
        if (!r.ok) return
        const next = (await r.json()) as PublicSiteConfig
        if (active) {
          setConfig(next)
          setReady(true)
          setPreview(previewMode)
        }
      } catch {
        /* Retry on focus or the next poll. */
      }
    }
    const visible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    void refresh()
    const timer = setInterval(visible, MODULE_POLL_MS)
    const channel =
      typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(SITE_SYNC_CHANNEL)
    if (channel) channel.onmessage = visible
    const onMessage = (e: MessageEvent) => {
      if (e.origin === location.origin && e.data?.type === 'site-modules-refresh') void refresh()
    }
    window.addEventListener('focus', visible)
    document.addEventListener('visibilitychange', visible)
    window.addEventListener('message', onMessage)
    return () => {
      active = false
      clearInterval(timer)
      channel?.close()
      window.removeEventListener('focus', visible)
      document.removeEventListener('visibilitychange', visible)
      window.removeEventListener('message', onMessage)
    }
  }, [])
  return (
    <SiteContext.Provider
      value={{
        config,
        ready,
        preview,
        refresh: async () => {
          window.dispatchEvent(new Event('focus'))
        },
      }}
    >
      {children}
      {preview && <PreviewControls />}
      {config.features.assistant && <AssistantDock />}
    </SiteContext.Provider>
  )
}
