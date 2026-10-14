import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { loadPublicSite } from '@/lib/public-site-client'
import { DEFAULT_SITE_CONFIG } from '@/lib/site-modules'

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('window', { addEventListener() {} })
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('公开配置加载', () => {
  it('合并同时发起的请求，刷新时重新取数据', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(DEFAULT_SITE_CONFIG)))
    vi.stubGlobal('fetch', fetcher)
    const first = loadPublicSite()
    expect(loadPublicSite()).toBe(first)
    expect(await first).toEqual(DEFAULT_SITE_CONFIG)
    expect(fetcher).toHaveBeenCalledTimes(1)
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ ...DEFAULT_SITE_CONFIG, revision: 'new' })),
    )
    expect((await loadPublicSite())?.revision).toBe('new')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('模板脚本和 React 初始化共用一次响应，后续刷新不使用旧数据', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(DEFAULT_SITE_CONFIG)))
    vi.stubGlobal('fetch', fetcher)
    runInNewContext(readFileSync('public/design/runtime-v2.js', 'utf8'), {
      window,
      document: {
        documentElement: {
          dataset: {},
          style: {},
          classList: { toggle() {}, contains: () => false },
        },
        getElementById: () => null,
        addEventListener() {},
      },
      localStorage: { getItem: () => null, setItem() {} },
      location: { search: '' },
      URLSearchParams,
      AbortController,
      setTimeout,
      clearTimeout,
      fetch: fetcher,
    })
    expect(await loadPublicSite(true)).toEqual(DEFAULT_SITE_CONFIG)
    expect(fetcher).toHaveBeenCalledTimes(1)
    fetcher.mockResolvedValue(
      new Response(JSON.stringify({ ...DEFAULT_SITE_CONFIG, revision: 'changed' })),
    )
    expect((await loadPublicSite())?.revision).toBe('changed')
    expect(fetcher).toHaveBeenCalledTimes(2)
  })

  it('连接超时后允许重试，不留下永久在途请求', async () => {
    const fetcher = vi.fn(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new Error('timeout')))
        }),
    )
    vi.stubGlobal('fetch', fetcher)
    const pending = loadPublicSite()
    await vi.advanceTimersByTimeAsync(8000)
    expect(await pending).toBeNull()
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify(DEFAULT_SITE_CONFIG)))
    expect(await loadPublicSite()).toEqual(DEFAULT_SITE_CONFIG)
  })
})
