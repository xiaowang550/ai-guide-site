'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { AssistantAvatar } from './assistant-avatar'
import type { AssistantDock } from '@/lib/settings'
import { readSettings, subscribeSettings, writeSettings } from '@/lib/settings'
import { computeDockPosition, DOCK_BUTTON_SIZE } from '@/lib/dock-position'
import { AssistantBubble, useAssistantPresence } from './assistant-presence'
import { mascotState, type MascotState } from '@/lib/assistant-mascot'
import { useMascotContext } from './use-mascot-context'

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
  const [mounted, setMounted] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [panelState, setPanelState] = useState<MascotState>('resting')
  const path = usePathname()
  const inAdmin = path?.startsWith('/admin') ?? false
  const activity = useMascotContext(ready && enabled && !inAdmin)

  const dragState = useRef<{
    id: number
    dx: number
    dy: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)
  const suppressClick = useRef(false)
  const touchClickUntil = useRef(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const { hint, dismiss, dragging, pause } = useAssistantPresence({
    active: ready && enabled && !inAdmin,
    open,
    path,
    anchor: wrapRef,
  })
  function viewport() {
    const v = window.visualViewport
    const css = getComputedStyle(document.documentElement)
    const inset = (edge: string) => parseFloat(css.getPropertyValue('--safe-' + edge)) || 0
    return {
      width: v?.width ?? window.innerWidth,
      height: v?.height ?? window.innerHeight,
      left: v?.offsetLeft ?? 0,
      top: v?.offsetTop ?? 0,
      insets: {
        top: inset('top'),
        right: inset('right'),
        bottom: inset('bottom'),
        left: inset('left'),
      },
    }
  }
  // 读取本地设置
  useEffect(() => {
    const s = readSettings()
    setEnabled(s.assistant)
    setOpen(false)
    setDock(s.assistantDock)
    setMounted(false)
    setReady(true)
    // 新的一次访问只介绍助手；聊天窗口必须由用户点击打开。
    if (s.assistantPanelOpen) writeSettings({ assistantPanelOpen: false })
    return subscribeSettings((next) => {
      setEnabled(next.assistant)
      setOpen(next.assistantPanelOpen)
      if (next.assistantPanelOpen) setMounted(true)
      setDock(next.assistantDock)
    })
  }, [])

  useEffect(() => {
    if (!ready) return
    function reposition() {
      const el = wrapRef.current
      if (!el || dragState.current) return
      const next = computeDockPosition(readSettings().assistantDock, viewport(), false)
      el.style.left = `${next.left}px`
      el.style.top = `${next.top}px`
    }
    reposition()
    window.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('resize', reposition)
    window.visualViewport?.addEventListener('scroll', reposition)
    return () => {
      window.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('resize', reposition)
      window.visualViewport?.removeEventListener('scroll', reposition)
    }
  }, [ready, dock])

  // 后台不显示助手浮窗：它是为访客准备的问答入口，
  // 而后台已经有自己的反馈处理与审计记录，浮窗在这里只是干扰。
  // 同 GuidedTour —— 后台无法脱离公开站根布局，所以由组件自行识别路径退出。

  if (!ready || !enabled || inAdmin) return null
  const state = open
    ? panelState
    : mascotState({
        ...activity,
        dragging: isDragging,
        greeting: hint?.hello,
        hint: !!hint,
      })

  const position = computeDockPosition(dock, viewport(), false, {
    width: DOCK_BUTTON_SIZE,
    height: DOCK_BUTTON_SIZE,
  })
  function onPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!e.isPrimary || e.button !== 0) return
    pause()
    dragging.current = true
    const rect = wrapRef.current!.getBoundingClientRect()
    suppressClick.current = false
    dragState.current = {
      id: e.pointerId,
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  function onPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    const st = dragState.current,
      el = wrapRef.current
    if (!st || !el || st.id !== e.pointerId) return
    if (Math.hypot(e.clientX - st.startX, e.clientY - st.startY) > 8) {
      st.moved = true
      setIsDragging(true)
    }
    if (!st.moved) return
    const next = computeDockPosition(
      { x: e.clientX - st.dx, y: e.clientY - st.dy },
      viewport(),
      false,
    )
    el.style.left = `${next.left}px`
    el.style.top = `${next.top}px`
    el.dataset.dragging = 'true'
  }
  function toggleAssistant() {
    setMounted(true)
    pause()
    setOpen((v) => !v)
    writeSettings({ assistantPanelOpen: !open })
  }
  function endDrag(e: React.PointerEvent<HTMLButtonElement>) {
    const st = dragState.current,
      el = wrapRef.current
    if (!st || !el || st.id !== e.pointerId) return
    dragState.current = null
    setIsDragging(false)
    dragging.current = false
    delete el.dataset.dragging
    suppressClick.current = st.moved
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
    if (e.type === 'pointercancel' || e.type === 'lostpointercapture') {
      const previous = computeDockPosition(dock, viewport(), false)
      el.style.left = `${previous.left}px`
      el.style.top = `${previous.top}px`
    } else if (st.moved) {
      const rect = el.getBoundingClientRect()
      const next = computeDockPosition({ x: rect.left, y: rect.top }, viewport(), false)
      setDock({ x: next.left, y: next.top })
      writeSettings({ assistantDock: { x: next.left, y: next.top } })
    } else if (e.type === 'pointerup' && e.pointerType === 'touch') {
      // 手机浏览器不一定派发兼容 click；轻触在 pointerup 完成，忽略其后重复的 click。
      touchClickUntil.current = performance.now() + 650
      e.preventDefault()
      toggleAssistant()
    }
  }
  return (
    <div
      ref={wrapRef}
      data-print-hide
      className="assistant-launcher fixed z-40"
      data-greeting={hint?.hello ? 'true' : undefined}
      data-state={state}
      style={{
        left: position.left,
        top: position.top,
        width: DOCK_BUTTON_SIZE,
        height: DOCK_BUTTON_SIZE,
      }}
    >
      {hint && !open && <AssistantBubble {...hint} anchor={wrapRef} onDismiss={dismiss} />}
      {mounted ? (
        <AssistantPanel
          open={open}
          onStateChange={setPanelState}
          onClose={() => {
            setOpen(false)
            writeSettings({ assistantPanelOpen: false })
          }}
        />
      ) : null}

      <button
        type="button"
        title="小芽：点击聊天，按住可拖动"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
        style={{ touchAction: 'none', cursor: 'grab' }}
        onClick={(e) => {
          const pointerType = (e.nativeEvent as PointerEvent).pointerType
          const touchDuplicate =
            pointerType !== 'mouse' && performance.now() < touchClickUntil.current
          if (e.detail > 0 && (suppressClick.current || touchDuplicate)) {
            suppressClick.current = false
            e.preventDefault()
            return
          }
          suppressClick.current = false
          toggleAssistant()
        }}
        aria-label={open ? '收起助手' : '打开站内助手'}
        aria-expanded={open}
        className="assistant-pet-button"
      >
        <span className="assistant-pet-shadow" aria-hidden="true" />
        <span className="assistant-pet-gaze">
          <span className="assistant-pet-float">
            <AssistantAvatar full state={state} />
          </span>
        </span>
      </button>
    </div>
  )
}
