'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CornerDownLeft, Search, X } from 'lucide-react'
import { SEARCH_TYPE_LABELS, searchDocs } from '@/lib/search'
import { useSearchIndex } from '@/components/use-search-index'
import { cn } from '@/lib/utils'
import { useFocusTrap } from '@/lib/use-focus-trap'

/** 全局搜索：按 `/` 唤起，方向键选择，回车跳转 */
export function CommandSearch({ className }: { className?: string } = {}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  // 索引按需加载：只有真的打开搜索时才请求 /search-index.json
  const { docs, state } = useSearchIndex(open)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  // 焦点陷阱：Tab 不会跑到背后的页面去；关闭后焦点回到触发按钮
  const closePanel = () => setOpen(false)
  const trapRef = useFocusTrap(open, closePanel)

  const hits = useMemo(() => searchDocs(docs, query, 12), [docs, query])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (e.key === '/' && !typing) {
        e.preventDefault()
        setOpen(true)
      } else if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setActive(0)
      // 焦点交给 focus trap 处理（它会把焦点落到第一个可聚焦元素）
    const t = setTimeout(() => {
      if (!document.querySelector('[role="dialog"] input')) inputRef.current?.focus()
    }, 10)
      // 弹窗打开时锁住背景滚动，避免滚轮穿透到底层页面
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        clearTimeout(t)
        document.body.style.overflow = prev
      }
    }
  }, [open])

  const go = useCallback(
    (href: string) => {
      setOpen(false)
      setQuery('')
      router.push(href)
    },
    [router]
  )

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && hits[active]) {
      e.preventDefault()
      go(hits[active].doc.href)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'hidden h-9 w-full min-w-0 items-center gap-2 rounded-lg border bg-background pl-3 pr-2 text-sm',
          'text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/40 sm:flex',
          // 宽度完全交给外层容器控制（site-header 里那段 flex-1 + max-w）。
          // 这里不再自带 max-width，否则两处约束会打架。
          className
        )}
        aria-label="打开全局搜索（快捷键斜杠）"
      >
        <Search className="h-4 w-4 shrink-0" aria-hidden />
        {/* 占位文字的出现时机：md（导航还隐藏、右侧空得多）显示，
            lg（导航出现、横向最挤）又藏起来，xl 之后再展开。
            量了 7 个文档站，桌面端搜索的主流是紧凑型（Pydantic 40px 纯图标、
            Tailwind 图标+⌘K 约 90px、MDN 80px），只有 Zustand 用 140px+ 带文字；
            本站一级项是中文，每项 70-110px，1024px 处只剩 90px 出头，
            这时候塞占位文字只会被截成一个字。 */}
        <span className="hidden min-w-0 flex-1 truncate pr-4 md:inline lg:hidden xl:inline">
          搜索工具、概念、教程…
        </span>
        {/* kbd 标 aria-hidden：按钮已有 aria-label="打开全局搜索（快捷键斜杠）"，
            不加的话屏幕阅读器会把可见的 "/" 也念一遍，重复播报。
            这个细节来自 Pydantic AI 的实现（唯一一个同时做了
            aria-keyshortcuts 与 kbd aria-hidden 的站点）。 */}
        <kbd
          aria-hidden
          className="ml-auto rounded border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
        >
          /
        </kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border bg-background text-muted-foreground sm:hidden"
        aria-label="打开全局搜索"
      >
        <Search className="h-4 w-4" aria-hidden />
      </button>

      {open ? (
        <div
          ref={trapRef}
          className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 px-4 pt-[10vh] backdrop-blur-[3px] animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="全局搜索"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl ring-1 ring-black/5 animate-slide-up dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b px-4 transition-shadow focus-within:border-primary/40">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onInputKeyDown}
                placeholder="搜工具名、概念（如 幻觉 / RAG）、教程场景…"
                className="h-12 w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/80"
                aria-label="搜索关键词"
              />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label="关闭搜索"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2">
              {query.trim() === '' ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  <p>输入关键词开始搜索</p>
                  <p className="mt-2 text-xs">
                    {state === 'loading'
                      ? '正在加载搜索索引…'
                      : state === 'error'
                        ? '搜索索引加载失败，请刷新页面重试'
                        : `共收录 ${docs.length} 条内容：工具、概念、教程、案例、学习路径、课程、教案包、简报`}
                  </p>
                </div>
              ) : hits.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  {state === 'loading'
                    ? '正在加载搜索索引…'
                    : state === 'error'
                      ? '搜索索引加载失败，请刷新页面重试'
                      : `没有找到「${query}」相关内容`}
                  {state === 'ready' ? (
                    <p className="mt-2 text-xs">试试更短的关键词，或直接去场景决策器描述你的需求</p>
                  ) : null}
                </div>
              ) : (
                <ul role="listbox" aria-label="搜索结果">
                  {hits.map((hit, i) => (
                    <li key={`${hit.doc.type}-${hit.doc.id}`}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(hit.doc.href)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-popover-foreground transition-colors',
                          i === active ? 'bg-accent' : 'hover:bg-accent/60'
                        )}
                      >
                        <span className="mt-0.5 shrink-0 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {SEARCH_TYPE_LABELS[hit.doc.type]}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{hit.doc.title}</span>
                          {hit.doc.subtitle ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {hit.doc.subtitle}
                            </span>
                          ) : null}
                          {hit.doc.summary ? (
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground/80">
                              {hit.doc.summary}
                            </span>
                          ) : null}
                        </span>
                        {i === active ? (
                          <CornerDownLeft className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-between border-t px-4 py-2 text-[11px] text-muted-foreground">
              <span>↑↓ 选择 · Enter 打开 · Esc 关闭</span>
              <span>按 / 随时唤起</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}