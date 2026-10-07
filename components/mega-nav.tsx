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

  /**
   * 延迟关闭：给鼠标从一级项移到面板留出穿越空隙的时间。
   *
   * 原来 160ms，实测下来鼠标扫过一级项与面板之间那段 8px 空白时仍会闪一下。
   * W3C 的 fly-out 参考实现用 1000ms 关闭延迟，Baymard 建议悬停类交互
   * 用 300-500ms。这里取 260ms：既避免闪烁，又不至于让面板在指针已经
   * 移开后还赖着不走。
   */
  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenKey(null), 260)
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
      {/*
        一级项间距。对齐 7 个文档站量出来的数值：Tailwind 24 / Vercel 24 / MDN 26 /
        Zustand 32 / Pydantic 32 —— 5/5 有一级项的站点都落在 24-32px。
        原来是 gap-1（4px），标签几乎贴在一起，这就是顶栏「挤」的主因。

        xl 以下收成 16px：中文项每项 70-110px，1024px 断点处若直接上 24px，
        整条栏只剩 27px 余量，再窄一点的窗口就会挤掉搜索框。
        一级项也从 7 个减到 6 个（学习路径收进教程面板）腾出横向预算。
      */}
      <ul className="flex items-center gap-4 xl:gap-6">
        {megaNav.map((item: NavItem, index: number) => {
          const key = item.href
          const open = openKey === key
          const children = item.children ?? []
          const id = `${baseId}-${key.replace(/\W/g, '')}`
          // 末尾两项的面板改为右对齐，否则会从窗口右边探出去
          const isLast = index >= megaNav.length - 2

          return (
            <li
              key={key}
              className="relative"
              onMouseEnter={() => {
                if (armed && children.length > 0) openNow(key)
              }}
              onMouseLeave={closeSoon}
            >
              {/* gap-0.5 = 4px：标签与箭头的间距，5/7 个站点量出来完全一致
                  （MDN .25rem / Zustand 4px / Pydantic .25rem / Tailwind gap-1 / Vercel 3px）。
                  箭头是独立按钮，靠这个间隙让它视觉上仍属于同一个控件。 */}
              <div className="flex items-center gap-0.5">
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  title={item.hint}
                  className={cn(
                    // h-9 与搜索框、主题按钮同高：顶栏里三种控件原本是 24/32/36px，
                    // 高度不齐会让整条栏看起来「挤」—— 视觉上找不到一条统一的水平线。
                    //
                    // 横向内边距刻意保持紧凑（pl-2.5 / pr-1.5）：试过放大到 pl-3 + pr-2，
                    // 一排 7 个标签的自然宽度从 365px 涨到 542px，中间那段搜索框
                    // 在 1024px 断点处被压到只剩十几像素，等于没有。所以这里只统一
                    // 高度和箭头对齐，不动横向留白。
                    'flex h-9 items-center rounded-l-lg pl-2.5 text-sm transition-colors',
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
                      // 箭头是独立的 tab 停止点（触屏上文字跳转、箭头开面板），
                      // 但视觉上贴着文字，仍属于同一个按钮。
                      'flex h-9 items-center rounded-r-lg pr-1.5 transition-colors',
                      isActive(item.href)
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <ChevronDown
                      className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
                      aria-hidden
                    />
                  </button>
                ) : (
                  // 没有面板的分区补一个等宽的右侧留白，
                  // 否则「知识库▾」和「教程」这类项的箭头位置不对齐，
                  // 整排标签看上去就是参差的。
                  <span
                    aria-hidden
                    className={cn(
                      'h-9 w-2',
                      isActive(item.href) && 'bg-accent rounded-r-lg'
                    )}
                  />
                )}
              </div>

              {open && children.length > 0 ? (
                <div
                  id={id}
                  role="group"
                  aria-label={`${item.label}的子页面`}
                  className={cn(
                    // 面板一律向右展开会顶出视口：靠右的一级项（「数据与站点」）
                    // 在 1024px 段展开时右边缘会超出窗口几十像素。
                    // 所以最后两项改成右对齐，并把宽度同时按视口夹住，
                    // 两道保险都在，窄窗口下也不会横向溢出。
                    'absolute top-full z-50 pt-2 animate-fade-in',
                    isLast ? 'right-0' : 'left-0'
                  )}
                >
                  {/* pt-2 是为了让鼠标有地方停留；延迟关闭配合它，避免闪烁 */}
                  <div
                    className={cn(
                      // 圆角 8px、内边距 8px：面板圆角与内边距的实测值
                      // （Pydantic .5rem/8px、Zustand 8px/8px、MDN 22px 分组面板）。
                      // 项数多时改成双列 —— 「学校服务」6 个子项都是平级的，
                      // 单列排下来面板能到 330px 高，鼠标要跨很远才够得到底部的项。
                      // 依据：Vercel 的 Build 面板用 3 列（三个平行生命周期），
                      // 只有「一堆跳转链接」的 Learn 面板才用单列。
                      'rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg',
                      children.length > 4
                        ? 'w-[34rem] max-w-[min(34rem,calc(100vw-2rem))]'
                        : 'min-w-[17.5rem] max-w-[calc(100vw-2rem)]'
                    )}
                  >
                    <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      {item.label} · {item.hint}
                    </p>
                    <ul
                      className={cn(
                        'grid gap-0.5',
                        children.length > 4 && 'grid-cols-2 gap-x-2'
                      )}
                    >
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