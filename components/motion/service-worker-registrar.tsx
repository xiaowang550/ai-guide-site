'use client'
import { useEffect, useState } from 'react'

/** Offline public reading; updates only activate after the visitor clicks refresh. */
export function ServiceWorkerRegistrar() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      !('serviceWorker' in navigator) ||
      !window.isSecureContext
    )
      return
    let disposed = false
    let registration: ServiceWorkerRegistration | undefined
    let watched: ServiceWorker | null = null
    let refreshing = false
    const stateChanged = () => {
      if (!disposed && registration?.waiting && navigator.serviceWorker.controller)
        setWaiting(registration.waiting)
    }
    const found = () => {
      watched?.removeEventListener('statechange', stateChanged)
      watched = registration?.installing ?? null
      watched?.addEventListener('statechange', stateChanged)
    }
    const cacheLoadedResources = () => {
      const urls = performance
        .getEntriesByType('resource')
        .map((resource) => resource.name)
        .filter((value) => {
          const url = new URL(value)
          return (
            url.origin === location.origin &&
            (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/brand/'))
          )
        })
      navigator.serviceWorker.controller?.postMessage({ type: 'CACHE_PUBLIC_RESOURCES', urls })
    }
    const controllerChanged = () => {
      if (refreshing) window.location.reload()
      else if (!disposed) cacheLoadedResources()
    }
    const activate = () => {
      refreshing = true
    }
    navigator.serviceWorker.addEventListener('controllerchange', controllerChanged)
    window.addEventListener('zhiya:refresh', activate)
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        })
        if (disposed) return
        stateChanged()
        registration.addEventListener('updatefound', found)
        found()
        void navigator.serviceWorker.ready.then(() => {
          if (!disposed) cacheLoadedResources()
        })
      } catch {
        /* Offline support is optional. */
      }
    }
    let timer: ReturnType<typeof setTimeout> | undefined
    const afterLoad = () => {
      timer = setTimeout(() => void register(), 2000)
    }
    if (document.readyState === 'complete') afterLoad()
    else window.addEventListener('load', afterLoad, { once: true })
    return () => {
      disposed = true
      clearTimeout(timer)
      window.removeEventListener('load', afterLoad)
      watched?.removeEventListener('statechange', stateChanged)
      registration?.removeEventListener('updatefound', found)
      navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged)
      window.removeEventListener('zhiya:refresh', activate)
    }
  }, [])
  return waiting ? (
    <div className="sw-update-notice" role="status">
      <span>新版本已准备好</span>
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new Event('zhiya:refresh'))
          waiting.postMessage({ type: 'SKIP_WAITING' })
        }}
      >
        刷新更新
      </button>
      <button type="button" onClick={() => setWaiting(null)} aria-label="稍后更新">
        稍后
      </button>
    </div>
  ) : null
}
