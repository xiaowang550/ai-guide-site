'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ExternalLink, RotateCcw, ChevronDown } from 'lucide-react'
import type { LearningPath, PathItem } from '@/data/types'
import { cn } from '@/lib/utils'

const STORAGE_PREFIX = 'ai-map:path-progress:'

const TYPE_LABEL: Record<PathItem['type'], string> = {
  concept: '概念',
  guide: '教程',
  tool: '工具',
  case: '案例',
}

/** 学习路径进度：勾选状态存 localStorage，不需要登录 */
export function PathProgress({ path }: { path: LearningPath }) {
  const storageKey = `${STORAGE_PREFIX}${path.id}`
  const [done, setDone] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      setDone(raw ? (JSON.parse(raw) as Record<string, boolean>) : {})
    } catch {
      setDone({})
    }
    setLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!loaded) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(done))
    } catch {
      /* 隐私模式下写入失败可忽略 */
    }
  }, [done, loaded, storageKey])

  const allItems = useMemo(() => path.phases.flatMap((p) => p.items), [path])
  const completed = allItems.filter((item) => done[item.href]).length
  const percent = allItems.length === 0 ? 0 : Math.round((completed / allItems.length) * 100)

  const phaseStats = path.phases.map((phase) => {
    const c = phase.items.filter((item) => done[item.href]).length
    return {
      phase,
      done: c,
      total: phase.items.length,
      percent: phase.items.length ? Math.round((c / phase.items.length) * 100) : 0,
    }
  })

  function toggle(href: string) {
    setDone((prev) => ({ ...prev, [href]: !prev[href] }))
  }

  function reset() {
    setDone({})
  }

  return (
    <div>
      {/* 总进度 */}
      <div className="path-progress-summary mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">
            进度 {completed} / {allItems.length} 项
            <span className="ml-2 text-muted-foreground">约 {path.estHours} 小时</span>
          </p>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            重置进度
          </button>
        </div>
        <div
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="学习路径完成度"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {percent === 100
            ? '全部完成。可以去AI 实时资讯看看有没有新变化，或者挑战下一条路径。'
            : `完成度 ${percent}%。勾选状态只保存在你自己的浏览器里，不会上传。`}
        </p>
      </div>

      {/* 阶段 */}
      <div className="space-y-4">
        {phaseStats.map(({ phase, done: d, total, percent: p }, index) => (
          <details className="path-phase" key={phase.title} open={index === 0}>
            <summary>
              <span className="path-phase-number">{index + 1}</span>
              <h2 className="min-w-0 flex-1 text-lg font-semibold">{phase.title}</h2>
              <span className="shrink-0 text-xs text-muted-foreground">
                {d}/{total} 已完成
              </span>
              <ChevronDown size={20} aria-hidden />
            </summary>
            <p className="mt-1.5 rounded-lg bg-accent/40 px-3 py-2 text-sm leading-6 text-foreground/85">
              学完你能做什么：{phase.outcome}
            </p>
            <ul className="path-phase-items">
              {phase.items.map((item) => {
                const checked = Boolean(done[item.href])
                return (
                  <li
                    key={item.href}
                    className={cn(
                      'transition-colors',
                      checked ? 'border-primary/40 bg-accent/20' : 'bg-card',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item.href)}
                      aria-pressed={checked}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-primary"
                      aria-label={checked ? `取消勾选 ${item.label}` : `标记完成：${item.label}`}
                    >
                      {checked ? (
                        <CheckCircle2 className="h-5 w-5" aria-hidden />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" aria-hidden />
                      )}
                    </button>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block text-sm font-medium',
                          checked && 'text-muted-foreground line-through',
                        )}
                      >
                        {item.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{TYPE_LABEL[item.type]}</span>
                    </span>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-11 shrink-0 items-center text-xs font-medium text-primary hover:underline"
                    >
                      去学习
                      <ExternalLink className="ml-1 inline h-3 w-3" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-score-4 transition-[width] duration-500"
                style={{ width: `${p}%` }}
              />
            </div>
          </details>
        ))}
      </div>
    </div>
  )
}
