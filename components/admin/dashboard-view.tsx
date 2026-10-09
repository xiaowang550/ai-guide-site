'use client'

import { useEffect, useState } from 'react'
import { Activity, ArrowRight, BarChart3, Eye, RefreshCw, TrendingUp } from 'lucide-react'
import { apiGet, type Dashboard } from './api-client'
import { TrafficChart } from './traffic-chart'
import type { TrafficPeriod, TrafficReport } from './traffic-types'

const PERIODS: { key: TrafficPeriod; label: string }[] = [
  { key: 'today', label: '今天' },
  { key: '7d', label: '7 天' },
  { key: '30d', label: '30 天' },
  { key: '90d', label: '90 天' },
  { key: '6m', label: '6 个月' },
  { key: '12m', label: '12 个月' },
]
const PAGE_NAMES: Record<string, string> = {
  '/': '首页',
  '/tools': '工具库',
  '/find': '场景决策器',
  '/compare': '工具对比',
  '/learn': '知识库',
  '/guides': '教程',
  '/cases': '案例库',
  '/edu': '教育专区',
}

export function DashboardView({
  onNavigate,
}: {
  onNavigate: (tab: 'content' | 'feedback' | 'review') => void
}) {
  const [period, setPeriod] = useState<TrafficPeriod>('7d')
  const [data, setData] = useState<TrafficReport | null>(null)
  const [overview, setOverview] = useState<Dashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    void apiGet<Dashboard>('/api/admin/dashboard', controller.signal)
      .then(setOverview)
      .catch(() => {})
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let running = false
    let active = true
    async function load() {
      if (running || document.hidden) return
      running = true
      setBusy(true)
      try {
        const result = await apiGet<TrafficReport>(
          `/api/admin/analytics?period=${period}`,
          controller.signal,
        )
        if (active) {
          setData(result)
          setError(null)
        }
      } catch (e) {
        if (active && !controller.signal.aborted)
          setError(e instanceof Error ? e.message : '数据加载失败')
      } finally {
        running = false
        if (active) setBusy(false)
      }
    }
    void load()
    const interval = window.setInterval(() => void load(), 10_000)
    const onVisible = () => {
      if (!document.hidden) void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      controller.abort()
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [period, refresh])

  const current = data?.period === period ? data : null
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="admin-eyebrow">OVERVIEW</p>
          <h1 className="mt-2 text-2xl font-semibold">一眼看清，网站近况。</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            浏览趋势、内容状态和待处理事项，都在这里。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="admin-live">
            <span />每 10 秒更新
          </span>
          <button
            onClick={() => setRefresh((v) => v + 1)}
            className="admin-icon-button"
            aria-label="刷新统计"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {error && (
        <div role="alert" className="admin-error">
          {error}{' '}
          <button className="underline" onClick={() => setRefresh((v) => v + 1)}>
            重新加载
          </button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={Eye}
          label="今日浏览量"
          value={data?.todayViews}
          detail={`昨日 ${data?.yesterdayViews.toLocaleString() ?? '—'} 次`}
        />
        <Metric
          icon={Activity}
          label="近 5 分钟浏览"
          value={data?.last5Minutes}
          detail="实时页面浏览次数"
          live
        />
        <Metric icon={TrendingUp} label="近一小时浏览" value={data?.lastHour} detail="按分钟汇总" />
        <Metric
          icon={BarChart3}
          label="累计浏览量"
          value={data?.allTimeViews}
          detail={data?.firstDay ? `从 ${data.firstDay} 开始` : '从启用统计开始记录'}
        />
      </div>
      <section className="admin-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">浏览趋势</h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {current
                ? `${current.startDay} — ${current.endDay} · ${current.granularity === 'month' ? '按月' : '按天'}汇总`
                : '正在切换时间范围…'}
            </p>
          </div>
          <div className="admin-periods" aria-label="统计时间范围">
            {PERIODS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} aria-pressed={period === p.key}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5 mt-6 flex items-baseline gap-3">
          <span className="text-3xl font-semibold tabular-nums">
            {current?.totalViews.toLocaleString() ?? '—'}
          </span>
          <span className="text-xs text-muted-foreground">次页面浏览</span>
          {current?.changePercent !== null && current?.changePercent !== undefined && (
            <span className="admin-change">
              {current.changePercent > 0 ? '+' : ''}
              {current.changePercent}% 较上一等长时段
            </span>
          )}
        </div>
        {current ? (
          <TrafficChart points={current.series} />
        ) : (
          <div className="admin-chart-loading">正在读取浏览趋势…</div>
        )}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <section className="admin-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">实时浏览</h2>
            <span className="text-xs text-muted-foreground">最近 60 分钟</span>
          </div>
          <div className="mt-5">
            {data ? (
              <TrafficChart
                points={data.realtime.map((p) => ({ label: p.time, count: p.count }))}
                realtime
              />
            ) : (
              <div className="admin-chart-loading">正在读取实时数据…</div>
            )}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            这里统计浏览次数，同一个人打开多个页面会计为多次。
          </p>
        </section>
        <section className="admin-panel">
          <h2 className="font-semibold">大家在看什么</h2>
          <p className="mt-1.5 text-xs text-muted-foreground">所选时间范围的热门页面</p>
          <div className="mt-6 space-y-5">
            {current?.topPages.length ? (
              current.topPages.slice(0, 6).map((p, i) => (
                <div key={p.path}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-xs">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="text-muted-foreground">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <a
                        className="truncate hover:text-primary"
                        href={p.path}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {PAGE_NAMES[p.path] ?? p.path}
                      </a>
                    </span>
                    <span className="tabular-nums">{p.count.toLocaleString()}</span>
                  </div>
                  <div className="ml-7 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/55"
                      style={{
                        width: `${(p.count / Math.max(1, current.topPages[0].count)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="py-10 text-center text-sm text-muted-foreground">还没有页面浏览记录</p>
            )}
          </div>
        </section>
      </div>
      <section className="admin-panel">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">需要你看一眼</h2>
          <span className="text-xs text-muted-foreground">内容与反馈</span>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            {
              tab: 'content' as const,
              label: '未发布草稿',
              count: overview?.content.withDraft,
              desc: `已发布 ${overview?.content.published ?? '—'} 条内容`,
            },
            {
              tab: 'feedback' as const,
              label: '待处理反馈',
              count: overview?.feedback.new,
              desc: '访客的纠错、问题和建议',
            },
            {
              tab: 'review' as const,
              label: '待复核内容',
              count: overview?.review.open,
              desc: '让资料保持新鲜和准确',
            },
          ].map((item) => (
            <button key={item.tab} onClick={() => onNavigate(item.tab)} className="admin-task-card">
              <span className="flex items-center justify-between text-xs text-muted-foreground">
                {item.label}
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <span className="mt-3 block text-2xl font-semibold">{item.count ?? '—'}</span>
              <span className="mt-2 block text-[11px] text-muted-foreground">{item.desc}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="flex flex-wrap justify-between gap-2 text-[11px] leading-5 text-muted-foreground">
        <span>统计时区：北京时间 · 页面浏览量 PV · 不记录访客身份</span>
        <span>
          {data
            ? `更新于 ${new Date(data.updatedAt).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' })}`
            : '正在连接统计服务'}
        </span>
      </div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  detail,
  live,
}: {
  icon: typeof Eye
  label: string
  value?: number
  detail: string
  live?: boolean
}) {
  return (
    <div className="admin-metric">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`admin-metric-icon ${live ? 'is-live' : ''}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-5 text-[2rem] font-semibold tabular-nums leading-none tracking-tight">
        {value === undefined ? '—' : value.toLocaleString()}
      </p>
      <p className="mt-3 text-[11px] text-muted-foreground">{detail}</p>
    </div>
  )
}
