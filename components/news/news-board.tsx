'use client'
import { ScrollSidebar } from '@/components/scroll-sidebar'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Code2,
  FileText,
  Filter,
  Flame,
  FlaskConical,
  Layers,
  Lightbulb,
  Radio,
  Search,
  Sparkles,
  UserRound,
  Wallet,
} from 'lucide-react'
import type { NewsCategory, NewsItem } from '@/lib/news/types'
import { newsDisplay } from '@/lib/news/display'
import { ToolLogo } from '@/components/tool-logo'
import { useNews } from './use-news'
const categories: NewsCategory[] = ['模型发布', '功能更新', '编程工具', '使用变化', '研究与行业']
const icons = {
  模型发布: Layers,
  功能更新: Sparkles,
  编程工具: Code2,
  使用变化: Wallet,
  研究与行业: FlaskConical,
}
// 小型展示映射，不把完整工具库带进资讯客户端。
const brands: Record<string, { tool: string; name: string }> = {
  openai: { tool: 'chatgpt', name: 'OpenAI' },
  anthropic: { tool: 'claude', name: 'Anthropic' },
  google: { tool: 'gemini', name: 'Google' },
  copilot: { tool: 'copilot', name: 'GitHub' },
  cursor: { tool: 'cursor', name: 'Cursor' },
  deepseek: { tool: 'deepseek', name: 'DeepSeek' },
  qwen: { tool: 'qwen', name: 'Qwen' },
  kimi: { tool: 'kimi', name: 'Kimi' },
  ollama: { tool: 'ollama', name: 'Ollama' },
}
const toolNames: Record<string, string> = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  gemini: 'Gemini',
  copilot: 'GitHub Copilot',
  cursor: 'Cursor',
  deepseek: 'DeepSeek',
  qwen: '通义千问',
  kimi: 'Kimi',
  ollama: 'Ollama',
  notebooklm: 'NotebookLM',
}
const date = (value: string) =>
  new Date(value).toLocaleDateString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
function BrandIcon({ item, size = 54 }: { item: NewsItem; size?: number }) {
  const tool = item.toolIds[0] || brands[item.sourceId]?.tool
  return tool ? (
    <ToolLogo
      src={`/logos/${tool}.svg`}
      alt={`${item.sourceName} 官方标识`}
      size={size}
      rounded="rounded-2xl"
    />
  ) : (
    <Radio size={size} aria-hidden />
  )
}
export function NewsBoard({
  initial,
  compact = false,
  tool,
  hero,
}: {
  initial: NewsItem[]
  compact?: boolean
  tool?: string
  hero?: ReactNode
}) {
  const { feed, error, loading } = useNews(initial, tool, compact ? 4 : 100)
  const [category, setCategory] = useState('全部'),
    [query, setQuery] = useState(''),
    [source, setSource] = useState('全部来源'),
    [visibleCount, setVisibleCount] = useState(12)
  const sources = [...new Map(feed.items.map((item) => [item.sourceId, item])).values()]
  const items = useMemo(
    () =>
      feed.items.filter(
        (item) =>
          (category === '全部' || item.category === category) &&
          (source === '全部来源' || item.sourceId === source) &&
          `${newsDisplay(item).title} ${item.originalTitle} ${item.summary ?? ''} ${item.sourceName}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [feed.items, category, source, query],
  )
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])
  const highlights = feed.items
    .filter((item) => now !== null && Date.parse(item.publishedAt) >= now - 7 * 86400000)
    .slice(0, 5)
  const sourceCount = feed.sources.filter((item) => item.status === 'ok').length
  const reset = () => {
    setCategory('全部')
    setQuery('')
    setSource('全部来源')
    setVisibleCount(12)
  }
  return (
    <div className={['news-board', !compact && 'news-page-grid'].filter(Boolean).join(' ')}>
      <div className="news-main">
        {!compact && hero}
        {!compact && (
          <div className="news-filters">
            <div className="news-tabs" role="group" aria-label="资讯主题">
              {['全部', ...categories].map((name) => {
                const Icon = icons[name as NewsCategory]
                return (
                  <button
                    type="button"
                    key={name}
                    onClick={() => {
                      setCategory(name)
                      setVisibleCount(12)
                    }}
                    aria-pressed={category === name}
                  >
                    {Icon && <Icon size={16} aria-hidden />}
                    {name}
                  </button>
                )
              })}
            </div>
            <label className="news-search">
              <Search size={18} aria-hidden />
              <input
                aria-label="搜索 AI 资讯"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setVisibleCount(12)
                }}
                placeholder="搜索资讯、产品或关键词…"
              />
            </label>
            <label className="news-source-filter">
              <Filter size={16} aria-hidden />
              <select
                aria-label="按来源筛选"
                value={source}
                onChange={(e) => {
                  setSource(e.target.value)
                  setVisibleCount(12)
                }}
              >
                <option value="全部来源">全部来源</option>
                {sources.map((item) => (
                  <option value={item.sourceId} key={item.sourceId}>
                    {item.sourceName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
        {(error || (feed.stale && !loading)) && (
          <p className="news-status" role="status">
            {error || '当前显示已保存消息，正在检查官方来源。'}
          </p>
        )}
        {!compact && (
          <div className="news-topline">
            <span>
              <span className="news-live-dot" aria-hidden />
              {loading
                ? '正在检查来源…'
                : `${items.length} 条消息 · 每 ${feed.intervalMinutes} 分钟检查官方来源`}
            </span>
            <span>
              {feed.lastFetchedAt
                ? `最近检查 ${new Date(feed.lastFetchedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                : '已核对的消息快照'}
            </span>
          </div>
        )}
        <div className={['news-grid', compact && 'news-grid-compact'].filter(Boolean).join(' ')}>
          {items
            .slice(0, compact ? 4 : visibleCount)
            .map((item) =>
              compact ? (
                <CompactNews item={item} key={item.id} />
              ) : (
                <NewsRow item={item} key={item.id} />
              ),
            )}
        </div>
        {!items.length && (
          <div className="news-empty" role="status">
            <Search size={28} aria-hidden />
            <p>{loading ? '正在读取消息…' : '暂时没有匹配的消息，试试其他主题或关键词。'}</p>
            {!compact && (
              <button type="button" onClick={reset}>
                清除筛选
              </button>
            )}
          </div>
        )}
        {!compact && items.length > visibleCount && (
          <button
            type="button"
            className="news-more"
            onClick={() => setVisibleCount((count) => count + 12)}
          >
            查看更多消息 <ArrowRight size={17} aria-hidden />
          </button>
        )}
        {!compact && (
          <p className="news-explanation">
            发布时间按北京时间显示，原始标题与链接保留。自动中文整理仅帮助阅读，具体开放范围、费用与功能以官方原文为准。页面每分钟检查新内容。
          </p>
        )}
      </div>
      {!compact && (
        <ScrollSidebar className="news-reference-aside">
          <section className="reference-panel news-overview">
            <h2>
              <BadgeCheck size={23} aria-hidden />
              一眼看懂
            </h2>
            {feed.items.slice(0, 5).map((item) => {
              const view = newsDisplay(item)
              return (
                <a
                  className="news-side-item"
                  href={item.url}
                  key={item.id}
                  target="_blank"
                  rel="noreferrer"
                >
                  <BrandIcon item={item} />
                  <span>
                    <strong>{view.title}</strong>
                    <small>{view.summary}</small>
                  </span>
                </a>
              )
            })}
          </section>
          <section className="reference-panel">
            <h2>
              <Flame className="news-flame" size={23} aria-hidden />
              本周重点
            </h2>
            <p className="news-side-caption">近 7 天发布 · 按发布时间整理</p>
            {highlights.length ? (
              <ol>
                {highlights.map((item, i) => (
                  <li className="news-ranked" key={item.id}>
                    <span>{i + 1}</span>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {newsDisplay(item).title}
                    </a>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="news-side-caption">近 7 天暂无新消息，可以查看上方的近期更新。</p>
            )}
          </section>
          <section className="reference-panel">
            <h2>
              <Radio size={23} aria-hidden />
              关注来源
            </h2>
            <div className="news-source-buttons">
              {sources.map((item) => (
                <button
                  type="button"
                  key={item.sourceId}
                  aria-pressed={source === item.sourceId}
                  onClick={() => {
                    setSource(source === item.sourceId ? '全部来源' : item.sourceId)
                    setVisibleCount(12)
                  }}
                  title={`筛选 ${item.sourceName} 的消息`}
                >
                  <BrandIcon item={item} size={43} />
                  <span>{brands[item.sourceId]?.name ?? item.sourceName}</span>
                </button>
              ))}
            </div>
            <details className="news-source-health">
              <summary>
                来源检查{' '}
                {feed.sources.length ? `${sourceCount}/${feed.sources.length}` : '等待同步'}
              </summary>
              {feed.sources.map((item) => (
                <p key={item.id}>
                  <span>{item.name}</span>
                  <span>
                    {item.status === 'ok'
                      ? '已检查'
                      : item.status === 'error'
                        ? '暂不可达'
                        : '待检查'}
                  </span>
                </p>
              ))}
              <small>来源暂不可达时保留历史消息，不把获取时间当作发布时间。</small>
            </details>
          </section>
        </ScrollSidebar>
      )}
    </div>
  )
}
function OriginalTitle({ item }: { item: NewsItem }) {
  if (item.originalTitle === item.title || !item.originalTitle) return null
  return (
    <details className="news-original">
      <summary>原始标题</summary>
      <p lang="en">{item.originalTitle}</p>
    </details>
  )
}
function NewsRow({ item }: { item: NewsItem }) {
  const view = newsDisplay(item)
  return (
    <article className="news-brief">
      <div className="news-brief-intro">
        <BrandIcon item={item} size={60} />
        <div>
          <div className="news-card-head">
            <span className="news-category">{item.category}</span>
            <time dateTime={item.publishedAt}>{date(item.publishedAt)}</time>
          </div>
          <h2>
            <a href={item.url} target="_blank" rel="noreferrer">
              {view.title}
            </a>
          </h2>
          <p className="news-summary">{view.summary}</p>
          <div className="news-attribution">
            {item.sourceName} 官方 · {view.languageLabel}
          </div>
          <OriginalTitle item={item} />
        </div>
      </div>
      <div className="news-brief-note">
        <h3>
          <Lightbulb size={19} aria-hidden />
          这次变化
        </h3>
        <p>{view.summary}</p>
      </div>
      <div className="news-brief-note">
        <h3>
          <UserRound size={19} aria-hidden />
          与你的关系
        </h3>
        <p>{view.takeaway}</p>
      </div>
      <div className="news-brief-note news-brief-links">
        <h3>
          <FileText size={19} aria-hidden />
          查看工具档案
        </h3>
        {item.toolIds.slice(0, 2).map((id) => (
          <Link href={`/tools/${id}/`} key={id}>
            {toolNames[id] ?? id}
            <ArrowRight size={15} aria-hidden />
          </Link>
        ))}
        {!item.toolIds.length && <p>这条消息来自官方行业或应用动态。</p>}
        <a className="news-official-link" href={item.url} target="_blank" rel="noreferrer">
          官方原文
          <ArrowUpRight size={15} aria-hidden />
        </a>
      </div>
    </article>
  )
}
function CompactNews({ item }: { item: NewsItem }) {
  const view = newsDisplay(item)
  return (
    <article className="news-card">
      <div className="news-card-head">
        <BrandIcon item={item} size={40} />
        <span className="news-category">{item.category}</span>
        <time dateTime={item.publishedAt}>{date(item.publishedAt)}</time>
      </div>
      <h2>
        <a href={item.url} target="_blank" rel="noreferrer">
          {view.title}
        </a>
      </h2>
      <p>{view.summary}</p>
      <OriginalTitle item={item} />
      <div className="news-card-bottom">
        <span>
          {item.sourceName} · {view.languageLabel}
        </span>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          aria-label={`阅读官方消息：${view.title}`}
        >
          <ArrowUpRight size={18} />
        </a>
      </div>
    </article>
  )
}
