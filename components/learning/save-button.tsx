'use client'
import { useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import {
  LIBRARY_EVENT,
  readLibrary,
  recordRecent,
  toggleSaved,
  type LearningKind,
} from '@/lib/learning/library'
import { useSiteModules } from '@/components/site-module-context'
import { moduleEnabled, pathEnabled } from '@/lib/site-modules'
export function SaveButton({
  href,
  title,
  summary,
  kind,
  record = true,
}: {
  href: string
  title: string
  summary: string
  kind: LearningKind
  record?: boolean
}) {
  const { config, ready, preview } = useSiteModules(),
    [saved, setSaved] = useState(false),
    [message, setMessage] = useState('')
  const available = moduleEnabled(config, 'saved') && pathEnabled(config, href)
  useEffect(() => {
    const update = () => setSaved(readLibrary('saved').some((item) => item.href === href))
    update()
    window.addEventListener(LIBRARY_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(LIBRARY_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [href])
  useEffect(() => {
    if (record && ready && available && !preview)
      recordRecent({
        href,
        title: title.slice(0, 160),
        summary: summary.slice(0, 300),
        kind,
        at: new Date().toISOString(),
      })
  }, [record, ready, available, preview, href, title, summary, kind])
  if (!available || preview) return null
  return (
    <div className="inline-flex flex-col items-start gap-1" data-print-hide>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => {
          const result = toggleSaved({
            href,
            title: title.slice(0, 160),
            summary: summary.slice(0, 300),
            kind,
            at: new Date().toISOString(),
          })
          setSaved(result.saved)
          setMessage(result.message)
        }}
        className="inline-flex min-h-9 items-center gap-2 rounded-xl border bg-background px-3 text-xs font-medium text-primary transition-colors hover:bg-accent"
      >
        {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        {saved ? '已加入学习夹' : '加入学习夹'}
      </button>
      <span role="status" className="max-w-64 text-xs text-muted-foreground">
        {message}
      </span>
    </div>
  )
}
