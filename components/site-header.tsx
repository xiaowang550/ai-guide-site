'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Menu, School, X } from 'lucide-react'
import { primaryNav, secondaryNav } from '@/lib/site'
import { cn } from '@/lib/utils'
import { CommandSearch } from '@/components/command-search'
import { ThemeToggle } from '@/components/theme-toggle'

export function SiteHeader() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="container flex h-14 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold" aria-label="AI 能力地图 首页">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="h-4 w-4" aria-hidden />
          </span>
          {/* 窄屏用 sr-only 而不是 hidden：hidden 会让链接在移动端失去可访问名称 */}
          <span className="hidden text-[15px] sm:inline">AI 能力地图</span>
          <span className="sr-only sm:hidden">AI 能力地图</span>
        </Link>

        <nav aria-label="主导航" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.hint}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/find"
            className={cn(
              'hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors md:inline-flex',
              pathname.startsWith('/find')
                ? 'bg-highlight/12 text-highlight'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            帮我选
          </Link>
          <Link
            href="/edu"
            className={cn(
              'hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors xl:inline-flex',
              pathname.startsWith('/edu')
                ? 'bg-primary/12 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <School className="h-3.5 w-3.5" aria-hidden />
            学校服务
          </Link>
          <CommandSearch />
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? '关闭菜单' : '打开菜单'}
          >
            {menuOpen ? <X className="h-4 w-4" aria-hidden /> : <Menu className="h-4 w-4" aria-hidden />}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div id="mobile-nav" className="border-t bg-background lg:hidden">
          <nav aria-label="移动端导航" className="container py-3">
            <ul className="grid gap-1 sm:grid-cols-2">
              {primaryNav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-baseline justify-between rounded-lg px-3 py-2 text-sm',
                      isActive(item.href)
                        ? 'bg-accent font-medium text-accent-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {item.label}
                    <span className="text-xs text-muted-foreground">{item.hint}</span>
                  </Link>
                </li>
              ))}
              <li className="sm:col-span-2 mt-1 border-t pt-1">
                <p className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  更多
                </p>
                <ul className="mt-1 grid gap-0.5 sm:grid-cols-2">
                  {secondaryNav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-baseline justify-between rounded-lg px-3 py-1.5 text-sm',
                          isActive(item.href)
                            ? 'bg-accent font-medium text-accent-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        {item.label}
                        <span className="text-[11px] text-muted-foreground">{item.hint}</span>
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