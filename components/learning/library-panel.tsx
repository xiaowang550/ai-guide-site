'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bookmark, Clock3, ArrowRight, X } from 'lucide-react'
import {
  LIBRARY_EVENT,
  readLibrary,
  removeSaved,
  restoreSaved,
  clearRecent,
  type LearningEntry,
  type LearningKind,
} from '@/lib/learning/library'
import { pathEnabled } from '@/lib/site-modules'
import { useSiteModules } from '@/components/site-module-context'
const labels: Record<LearningKind, string> = {
  tool: '工具',
  guide: '教程',
  case: '案例',
  concept: '概念',
  path: '学习路径',
}
export function LibraryPanel() {
  const { config } = useSiteModules(),
    [saved, setSaved] = useState<LearningEntry[]>([]),
    [recent, setRecent] = useState<LearningEntry[]>([]),
    [loaded, setLoaded] = useState(false),
    [kind, setKind] = useState<LearningKind | 'all'>('all'),
    [removed, setRemoved] = useState<LearningEntry | null>(null),
    [error, setError] = useState('')
  const load = useCallback(() => {
    setSaved(readLibrary('saved'))
    setRecent(readLibrary('recent'))
    setLoaded(true)
  }, [])
  useEffect(() => {
    load()
    window.addEventListener(LIBRARY_EVENT, load)
    window.addEventListener('storage', load)
    return () => {
      window.removeEventListener(LIBRARY_EVENT, load)
      window.removeEventListener('storage', load)
    }
  }, [load])
  const visible = saved.filter((item) => pathEnabled(config, item.href)),
    filtered = visible.filter((item) => kind === 'all' || item.kind === kind),
    last = recent.filter((item) => pathEnabled(config, item.href))
  function card(item: LearningEntry, removable: boolean) {
    return (
      <article key={item.href} className="relative flex flex-col rounded-2xl border bg-card p-5">
        <p className="text-[11px] text-primary">{labels[item.kind]}</p>
        <Link
          href={item.href}
          className="mt-3 block text-base font-semibold leading-7 hover:text-primary"
        >
          {item.title}
        </Link>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
          {item.summary}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <Link
            href={item.href}
            className="inline-flex items-center gap-2 text-xs font-medium text-primary"
          >
            {removable ? '打开内容' : '继续查看'}
            <ArrowRight className="h-3 w-3" />
          </Link>
          {removable && (
            <button
              title={`移除${item.title}`}
              aria-label={`移除${item.title}`}
              className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent"
              onClick={() => {
                if (removeSaved(item.href)) {
                  setRemoved(item)
                  setError('')
                } else setError('未能保存变更，请稍后重试。')
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </article>
    )
  }
  return (
    <div className="container space-y-12 py-9">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {removed && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl bg-accent px-4 py-3 text-sm"
        >
          <span>已移出「{removed.title}」</span>
          <button
            className="font-medium text-primary underline"
            onClick={() => {
              if (restoreSaved(removed)) {
                setRemoved(null)
                setError('')
              } else setError('未能恢复收藏。')
            }}
          >
            撤销
          </button>
          <button
            className="ml-auto text-xs text-muted-foreground"
            onClick={() => setRemoved(null)}
          >
            收起提示
          </button>
        </div>
      )}
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Bookmark className="h-5 w-5 text-primary" />
            我的收藏
          </h2>
          <p className="text-xs text-muted-foreground">{visible.length} 份内容 · 仅保存在本机</p>
        </div>
        <div className="mb-6 mt-4 flex flex-wrap gap-2">
          {(['all', 'tool', 'guide', 'case', 'concept', 'path'] as const).map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={kind === value}
              className={`rounded-full border px-3 py-2 text-xs ${kind === value ? 'bg-accent font-medium text-primary' : 'text-muted-foreground hover:bg-accent'}`}
              onClick={() => setKind(value)}
            >
              {value === 'all' ? '全部' : labels[value]}
            </button>
          ))}
        </div>
        {filtered.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => card(item, true))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed px-6 py-10 text-center">
            <h3 className="font-medium">
              {loaded
                ? visible.length
                  ? '这一类还没有收藏'
                  : '把用得上的方法，留在这里'
                : '正在读取学习夹…'}
            </h3>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-muted-foreground">
              在工具、教程、概念或案例详情点击“加入学习夹”，下次可以直接回来查看，不需要账号。
            </p>
            <div className="mt-5 flex justify-center gap-5 text-sm">
              {pathEnabled(config, '/guides') && (
                <Link className="text-primary" href="/guides">
                  找一篇教程 →
                </Link>
              )}
              {pathEnabled(config, '/cases') && (
                <Link className="text-primary" href="/cases">
                  看看实际做法 →
                </Link>
              )}
            </div>
          </div>
        )}
        {saved.length > visible.length && (
          <p className="mt-4 text-xs text-muted-foreground">
            部分收藏所属栏目暂时关闭，恢复开放后会重新显示。
          </p>
        )}
      </section>
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Clock3 className="h-5 w-5 text-primary" />
            最近浏览
          </h2>
          {recent.length > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-primary"
              onClick={() => {
                if (!clearRecent()) setError('未能清除最近记录。')
              }}
            >
              清除记录
            </button>
          )}
        </div>
        {last.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {last.map((item) => card(item, false))}
          </div>
        ) : (
          <p className="rounded-xl bg-accent/40 p-5 text-sm text-muted-foreground">
            阅读过的详情会出现在这里，最多保留最近 8 份。
          </p>
        )}
      </section>
    </div>
  )
}
