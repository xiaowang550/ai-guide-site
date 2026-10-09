'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowUpRight, Search, X } from 'lucide-react'
import { SEARCH_TYPE_LABELS } from '@/lib/search-labels'
import type { searchDocs } from '@/lib/search'
import { pathEnabled } from '@/lib/site-modules'
import { useSiteModules } from './site-module-context'
import { useSearchIndex } from '@/components/use-search-index'
import { cn } from '@/lib/utils'

const SUGGESTIONS = ['周报', 'PPT', '表格', '提示词']
const SHORTCUTS = [
  { title: '写一份周报', href: '/guides/weekly-report' },
  { title: '整理长文档', href: '/guides/long-pdf-summary' },
  { title: '找一个合适的工具', href: '/find' },
]

/** 普通输入框 + 锚定结果面板。Portal 避免顶栏的 backdrop-filter 影响搜索。 */
export function CommandSearch({ className }: { className?: string } = {}) {
  const router = useRouter()
  const pathname = usePathname()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [position, setPosition] = useState({ top: 66, left: 16, width: 500, height: 450 })
  const wrapper = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const desktopInput = useRef<HTMLInputElement>(null)
  const mobileInput = useRef<HTMLInputElement>(null)
  const { docs, state: indexState } = useSearchIndex(open)
  const { config } = useSiteModules()
  const [matcher, setMatcher] = useState<typeof searchDocs | null>(null),
    [engineError, setEngineError] = useState(false)
  const state = engineError ? 'error' : indexState === 'ready' && !matcher ? 'loading' : indexState
  useEffect(() => {
    if (!open || matcher) return
    let active = true
    void import('@/lib/search')
      .then((module) => {
        if (active) setMatcher(() => module.searchDocs)
      })
      .catch(() => {
        if (active) setEngineError(true)
      })
    return () => {
      active = false
    }
  }, [open, matcher])
  const hits = useMemo(() => (matcher ? matcher(docs, query, 8) : []), [docs, query, matcher])
  const close = useCallback(() => setOpen(false), [])

  useEffect(() => {
    close()
  }, [pathname, close])
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable
      if ((!typing && e.key === '/') || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault()
        setOpen(true)
        window.setTimeout(
          () => (window.innerWidth < 640 ? mobileInput : desktopInput).current?.focus(),
          0,
        )
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault()
        close()
        desktopInput.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const rect = wrapper.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.min(520, window.innerWidth - 32)
      const top = rect.bottom + 10
      setPosition({
        top,
        left:
          window.innerWidth < 640
            ? 16
            : Math.max(16, Math.min(rect.right - width, window.innerWidth - width - 16)),
        width,
        height: Math.max(150, window.innerHeight - top - 24),
      })
    }
    place()
    const outside = (e: PointerEvent) => {
      if (
        !wrapper.current?.contains(e.target as Node) &&
        !panel.current?.contains(e.target as Node)
      )
        close()
    }
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', outside)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place)
    }
  }, [open, close])

  useEffect(() => {
    panel.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const go = (href: string) => {
    close()
    setQuery('')
    router.push(href)
  }
  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.max(0, Math.min(hits.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1))))
    } else if (e.key === 'Enter' && query.trim()) {
      e.preventDefault()
      go(hits[active]?.doc.href ?? `/search?q=${encodeURIComponent(query.trim())}`)
    } else if (e.key === 'Tab') close()
  }
  const inputProps = {
    value: query,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(e.target.value)
      setActive(0)
      setOpen(true)
    },
    onKeyDown: onKey,
    role: 'combobox',
    'aria-expanded': open,
    'aria-controls': `${id}-results`,
    'aria-activedescendant': open && hits[active] ? `${id}-${active}` : undefined,
    'aria-autocomplete': 'list' as const,
    'aria-label': '搜索工具、教程和概念',
    autoComplete: 'off',
  }

  return (
    <div ref={wrapper} className={cn('search-anchor', className)}>
      <div className="header-search hidden h-9 items-center gap-2 rounded-lg border bg-background px-3 sm:flex">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={desktopInput}
          {...inputProps}
          onFocus={() => setOpen(true)}
          placeholder="搜索工具、教程…"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              desktopInput.current?.focus()
            }}
            aria-label="清空搜索"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : (
          <kbd aria-hidden className="hidden text-[10px] text-muted-foreground xl:block">
            /
          </kbd>
        )}
      </div>
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background sm:hidden"
        aria-label="打开搜索"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v)
          window.setTimeout(() => mobileInput.current?.focus(), 0)
        }}
      >
        <Search className="h-4 w-4" />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            className="search-popover"
            style={{
              top: position.top,
              left: position.left,
              width: position.width,
              maxHeight: position.height,
            }}
          >
            <div className="flex items-center gap-2 border-b px-4 py-3 sm:hidden">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                ref={mobileInput}
                {...inputProps}
                placeholder="搜索工具、教程…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none focus-visible:ring-0"
              />
              <button type="button" onClick={close} aria-label="关闭搜索">
                <X className="h-4 w-4" />
              </button>
            </div>
            {!query.trim() ? (
              <div className="p-4">
                <p className="text-[11px] text-muted-foreground">试试这些关键词</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((word) => (
                    <button
                      key={word}
                      type="button"
                      className="search-suggestion"
                      onClick={() => {
                        setQuery(word)
                        setActive(0)
                        desktopInput.current?.focus()
                      }}
                    >
                      {word}
                    </button>
                  ))}
                </div>
                <p className="mb-2 mt-5 text-[11px] text-muted-foreground">直接开始一件事</p>
                {SHORTCUTS.filter((item) => pathEnabled(config, item.href)).map((s) => (
                  <Link key={s.href} href={s.href} onClick={close} className="search-shortcut">
                    {s.title}
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
                <div id={`${id}-results`} role="listbox" aria-label="搜索结果" />
              </div>
            ) : (
              <div className="min-h-0 overflow-y-auto p-2">
                <ul id={`${id}-results`} role="listbox" aria-label="搜索结果">
                  {hits.map((hit, i) => (
                    <li key={`${hit.doc.type}-${hit.doc.id}`}>
                      <button
                        id={`${id}-${i}`}
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(hit.doc.href)}
                        className={cn('search-result', i === active && 'is-active')}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 text-sm font-medium" title={hit.doc.title}>
                            {hit.doc.title}
                          </span>
                          {hit.doc.subtitle && (
                            <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                              {hit.doc.subtitle}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {SEARCH_TYPE_LABELS[hit.doc.type]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                {!hits.length && (
                  <p role="status" className="p-6 text-center text-sm text-muted-foreground">
                    {state === 'loading'
                      ? '正在搜索…'
                      : state === 'error'
                        ? '搜索暂时不可用，请刷新重试。'
                        : '没有找到结果，试试短一点的词。'}
                  </p>
                )}
              </div>
            )}
            <div className="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-3 text-[10px] text-muted-foreground">
              <span>↑↓ 选择 · Enter 打开 · Esc 关闭</span>
              {query.trim() && (
                <Link
                  href={`/search?q=${encodeURIComponent(query.trim())}`}
                  onClick={close}
                  className="text-primary"
                >
                  全部结果 →
                </Link>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  )
}
