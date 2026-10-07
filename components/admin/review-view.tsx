'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiGet, apiSend, relativeTime, type ReviewTask } from './api-client'

const KIND_LABEL: Record<string, string> = {
  freshness: '内容过期',
  evidence: '依据待补',
  manual: '手动添加',
}

const SEVERITY_LABEL: Record<string, string> = {
  high: '优先处理',
  normal: '正常',
  low: '有空再看',
}

/**
 * 内容复核待办。
 *
 * 自动待办由「重新计算」生成，不是在打开页面时顺手算的 ——
 * 后台只是读和写，真正的判定规则在 lib/admin/review.ts 里。
 */
export function ReviewView() {
  const [tasks, setTasks] = useState<ReviewTask[] | null>(null)
  const [summary, setSummary] = useState<{ open: number; high: number; overdue: number } | null>(null)
  const [showDone, setShowDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const load = useCallback(async () => {
    setBusy(true)
    try {
      const res = await apiGet<{
        tasks: ReviewTask[]
        summary: { open: number; high: number; overdue: number }
      }>(`/api/admin/review${showDone ? '?status=done' : ''}`)
      setTasks(res.tasks)
      setSummary(res.summary)
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败')
    } finally {
      setBusy(false)
    }
  }, [showDone])

  useEffect(() => {
    void load()
  }, [load])

  async function regenerate() {
    setBusy(true)
    try {
      const res = await apiSend<{ created: number; updated: number; closed: number; scanned: number }>(
        '/api/admin/review/regenerate',
        'POST'
      )
      setError(null)
      await load()
      setLastResult(`扫描 ${res.scanned} 条：新建 ${res.created}，更新 ${res.updated}，自动关闭 ${res.closed}`)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '重新计算失败')
    } finally {
      setBusy(false)
    }
  }

  async function resolve(task: ReviewTask, status: 'done' | 'dismissed') {
    await apiSend(`/api/admin/review/${encodeURIComponent(task.id)}`, 'PATCH', { status })
    await load()
  }

  async function addManual() {
    if (!newTitle.trim()) return
    try {
      await apiSend('/api/admin/review', 'POST', { title: newTitle, severity: 'normal' })
      setNewTitle('')
      await load()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '添加失败')
    }
  }

  const [lastResult, setLastResult] = useState<string | null>(null)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline pb-3">
        <h2 className="text-sm font-semibold">内容复核待办</h2>
        {summary ? (
          <span className="text-xs text-muted-foreground">
            未完成 {summary.open} 项
            {summary.high > 0 ? ` · 其中 ${summary.high} 项优先处理` : ''}
            {summary.overdue > 0 ? ` · ${summary.overdue} 项已逾期` : ''}
          </span>
        ) : null}
        <span className="flex-1" />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
          只看已完成
        </label>
        <button
          onClick={() => void regenerate()}
          disabled={busy}
          className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-50"
        >
          重新计算
        </button>
      </div>

      {error ? <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{error}</p> : null}
      {lastResult ? <p className="mt-3 rounded border border-hairline bg-muted/30 px-3 py-2 text-xs">{lastResult}</p> : null}

      <div className="mt-3 flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void addManual()
          }}
          placeholder="手动添加一条待办，例如「等厂商发新版后回来改价格」"
          className="flex-1 rounded border border-hairline bg-background px-2 py-1.5 text-sm"
        />
        <button
          onClick={() => void addManual()}
          disabled={!newTitle.trim()}
          className="rounded border border-hairline px-3 py-1.5 text-sm disabled:opacity-50"
        >
          添加
        </button>
      </div>

      {tasks === null ? (
        <p className="mt-4 text-sm text-muted-foreground">{busy ? '加载中…' : ''}</p>
      ) : tasks.length === 0 ? (
        <p className="mt-4 rounded border border-dashed border-hairline px-3 py-4 text-sm text-muted-foreground">
          {showDone ? '还没有已完成的待办。' : '当前没有待办。'}
          <span className="mt-1 block text-xs">
            点「重新计算」会按内容更新时间（工具 30 天未更新即提醒）与
            评分依据完整度（≥4 或 ≤2 分必须有依据）重新生成。
            已复核过的条目会关掉对应待办，不会一直挂着。
          </span>
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {tasks.map((t) => (
            <li
              key={t.id}
              className={
                t.severity === 'high' && t.status === 'open'
                  ? 'rounded border-l-2 border-amber-500 border-y border-r border-hairline px-3 py-2'
                  : 'rounded border border-hairline px-3 py-2'
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-muted px-1.5 py-0.5 text-[11px]">
                  {KIND_LABEL[t.kind] ?? t.kind}
                </span>
                {t.status === 'open' ? (
                  <span className="text-[11px] text-muted-foreground">
                    {SEVERITY_LABEL[t.severity] ?? t.severity}
                    {t.due_date ? ` · 建议 ${t.due_date} 前完成` : ''}
                  </span>
                ) : (
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                    已完成 · {relativeTime(t.created_at)}
                  </span>
                )}
                {t.item_id ? (
                  <span className="text-[11px] text-muted-foreground">{t.item_id}</span>
                ) : null}
                {t.status === 'open' ? (
                  <span className="flex-1" />
                ) : null}
                {t.status === 'open' ? (
                  <>
                    <button
                      onClick={() => void resolve(t, 'done')}
                      className="rounded bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground"
                    >
                      标记完成
                    </button>
                    <button
                      onClick={() => void resolve(t, 'dismissed')}
                      className="rounded border border-hairline px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      忽略
                    </button>
                  </>
                ) : null}
              </div>
              <p className="mt-1 text-sm font-medium">{t.title}</p>
              {t.detail ? (
                <p className="mt-0.5 whitespace-pre-wrap text-xs leading-5 text-muted-foreground">{t.detail}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
