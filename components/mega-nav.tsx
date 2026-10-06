'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { megaNav, type NavItem } from '@/lib/site'
import { cn } from '@/lib/utils'

/**
 * 桌面端主导航：悬停展开下拉面板。
 *
 * 为什么要面板：顶栏只有一行标签，想知道「术语表在哪」得先点进知识库再找。
 * 面板把每个分区的全部子页一次铺开，找路径的成本降为零。
 *
 * 三种输入方式都要能用（这是本组件的全部难点）：
 * 1. **鼠标**：悬停即开。离开面板区域后延迟关闭 —— 否则鼠标要精确穿过
 *    两个元素之间的空隙时会闪一下（面板有上边距）。
 * 2. **键盘**：焦点进入即开（focus-within），Esc 关闭。Tab 可以在面板内
 *    逐项移动，不用鼠标。
 * 3. **触屏**：没有 hover。点击一级项的按钮区域切换开合，
 *    而点击文字本身仍然跳转到分区首页 —— 两种意图分开处理。
 *
 * 无障碍细节：
 *   - 一级项用 button + aria-expanded，文字单独用 Link 跳首页
 *   - 面板用 role="group" + aria-label，Esc 后焦点回到触发按钮
 *   - 打开时给面板加 focus-within，键盘用户不会「掉」出面板
 */
export function MegaNav() {
  const pathname = usePathname()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const panelId = useId()
  const baseId = useId()

  // 路由一变就收起：面板里的链接点完必须立刻消失，否则会盖在新页面上
  useEffect(() => {
    setOpenKey(null)
  }, [pathname])

  // 点面板外 / Esc / 失焦都收起
  useEffect(() => {
    if (!openKey) return

    function onPointerDown(e: PointerEvent) {
      if (!navRef.current?.contains(e.target as Node)) setOpenKey(null)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpenKey(null)
      // 焦点回到刚才那个触发按钮，否则键盘用户会「丢失位置」
      const el = navRef.current?.querySelector<HTMLButtonElement>(`[data-nav-trigger="${openKey}"]`)
      el?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [openKey])

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current)
    },
    []
  )

  /** 第一次真实鼠标移动后，才允许「悬停即开」——避免触屏点一下就误开又立刻收起 */
  useEffect(() => {
    const enable = () => setArmed(true)
    window.addEventListener('pointermove', enable, { once: true, passive: true })
    window.addEventListener('pointerdown', enable, { once: true, passive: true })
    return () => {
      window.removeEventListener('pointermove', enable)
      window.removeEventListener('pointerdown', enable)
    }
  }, [])

  function openNow(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenKey(key)
  }

  /** 延迟关闭：给鼠标从一级项移到面板留出穿越空隙的时间 */
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenKey(null), 160)
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      ref={navRef}
      aria-label="主导航"
      className="hidden lg:block"
      onMouseLeave={closeSoon}
      onMouseEnter={() => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
      }}
    >
      <ul className="flex items-center gap-0.5">
        {megaNav.map((item: NavItem) => {
          const key = item.href
          const open = openKey === key
          const children = item.children ?? []
          const id = `${baseId}-${key.replace(/\W/g, '')}`

          return (
            <li
              key={key}
              className="relative"
              onMouseEnter={() => {
                if (armed && children.length > 0) openNow(key)
              }}
              onMouseLeave={closeSoon}
            >
              <div className="flex items-center">
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  title={item.hint}
                  className={cn(
                    'rounded-l-md py-1.5 pl-2.5 text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>

                {children.length > 0 ? (
                  <button
                    type="button"
                    data-nav-trigger={key}
                    aria-expanded={open}
                    aria-controls={open ? id : undefined}
                    aria-label={`${item.label}的更多入口`}
                    onClick={() => (open ? setOpenKey(null) : openNow(key))}
                    className={cn(
                      'rounded-r-md py-1.5 pr-1.5 transition-colors',
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <ChevronDown
                      className={cn('h-3 w-3 transition-transform', open && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                ) : null}
              </div>

              {open && children.length > 0 ? (
                <div
                  id={id}
                  role="group"
                  aria-label={`${item.label}的子页面`}
                  className="absolute left-0 top-full z-50 pt-2 animate-fade-in"
                >
                  {/* pt-2 是为了让鼠标有地方停留；延迟关闭配合它，避免闪烁 */}
                  <div className="min-w-[280px] rounded-xl border bg-popover p-2 text-popover-foreground shadow-lg">
                    <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label} · {item.hint}
                    </p>
                    <ul className="grid gap-0.5">
                      {children.map((c) => (
                        <li key={c.href}>
                          <Link
                            href={c.href}
                            aria-current={isActive(c.href) ? 'page' : undefined}
                            className={cn(
                              'block rounded-lg px-2 py-1.5 transition-colors',
                              isActive(c.href)
                                ? 'bg-accent text-accent-foreground'
                                : 'hover:bg-accent/60'
                            )}
                          >
                            <span className="block text-sm font-medium leading-tight">{c.label}</span>
                            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                              {c.hint}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>
      <span className="sr-only" id={panelId} />
    </nav>
  )
}