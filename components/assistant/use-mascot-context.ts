'use client'
import { useEffect, useState } from 'react'
export function useMascotContext(active: boolean) {
  const [searching, setSearching] = useState(false)
  const [resting, setResting] = useState(false)
  useEffect(() => {
    if (!active) return
    let last = Date.now()
    function activity() {
      last = Date.now()
      setResting(false)
    }
    function focus() {
      const el = document.activeElement
      const search =
        el instanceof HTMLInputElement &&
        (el.type === 'search' ||
          /搜索|查找/.test([el.placeholder, el.getAttribute('aria-label')].join(' ')))
      setSearching(search)
      activity()
    }
    const interval = window.setInterval(() => {
      if (!document.hidden) setResting(Date.now() - last > 60000)
    }, 10000)
    document.addEventListener('focusin', focus)
    document.addEventListener('focusout', focus)
    document.addEventListener('input', activity)
    window.addEventListener('pointerdown', activity, { passive: true })
    window.addEventListener('scroll', activity, { passive: true })
    return () => {
      clearInterval(interval)
      document.removeEventListener('focusin', focus)
      document.removeEventListener('focusout', focus)
      document.removeEventListener('input', activity)
      window.removeEventListener('pointerdown', activity)
      window.removeEventListener('scroll', activity)
    }
  }, [active])
  return { searching, resting }
}
