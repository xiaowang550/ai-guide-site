'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/** Progressive decoration: content is visible even if a frame or observer never runs. */
export function RefinementMotion() {
  const pathname = usePathname()
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const fine = matchMedia('(hover: hover) and (pointer: fine)')
    let last: HTMLElement | null = null
    const restore = () => {
      last?.style.setProperty('--xi-rx', '0deg')
      last?.style.setProperty('--xi-ry', '0deg')
      last?.classList.remove('xi-pointed')
      last = null
    }
    const pointer = (e: PointerEvent) => {
      if (preference.matches || !fine.matches) return restore()
      const el = (e.target as Element).closest<HTMLElement>(
        '.x-tool-card, .x-case-card, .xt-resource',
      )
      if (el !== last) restore()
      if (!el) return
      last = el
      const r = el.getBoundingClientRect()
      el.classList.add('xi-pointed')
      el.style.setProperty('--xi-rx', `${(0.5 - (e.clientY - r.top) / r.height) * 4}deg`)
      el.style.setProperty('--xi-ry', `${((e.clientX - r.left) / r.width - 0.5) * 5}deg`)
      el.style.setProperty('--xi-x', `${e.clientX - r.left}px`)
      el.style.setProperty('--xi-y', `${e.clientY - r.top}px`)
    }
    document.addEventListener('pointermove', pointer, { passive: true })
    document.addEventListener('pointerleave', restore)
    window.addEventListener('blur', restore)
    let observer: IntersectionObserver | undefined
    if (!preference.matches && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) =>
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add('xi-enter')
            observer?.unobserve(entry.target)
          }),
        { threshold: 0.08 },
      )
      document
        .querySelectorAll(
          '.x-section-heading, .x-task-demo, .x-terminal, .x-learning-intro, .x-case-card, .xt-resource',
        )
        .forEach((el, i) => {
          ;(el as HTMLElement).style.setProperty('--xi-delay', `${(i % 3) * 65}ms`)
          observer?.observe(el)
        })
    }
    return () => {
      observer?.disconnect()
      restore()
      document.removeEventListener('pointermove', pointer)
      document.removeEventListener('pointerleave', restore)
      window.removeEventListener('blur', restore)
    }
  }, [pathname])
  return null
}
