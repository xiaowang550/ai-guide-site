'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MessageCircleQuestion } from 'lucide-react'
import type { EduFaq } from '@/data/types'
import { AUDIENCE_LABELS } from '@/lib/edu-shared'
import { cn } from '@/lib/utils'

const FILTERS: (EduFaq['audience'] | 'all')[] = ['all', 'teacher', 'student', 'guardian', 'school']
const FILTER_LABEL: Record<string, string> = {
  all: '全部',
  ...AUDIENCE_LABELS,
}

/** 常见问题：按对象筛选，答案给立场 + 可执行做法 + 边界 */
export function FaqList({ items }: { items: EduFaq[] }) {
  const [filter, setFilter] = useState<EduFaq['audience'] | 'all'>('all')
  const [category, setCategory] = useState<string>('all')

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(items.map((i) => i.category)))],
    [items]
  )

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          (filter === 'all' || i.audience === filter) &&
          (category === 'all' || i.category === category)
      ),
    [items, filter, category]
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              filter === f
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {FILTER_LABEL[f]}
          </button>
        ))}
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="ml-auto h-8 rounded-md border bg-background px-2 text-xs"
          aria-label="按分类筛选"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? '全部分类' : c}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        共 {filtered.length} 条
      </p>

      {filtered.length === 0 ? (
        <p className="mt-4 border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          该组合下暂无常见问题，可以直接在下方提交提问。
        </p>
      ) : (
        <div className="mt-4 divide-y border-t border-hairline pt-5">
          {filtered.map((item) => (
            <details key={item.id} className="group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-start gap-2.5 text-sm font-medium">
                <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="flex-1 leading-6">{item.question}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {AUDIENCE_LABELS[item.audience]} · {item.category}
                </span>
              </summary>
              <div className="mt-3 pl-6.5">
                <p className="text-sm leading-7 text-foreground/85">{item.answer}</p>
                {item.refs.length > 0 ? (
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {item.refs.map((href) => (
                      <li key={href}>
                        <Link
                          href={href}
                          className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] hover:border-primary/40 hover:bg-accent/30"
                        >
                          {href}
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}