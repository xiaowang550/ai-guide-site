'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { Sparkles } from 'lucide-react'
import { readAiConfig, writeAiConfig, type AiConfig } from '@/lib/ai-client'
import type { AssistantDock } from '@/lib/settings'
import { readSettings, subscribeSettings, writeSettings } from '@/lib/settings'
import {
  computeDockPosition,
  DOCK_BUTTON_SIZE,
  panelWidthFor } from '@/lib/dock-position'
import { cn } from '@/lib/utils'

/**
 * AI 小助手浮窗（只负责「停在哪里 / 展开收起 / 拖拽」，不含任何数据与引擎）。
 *
 * ⚠️ 关键约束：面板（AssistantPanel）用 next/dynamic 按需加载。
 * 面板会引入决策器引擎与整份工具数据，如果静态 import，
 * 这份数据会被打进 layout chunk —— 全站每个页面都要下载它
 * （实测首屏会从 166 KB 涨到 314 KB）。这个教训写在 README「性能基线」章节里。
 */
const AssistantPanel = dynamic(() => import('./assistant-panel').then((m) => m.AssistantPanel), {
  ssr: false,
})



export function AssistantDock() {
  const [enabled, setEnabled] = useState(true)
  const [open, setOpen] = useState(false)
  const [dock, setDock] = useState<AssistantDock>('bottom-right')
  const [ready, setReady] = useState(false)
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null)

  const dragState = useRef<{
    dx: number
    dy: number
    /** pointerdown 时的起点，用于判断是否真的移动过（movementX/Y 在部分环境恒为 0） */
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // 读取本地设置
  useEffect(() => {
    const s = readSettings()
    setEnabled(s.assistant)
    setOpen(s.assistantPanelOpen)
    setDock(s.assistantDock)
    setAiConfig(readAiConfig())
    setReady(true)
    return subscribeSettings((next) => {
      setEnabled(next.assistant)
      setOpen(next.assistantPanelOpen)
      setDock(next.assistantDock)
    })
  }, [])

  // 窗口尺寸变化时把停靠位置贴回屏幕内
  useEffect(() => {
    if (!ready) return
    // 旋转屏幕 / 改变窗口大小后，把浮窗拉回可视区（自定义坐标也要夹紧）
    function reposition() {
      const el = wrapRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const next = computeDockPosition(
        { x: rect.left, y: rect.top },
        { width: window.innerWidth, height: window.innerHeight },
        open,
        { width: rect.width, height: rect.height }
      )
      if (Math.abs(next.left - rect.left) > 1 || Math.abs(next.top - rect.top) > 1) {
        el.style.left = `${next.left}px`
        el.style.top = `${next.top}px`
        // 自定义坐标存成 {x, y}，下次挂载按新视口重新夹紧
        setDock({ x: next.left, y: next.top })
      }
    }
    window.addEventListener('resize', reposition)
    return () => window.removeEventListener('resize', reposition)
  }, [ready, open])

  if (!ready || !enabled) return null

  // 窄屏上按实际可用宽度定位并夹紧，避免面板被推出屏幕（见 lib/dock-position.ts）
  const viewport = {
    width: typeof window === 'undefined' ? 1440 : window.innerWidth,
    height: typeof window === 'undefined' ? 900 : window.innerHeight,
  }
  const style = computeDockPosition(dock, viewport, open, {
    width: open ? panelWidthFor(viewport.width) : DOCK_BUTTON_SIZE,
    height: open ? 460 : DOCK_BUTTON_SIZE,
  })

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest('button, a, input')) return
    const el = wrapRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragState.current = {
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }

  function onPointerMove(e: React.PointerEvent) {
    const st = dragState.current
    const el = wrapRef.current
    if (!st || !el) return
    const x = e.clientX - st.dx
    const y = e.clientY - st.dy
    if (Math.abs(e.clientX - st.startX) > 3 || Math.abs(e.clientY - st.startY) > 3) {
      st.moved = true
    }
    const rect = el.getBoundingClientRect()
    const next = computeDockPosition(
      { x, y },
      { width: window.innerWidth, height: window.innerHeight },
      open,
      { width: rect.width, height: rect.height }
    )
    el.style.left = `${next.left}px`
    el.style.top = `${next.top}px`
  }

  function onPointerUp() {
    const st = dragState.current
    const el = wrapRef.current
    dragState.current = null
    if (!st || !el || !st.moved) return
    const rect = el.getBoundingClientRect()
    // 落下时再夹一次：保证「放下后一定还在屏幕里」（与 resize 用同一套逻辑）
    const next = computeDockPosition(
      { x: rect.left, y: rect.top },
      { width: window.innerWidth, height: window.innerHeight },
      open,
      { width: rect.width, height: rect.height }
    )
    const x = next.left
    const y = next.top
    el.style.left = `${x}px`
    el.style.top = `${y}px`
    setDock({ x, y })
    writeSettings({ assistantDock: { x, y } })
  }

  return (
    <div
      ref={wrapRef}
      data-print-hide
      className="fixed z-40"
      style={{ left: style.left, top: style.top, touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {open ? (
        <AssistantPanel
          width={panelWidthFor(viewport.width)}
          onClose={() => {
            setOpen(false)
            writeSettings({ assistantPanelOpen: false })
          }}
          onHide={() => {
            setOpen(false)
            setEnabled(false)
            writeSettings({ assistant: false, assistantPanelOpen: false })
          }}
          aiConfig={aiConfig}
          onToggleAi={() => setAiConfig(writeAiConfig({ mode: aiConfig?.mode === 'live' ? 'rules' : 'live' }))}
        />
      ) : null}

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v)
          writeSettings({ assistantPanelOpen: !open })
        }}
        aria-label={open ? '收起助手' : '打开站内助手'}
        aria-expanded={open}
        className={cn(
          'inline-flex h-[52px] w-[52px] items-center justify-center rounded-full border bg-card shadow-lg transition-colors',
          open ? 'border-primary/40 bg-primary text-primary-foreground' : 'hover:border-primary/40'
        )}
      >
        <Sparkles className="h-5 w-5 text-primary" aria-hidden />
      </button>
    </div>
  )
}