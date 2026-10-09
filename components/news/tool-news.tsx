'use client'

import Link from 'next/link'
import { ArrowUpRight, Radio } from 'lucide-react'
import type { NewsItem } from '@/lib/news/types'
import { useNews } from './use-news'

export function ToolNews({ id, initial }: { id: string; initial: NewsItem[] }) {
  const { feed, error } = useNews(initial, id, 3)
  return (
    <section className="rounded-2xl bg-primary/[0.045] p-5" aria-label="工具的官方最新消息">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base">
          <Radio className="h-4 w-4 text-primary" aria-hidden />
          最近官方动态
        </h2>
        <Link href="/updates" className="text-xs text-primary">
          更多 AI 资讯 →
        </Link>
      </div>
      {feed.items.length ? (
        <ul className="mt-3 space-y-3">
          {feed.items.map((item) => (
            <li key={item.id}>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between gap-4 text-sm leading-6 hover:text-primary"
              >
                <span>
                  {item.title}
                  <small className="mt-1 block text-xs text-muted-foreground">
                    {item.sourceName} · 发布于{' '}
                    {new Date(item.publishedAt).toLocaleDateString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                    })}
                  </small>
                </span>
                <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          暂未获取到这个工具的近期发布记录，可从下方官方来源查看。
        </p>
      )}
      {(error || feed.stale) && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          {error || '展示已获取消息，请以官方原文确认当前开放范围。'}
        </p>
      )}
    </section>
  )
}
