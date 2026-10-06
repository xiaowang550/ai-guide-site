'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import type { GlossaryEntry } from '@/data/types'
import { groupByInitial } from '@/lib/glossary'

/** 术语表浏览：中英对照、首字母分组、锚点、实时检索 */
export function GlossaryBrowser({ entries }: { entries: GlossaryEntry[] }) {
  const [q, setQ] = useState('')
  const [onlyLinked, setOnlyLinked] = useState(false)

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return entries.filter((e) => {
      if (onlyLinked && !e.conceptId) return false
      if (!query) return true
      return `${e.term}${e.termEn}${e.short}${e.detail}`.toLowerCase().includes(query)
    })
  }, [entries, q, onlyLinked])

  const groups = useMemo(() => groupByInitial(filtered), [filtered])
  const letters = groups.map((g) => g.initial)

  const letterId = (initial: string) => `letter-${encodeURIComponent(initial)}`

  return (
    <div>
      <div className="sticky top-14 z-30 -mx-4 mb-5 border-b bg-background/90 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜中文或英文术语，如 RAG / 幻觉 / Embedding"
              className="h-9 w-full rounded-lg border bg-background pl-8 pr-3 text-sm"
              aria-label="搜索术语"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={onlyLinked}
              onChange={(e) => setOnlyLinked(e.target.checked)}
              className="h-4 w-4 accent-[hsl(var(--primary))]"
            />
            只看有概念页的
          </label>
          <p className="text-xs text-muted-foreground">
            {filtered.length} / {entries.length} 条
          </p>
        </div>

        {letters.length > 0 && !q ? (
          <nav aria-label="首字母索引" className="mt-3 flex flex-wrap gap-1">
            {letters.map((l) => (
              <a
                key={l}
                href={`#${letterId(l)}`}
                className="inline-flex h-6 w-6 items-center justify-center rounded text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {l}
              </a>
            ))}
          </nav>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          没有匹配的术语，换个关键词试试。
        </p>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.initial} id={letterId(group.initial)}>
              <h2 className="mb-3 border-b pb-1 text-sm font-semibold text-muted-foreground">
                {group.initial}
              </h2>
              <dl className="space-y-4">
                {group.items.map((entry) => (
                  <div key={entry.id} id={entry.id} className="scroll-mt-24">
                    <dt className="flex flex-wrap items-baseline gap-2">
                      <span className="text-base font-semibold">{entry.term}</span>
                      <span className="text-xs text-muted-foreground">{entry.termEn}</span>
                      {entry.conceptId ? (
                        <Link
                          href={`/learn/${entry.conceptId}`}
                          className="text-xs text-primary hover:underline"
                          title="跳到完整概念讲解"
                        >
                          读完整概念 →
                        </Link>
                      ) : null}
                    </dt>
                    <dd className="mt-1 space-y-1.5">
                      <p className="text-sm leading-6 text-foreground/90">{entry.short}</p>
                      <p className="text-sm leading-6 text-muted-foreground">{entry.detail}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}