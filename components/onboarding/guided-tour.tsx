'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname } from 'next/navigation'
import { ArrowRight, Compass, Grid3x3, LayoutTemplate, MessageSquareQuote, X } from 'lucide-react'
import { readSettings, writeSettings } from '@/lib/settings'
import { cn } from '@/lib/utils'

/**
 * 新手引导（首次进入自动播放，可随时跳过）。
 *
 * 为什么要它：站内信息量不小，而新用户最常见的卡点是「不知道从哪下手」。
 * 引导只做三件事：指出从哪开始、解释这个站是干什么的、告诉用户随时能跳过。
 *
 * 设计约束：
 * - 不做强制流程：任何一步都能「跳过」，跳过后不再打扰（设置页可重看）
 * - 不遮挡交互的入口：只有当前步的高亮区域可点，其余半透明但不强锁
 * - 尊重 prefers-reduced-motion：关掉滑动动画
 */

interface Step {
  id: string
  title: string
  body: string
  /** CSS 选择器：高亮这个区域 */
  target?: string
  /** 找不到目标时的兜底锚点 */
  fallbackHref?: string
}

const STEPS: Step[] = [
  {
    id: 'what',
    title: '这个站解决三个问题',
    body: 'AI 是什么、怎么用、该用哪个。我们不做工具大全，而是把每个工具的能力量化成 14 个维度，并把弱项和「别用它做」都写清楚。',
  },
  {
    id: 'decision',
    title: '不知道用哪个？用场景决策器',
    body: '你只需要说「我要干什么」，它会告诉你用哪个、为什么、怎么问。推荐由站内规则算出，同样输入永远同样结果，可以质疑。',
    target: 'header a[href="/find"]',
    fallbackHref: '/find',
  },
  {
    id: 'tools',
    title: '工具库：先看能力地图',
    body: '每个工具都有 14 维雷达图、强项、弱项和价格。表格视图可以横向比对，筛选器里最实用的是「大陆可直连」。',
    target: 'header a[href="/tools"]',
    fallbackHref: '/tools',
  },
  {
    id: 'assistant',
    title: '右下角这个助手可以问它',
    body: '它不联网、不调用大模型，只查站内的数据，回答都能点进页面核对。可以拖到任何位置，不想要就在设置里关掉。',
  },
]

export function GuidedTour() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const [mounted, setMounted] = useState(false)

  const reduced = useMemo(() => {
    if (typeof window === 'undefined') return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  // 首次进入自动开始（读完或跳过后不再打扰）
  useEffect(() => {
    setMounted(true)
    const settings = readSettings()
    if (!settings.onboardingDone) setActive(true)
  }, [])

  const step = STEPS[index]

  // 定位高亮区域
  useEffect(() => {
    if (!active || !step?.target) {
      setRect(null)
      return
    }
    const el = document.querySelector(step.target)
    if (!el) {
      setRect(null)
      return
    }
    const update = () => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update)
    }
  }, [active, step?.target, pathname])

  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') finish()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!mounted || !active || !step) return null

  function finish() {
    writeSettings({ onboardingDone: true })
    setActive(false)
  }

  function next() {
    if (index >= STEPS.length - 1) {
      finish()
      return
    }
    setIndex((i) => i + 1)
  }

  const padding = 8
  const hole =
    rect && step.target
      ? {
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
        }
      : null

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="新手引导">
      {/* 遮罩：用 box-shadow 挖洞，不阻断内部点击 */}
      <div
        className="absolute inset-0 bg-foreground/25"
        style={
          hole
            ? {
                clipPath: `polygon(
                  0% 0%, 0% 100%, ${hole.left}px 100%,
                  ${hole.left}px ${hole.top}px,
                  ${hole.left + hole.width}px ${hole.top}px,
                  ${hole.left + hole.width}px ${hole.top + hole.height}px,
                  ${hole.left}px ${hole.top + hole.height}px,
                  ${hole.left}px 100%, 100% 100%, 100% 0%
                )`,
              }
            : undefined
        }
      />

      {/* 高亮框 */}
      {hole ? (
        <div
          className={cn(
            'pointer-events-none absolute rounded-lg ring-2 ring-primary',
            !reduced && 'animate-fade-in'
          )}
          style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
        />
      ) : null}

      {/* 卡片 */}
      <div
        className={cn(
          'absolute w-[min(360px,calc(100vw-32px))] border bg-popover p-5 shadow-2xl',
          hole ? 'rounded-xl' : 'rounded-xl',
          !reduced && 'animate-slide-up'
        )}
        style={
          hole
            ? {
                top: Math.min(hole.top + hole.height + 12, (typeof window !== 'undefined' ? window.innerHeight : 800) - 240),
                left: Math.min(Math.max(12, hole.left), (typeof window !== 'undefined' ? window.innerWidth : 1280) - 372),
              }
            : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        }
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {index === 0 ? (
              <MessageSquareQuote className="h-4 w-4" aria-hidden />
            ) : index === 1 ? (
              <Compass className="h-4 w-4" aria-hidden />
            ) : index === 2 ? (
              <Grid3x3 className="h-4 w-4" aria-hidden />
            ) : (
              <LayoutTemplate className="h-4 w-4" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              第 {index + 1} / {STEPS.length} 步
            </p>
            <h2 className="mt-1 text-base font-semibold leading-6">{step.title}</h2>
            <p className="mt-2 text-[13px] leading-6 text-foreground/85">{step.body}</p>
          </div>
          <button
            type="button"
            onClick={finish}
            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="跳过引导"
            title="跳过（之后可在设置里重看）"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex gap-1" aria-hidden>
            {STEPS.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  i <= index ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={finish}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            跳过
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {index >= STEPS.length - 1 ? '开始使用' : '下一步'}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

/** 设置页用：手动重新播放引导 */
export function replayOnboarding(): void {
  writeSettings({ onboardingDone: false })
  window.location.reload()
}