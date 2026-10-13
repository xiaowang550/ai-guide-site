'use client'

import { useLayoutEffect, useRef, type ComponentProps, type ReactNode } from 'react'
import { sidebarBounds, sidebarOffset } from '@/lib/scroll-sidebar'

type Props = Omit<ComponentProps<'aside'>, 'children'> & {
  children: ReactNode
  as?: 'aside' | 'nav' | 'div'
}

/** Follow the viewport in both directions, staying inside the original column. */
export function ScrollSidebar({ children, className, as: Tag = 'aside', ...props }: Props) {
  const ref = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const header = document.querySelector<HTMLElement>('.site-header, .school-session-header')
    let bounds = sidebarBounds(0, window.innerHeight, 0)
    let offset = 0,
      previousY = window.scrollY,
      frame = 0,
      enabled = false,
      translation = 0,
      viewportHeight = window.innerHeight
    const render = () => {
      const rect = node.getBoundingClientRect()
      const naturalTop = rect.top - translation
      const end = node.parentElement!.getBoundingClientRect().bottom - rect.height
      translation = Math.max(0, Math.min(end, Math.max(naturalTop, offset)) - naturalTop)
      // Relative positioning retains the column's space in the grid and avoids
      // WebKit's delayed recalculation of a sticky inset changed during scrolling.
      node.style.top = `${translation}px`
      node.dataset.sidebarPin =
        offset === bounds.top ? 'top' : offset === bounds.bottom ? 'bottom' : 'moving'
    }
    const measure = () => {
      const wasEnabled = enabled
      node.style.removeProperty('position')
      node.style.removeProperty('top')
      translation = 0
      enabled = getComputedStyle(node).position === 'sticky' && node.getClientRects().length > 0
      if (!enabled) {
        node.style.removeProperty('top')
        delete node.dataset.sidebarPin
        previousY = window.scrollY
        return
      }
      const tabs = document.querySelector<HTMLElement>('.mobile-tabs')
      viewportHeight =
        window.innerHeight -
        (tabs && getComputedStyle(tabs).visibility !== 'hidden'
          ? tabs.getBoundingClientRect().height
          : 0)
      bounds = sidebarBounds(
        node.getBoundingClientRect().height,
        viewportHeight,
        header?.getBoundingClientRect().bottom ?? 0,
      )
      node.style.position = 'relative'
      if (!wasEnabled) offset = sidebarOffset(node.getBoundingClientRect().top, 0, bounds)
      else offset = sidebarOffset(offset, window.scrollY - previousY, bounds)
      previousY = window.scrollY
      render()
    }
    const scroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!enabled) return
        const y = window.scrollY
        offset = sidebarOffset(offset, y - previousY, bounds)
        previousY = y
        render()
      })
    }
    const focus = (event: FocusEvent) => {
      if (!enabled || !(event.target instanceof HTMLElement)) return
      const rect = event.target.getBoundingClientRect()
      const delta =
        rect.top < bounds.top
          ? rect.top - bounds.top
          : Math.max(0, rect.bottom - (viewportHeight - 16))
      offset = sidebarOffset(offset, delta, bounds)
      render()
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    if (header) observer.observe(header)
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('resize', measure)
    window.addEventListener('zhiya:layout', measure)
    node.addEventListener('focusin', focus)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('resize', measure)
      window.removeEventListener('zhiya:layout', measure)
      node.removeEventListener('focusin', focus)
      node.style.removeProperty('top')
      node.style.removeProperty('position')
      delete node.dataset.sidebarPin
    }
  }, [])
  return (
    <Tag
      {...props}
      className={className}
      ref={(node) => {
        ref.current = node
      }}
      data-scroll-sidebar
    >
      {children}
    </Tag>
  )
}
