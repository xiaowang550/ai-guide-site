'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  assistantBubblePosition,
  assistantHint,
  canShowAssistantHint,
  ASSISTANT_HELLO_MS,
  ASSISTANT_QUIET_MS,
  ASSISTANT_HINT_DURATION_MS,
} from '@/lib/assistant-presence'

const SEEN = 'ai-map:assistant-hello:v2',
  QUIET = 'ai-map:assistant-quiet:v2',
  LAST_SHOWN = 'ai-map:assistant-last-hint:v3',
  SEQUENCE = 'ai-map:assistant-hint-sequence:v3'
function sessionValue(key: string) {
  try {
    return Number(sessionStorage.getItem(key)) || 0
  } catch {
    return 0
  }
}
function remember(key: string, value: number) {
  try {
    sessionStorage.setItem(key, String(value))
  } catch {}
}
export function useAssistantPresence({
  active,
  open,
  path,
  anchor,
}: {
  active: boolean
  open: boolean
  path: string
  anchor: React.RefObject<HTMLDivElement | null>
}) {
  const [hint, setHint] = useState<{ hello: boolean; text: string } | null>(null)
  const lastInteraction = useRef(Date.now()),
    lastShown = useRef(Date.now()),
    helloShown = useRef(false)
  const quietUntil = useRef(0),
    sequence = useRef(0),
    dragging = useRef(false)
  const clearHint = () => {
    setHint(null)
    lastInteraction.current = Date.now()
  }
  const dismiss = () => {
    clearHint()
    quietUntil.current = Date.now() + ASSISTANT_QUIET_MS
    remember(QUIET, quietUntil.current)
  }
  useEffect(() => {
    setHint(null)
    if (!active) return
    const previouslySeen = sessionValue(SEEN)
    helloShown.current = helloShown.current || !!previouslySeen
    // 完整页面导航也保留计时，避免每到一个页面都重新等待三分钟。
    const remembered = sessionValue(LAST_SHOWN) || previouslySeen
    if (remembered && remembered <= Date.now()) lastShown.current = remembered
    sequence.current = sessionValue(SEQUENCE)
    quietUntil.current = sessionValue(QUIET)
    if (open) {
      setHint(null)
      lastShown.current = Date.now()
      remember(LAST_SHOWN, lastShown.current)
      return
    }
    let hide: ReturnType<typeof setTimeout> | undefined
    let introTimer: ReturnType<typeof setTimeout> | undefined
    function close() {
      setHint(null)
      if (hide) clearTimeout(hide)
    }
    function interact() {
      lastInteraction.current = Date.now()
    }
    function typed(e: Event) {
      interact()
      if (
        (e.target as HTMLElement)?.matches(
          'input,textarea,select,[contenteditable]:not([contenteditable="false"])',
        )
      )
        close()
    }
    function visible() {
      interact()
      if (document.hidden) close()
    }
    function tick() {
      const el = document.activeElement as HTMLElement | null
      const hello = !helloShown.current
      if (
        !canShowAssistantHint({
          now: Date.now(),
          lastInteraction: lastInteraction.current,
          lastShown: lastShown.current,
          quietUntil: quietUntil.current,
          hello,
          hidden: document.hidden,
          panelOpen: open,
          dragging: dragging.current,
          typing: !!el?.matches(
            'input,textarea,select,[contenteditable]:not([contenteditable="false"])',
          ),
          modal: !!document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]'),
        })
      )
        return
      lastShown.current = Date.now()
      remember(LAST_SHOWN, lastShown.current)
      helloShown.current = true
      if (hello) remember(SEEN, lastShown.current)
      setHint({
        hello,
        text: hello
          ? '找工具、学提示词、起草材料，点我就能聊。'
          : assistantHint(path, sequence.current++),
      })
      remember(SEQUENCE, sequence.current)
      if (hide) clearTimeout(hide)
      hide = setTimeout(close, hello ? 12000 : ASSISTANT_HINT_DURATION_MS)
    }
    const initial = setTimeout(tick, ASSISTANT_HELLO_MS),
      periodic = setInterval(tick, 10000)
    const afterIntro = () => {
      interact()
      if (introTimer) clearTimeout(introTimer)
      introTimer = setTimeout(tick, ASSISTANT_HELLO_MS)
    }
    window.addEventListener('ai-map:intro-closed', afterIntro)
    window.addEventListener('pointerdown', interact, { passive: true })
    window.addEventListener('keydown', interact)
    window.addEventListener('scroll', interact, { passive: true })
    document.addEventListener('input', typed)
    document.addEventListener('focusin', typed)
    document.addEventListener('visibilitychange', visible)
    return () => {
      clearTimeout(initial)
      clearInterval(periodic)
      if (hide) clearTimeout(hide)
      if (introTimer) clearTimeout(introTimer)
      window.removeEventListener('ai-map:intro-closed', afterIntro)
      window.removeEventListener('pointerdown', interact)
      window.removeEventListener('keydown', interact)
      window.removeEventListener('scroll', interact)
      document.removeEventListener('input', typed)
      document.removeEventListener('focusin', typed)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [active, open, path])

  useEffect(() => {
    if (!active || open) return
    const reduce = matchMedia('(prefers-reduced-motion: reduce)'),
      fine = matchMedia('(pointer: fine)')
    let frame = 0,
      px = 0,
      py = 0
    function reset() {
      const el = anchor.current
      if (!el) return
      el.style.setProperty('--pet-x', '0px')
      el.style.setProperty('--pet-y', '0px')
      el.style.setProperty('--pet-turn', '0deg')
    }
    function move(e: PointerEvent) {
      if (e.pointerType !== 'mouse' || reduce.matches || !fine.matches || dragging.current) {
        reset()
        return
      }
      px = e.clientX
      py = e.clientY
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const el = anchor.current
        if (!el || dragging.current) return
        if (reduce.matches || !fine.matches) {
          reset()
          return
        }
        const r = el.getBoundingClientRect(),
          dx = px - r.left - r.width / 2,
          dy = py - r.top - r.height / 2
        if (Math.hypot(dx, dy) > 180) {
          reset()
          return
        }
        const clamp = (v: number, max: number) => Math.max(-max, Math.min(max, v))
        el.style.setProperty('--pet-x', clamp(dx / 30, 3).toFixed(2) + 'px')
        el.style.setProperty('--pet-y', clamp(dy / 45, 2).toFixed(2) + 'px')
        el.style.setProperty('--pet-turn', clamp(dx / 35, 4).toFixed(2) + 'deg')
      })
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('blur', reset)
    reduce.addEventListener('change', reset)
    fine.addEventListener('change', reset)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('blur', reset)
      reduce.removeEventListener('change', reset)
      fine.removeEventListener('change', reset)
      cancelAnimationFrame(frame)
      reset()
    }
  }, [active, open, anchor])
  return {
    hint,
    dismiss,
    clearHint,
    dragging,
    pause: () => {
      clearHint()
      lastShown.current = Date.now()
      remember(LAST_SHOWN, lastShown.current)
    },
  }
}

export function AssistantBubble({
  hello,
  text,
  anchor,
  onDismiss,
}: {
  hello: boolean
  text: string
  anchor: React.RefObject<HTMLDivElement | null>
  onDismiss: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: 0, top: 0, above: true, tail: 200 })
  useLayoutEffect(() => {
    function place() {
      const el = anchor.current,
        bubble = ref.current
      if (!el || !bubble) return
      const v = window.visualViewport,
        rect = bubble.getBoundingClientRect()
      setPosition(
        assistantBubblePosition(
          el.getBoundingClientRect(),
          {
            width: v?.width ?? innerWidth,
            height: v?.height ?? innerHeight,
            left: v?.offsetLeft ?? 0,
            top: v?.offsetTop ?? 0,
          },
          { width: rect.width, height: rect.height },
        ),
      )
    }
    place()
    window.addEventListener('resize', place)
    window.visualViewport?.addEventListener('resize', place)
    window.visualViewport?.addEventListener('scroll', place)
    return () => {
      window.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('scroll', place)
    }
  }, [anchor, text])
  return (
    <div
      ref={ref}
      role="status"
      aria-live={hello ? 'polite' : 'off'}
      className="assistant-discovery"
      data-placement={position.above ? 'above' : 'below'}
      style={
        {
          left: position.left,
          top: position.top,
          '--bubble-tail': position.tail + 'px',
        } as React.CSSProperties
      }
    >
      <button
        type="button"
        aria-label="关闭助手提示，半小时内不再提醒"
        title="半小时内不再提醒"
        onClick={onDismiss}
      >
        ×
      </button>
      <strong>{hello ? '我是小芽，你的 AI 学习搭子' : '小芽轻轻说'}</strong>
      <p>{text}</p>
      {hello && <span>点击我聊天 · 按住我拖动</span>}
    </div>
  )
}
