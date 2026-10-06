'use client'

import { useEffect } from 'react'

/**
 * 注册 Service Worker（离线能力）。
 *
 * 两个刻意的选择：
 * 1) **只在生产构建注册**：开发时注册会让缓存干扰热更新，越改越难调试。
 * 2) **失败不影响页面**：浏览器不支持、HTTP 环境（非 localhost）、
 *    用户屏蔽注册时静默跳过 —— 离线只是增强，不能成为使用门槛。
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    // 注册需要同源且安全上下文：localhost 或 https
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    if (!isLocal && window.location.protocol !== 'https:') return

    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        /* 注册失败不影响使用 */
      })
    }

    // 页面完全空闲后再注册，不与首屏资源争带宽
    if ('requestIdleCallback' in window) {
      ;(window as unknown as { requestIdleCallback: (cb: () => void, o?: object) => void })
        .requestIdleCallback(register)
    } else {
      setTimeout(register, 2000)
    }
  }, [])

  return null
}