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
