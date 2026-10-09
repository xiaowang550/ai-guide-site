'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * 访问统计与关键事件的采集端。
 *
 * ── 采集什么，不采集什么 ──
 *
 * 只上报两样东西：**当前页面路径**与**事件名**。
 * 不发 Cookie、不发 localStorage 标识、不发 IP、不发 User-Agent、不做浏览器指纹。
 * 后端据此按「天 × 路径」聚合，算不出「谁来了几次」—— 这是刻意的，
 * 对外承诺的「不做用户画像」不能在统计口开后门。
 *
 * 页面路径里也不含 query string（后端还会再归一化一次）：
 * 带 query 的 URL 可能包含搜索词或来源标记，那些不该被记下来。
 *
 * ── 为什么用事件委托而不是逐处埋点 ──
 *
 * 「点击复制提示词」「点击工具官网外链」这类事件散落在十几个组件里，
 * 每处加一行 setState 式的回调既啰嗦又容易漏。改成：
 *   · 组件上加 `data-track="prompt_copy"`（纯声明式，不改逻辑）
 *   · 这里挂一个全局委托监听，按属性名上报
 * 加一个新事件点的成本是给某个按钮加一个属性，而不是改一段状态管理。
 *
 * ── 失败绝不打扰访客 ──
 *
 * 上报走 fetch 且不 await，任何错误都吞掉。统计是「尽力而为」，
 * 让访客因为统计失败看到报错是本末倒置。
 */

export const TRACK_ATTR = 'data-track'

/** 供非 React 代码（以及懒加载场景）调用 */
export function track(event: string, path?: string): void {
  if (typeof window === 'undefined') return
  try {
    const body = JSON.stringify({
      events: [{ name: event, path: path ?? window.location.pathname }],
    })
    void fetch('/api/collect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {})
  } catch {
    /* 统计永远不能影响正常浏览 */
  }
}

/** 只报页面浏览，不带事件 */
function trackPageView(path: string): void {
  if (typeof window === 'undefined') return
  try {
    void fetch('/api/collect', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: JSON.stringify({ path }),
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {})
  } catch {
    /* 同上 */
  }
}

export function AnalyticsBeacon() {
  const pathname = usePathname()

  // 页面浏览：每次路由变化报一次
  useEffect(() => {
    if (!pathname) return
    // 跳过后台：后台的浏览量没有意义，而且后台页面的行为由审计日志覆盖
    if (pathname.startsWith('/admin')) return
    trackPageView(pathname)
  }, [pathname])

  // 事件委托：点击带 data-track 的元素
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest?.(`[${TRACK_ATTR}]`) as HTMLElement | null
      if (!el) return
      const name = el.getAttribute(TRACK_ATTR)
      if (name) track(name)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // 工具官网外链：这是「哪些工具真的被用起来」的直接信号，
  // 对内容取舍有实际价值。用委托而不是给每个链接加属性 ——
  // 因为「跳转到一个注册 / 定价页」本身就是想记的事件，链接在哪不重要。
  useEffect(() => {
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null
      const link = target?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!link) return
      const href = link.getAttribute('href') ?? ''
      if (!/^https?:\/\//i.test(href)) return
      if (href.startsWith(window.location.origin)) return
      // 只在工具详情页统计「跳去厂商官网」，别的地方不算
      if (!window.location.pathname.startsWith('/tools/')) return
      if (link.hasAttribute(TRACK_ATTR)) return // 已有更精确的事件标记
      track('tool_outbound')
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
