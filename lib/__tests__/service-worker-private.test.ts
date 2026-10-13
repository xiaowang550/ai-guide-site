import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

/** 执行真正的 worker fetch 监听器，检查是否拦截敏感请求。 */
function intercepts(path: string, cache = 'default', mode = 'cors'): boolean {
  let listener: ((event: unknown) => void) | undefined
  runInNewContext(readFileSync('public/sw.js', 'utf8'), {
    URL,
    self: {
      location: { origin: 'https://site.test' },
      addEventListener: (name: string, fn: typeof listener) => {
        if (name === 'fetch') listener = fn
      },
    },
    caches: { match: async () => undefined },
    fetch: async () => ({ ok: false }),
  })
  let intercepted = false
  listener!({
    request: {
      method: 'GET',
      url: `https://site.test${path}`,
      cache,
      mode,
      headers: new Headers(),
    },
    respondWith: () => {
      intercepted = true
    },
  })
  return intercepted
}

describe('管理数据不进入离线缓存', () => {
  it('会话、统计、内容接口和后台页面全部直接走网络', () => {
    for (const path of [
      '/api/admin/session',
      '/api/admin/analytics?period=7d',
      '/api/admin/content',
      '/api/content/published',
      '/admin',
      '/admin/',
      '/edu/',
      '/edu/toolkits/highschool-ai.txt',
      '/school/login/',
      '/api/school/session',
    ])
      expect(intercepts(path), path).toBe(false)
  })
  it('no-store 请求和 React Server Component 请求不使用缓存', () => {
    expect(intercepts('/tools/', 'no-store')).toBe(false)
    expect(intercepts('/tools/?_rsc=abc')).toBe(false)
  })
  it('公开导航和带 hash 的静态文件继续提供离线缓存', () => {
    expect(intercepts('/tools/', 'default', 'navigate')).toBe(true)
    expect(intercepts('/_next/static/chunks/test.js')).toBe(true)
  })
})

describe('离线资源与版本切换', () => {
  function worker() {
    type WorkerEvent = {
      waitUntil: (pending: Promise<unknown>) => void
      respondWith: (pending: Promise<unknown>) => void
      [key: string]: unknown
    }
    const listeners: Record<string, (event: WorkerEvent) => void> = {}
    const written: string[] = [],
      removed: string[] = []
    let skipped = 0
    const html =
      '<script src="/_next/static/chunks/app.js"></script><link href="/_next/static/css/site.css"><script src="https://other.test/file.js"></script><a href="/api/admin/session">私人接口</a>'
    runInNewContext(readFileSync('public/sw.js', 'utf8'), {
      URL,
      Response,
      self: {
        location: { origin: 'https://site.test' },
        addEventListener: (name: string, fn: (event: WorkerEvent) => void) => {
          listeners[name] = fn
        },
        skipWaiting: async () => {
          skipped++
        },
        clients: { claim: async () => {} },
      },
      caches: {
        match: async () => undefined,
        keys: async () => ['ai-map-pages-v6', 'ai-map-static-v7', 'another-app-cache'],
        delete: async (name: string) => {
          removed.push(name)
        },
        open: async () => ({
          addAll: async () => {},
          match: async () => new Response(html),
          add: async (asset: string) => {
            written.push(asset)
          },
          put: async (request: Request) => {
            written.push(request.url)
          },
        }),
      },
      fetch: async () =>
        new Response('private content', { headers: { 'Cache-Control': 'private, no-store' } }),
    })
    const run = async (name: string, extras = {}) => {
      const pending: Promise<unknown>[] = []
      listeners[name]({
        waitUntil: (p: Promise<unknown>) => pending.push(p),
        respondWith: (p: Promise<unknown>) => pending.push(p),
        ...extras,
      })
      await Promise.all(pending)
    }
    return { run, written, removed, skipped: () => skipped }
  }
  it('首次安装补齐首页和离线页依赖，不预缓存接口或外域资源', async () => {
    const sw = worker()
    await sw.run('install')
    expect(sw.written).toContain('https://site.test/_next/static/chunks/app.js')
    expect(sw.written).toContain('https://site.test/_next/static/css/site.css')
    expect(
      sw.written.some((asset) => asset.includes('/api/') || asset.includes('other.test')),
    ).toBe(false)
    expect(sw.skipped()).toBe(0)
  })
  it('只在明确刷新消息后启用等待版本', async () => {
    const sw = worker()
    await sw.run('message', { data: { type: 'OTHER' } })
    expect(sw.skipped()).toBe(0)
    await sw.run('message', { data: { type: 'SKIP_WAITING' } })
    expect(sw.skipped()).toBe(1)
  })
  it('仅清理本站旧缓存，保留其他应用缓存', async () => {
    const sw = worker()
    await sw.run('activate')
    expect(sw.removed).toEqual(['ai-map-pages-v6'])
  })
  it('补齐已加载资源时只接受本站静态脚本和品牌图片', async () => {
    const sw = worker()
    await sw.run('message', {
      data: {
        type: 'CACHE_PUBLIC_RESOURCES',
        urls: [
          '/api/admin/session',
          '/edu/',
          'https://other.test/file.js',
          '/_next/static/chunks/mobile.js',
          '/brand/sprout-mark-v3.webp',
        ],
      },
    })
    expect(sw.written).toEqual([
      'https://site.test/_next/static/chunks/mobile.js',
      'https://site.test/brand/sprout-mark-v3.webp',
    ])
  })
  it('带 private 或 no-store 响应即使来自公开路径也不保存', async () => {
    const sw = worker()
    await sw.run('fetch', {
      request: {
        method: 'GET',
        url: 'https://site.test/tools/',
        headers: new Headers(),
        mode: 'navigate',
      },
    })
    expect(sw.written).toEqual([])
  })
})
