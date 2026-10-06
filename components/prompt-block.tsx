'use client'

import { useMemo, useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import type { PromptTemplate, Tool } from '@/data/types'
import { cn } from '@/lib/utils'

/**
 * 可复制提示词块：变量可填、变量高亮、一键复制、可直接跳到对应工具官网。
 * 「填了变量再复制」是为了让用户不必自己改模板里的占位符。
 */
export function PromptBlock({
  template,
  tools = [],
  defaultToolId,
  className,
}: {
  template: PromptTemplate
  tools?: Tool[]
  defaultToolId?: string
  className?: string
}) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState(false)
  const [activeTool, setActiveTool] = useState<string>(defaultToolId ?? tools[0]?.id ?? '')

  const filled = useMemo(() => fillTemplate(template.body, values), [template.body, values])

  async function copy() {
    try {
      await navigator.clipboard.writeText(filled)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = filled
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const missing = template.variables.filter((v) => !values[v.key]?.trim()).length

  return (
    <div className={cn('overflow-hidden border-t border-hairline pt-5', className)}>
      <div className="flex flex-wrap items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{template.title}</p>
          <p className="truncate text-xs text-muted-foreground">{template.scenario}</p>
        </div>
        {tools.length > 0 ? (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="sr-only sm:not-sr-only">在哪个工具里用</span>
            <select
              value={activeTool}
              onChange={(e) => setActiveTool(e.target.value)}
              className="h-7 rounded-md border bg-background px-1.5 text-xs text-foreground"
            >
              {tools.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          onClick={copy}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
            copied
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? '已复制' : '复制'}
        </button>
        {tools.length > 0 ? (
          <a
            href={tools.find((t) => t.id === activeTool)?.officialUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-xs font-medium hover:bg-accent"
          >
            打开工具
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        ) : null}
      </div>

      {template.variables.length > 0 ? (
        <div className="grid gap-3 border-b bg-muted/20 px-4 py-3 sm:grid-cols-2">
          {template.variables.map((v) => (
            <label key={v.key} className="block text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">{v.label}</span>
              <input
                value={values[v.key] ?? ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [v.key]: e.target.value }))}
                placeholder={v.placeholder}
                className="h-8 w-full rounded-md border bg-background px-2 text-xs"
              />
            </label>
          ))}
        </div>
      ) : null}

      <pre className="overflow-x-auto p-4 text-[13px] leading-6">
        <code className="whitespace-pre-wrap font-mono">{renderWithHighlight(filled)}</code>
      </pre>

      {missing > 0 ? (
        <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
          还有 {missing} 个变量未填写，未填写的部分会原样保留 {'{{变量名}}'}
        </p>
      ) : null}

      {template.modelNotes ? (
        <p className="border-t bg-muted/30 px-4 py-2.5 text-xs leading-5 text-muted-foreground">
          使用提示：{template.modelNotes}
        </p>
      ) : null}
    </div>
  )
}

export function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w-]+)\s*\}\}/g, (match, key: string) => {
    const v = values[key]
    return v && v.trim() ? v : match
  })
}

/** 把 {{变量}} 高亮成胶囊标签 */
function renderWithHighlight(text: string) {
  const parts = text.split(/(\{\{\s*[\w-]+\s*\}\})/g)
  return parts.map((part, i) =>
    /^\{\{\s*[\w-]+\s*\}\}$/.test(part) ? (
      <span key={i} className="prompt-var">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  )
}