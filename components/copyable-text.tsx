'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 可一键复制的文本块（学生使用声明、提示词、邮件模板都用它） */
export function CopyableText({
  text,
  label = '复制',
  className,
  title,
}: {
  text: string
  label?: string
  className?: string
  title?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className={cn('overflow-hidden rounded-xl border bg-muted/40', className)}>
      <div className="flex items-center justify-between gap-3 border-b px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{title ?? '可直接复制'}</span>
        <button
          type="button"
          data-print-hide
          /* 声明式埋点：由 components/analytics-beacon.tsx 的全局委托监听上报，
             这里不需要引任何状态管理或 fetch */
          data-track="prompt_copy"
          onClick={copy}
          className={cn(
            'inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
            copied
              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden />
          )}
          {copied ? '已复制' : label}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap p-4 font-mono text-[13px] leading-6 text-foreground/90">
        {text}
      </pre>
    </div>
  )
}