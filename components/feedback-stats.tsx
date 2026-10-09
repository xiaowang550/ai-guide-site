'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Github, Loader2 } from 'lucide-react'
import {
  aggregateFeedback,
  buildIssuesApiUrl,
  feedbackCountFor,
  isValidRepo,
  normalizeIssues,
  type FeedbackStats,
} from '@/lib/feedback-stats'
import { siteConfig } from '@/lib/site'
import { cn } from '@/lib/utils'

/**
 * 反馈统计（读 GitHub 公开 Issues，无需 token）。
 *
 * 展示两件事：
 *   1) 全站一共收到多少条勘误反馈，其中多少还没处理
 *   2) 当前页面已有多少条反馈 —— 让读者知道"别人也发现了这里的问题"
 *
 * 仓库未配置 / API 不可用时静默隐藏，不给用户一个坏掉的数字。
 */
export function FeedbackStatsPanel({ pageUrl, className }: { pageUrl?: string; className?: string }) {
  const repo = siteConfig.feedbackRepo ?? ''
  const enabled = isValidRepo(repo)
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed' | 'hidden'>('loading')

  useEffect(() => {
    if (!enabled) {
      setState('hidden')
      return
    }
    let alive = true
    // 匿名读取有速率限制，失败就降级为不展示，绝不显示假的 0
    fetch(buildIssuesApiUrl(repo, 50), { headers: { Accept: 'application/vnd.github+json' } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (!alive) return
        setStats(aggregateFeedback(normalizeIssues(data)))
        setState('ready')
      })
      .catch(() => {
        if (!alive) return
        setState('failed')
      })
    return () => {
      alive = false
    }
  }, [enabled, repo])

  if (state === 'hidden' || state === 'failed' || !stats) return null

  const mine = pageUrl ? feedbackCountFor(stats, pageUrl) : 0

  return (
    <div className={cn('border-y border-hairline py-4 text-sm', className)}>
      <p className="flex flex-wrap items-baseline gap-x-2">
        <Github className="h-4 w-4 shrink-0" aria-hidden />
        <span className="font-medium">已收到 {stats.total} 条勘误反馈</span>
        {stats.open > 0 ? (
          <span className="text-muted-foreground">
            其中 <strong className="text-foreground">{stats.open}</strong> 条待核对
          </span>
        ) : stats.total > 0 ? (
          <span className="text-muted-foreground">已全部处理完毕</span>
        ) : null}
        {mine > 0 ? (
          <span className="text-muted-foreground">
            · 本页已被反馈 <strong className="text-foreground">{mine}</strong> 次
          </span>
        ) : null}
      </p>

      {stats.byPage.length > 0 ? (
        <div className="mt-3">
          <p className="eyebrow">被质疑最多的内容</p>
          <ul className="mt-2 space-y-1">
            {stats.byPage.slice(0, 3).map((p) => (
              <li key={p.pageUrl} className="flex items-baseline gap-2 text-sm">
                <span className="tabular-nums text-muted-foreground">{p.count}×</span>
                {p.pageUrl.startsWith('/') ? (
                  <Link href={p.pageUrl} className="link">
                    {p.pageUrl}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{p.pageUrl}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** 「提交到 GitHub Issue」按钮：仅在配置了仓库时出现 */
export function SubmitIssueButton({
  title,
  body,
  className,
}: {
  title: string
  body: string
  className?: string
}) {
  const repo = siteConfig.feedbackRepo ?? ''
  if (!isValidRepo(repo)) return null
  const params = new URLSearchParams({ title, body, labels: '勘误反馈' })
  return (
    <a
      href={`https://github.com/${repo}/issues/new?${params.toString()}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors hover:bg-accent',
        className
      )}
      title="在 GitHub 上提交一条反馈（你用自己的账号提交，本站不接触你的凭据）"
    >
      <Github className="h-3.5 w-3.5" aria-hidden />
      提交到 GitHub Issue
      <ExternalLink className="h-3 w-3" aria-hidden />
    </a>
  )
}

/** 小型加载占位（避免布局跳动） */
export function StatsPlaceholder() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      读取反馈统计…
    </span>
  )
}
