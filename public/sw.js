/**
 * Service Worker：让站点在无网络时也能打开已访问过的页面。
 *
 * 策略取舍（内容站最重要的是"新内容要能看到"）：
 *   - HTML / 页面请求：network-first —— 有网永远拿最新的，没网才回退到缓存
 *   - /_next/static/**：cache-first —— 文件名带 hash，内容不会变，可以放心长期缓存
 *   - JSON（索引类）：stale-while-revalidate —— 先用缓存秒开，再后台更新
 *
 * 版本更新：改动本文件后请把 CACHE_VERSION 加一，
 * activate 时会自动清掉旧版本缓存，避免用户卡在旧资源上。
 */

const CACHE_VERSION = 'v1'
const STATIC_CACHE = `ai-map-static-${CACHE_VERSION}`
const PAGES_CACHE = `ai-map-pages-${CACHE_VERSION}`

/** 离线时兜底的页面（静态导出下路径固定） */
const OFFLINE_URL = '/offline/'

/** 安装时预缓存：离线兜底页 + 首页 */
const PRECACHE = [OFFLINE_URL, '/']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {
        /* 预缓存失败不阻塞安装 */
      })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGES_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // 只处理同源请求；跨域（例如 GitHub API）直接走网络
  if (url.origin !== self.location.origin) return

  // 1) 带 hash 的静态资源：内容不变，缓存优先
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            }
            return response
          })
          .catch(() => cached ?? Response.error())
      })
    )
    return
  }

  // 2) 页面导航：先网络，失败回退缓存，再失败给离线页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const offline = await caches.match(OFFLINE_URL)
          if (offline) return offline
          return new Response('<h1>离线</h1><p>该页面尚未缓存。</p>', {
            status: 503,
            headers: { 'content-type': 'text/html; charset=utf-8' },
          })
        })
    )
    return
  }

  // 3) 其他同源 GET（JSON、图标）：先给缓存，后台更新
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
        .catch(() => cached ?? Response.error())
      return cached ?? network
    })
  )
})