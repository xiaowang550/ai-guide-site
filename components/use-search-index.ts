'use client'

import { useEffect, useState, useMemo } from 'react'
import { useSiteModules } from './site-module-context'
import { pathEnabled, moduleHref } from '@/lib/site-modules'
import type { SearchDoc } from '@/data/types'
import type { SearchDocWithWeight } from '@/lib/search'

/**
 * 全站搜索索引：按需加载 + 会话内缓存。
 *
 * 索引不再由 layout 作为 props 传进每个页面（那会让每页 HTML 都多十几 KB），
 * 改成用户第一次触发搜索时才请求 /search-index.json。
 *
 * - 模块级缓存：整个会话只请求一次
 * - 失败兜底：请求失败时返回空索引，UI 给出提示而不是崩溃或白屏
 */
type IndexState = 'idle' | 'loading' | 'ready' | 'error'

const ENDPOINT = '/search-index.json'

let cache: SearchDocWithWeight[] | null = null
let inflight: Promise<SearchDocWithWeight[]> | null = null

export function useSearchIndex(enabled: boolean): {
  docs: SearchDocWithWeight[]
  state: IndexState
} {
  const { config } = useSiteModules()
  const [docs, setDocs] = useState<SearchDocWithWeight[]>(cache ?? [])
  const [state, setState] = useState<IndexState>(cache ? 'ready' : 'idle')

  useEffect(() => {
    if (!enabled) return
    if (cache) {
      setDocs(cache)
      setState('ready')
      return
    }

    if (!inflight) {
      setState('loading')
      inflight = fetch(ENDPOINT, { cache: 'no-store' })
        .then((r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json() as Promise<SearchDoc[]>
        })
        .then((data) => {
          cache = data
          inflight = null
          return data
        })
        .catch(() => {
          inflight = null
          throw new Error('搜索索引加载失败')
        })
    }

    let alive = true
    inflight
      .then((data) => {
        if (!alive) return
        setDocs(data)
        setState('ready')
      })
      .catch(() => {
        if (!alive) return
        setState('error')
      })

    return () => {
      alive = false
    }
  }, [enabled])

  const visibleDocs = useMemo(
    () => [
      ...docs.filter((doc) => pathEnabled(config, doc.href)),
      ...config.modules
        .filter((module) => module.kind !== 'builtin' && module.enabled)
        .map((module) => ({
          id: `module-${module.id}`,
          type: 'module' as const,
          title: module.title,
          summary: module.description,
          href: moduleHref(module),
          keywords: [module.title, ...module.blocks.map((block) => block.title)],
          tags: [],
        })),
    ],
    [docs, config],
  )
  return { docs: visibleDocs, state }
}

/** 搜索页专用：一进入就加载 */
export function useSearchIndexEager(): { docs: SearchDocWithWeight[]; state: IndexState } {
  return useSearchIndex(true)
}
