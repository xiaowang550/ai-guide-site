'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bell,
  Code2,
  FlaskConical,
  Layers,
  Search,
  Sparkles,
  Wallet,
} from 'lucide-react'
import type { NewsCategory, NewsItem } from '@/lib/news/types'
import { useNews } from './use-news'

const categories: NewsCategory[] = ['模型发布', '功能更新', '编程工具', '使用变化', '研究与行业']
const icons = {
  模型发布: Layers,
  功能更新: Sparkles,
  编程工具: Code2,
  使用变化: Wallet,
  研究与行业: FlaskConical,
}
const date = (value: string) =>
  new Date(value).toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
export function NewsBoard({
  initial,
  compact = false,
  tool,
}: {
  initial: NewsItem[]
  compact?: boolean
  tool?: string
}) {
  const { feed, error, loading } = useNews(initial, tool, compact ? 4 : 100)
  const [category, setCategory] = useState('全部')
  const [query, setQuery] = useState('')
  const [source, setSource] = useState('全部来源')
  const [visibleCount, setVisibleCount] = useState(12)
  const sources = [...new Set(feed.items.map((item) => item.sourceName))]
  const items = useMemo(
    () =>
      feed.items.filter(
        (item) =>
          (category === '全部' || item.category === category) &&
          (source === '全部来源' || item.sourceName === source) &&
          `${item.title} ${item.originalTitle} ${item.summary ?? ''} ${item.sourceName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [feed.items, category, source, query],
  )
  const featured = !compact ? items.find((item) => item.reviewed && item.summary) : null
  const others = featured ? items.filter((item) => item.id !== featured.id) : items
  return (
    <div className="news-board">
      {!compact && (
        <>
          <div className="news-topline">
            <span className="inline-flex items-center gap-2">
              <Bell className="h-4 w-4" aria-hidden />
              关注新模型、新功能与使用变化
            </span>
            <span>
              {feed.lastFetchedAt
                ? `最近获取 ${new Date(feed.lastFetchedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                : loading
                  ? '正在连接资讯源…'
                  : '当前为已核对的消息快照'}
            </span>
          </div>
          <div className="news-filters">
            <div className="news-tabs" role="group" aria-label="资讯主题">
              {['全部', ...categories].map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => {
                    setCategory(item)
                    setVisibleCount(12)
                  }}
                  aria-pressed={category === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <label className="news-search">
              <Search className="h-4 w-4" aria-hidden />
              <input
                aria-label="搜索 AI 资讯"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setVisibleCount(12)
                }}
                placeholder="找工具、版本或关键词"
              />
            </label>
            <label className="sr-only" htmlFor="news-source">
              按来源筛选
            </label>
            <select
              id="news-source"
              className="news-source-select"
              value={source}
              onChange={(event) => {
                setSource(event.target.value)
                setVisibleCount(12)
              }}
            >
              <option>全部来源</option>
              {sources.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
        </>
      )}
      {(error || (feed.stale && !loading)) && (
        <p className="news-status" role="status">
          {error || '部分消息获取较早，请留意官方发布时间。'}
          {!compact && ' 每 30 分钟检查官方来源，页面每分钟自动刷新。'}
        </p>
      )}
      {!compact && feed.sources.some((item) => item.status === 'error') && !error && (
        <p className="news-status">部分来源暂时不可达，仍保留已获取的消息。</p>
      )}
      {featured && (
        <article className="news-featured">
          <div>
            <p className="text-xs font-medium text-primary">一眼看懂 · {featured.category}</p>
            <h2 className="mt-4 text-2xl leading-9">{featured.title}</h2>
            <p className="mt-3 text-xs text-muted-foreground">
              {featured.sourceName} · 官方发布 {date(featured.publishedAt)}
            </p>
          </div>
          <div className="news-featured-notes">
            <div>
              <span>这次变化</span>
              <p>{featured.summary}</p>
            </div>
            {featured.takeaway && (
              <div>
                <span>与你的关系</span>
                <p>{featured.takeaway}</p>
              </div>
            )}
            <a href={featured.url} target="_blank" rel="noreferrer" className="section-link">
              看官方原文
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </article>
      )}
      <div className={`news-grid ${compact ? 'news-grid-compact' : ''}`}>
        {others.slice(0, compact ? 4 : visibleCount).map((item) => {
          const Icon = icons[item.category] ?? Sparkles
          return (
            <article className="news-card" key={item.id}>
              <div className="news-card-head">
                <span className="news-category">
                  <Icon className="h-4 w-4" aria-hidden />
                  {item.category}
                </span>
                <time dateTime={item.publishedAt}>{date(item.publishedAt)}</time>
              </div>
              <h2 className="mt-4 text-base leading-7">
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              </h2>
              {item.summary && (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
              )}
              {item.takeaway && !compact && (
                <details className="news-detail">
                  <summary>这条消息适合谁看</summary>
                  <p>{item.takeaway}</p>
                </details>
              )}
              <div className="news-card-bottom">
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
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
              {!compact && item.toolIds.length > 0 && (
                <div className="news-tool-links">
                  {item.toolIds.map((id) => (
                    <Link href={`/tools/${id}`} key={id}>
                      查看工具档案 →
                    </Link>
                  ))}
                </div>
              )}
            </article>
          )
        })}
      </div>
      {!compact && others.length > visibleCount && (
        <button
          type="button"
          className="section-link mt-6"
          onClick={() => setVisibleCount((count) => count + 12)}
        >
          再看 12 条消息（还有 {others.length - visibleCount} 条） →
        </button>
      )}
      {!items.length && (
        <p role="status" className="rounded-xl bg-muted/50 p-7 text-sm text-muted-foreground">
          {loading ? '正在读取消息…' : '这个筛选暂时没有消息，试试其他主题或关键词。'}
        </p>
      )}
      {!compact && (
        <p className="mt-7 text-xs leading-6 text-muted-foreground">
          日期为官方发布时间。整理后的短摘要附官方原文；未经整理的消息保留官方标题。功能开放范围和费用以当前官方说明为准。
        </p>
      )}
    </div>
  )
}
