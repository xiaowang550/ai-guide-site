'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, Compass, Menu, X } from 'lucide-react'
import { primaryNav, secondaryNav, siteConfig } from '@/lib/site'
import { useSiteModules } from './site-module-context'
import { pathEnabled } from '@/lib/site-modules'
import { cn } from '@/lib/utils'
import { MegaNav } from '@/components/mega-nav'
import { CommandSearch } from '@/components/command-search'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteHeader() {
  const { config } = useSiteModules()
  const custom = config.modules.some(
    (module) => module.kind !== 'builtin' && module.enabled && module.navigation,
  )
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false)
        menuButton.current?.focus()
      }
    }
    const resize = () => {
      if (window.innerWidth >= 1024) setMenuOpen(false)
    }
    document.addEventListener('keydown', close)
    window.addEventListener('resize', resize)
    return () => {
      document.removeEventListener('keydown', close)
      window.removeEventListener('resize', resize)
    }
  }, [menuOpen])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="site-header sticky top-0 z-40 border-b border-border/60 bg-background">
      <div className="container flex h-[72px] items-center gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold"
          aria-label={`${siteConfig.name} 首页`}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="h-[18px] w-[18px]" aria-hidden />
          </span>
          {/* 窄屏用 sr-only 而不是 hidden：hidden 会让链接在移动端失去可访问名称 */}
          <span className="hidden text-[15px] sm:inline">{siteConfig.name}</span>
          <span className="sr-only sm:hidden">{siteConfig.name}</span>
        </Link>

        <MegaNav />

        {/*
          三段式：品牌 + 分区 | 搜索 | 行动。
          搜索放在中间并且 flex-1，让它吃掉导航与右侧之间的空白 ——
          之前右侧簇带 ml-auto，空白全被 margin 吃掉，宽屏上中间留一个大洞，
          看起来像「左边挤成一团、右边空一块」。搜索撑开后这条横线才是完整的。

          搜索保持 flex-1 但设上限，免得在超宽屏上拉成一条 2000px 的输入框。
        */}
        {/*
          justify-end 在 lg 以下、lg:justify-start 在 lg 以上。
          桌面导航要到 lg 才出现，所以 lg 以下右侧本来就空着一大块
          —— 这时候让搜索框贴右（挨着 CTA），别贴左，否则 logo 与搜索之间
          会多出一个 400 多像素的洞。
          lg 起导航出现，搜索才回到它右侧、紧跟导航并向右伸展。
        */}
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 lg:justify-start">
          {/*
            宽度必须跟着占位文字的出现时机走，否则会出现「文字被截成『搜...』」：
            文字在 md 段出现、lg 段藏起来、xl 段再出现，所以宽度也是三段。
              - sm-md   7rem   文字不显示，只要图标 + 快捷键
              - md-lg  16rem   文字显示，且这一段导航还隐藏着、右侧空得多
              - lg-xl   7rem   文字藏起来（横向最挤的一段）
              - xl+     自适应 文字回来，向右伸展到 max-w-md 为止

            16rem 是按「11 个汉字 + 图标 + / 快捷键」实算出来的，
            比它窄占位文字就会被截成「搜索工具、概念、…」。
          */}
          <CommandSearch className="w-9 shrink-0 sm:w-[7rem] md:w-[16rem] lg:w-[7rem] xl:w-auto xl:max-w-md xl:flex-1" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {pathEnabled(config, '/saved') && (
            <Link
              href="/saved"
              title="我的学习夹"
              aria-label="打开我的学习夹"
              className="hidden h-9 w-9 items-center justify-center rounded-xl border text-muted-foreground hover:bg-accent xl:inline-flex"
            >
              <Bookmark className="h-4 w-4" />
            </Link>
          )}
          {/* 「帮我选」用实心底色，和导航里的灰字链接区分开。
              之前它和「教程」「案例」长得一模一样，扫一眼分不清哪个是浏览、
              哪个是要动手 —— 它其实是全站唯一的行动入口。 */}
          {pathEnabled(config, '/find') && (
            <Link
              href="/find"
              className={cn(
                'hidden h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors md:inline-flex',
                pathname.startsWith('/find')
                  ? 'bg-highlight text-highlight-foreground'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90',
              )}
            >
              帮我选
            </Link>
          )}
          <div className="hidden shrink-0 sm:block">
            <ThemeToggle />
          </div>
          <button
            ref={menuButton}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
          >
            {menuOpen ? (
              <X className="h-[18px] w-[18px]" aria-hidden />
            ) : (
              <Menu className="h-[18px] w-[18px]" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="mobile-nav" className="mobile-nav-panel border-t bg-background lg:hidden">
          <nav aria-label="移动端导航" className="container py-3">
            <ul className="grid gap-1 sm:grid-cols-2">
              {primaryNav
                .filter((item) => pathEnabled(config, item.href))
                .map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-baseline justify-between rounded-lg px-3 py-2 text-sm',
                        isActive(item.href)
                          ? 'bg-accent font-medium text-accent-foreground'
                          : 'hover:bg-muted',
                      )}
                    >
                      {item.label}
                      <span className="max-w-[55%] text-right text-xs text-muted-foreground">
                        {item.hint}
                      </span>
                    </Link>
                  </li>
                ))}
              <li className="mt-1 border-t pt-1 sm:col-span-2">
                <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  更多
                </p>
                <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                  {[
                    ...secondaryNav.filter((item) => pathEnabled(config, item.href)),
                    ...(custom
                      ? [{ href: '/modules/', label: '学习与实践模块', hint: '新资料与练习' }]
                      : []),
                  ].map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-baseline justify-between rounded-lg px-3 py-1.5 text-sm',
                          isActive(item.href)
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {item.label}
                        <span className="max-w-[55%] text-right text-[11px] text-muted-foreground">
                          {item.hint}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="sm:col-span-2">
                <div className="px-3 pt-1 sm:hidden">
                  <ThemeToggle />
                </div>
              </li>
            </ul>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
