'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ToolSourceState } from '@/lib/news/tool-watch'
import type { NewsFeed, NewsItem } from '@/lib/news/types'
import { apiGet, apiSend, formatDateTime } from './api-client'

export function NewsView() {
  const [feed, setFeed] = useState<(NewsFeed & { toolSources: ToolSourceState[] }) | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try {
      setFeed(await apiGet<NewsFeed & { toolSources: ToolSourceState[] }>('/api/admin/news'))
      setError('')
    } catch {
      setError('读取资讯失败，请重试。')
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  async function refresh() {
    setBusy(true)
    try {
      await apiSend('/api/admin/news/refresh', 'POST', {})
      await load()
    } catch {
      setError('同步未完成，请查看来源状态后重试。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div>
      <p className="text-xs text-primary">官方资讯与同步状态</p>
      <h1 className="mt-2 text-2xl">AI 实时资讯管理</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        自动获取一手消息。可补充中文标题、短摘要和阅读提示，也可以隐藏不适合公开的消息。工具有新动态时会进入复核待办。
      </p>
      <div className="my-6 flex items-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
          className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? '正在同步…' : '立即同步官方消息'}
        </button>
        <span className="text-xs text-muted-foreground">
          每 30 分钟检查 · 最近获取 {formatDateTime(feed?.lastFetchedAt)}
        </span>
      </div>
      {error && (
        <p role="alert" className="my-4 text-sm text-danger">
          {error}
        </p>
      )}
      {feed && (
        <>
          <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {feed.sources.map((source) => (
              <div className="rounded-xl border bg-card p-4" key={source.id}>
                <p className="text-sm font-medium">
                  {source.name}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {source.status === 'ok'
                      ? '已获取'
                      : source.status === 'error'
                        ? '获取失败'
                        : '尚未同步'}
                  </span>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  成功时间：{formatDateTime(source.succeededAt)}
                </p>
                {source.error && <p className="mt-2 text-xs text-danger">{source.error}</p>}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <details className="mb-6 rounded-2xl border bg-card p-5">
              <summary className="cursor-pointer text-sm font-medium">
                工具资料来源检查 · {feed.toolSources?.length ?? 0} 个工具
              </summary>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                每 6
                小时比较官方页面正文；变化进入复核待办。页面需登录或无法读取时会提示人工核验，工具资料和评分不会自动改写。
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {feed.toolSources?.map((source) => (
                  <div key={source.id} className="rounded-xl bg-muted/50 p-3">
                    <a
                      className="text-sm text-primary"
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.name}
                    </a>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {source.status === 'ok'
                        ? '已检查'
                        : source.status === 'error'
                          ? '需要人工核验'
                          : '待检查'}{' '}
                      · {formatDateTime(source.succeededAt)}
                    </p>
                    {source.error && (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{source.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </details>
            {feed.items.map((item) => (
              <NewsEditor key={item.id} item={item} onSaved={load} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
function NewsEditor({ item, onSaved }: { item: NewsItem; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(item.title),
    [summary, setSummary] = useState(item.summary ?? ''),
    [takeaway, setTakeaway] = useState(item.takeaway ?? ''),
    [hidden, setHidden] = useState(!!item.hidden)
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  async function save() {
    setBusy(true)
    try {
      await apiSend(`/api/admin/news/${item.id}`, 'PATCH', { title, summary, takeaway, hidden })
      setMessage('已保存')
      await onSaved()
    } catch {
      setMessage('保存失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="rounded-2xl border bg-card p-5">
      <summary className="cursor-pointer text-sm font-medium">
        {item.title}
        <span className="ml-2 text-xs text-muted-foreground">
          {item.sourceName} · {item.hidden ? '已隐藏' : '公开'}
        </span>
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-xs leading-6 text-muted-foreground">
          官方标题：{item.originalTitle}
          <br />
          发布时间：{formatDateTime(item.publishedAt)}
          <br />
          <a href={item.url} target="_blank" rel="noreferrer" className="text-primary underline">
            打开官方原文
          </a>
        </p>
        <label className="block text-xs">
          公开标题
          <input
            className="admin-input mt-2"
            maxLength={230}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="block text-xs">
          简短说明
          <textarea
            className="admin-input mt-2"
            rows={2}
            maxLength={300}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
          />
        </label>
        <label className="block text-xs">
          与读者的关系
          <input
            className="admin-input mt-2"
            maxLength={200}
            value={takeaway}
            onChange={(event) => setTakeaway(event.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={hidden}
            onChange={(event) => setHidden(event.target.checked)}
          />
          暂时不在公开资讯中显示
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="rounded-lg bg-primary px-4 py-2 text-xs text-primary-foreground disabled:opacity-50"
        >
          {busy ? '正在保存…' : '保存公开内容'}
        </button>
        <span className="ml-3 text-xs" role="status">
          {message}
        </span>
      </div>
    </details>
  )
}
