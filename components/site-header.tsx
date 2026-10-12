'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bookmark, Menu, X } from 'lucide-react'
import { BrandMark } from './brand-mark'
import { secondaryNav, siteConfig } from '@/lib/site'
import { siteNavigation } from '@/lib/site-navigation'
import { useSiteModules } from './site-module-context'
import { pathEnabled } from '@/lib/site-modules'
import { cn } from '@/lib/utils'
import { MegaNav } from '@/components/mega-nav'
import { CommandSearch } from '@/components/command-search'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteHeader() {
  const { config } = useSiteModules()
  const navigation = siteNavigation(config)
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
      <div className="container flex h-[72px] items-center gap-3 xl:gap-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold"
          aria-label={`${siteConfig.name} 首页`}
        >
          <BrandMark />
          {/* 窄屏用 sr-only 而不是 hidden：hidden 会让链接在移动端失去可访问名称 */}
          <span className="sr-only">{siteConfig.name}</span>
        </Link>

        <Link
          href="/"
          aria-label="返回首页"
          aria-current={pathname === '/' ? 'page' : undefined}
          className={cn(
            'inline-flex h-9 shrink-0 items-center rounded-xl px-2.5 text-sm transition-colors lg:hidden',
            pathname === '/'
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          )}
        >
          首页
        </Link>

        <MegaNav />
        <Link
          href={`/feedback/?from=${encodeURIComponent(pathname)}`}
          prefetch={false}
          aria-current={pathname.startsWith('/feedback') ? 'page' : undefined}
          className={cn(
            'hidden h-9 shrink-0 items-center whitespace-nowrap rounded-xl px-2.5 text-sm lg:inline-flex',
            pathname.startsWith('/feedback')
              ? 'bg-accent font-medium text-accent-foreground'
              : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          )}
        >
          问题反馈
        </Link>

        {/* 搜索靠右并限制宽度，为导航末尾的文字反馈入口留出空间。 */}
        <div className="flex min-w-0 flex-1 items-center justify-end">
          <CommandSearch className="w-9 shrink-0 sm:w-[7rem] md:w-[16rem] lg:w-[5rem] xl:w-full xl:max-w-[22rem]" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/feedback/?from=${encodeURIComponent(pathname)}`}
            prefetch={false}
            title="问题反馈"
            aria-label="问题反馈"
            className="inline-flex h-9 items-center justify-center rounded-xl border px-2 text-sm text-muted-foreground hover:bg-accent hover:text-primary lg:hidden"
          >
            反馈
          </Link>
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
              {navigation.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
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
                <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  更多
                </p>
                <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                  {[...secondaryNav.filter((item) => pathEnabled(config, item.href))].map(
                    (item) => (
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
                          <span className="max-w-[55%] text-right text-xs text-muted-foreground">
                            {item.hint}
                          </span>
                        </Link>
                      </li>
                    ),
                  )}
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
