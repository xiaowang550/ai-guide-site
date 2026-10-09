'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, X, ArrowUpRight } from 'lucide-react'
import { CASE_TOPICS, filterCases, type CasePreview, type CaseTopic } from '@/lib/case-filters'
import { CoverArt } from './cover-art'
import { SaveButton } from './learning/save-button'

export function CaseExplorer({ items }: { items: CasePreview[] }) {
  const [query, setQuery] = useState(''),
    [topic, setTopic] = useState<CaseTopic>('all'),
    [industry, setIndustry] = useState(''),
    [ready, setReady] = useState(false)
  const industries = useMemo(() => [...new Set(items.map((item) => item.industry))], [items])
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(location.search)
      setQuery(p.get('q') ?? '')
      setTopic(
        CASE_TOPICS.some((topic) => topic.id === p.get('topic'))
          ? (p.get('topic') as CaseTopic)
          : 'all',
      )
      setIndustry(industries.includes(p.get('industry') ?? '') ? p.get('industry')! : '')
      setReady(true)
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [industries])
  useEffect(() => {
    if (!ready) return
    const p = new URLSearchParams()
    if (query.trim()) p.set('q', query.trim())
    if (topic !== 'all') p.set('topic', topic)
    if (industry) p.set('industry', industry)
    const qs = p.toString()
    window.history.replaceState(null, '', `${location.pathname}${qs ? '?' + qs : ''}`)
  }, [query, topic, industry, ready])
  const filtered = useMemo(
      () => filterCases(items, query, topic, industry),
      [items, query, topic, industry],
    ),
    active = query || topic !== 'all' || industry
  function reset() {
    setQuery('')
    setTopic('all')
    setIndustry('')
  }
  return (
    <>
      <section className="mb-7 rounded-2xl border bg-card p-5" aria-label="案例筛选">
        <div className="flex flex-wrap gap-3">
          <label className="relative min-w-0 flex-1 basis-64">
            <span className="sr-only">搜索案例</span>
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜任务、角色或工具，如：通知、教师、n8n"
              className="h-11 w-full rounded-xl border bg-background pl-10 pr-10 text-sm"
            />
            {query && (
              <button
                aria-label="清除案例关键词"
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center"
                onClick={() => setQuery('')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
            行业
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-11 max-w-44 rounded-xl border bg-background px-3 text-sm text-foreground"
            >
              <option value="">全部行业</option>
              {industries.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {CASE_TOPICS.map((value) => (
            <button
              key={value.id}
              type="button"
              aria-pressed={topic === value.id}
              onClick={() => setTopic(value.id)}
              className={`min-h-9 rounded-full px-3 text-xs transition-colors ${topic === value.id ? 'bg-accent font-medium text-primary' : 'text-muted-foreground hover:bg-accent/60'}`}
            >
              {value.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-4 text-xs">
          <p role="status" aria-live="polite" className="text-muted-foreground">
            找到 <strong className="text-foreground">{filtered.length}</strong> 个案例
            {industry ? ` · ${industry}` : ''}
          </p>
          {active && (
            <button onClick={reset} className="text-primary">
              清空条件
            </button>
          )}
        </div>
      </section>
      {filtered.length ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item, i) => (
            <article key={item.id} className="media-card flex flex-col overflow-hidden">
              <Link href={`/cases/${item.id}`} aria-label={`查看${item.title}`}>
                <CoverArt
                  id={item.id}
                  eyebrow={`${item.industry} · ${item.role}`}
                  index={i + 1}
                  tools={item.tools}
                  height="sm"
                />
              </Link>
              <div className="flex flex-1 flex-col p-5">
                <p className="mb-2 text-xs text-muted-foreground">
                  {item.illustrative ? '演示案例 · 虚构材料练习' : '典型场景 · 编辑整理'}
                </p>
                <h2 className="text-base font-semibold leading-7">
                  <Link className="hover:text-primary" href={`/cases/${item.id}`}>
                    {item.title}
                  </Link>
                </h2>
                <p className="mt-3 line-clamp-3 flex-1 text-sm leading-7 text-muted-foreground">
                  {item.summary}
                </p>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
                  <Link
                    href={`/cases/${item.id}`}
                    className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary"
                  >
                    看流程与提示词 <ArrowUpRight className="h-3 w-3" />
                  </Link>
                  <SaveButton
                    href={`/cases/${item.id}`}
                    title={item.title}
                    summary={item.summary}
                    kind="case"
                    record={false}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-10 text-center">
          <h2 className="font-semibold">条件有点多，暂时没有匹配的案例</h2>
          <p className="mt-3 text-sm text-muted-foreground">先去掉行业限制，或换一个任务关键词。</p>
          <button
            onClick={reset}
            className="mt-5 rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground"
          >
            查看全部案例
          </button>
        </div>
      )}
    </>
  )
}
