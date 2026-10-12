'use client'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import type { NewsItem } from '@/lib/news/types'
import { useNews } from './use-news'

/** 首页只加载短消息卡片，完整资讯筛选在资讯页加载。两处沿用同一个实时数据源。 */
export function NewsPreview({ initial }: { initial: NewsItem[] }) {
  const { feed, error, loading } = useNews(initial, undefined, 4)
  return (
    <div>
      {error && (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {error}
        </p>
      )}
      <div className="news-preview-grid">
        {feed.items.slice(0, 4).map((item) => (
          <article className="news-preview-card" key={item.id}>
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="text-primary">{item.category}</span>
              <time dateTime={item.publishedAt}>
                {new Date(item.publishedAt).toLocaleDateString('zh-CN', {
                  timeZone: 'Asia/Shanghai',
                })}
              </time>
            </div>
            <h3 className="mt-3 text-base font-semibold leading-7">
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.title}
              </a>
            </h3>
            {item.summary && (
              <p className="mt-3 line-clamp-2 text-sm leading-7 text-muted-foreground">
                {item.summary}
              </p>
            )}
            <footer className="mt-auto flex items-center justify-between gap-3 pt-5 text-xs text-muted-foreground">
              <span>
                {item.sourceName}
                {!item.reviewed ? ' · 官方标题' : ''}
              </span>
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`阅读官方消息：${item.title}`}
              >
                <ArrowUpRight size={18} />
              </a>
            </footer>
          </article>
        ))}
      </div>
      {!feed.items.length && (
        <p role="status" className="text-sm text-muted-foreground">
          {loading ? '正在读取消息…' : '暂时没有消息，稍后再来看看。'}
        </p>
      )}
      <Link href="/updates" className="section-link mt-5">
        更多 AI 资讯 →
      </Link>
    </div>
  )
}
