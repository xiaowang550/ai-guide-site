'use client'

import { useEffect, useState } from 'react'
import { ApiError, apiGet, relativeTime, type Dashboard } from './api-client'

/**
 * 仪表盘。
 *
 * 原则：**只用真实数据，没有就显示空状态**，不填占位数字。
 *
 * 这条对一个内容站的后台尤其重要 —— 一个显示「1,234 次访问」的占位数字，
 * 会让人在真实数据到来之前就形成错误判断，并据此决定内容策略。
 * 所以这里所有数字都来自 `GET /api/admin/dashboard`，
 * 接口返回 0 就显示 0，`hasData` 为假就明确写「还没有数据」。
 */
export function DashboardView({ onNavigate }: { onNavigate: (tab: 'content' | 'feedback' | 'review') => void }) {
  const [data, setData] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    setBusy(true)
    try {
      setData(await apiGet<Dashboard>('/api/admin/dashboard'))
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : '加载失败')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  if (error) {
    return (
      <div className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">
        {error}
        <button type="button" className="ml-3 underline" onClick={() => void load()}>
          重试
        </button>
      </div>
    )
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground">{busy ? '加载中…' : '暂无数据'}</p>
  }

  const maxView = Math.max(1, ...data.analytics.viewsByDay.map((d) => d.count))
  const recent = data.analytics.viewsByDay.slice(-14)

  return (
    <div className="space-y-8">
      {/* 内容状态 */}
      <section>
        <h2 className="text-sm font-semibold">内容</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="已收录" value={data.content.total} unit="个" />
          <Stat label="已发布" value={data.content.published} unit="个" />
          <Stat
            label="有未发布草稿"
            value={data.content.withDraft}
            unit="个"
            tone={data.content.withDraft > 0 ? 'warn' : undefined}
          />
          <Stat label="从未发布" value={data.content.neverPublished} unit="个" />
        </div>
        {data.content.total === 0 ? (
          <EmptyHint>
            数据库里还没有任何内容。运行 <code>npm run admin:seed</code> 把仓库里的
            基线工具资料迁移进来，或者直接新建一条。
            <button className="ml-2 underline" onClick={() => onNavigate('content')}>
              去内容页
            </button>
          </EmptyHint>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            {data.content.lastPublish ? (
              <>
                最近一次发布：{relativeTime(data.content.lastPublish.at)}，由{' '}
                {data.content.lastPublish.actor}。
              </>
            ) : (
              '还没有任何发布记录。'
            )}
          </p>
        )}
      </section>

      {/* 待处理事项 */}
      <section>
        <h2 className="text-sm font-semibold">待处理</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button onClick={() => onNavigate('feedback')} className="text-left">
            <Stat
              label="待处理反馈"
              value={data.feedback.new}
              unit="条"
              tone={data.feedback.new > 0 ? 'warn' : undefined}
            />
          </button>
          <button onClick={() => onNavigate('review')} className="text-left">
            <Stat
              label="未完成复核"
              value={data.review.open}
              unit="项"
              tone={data.review.high > 0 ? 'warn' : undefined}
            />
          </button>
          <Stat label="高优先级" value={data.review.high} unit="项" tone={data.review.high > 0 ? 'warn' : undefined} />
          <Stat label="已逾期" value={data.review.overdue} unit="项" tone={data.review.overdue > 0 ? 'warn' : undefined} />
        </div>
        {data.feedback.total === 0 && data.review.open === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">目前没有需要处理的事项。</p>
        ) : null}
      </section>

      {/* 访问统计 */}
      <section>
        <h2 className="text-sm font-semibold">访问统计（最近 14 天）</h2>

        {!data.analytics.hasData ? (
          <EmptyHint>
            还没有统计数据。公开站的埋点在访客打开页面时上报（见{' '}
            <code>components/analytics-beacon.tsx</code>），
            之后这里会显示页面浏览量与关键事件的真实数字。
          </EmptyHint>
        ) : (
          <>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Stat label="页面浏览" value={data.analytics.totalViews} unit="次" />
              <Stat label="关键事件" value={data.analytics.totalEvents} unit="次" />
            </div>

            {/* 极简条形图：不引图表库，14 根柱子足够看出趋势 */}
            <div className="mt-4 flex h-24 items-end gap-1" role="img" aria-label="最近 14 天页面浏览量">
              {recent.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary/70"
                    style={{ height: `${Math.round((d.count / maxView) * 72)}px`, minHeight: d.count > 0 ? 3 : 0 }}
                    title={`${d.day}：${d.count} 次`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>{recent[0]?.day}</span>
              <span>{recent[recent.length - 1]?.day}</span>
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-medium">浏览最多的页面</h3>
                {data.analytics.topPages.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">暂无数据</p>
                ) : (
                  <ol className="mt-1.5 space-y-1 text-xs">
                    {data.analytics.topPages.slice(0, 8).map((p) => (
                      <li key={p.path} className="flex justify-between gap-3">
                        <span className="truncate text-muted-foreground">{p.path}</span>
                        <span className="tabular-nums">{p.count}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <div>
                <h3 className="text-xs font-medium">关键事件</h3>
                {data.analytics.topEvents.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">暂无数据</p>
                ) : (
                  <ol className="mt-1.5 space-y-1 text-xs">
                    {data.analytics.topEvents.map((e) => (
                      <li key={e.name} className="flex justify-between gap-3">
                        <span className="truncate text-muted-foreground" title={e.name}>
                          {e.label}
                        </span>
                        <span className="tabular-nums">{e.count}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            <p className="mt-4 rounded border border-hairline bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
              {data.privacyNote}
            </p>
            {data.analytics.firstDay ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                统计从 {data.analytics.firstDay} 开始有数据。
              </p>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string
  value: number
  unit: string
  tone?: 'warn'
}) {
  return (
    <div className={`border-t pt-3 ${tone === 'warn' && value > 0 ? 'border-amber-500/60' : 'border-hairline'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-2xl font-bold tabular-nums">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 rounded border border-dashed border-hairline px-3 py-3 text-xs leading-6 text-muted-foreground">
      {children}
    </p>
  )
}
