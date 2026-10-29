/* Public reading cache only. Authenticated pages and API responses never enter it. */
const CACHE_VERSION = 'v9'
const STATIC_CACHE = `ai-map-static-${CACHE_VERSION}`
const PAGES_CACHE = `ai-map-pages-${CACHE_VERSION}`
const OFFLINE_URL = '/offline/'
const PRECACHE = [OFFLINE_URL, '/']
function cacheable(response) {
  return response.ok && !/(?:private|no-store)/i.test(response.headers?.get('Cache-Control') ?? '')
}
async function remember(cacheName, request, response) {
  if (!cacheable(response)) return
  const copy = response.clone()
  const cache = await caches.open(cacheName)
  await cache.put(request, copy)
}
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES_CACHE)
      await pages.addAll(PRECACHE)
      // Registration follows the first render: save scripts/styles already loaded too.
      const assets = new Set([
        '/brand/xian/mark.svg',
        '/brand/xian/favicon.svg',
        '/brand/xian/logo.svg',
      ])
      for (const page of PRECACHE) {
        const html = await (await pages.match(page)).text()
        for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
          const url = new URL(match[1], self.location.origin)
          if (url.origin === self.location.origin && url.pathname.startsWith('/_next/static/'))
            assets.add(url.href)
        }
      }
      const resources = await caches.open(STATIC_CACHE)
      await Promise.allSettled([...assets].map((asset) => resources.add(asset)))
      // Updates wait for the visitor's refresh button, preserving unfinished forms.
    })().catch(() => {}),
  )
})
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(self.skipWaiting())
  if (event.data?.type === 'CACHE_PUBLIC_RESOURCES' && Array.isArray(event.data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(STATIC_CACHE)
        await Promise.allSettled(
          event.data.urls.slice(0, 64).map(async (value) => {
            const url = new URL(value, self.location.origin)
            if (
              url.origin === self.location.origin &&
              (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/brand/'))
            )
              await cache.add(url.href)
          }),
        )
      })().catch(() => {}),
    )
  }
})
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                /^ai-map-(?:static|pages)-/.test(key) &&
                key !== STATIC_CACHE &&
                key !== PAGES_CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname === '/admin' ||
    url.pathname.startsWith('/admin/') ||
    /^\/freshness(?:\/|$)/.test(url.pathname) ||
    /^\/edu(?:\/|\.|$)/.test(url.pathname) ||
    /^\/school(?:\/|$)/.test(url.pathname) ||
    url.searchParams.has('admin-preview') ||
    url.searchParams.has('design-preview') ||
    request.cache === 'no-store' ||
    request.headers.get('RSC') === '1' ||
    url.searchParams.has('_rsc')
  )
    return
  function save(cache, response) {
    const pending = remember(cache, request, response).catch(() => {})
    event.waitUntil?.(pending)
    return response
  }
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request)
            .then((response) => save(STATIC_CACHE, response))
            .catch(() => Response.error()),
      ),
    )
    return
  }
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => save(PAGES_CACHE, response))
        .catch(
          async () =>
            (await caches.match(request)) ??
            (await caches.match(OFFLINE_URL)) ??
            new Response('<h1>暂时离线</h1><p>请联网后重试，这个页面尚未缓存。</p>', {
              status: 503,
              headers: { 'content-type': 'text/html; charset=utf-8' },
            }),
        ),
    )
    return
  }
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => save(STATIC_CACHE, response))
        .catch(() => cached ?? Response.error())
      event.waitUntil?.(network.then(() => {}))
      return cached ?? network
    }),
  )
})
