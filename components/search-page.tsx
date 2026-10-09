'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X } from 'lucide-react'
import type { SearchDoc } from '@/data/types'
import { SEARCH_TYPE_LABELS, searchDocsByType } from '@/lib/search'
import { useSearchIndex } from '@/components/use-search-index'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/page-header'

const TYPES: (SearchDoc['type'] | 'all')[] = [
  'all',
  'news',
  'module',
  'tool',
  'program',
  'toolkit',
  'concept',
  'guide',
  'case',
  'path',
]

/** 搜索结果页：支持 ?q= 与类型筛选，逻辑与全局搜索共用同一个纯函数 */
export function SearchPageClient() {
  const { docs, state } = useSearchIndex(true)
  const [q, setQ] = useState('')
  const [type, setType] = useState<SearchDoc['type'] | 'all'>('all')

  // 静态导出：挂载后从地址栏读取 ?q=
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(location.search)
      setQ(params.get('q') ?? '')
      const type = params.get('type')
      setType(TYPES.includes(type as SearchDoc['type']) ? (type as SearchDoc['type']) : 'all')
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])

  const hits = useMemo(() => {
    return searchDocsByType(docs, q, type, 60)
  }, [docs, q, type])

  const grouped = useMemo(() => {
    const map: Partial<Record<SearchDoc['type'], typeof hits>> = {}
    for (const hit of hits) {
      ;(map[hit.doc.type] ||= []).push(hit)
    }
    return map
  }, [hits])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (type !== 'all') params.set('type', type)
    const url = `/search${params.toString() ? `?${params}` : ''}`
    if (location.pathname + location.search !== url) window.history.pushState(null, '', url)
  }

  return (
    <>
      <PageHeader
        title="搜索"
        description="全站聚合搜索：工具、概念、教程、案例、学习路径。也可以在任意页面按 / 快速唤起。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '搜索' }]}
      />

      <div className="container py-8">
        <form onSubmit={submit} className="flex flex-wrap gap-2">
          <div className="relative min-w-[240px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="输入关键词，例如：幻觉、PPT、免费、代码"
              className="h-11 w-full rounded-xl border bg-background pl-9 pr-10 text-sm"
              aria-label="搜索关键词"
              enterKeyHint="search"
            />
            {q && (
              <button
                type="button"
                aria-label="清除搜索关键词"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-primary"
                onClick={() => setQ('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            搜索
          </button>
        </form>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t)
                const params = new URLSearchParams(location.search)
                if (q.trim()) params.set('q', q.trim())
                else params.delete('q')
                if (t === 'all') params.delete('type')
                else params.set('type', t)
                window.history.replaceState(null, '', `/search${params.size ? '?' + params : ''}`)
              }}
              aria-pressed={type === t}
              className={cn(
                'rounded-full border px-3 py-1 text-xs transition-colors',
                type === t
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              {t === 'all' ? '全部' : SEARCH_TYPE_LABELS[t]}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-muted-foreground">
            {state === 'loading'
              ? '正在加载索引…'
              : state === 'error'
                ? '索引加载失败'
                : `${hits.length} 条结果`}
          </span>
        </div>

        {state === 'error' ? (
          <p className="mt-8 border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            搜索索引加载失败，请刷新页面重试。
          </p>
        ) : state === 'loading' ? (
          <p className="mt-8 border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            正在加载搜索索引…
          </p>
        ) : q.trim() === '' ? (
          <p className="mt-8 border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            输入关键词开始搜索，或试试：幻觉、上下文窗口、PPT、免费、代码审查
          </p>
        ) : hits.length === 0 ? (
          <p className="mt-8 border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            没有找到与「{q}」相关的内容。
            <Link href="/find" className="mt-2 block text-primary hover:underline">
              换个思路：用场景决策器描述你的需求
            </Link>
          </p>
        ) : (
          <div className="mt-6 space-y-8">
            {(Object.keys(grouped) as SearchDoc['type'][]).map((t) => (
              <section key={t}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {SEARCH_TYPE_LABELS[t]}（{grouped[t]?.length}）
                </h2>
                <ul className="divide-y border-t border-hairline pt-5">
                  {grouped[t]?.map((hit) => (
                    <li key={`${hit.doc.type}-${hit.doc.id}`}>
                      <Link
                        href={hit.doc.href}
                        className="block px-5 py-4 transition-colors hover:bg-accent/30"
                      >
                        <p className="text-sm font-medium">{hit.doc.title}</p>
                        {hit.doc.subtitle ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{hit.doc.subtitle}</p>
                        ) : null}
                        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                          {hit.doc.summary}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
