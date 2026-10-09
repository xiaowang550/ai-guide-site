'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { DEFAULT_SITE_CONFIG, MODULE_POLL_MS, type PublicSiteConfig } from '@/lib/site-modules'
import { SiteContext } from './site-module-context'
import dynamic from 'next/dynamic'
const PreviewControls = dynamic(
  () => import('./module-preview-controls').then((m) => m.PreviewControls),
  { ssr: false },
)
const AssistantDock = dynamic(
  () => import('./assistant/assistant-dock').then((m) => m.AssistantDock),
  { ssr: false },
)
const GuidedTour = dynamic(() => import('./onboarding/guided-tour').then((m) => m.GuidedTour), {
  ssr: false,
})

export function SiteModulesProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState(DEFAULT_SITE_CONFIG),
    [ready, setReady] = useState(false),
    [preview, setPreview] = useState(false)
  const active = useRef(true),
    previewMode = useRef(false)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(previewMode.current ? '/api/admin/modules' : '/api/site', {
        cache: 'no-store',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        if (previewMode.current) {
          previewMode.current = false
          setPreview(false)
          const publicResponse = await fetch('/api/site', { cache: 'no-store' })
          if (publicResponse.ok && active.current) setConfig(await publicResponse.json())
        }
        return
      }
      const next = (await response.json()) as PublicSiteConfig
      if (active.current) {
        setConfig(next)
        setReady(true)
        setPreview(previewMode.current)
      }
    } catch {
      /* 保留最近一次成功的配置，网络恢复后重试。 */
    }
  }, [])
  useEffect(() => {
    active.current = true
    previewMode.current = new URLSearchParams(location.search).get('admin-preview') === '1'
    void refresh()
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh()
    }, MODULE_POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    const onMessage = (event: MessageEvent) => {
      if (event.origin === location.origin && event.data?.type === 'site-modules-refresh')
        void refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('message', onMessage)
    const onPreviewNavigation = (event: MouseEvent) => {
      if (
        !previewMode.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const anchor = (event.target as Element)?.closest?.('a')
      if (!anchor || anchor.target || anchor.hasAttribute('download')) return
      const target = new URL(anchor.href, location.href)
      if (
        target.origin !== location.origin ||
        target.pathname.startsWith('/admin') ||
        (target.hash && target.pathname === location.pathname)
      )
        return
      event.preventDefault()
      event.stopPropagation()
      target.searchParams.set('admin-preview', '1')
      location.assign(target.href)
    }
    document.addEventListener('click', onPreviewNavigation, true)
    return () => {
      active.current = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('message', onMessage)
      document.removeEventListener('click', onPreviewNavigation, true)
    }
  }, [refresh])
  return (
    <SiteContext.Provider value={{ config, ready, preview, refresh }}>
      {children}
      {preview && <PreviewControls />}
      {config.features.assistant && <AssistantDock />}
      {ready && config.features.onboarding && <GuidedTour />}
    </SiteContext.Provider>
  )
}
