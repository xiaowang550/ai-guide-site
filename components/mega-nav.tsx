'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { megaNav, type NavItem } from '@/lib/site'
import { useSiteModules } from './site-module-context'
import { pathEnabled } from '@/lib/site-modules'
import { cn } from '@/lib/utils'

export function MegaNav() {
  const { config } = useSiteModules()
  const custom = config.modules.some(
    (module) => module.kind !== 'builtin' && module.enabled && module.navigation,
  )
  const visibleNav = megaNav.filter((item) => pathEnabled(config, item.href))
  if (custom && !visibleNav.length)
    visibleNav.push({ href: '/modules/', label: '更多模块', hint: '新资料与练习' })
  const pathname = usePathname()
  const [openKey, setOpenKey] = useState<string | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navRef = useRef<HTMLElement | null>(null)
  const baseId = useId()

  useEffect(() => {
    setOpenKey(null)
  }, [pathname])

  useEffect(() => {
    if (!openKey) return

    function onPointerDown(e: PointerEvent) {
      if (!navRef.current?.contains(e.target as Node)) setOpenKey(null)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setOpenKey(null)

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
    [],
  )

  function openNow(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpenKey(key)
  }

  function closeSoon() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    closeTimer.current = setTimeout(() => setOpenKey(null), 260)
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <nav
      ref={navRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpenKey(null)
      }}
      aria-label="主导航"
      className="hidden lg:block"
      onMouseLeave={closeSoon}
      onMouseEnter={() => {
        if (closeTimer.current) clearTimeout(closeTimer.current)
      }}
    >
      <ul className="flex items-center gap-4 xl:gap-6">
        {visibleNav.map((item: NavItem, index: number) => {
          const key = item.href
          const open = openKey === key
          const children = [
            ...(item.children ?? []).filter((child) => pathEnabled(config, child.href)),
            ...(custom && item.href !== '/modules/' && index === visibleNav.length - 1
              ? [{ href: '/modules/', label: '学习与实践模块', hint: '打开最新添加的资料与练习' }]
              : []),
          ]
          const id = `${baseId}-${key.replace(/\W/g, '')}`

          const isLast = index >= visibleNav.length - 2

          return (
            <li
              key={key}
              className="relative"
              onMouseEnter={() => {
                if (closeTimer.current) clearTimeout(closeTimer.current)
              }}
              onMouseLeave={closeSoon}
            >
              {children.length > 0 ? (
                <button
                  type="button"
                  data-nav-trigger={key}
                  aria-expanded={open}
                  aria-controls={open ? id : undefined}
                  onClick={() => (open ? setOpenKey(null) : openNow(key))}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown') {
                      event.preventDefault()
                      openNow(key)
                      requestAnimationFrame(() =>
                        document.getElementById(id)?.querySelector<HTMLAnchorElement>('a')?.focus(),
                      )
                    }
                  }}
                  className={cn(
                    'flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-sm transition-colors',
                    isActive(item.href) || open
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                  <ChevronDown
                    className={cn('h-3.5 w-3.5 transition-transform', open && 'rotate-180')}
                    aria-hidden
                  />
                </button>
              ) : (
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={cn(
                    'flex h-9 items-center rounded-xl px-2.5 text-sm transition-colors',
                    isActive(item.href)
                      ? 'bg-accent font-medium text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              )}

              {open && children.length > 0 ? (
                <div
                  id={id}
                  role="group"
                  aria-label={`${item.label}的子页面`}
                  className={cn(
                    'absolute top-full z-50 animate-fade-in pt-2',
                    isLast ? 'right-0' : 'left-0',
                  )}
                >
                  <div
                    className={cn(
                      'rounded-2xl border bg-popover p-2 text-popover-foreground shadow-lg',
                      children.length > 4
                        ? 'w-[34rem] max-w-[min(34rem,calc(100vw-2rem))]'
                        : 'min-w-[17.5rem] max-w-[calc(100vw-2rem)]',
                    )}
                  >
                    <Link
                      href={item.href}
                      onClick={() => setOpenKey(null)}
                      className="flex items-center justify-between rounded-xl px-3 py-3 text-sm font-semibold hover:bg-accent/60"
                    >
                      进入{item.label}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                    </Link>
                    <ul
                      className={cn('grid gap-0.5', children.length > 4 && 'grid-cols-2 gap-x-2')}
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
                                : 'hover:bg-accent/60',
                            )}
                          >
                            <span className="block text-sm font-medium leading-tight">
                              {c.label}
                            </span>
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
    </nav>
  )
}
