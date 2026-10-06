'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 全站微交互层：一个组件、少量全局委托监听，
 * 避免给每张卡片都套一层 client 组件（否则会把整页变成客户端渲染）。
 *
 * 1) spotlight：鼠标在 .spotlight 元素内移动时，把光标位置写进 --mx / --my，
 *    由 CSS 画一层很淡的径向高光。
 * 2) reveal：元素进入视口时加 .is-in 触发淡入上移。
 *    刻意不用 IntersectionObserver —— 它在部分环境（后台标签页、无头浏览器、
 *    无合成器更新）不会触发回调，一旦回调缺失内容就会永久停在 opacity:0。
 *    这里用 rAF 节流的滚动检测 + 1.5 秒兜底定时器：最坏情况只是没动画，内容一定可见。
 * 3) 阅读进度条：只有长页面显示，滚到底自动淡出。
 *
 * 无障碍：动效遵循 prefers-reduced-motion（CSS 侧还有一层 !important 兜底）。
 */
export function MotionLayer() {
  const pathname = usePathname()

  // ---------- 1) spotlight：全局委托 ----------
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let last: { el: HTMLElement; x: number; y: number } | null = null

    function write() {
      if (!last) return
      const { el, x, y } = last
      const rect = el.getBoundingClientRect()
      if (rect.width === 0) return
      el.style.setProperty('--mx', `${((x - rect.left) / rect.width) * 100}%`)
      el.style.setProperty('--my', `${((y - rect.top) / rect.height) * 100}%`)
    }

    function onMove(e: PointerEvent) {
      const target = e.target as HTMLElement | null
      const el = target?.closest?.('.spotlight') as HTMLElement | null
      // 离开某个 spotlight 时清掉高亮，避免残影
      document
        .querySelectorAll<HTMLElement>('.spotlight.is-lit')
        .forEach((n) => n !== el && n.classList.remove('is-lit'))
      if (!el) return
      el.classList.add('is-lit')
      last = { el, x: e.clientX, y: e.clientY }
      // 直接写 CSS 自定义属性，不走 requestAnimationFrame：
      // 两次赋值开销可忽略，换来的是不依赖帧调度，
      // 在不跑帧的环境（后台标签页 / 无头浏览器）里高亮依然跟手。
      write()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  // ---------- 2) reveal：进入视口淡入（路由切换后重新扫描） ----------
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let pending: HTMLElement[] = []
    let ticking = false
    let timer: ReturnType<typeof setTimeout> | undefined

    function detach() {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (timer) clearTimeout(timer)
    }

    function check() {
      ticking = false
      if (pending.length === 0) return
      const limit = window.innerHeight * 0.94
      const rest: HTMLElement[] = []
      for (const el of pending) {
        if (el.getBoundingClientRect().top < limit) el.classList.add('is-in')
        else rest.push(el)
      }
      pending = rest
      if (pending.length === 0) detach()
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(check)
    }

    pending = Array.from(document.querySelectorAll<HTMLElement>('.reveal:not(.is-in)'))

    if (pending.length > 0) {
      if (reduced) {
        pending.forEach((el) => el.classList.add('is-in'))
        pending = []
      } else {
        check()
        if (pending.length > 0) {
          window.addEventListener('scroll', onScroll, { passive: true })
          window.addEventListener('resize', onScroll, { passive: true })
          // 兜底一：1.5 秒后把「视口上下一个屏以内」的剩余元素强制入场。
          // 作用域刻意只覆盖可见范围 —— 更深处的卡片仍保留滚动入场，
          // 同时保证用户没滚动也不会在首屏看到错位的入口区。
          timer = setTimeout(() => {
            const limit = window.innerHeight * 2
            for (const el of pending) {
              if (el.getBoundingClientRect().top < limit) el.classList.add('is-in')
            }
          }, 1500)
        }
      }
    }

    // 兜底二：2.4 秒后摘掉 html.js-reveal，让 reveal 规则整体失效。
    // 覆盖"某些环境不推进 CSS 过渡"的情况：即便动画卡住，
    // 元素也已经回到没有任何 transform 的静态状态。
    const settle = setTimeout(() => {
      document.documentElement.classList.remove('js-reveal')
    }, 2400)

    return () => {
      clearTimeout(settle)
      detach()
    }
  }, [pathname])

  return <ReadingProgress />
}

/** 阅读进度条：概念 / 教程 / 案例这类长文页才有意义 */
function ReadingProgress() {
  useEffect(() => {
    const bar = document.getElementById('reading-progress')
    if (!bar) return
    const el: HTMLElement = bar

    let visible = false
    let ticking = false

    function update() {
      ticking = false
      const doc = document.documentElement
      const total = doc.scrollHeight - window.innerHeight
      const longPage = doc.scrollHeight > window.innerHeight * 2.2
      const progress = total > 0 ? Math.min(1, window.scrollY / total) : 0
      // 短页面不显示；接近底部时淡出，避免和页脚撞在一起
      const shouldShow = longPage && progress > 0.01 && progress < 0.995
      if (shouldShow !== visible) {
        visible = shouldShow
        el.style.opacity = shouldShow ? '1' : '0'
      }
      el.style.transform = `scaleX(${progress})`
    }

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  return (
    <div
      id="reading-progress"
      aria-hidden
      className="pointer-events-none fixed left-0 right-0 top-0 z-30 h-[2px] origin-left bg-primary/70 opacity-0 transition-opacity duration-300"
    />
  )
}