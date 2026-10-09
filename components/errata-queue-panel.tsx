'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Copy, Mail, Trash2 } from 'lucide-react'
import { buildErrataBatchText, buildMailto, readQueue, removeFromQueue, type ErrataSubmission } from '@/lib/errata'
import { Button } from '@/components/ui/button'

/**
 * 设置页里的「待发送反馈」入口。
 *
 * 为什么要放在设置页：勘误表单里的队列是本地的，
 * 用户如果攒了几条又忘了，必须有个地方能再找到 —— 否则数据就白填了。
 */
export function ErrataQueuePanel() {
  const [queue, setQueue] = useState<ErrataSubmission[]>([])
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    setQueue(readQueue(localStorage))
    setMounted(true)
  }, [])

  if (!mounted || queue.length === 0) return null

  const mailto = buildMailto(queue, '1302582367@qq.com')
  const text = buildErrataBatchText(queue)

  async function copyAll() {
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
    <div className="border-t border-hairline py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-[16rem] flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
            你有 {queue.length} 条勘误反馈还没发出去
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            反馈只存在这台设备上，本站没有后端、收不到自动提交。
            请复制或用邮件发给我们，附在{' '}
            <a href="/about#errata" className="link">
              勘误说明
            </a>
            里提到的渠道。
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {queue.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="truncate font-mono text-xs text-muted-foreground">{item.pageUrl}</p>
              <p className="mt-1 text-sm leading-5">
                <span className="text-muted-foreground">{item.field}：</span>
                {item.problem.slice(0, 48)}
                {item.problem.length > 48 ? '…' : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQueue(removeFromQueue(localStorage, item.id))}
              className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-danger"
              aria-label="删除这条反馈"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={copyAll}>
          <Copy className="h-3.5 w-3.5" aria-hidden />
          {copied ? '已复制全部' : `复制全部（${queue.length}）`}
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={mailto.href}>
            <Mail className="h-3.5 w-3.5" aria-hidden />
            用邮件发送
          </a>
        </Button>
      </div>
      {mailto.tooLong ? (
        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
          内容较长，邮件客户端可能截断，建议改用「复制全部」再粘贴。
        </p>
      ) : null}
    </div>
  )
}