'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  ApiError,
  apiGet,
  apiSend,
  formatDateTime,
  relativeTime,
  type FeedbackItem,
} from './api-client'

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'new', label: '待处理' },
  { key: 'triaged', label: '处理中' },
  { key: 'resolved', label: '已解决' },
  { key: 'dismissed', label: '已忽略' },
]

const STATUS_LABEL: Record<string, string> = {
  new: '待处理',
  triaged: '处理中',
  resolved: '已解决',
  dismissed: '已忽略',
}

const KIND_LABEL: Record<string, string> = {
  errata: '内容有误',
  correction: '数据要改',
  question: '想问一个问题',
  suggestion: '建议',
}

/** 反馈收件箱 */
export function FeedbackView() {
  const [items, setItems] = useState<FeedbackItem[] | null>(null)
  const [status, setStatus] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const res = await apiGet<{ items: FeedbackItem[]; counts: Record<string, number> }>(
        `/api/admin/feedback${status ? `?status=${status}` : ''}`
      )
      setItems(res.items)
      setCounts(res.counts)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败')
    } finally {
      setBusy(false)
    }
  }, [status])

  useEffect(() => {
    void load()
  }, [load])

  async function update(id: string, nextStatus: string) {
    try {
      await apiSend(`/api/admin/feedback/${id}`, 'PATCH', {
        status: nextStatus,
        note: notes[id],
      })
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '操作失败')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-3">
        <h2 className="text-sm font-semibold">用户反馈</h2>
        <span className="flex-1" />
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setStatus(t.key)}
            className={
              status === t.key
                ? 'rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground'
                : 'rounded border border-hairline px-2 py-1 text-xs text-muted-foreground hover:text-foreground'
            }
          >
            {t.label}
            {t.key && counts[t.key] ? ` ${counts[t.key]}` : ''}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{error}</p> : null}

      {items === null ? (
        <p className="mt-4 text-sm text-muted-foreground">{busy ? '加载中…' : ''}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 rounded border border-dashed border-hairline px-3 py-4 text-sm text-muted-foreground">
          {status ? '这个状态下没有反馈。' : '还没有收到任何反馈。'}
          <span className="mt-1 block text-xs">
            公开站的纠错入口在每个工具详情页的「提交勘误」处，提交后会进入这里。
          </span>
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.map((f) => (
            <li key={f.id} className="rounded border border-hairline px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  {KIND_LABEL[f.kind] ?? f.kind}
                </span>
                <span
                  className={
                    f.status === 'new'
                      ? 'rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-700 dark:text-amber-300'
                      : 'rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground'
                  }
                >
                  {STATUS_LABEL[f.status] ?? f.status}
                </span>
                <span className="text-[11px] text-muted-foreground">{relativeTime(f.created_at)}</span>
                {f.page_url ? (
                  <a
                    href={f.page_url}
                    className="truncate text-[11px] text-primary underline underline-offset-2"
                  >
                    {f.page_url}
                  </a>
                ) : null}
              </div>

              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6">{f.message}</p>

              {f.contact ? (
                <p className="mt-1 text-[11px] text-muted-foreground">联系方式：{f.contact}</p>
              ) : null}
              {f.handled_note ? (
                <p className="mt-1.5 rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
                  处理记录：{f.handled_note}
                </p>
              ) : null}

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  value={notes[f.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [f.id]: e.target.value }))}
                  placeholder="处理记录（会记进审计日志）"
                  className="min-w-52 flex-1 rounded border border-hairline bg-background px-2 py-1 text-xs"
                />
                {f.status !== 'triaged' ? (
                  <button
                    onClick={() => void update(f.id, 'triaged')}
                    className="rounded border border-hairline px-2 py-1 text-xs"
                  >
                    标记处理中
                  </button>
                ) : null}
                {f.status !== 'resolved' ? (
                  <button
                    onClick={() => void update(f.id, 'resolved')}
                    className="rounded bg-primary px-2 py-1 text-xs font-medium text-primary-foreground"
                  >
                    已解决
                  </button>
                ) : null}
                {f.status !== 'dismissed' ? (
                  <button
                    onClick={() => void update(f.id, 'dismissed')}
                    className="rounded border border-hairline px-2 py-1 text-xs text-muted-foreground"
                  >
                    忽略
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11px] text-muted-foreground">
        反馈表不存 IP。「已忽略」是独立状态而不是删除 —— 重复反馈时能看到上次是怎么处理的，
        删掉记录就会再次收到同一条。收到时间：{items?.[0] ? formatDateTime(items[0].created_at) : '—'}
      </p>
    </div>
  )
}
