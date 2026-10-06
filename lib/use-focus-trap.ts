'use client'

import { useEffect, useRef } from 'react'

/**
 * 焦点陷阱（focus trap）。
 *
 * 为什么必须有：模态框打开后，Tab 会跑到背后的页面上去 ——
 * 屏幕阅读器用户会以为自己在浏览主内容，实际上焦点已经离开弹窗，
 * 这是键盘与读屏用户最常见的"卡死"方式。
 *
 * 同时负责：关闭后把焦点还给打开它的那个元素。
 */
export function useFocusTrap(
  active: boolean,
  onClose: () => void
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active) return

    // 记住打开前的焦点，关闭时归还
    restoreRef.current = document.activeElement as HTMLElement | null

    const node = ref.current
    const focusables = () => {
      if (!node) return [] as HTMLElement[]
      return Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null || el === document.activeElement)
    }

    // 打开后把焦点移进弹窗
    const first = focusables()[0]
    first?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const firstEl = items[0]
      const lastEl = items[items.length - 1]
      const activeEl = document.activeElement as HTMLElement | null

      // Shift+Tab 在第一个元素上 → 回到最后一个；Tab 在最后一个 → 回到第一个
      if (e.shiftKey && (activeEl === firstEl || !node?.contains(activeEl))) {
        e.preventDefault()
        lastEl.focus()
      } else if (!e.shiftKey && activeEl === lastEl) {
        e.preventDefault()
        firstEl.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      // 焦点归还：关闭后回到触发按钮，而不是页面顶部
      const back = restoreRef.current
      if (back && document.contains(back)) {
        back.focus()
      } else {
        document.body.focus()
      }
    }
  }, [active, onClose])

  return ref
}
