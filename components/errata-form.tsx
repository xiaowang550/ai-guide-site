'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Check, Copy, Mail, Trash2 } from 'lucide-react'
import {
  addToQueue,
  buildErrataBatchText,
  buildErrataText,
  buildMailto,
  createEmptySubmission,
  ERRATA_FIELDS,
  hasContent,
  readQueue,
  removeFromQueue,
  safePageParam,
  validateSubmission,
  type ErrataSubmission,
} from '@/lib/errata'
import { isValidRepo } from '@/lib/feedback-stats'
import { siteConfig } from '@/lib/site'
import { SubmitIssueButton } from '@/components/feedback-stats'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'

const MAILTO = '1302582367@qq.com'

/**
 * 勘误反馈表单。
 *
 * 为什么是「复制 / 邮件」而不是一个提交按钮：
 * 本站是纯静态站，没有后端，任何「提交」按钮都只能把内容送到用户自己的剪贴板或邮件。
 * 与其做一个点完就没动静的假表单，不如老实做成本地队列 + 一键导出，
 * 让用户填的东西能真的到维护者手里：
 *   - 结构化字段（页面 / 字段 / 问题 / 建议 / 依据）
 *   - 暂存在本地，填一半关掉不丢
 *   - 一键复制成纯文本，或用 mailto: 带上内容
 */
export function ErrataForm({ from }: { from?: string }) {
  const [draft, setDraft] = useState<ErrataSubmission>(createEmptySubmission(''))
  const [queue, setQueue] = useState<ErrataSubmission[]>([])
  const [mounted, setMounted] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [justAdded, setJustAdded] = useState(false)

  // 从 URL 预填页面（例如工具页的「报告这一页」跳转过来）
  useEffect(() => {
    setDraft(createEmptySubmission(safePageParam(from)))
    setMounted(true)
  }, [from])

  useEffect(() => {
    if (!mounted) return
    setQueue(readQueue(localStorage))
  }, [mounted])

  const validation = useMemo(() => validateSubmission(draft), [draft])
  const mailto = useMemo(() => buildMailto(queue, MAILTO), [queue])

  function patch(p: Partial<ErrataSubmission>) {
    setDraft((d) => ({ ...d, ...p }))
  }

  async function copy(text: string, key: string) {
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
    setCopied(key)
    setTimeout(() => setCopied(null), 1800)
  }

  function add() {
    if (!validation.ok) return
    setQueue(addToQueue(localStorage, draft))
    setDraft(createEmptySubmission(draft.pageUrl))
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 2400)
  }

  if (!mounted) return null

  return (
    <div className="mt-5 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* 填写区 */}
      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">
              问题页面 <span className="text-danger">*</span>
            </span>
            <Input
              value={draft.pageUrl}
              onChange={(e) => patch({ pageUrl: e.target.value })}
              placeholder="/tools/deepseek"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">出问题的字段</span>
            <select
              value={draft.field}
              onChange={(e) => patch({ field: e.target.value })}
              className="h-9 w-full rounded-md border bg-background px-2.5 text-sm"
            >
              {ERRATA_FIELDS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm">
          <span className="mb-1.5 block font-medium">
            问题描述 <span className="text-danger">*</span>
          </span>
          <Textarea
            value={draft.problem}
            onChange={(e) => patch({ problem: e.target.value })}
            placeholder="现在写的是什么？哪里不对？"
          />
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium">应该改成</span>
            <Textarea
              value={draft.correction}
              onChange={(e) => patch({ correction: e.target.value })}
              placeholder="留空表示我只是有疑问"
              className="min-h-[72px]"
            />
          </label>
          <div className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">依据链接</span>
              <Input
                value={draft.sourceUrl}
                onChange={(e) => patch({ sourceUrl: e.target.value })}
                placeholder="https://官方页面或公告"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium">怎么发现的</span>
              <Input
                value={draft.note}
                onChange={(e) => patch({ note: e.target.value })}
                placeholder="选填，例如在对比页看到的"
              />
            </label>
          </div>
        </div>

        {validation.missing.length > 0 ? (
          <p className="mt-3 text-xs text-muted-foreground">还缺：{validation.missing.join('、')}</p>
        ) : null}
        {validation.warnings.map((w) => (
          <p key={w} className="mt-2 flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
            {w}
          </p>
        ))}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={add} disabled={!validation.ok}>
            {justAdded ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                已加入待发送列表
              </>
            ) : (
              '加入待发送列表'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => copy(buildErrataText(draft), 'draft')}
            disabled={!hasContent(draft)}
          >
            {copied === 'draft' ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden />
                已复制
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden />
                只复制这一条
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 待发送队列 */}
      <div className="band-card self-start">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">待发送（{queue.length}）</h3>
          {queue.length > 0 ? (
            <button
              type="button"
              onClick={() => setQueue(removeAll(localStorage, queue))}
              className="text-xs text-muted-foreground hover:text-danger"
            >
              清空
            </button>
          ) : null}
        </div>

        {queue.length === 0 ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            还没有内容。填好后加入这里，可以攒几条一起发。
            <span className="mt-1 block">列表只存在你这台设备的浏览器里，不会上传。</span>
          </p>
        ) : (
          <>
            <ul className="mt-3 space-y-2">
              {queue.map((item) => (
                <li key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-muted-foreground">
                        {item.pageUrl}
                      </p>
                      <p className="mt-1 text-sm leading-5">
                        <span className="text-muted-foreground">{item.field}：</span>
                        {item.problem.slice(0, 40)}
                        {item.problem.length > 40 ? '…' : ''}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setQueue(removeFromQueue(localStorage, item.id))}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-danger"
                      aria-label="删除这条"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => copy(buildErrataBatchText(queue), 'all')}>
                {copied === 'all' ? (
                  <>
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    已复制全部
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    复制全部（{queue.length}）
                  </>
                )}
              </Button>
              <Button asChild variant="outline">
                <a href={mailto.href}>
                  <Mail className="h-3.5 w-3.5" aria-hidden />
                  用邮件发送
                </a>
              </Button>
              {isValidRepo(siteConfig.feedbackRepo) ? (
                <SubmitIssueButton
                  title={`[勘误] ${queue.length} 条`}
                  body={buildErrataBatchText(queue)}
                />
              ) : null}
            </div>

            {mailto.tooLong ? (
              <p className="mt-2 flex gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                内容较长，邮件客户端可能截断，建议改用「复制全部」粘贴到邮件里。
              </p>
            ) : null}
          </>
        )}

        <p className="mt-4 border-t border-hairline pt-3 text-xs leading-5 text-muted-foreground">
          本站没有后端，所以没有「提交」按钮 —— 数据必须由你亲手带走。
          流程：<span className="text-foreground">加入列表 → 复制或发邮件 → 我们核对 → 更新页面并在
          <Link href="/updates" className="link mx-1">
            AI 实时资讯
          </Link>
          记录</span>。
        </p>
      </div>
    </div>
  )
}

function removeAll(storage: Storage, list: ErrataSubmission[]): ErrataSubmission[] {
  list.forEach((s) => removeFromQueue(storage, s.id))
  return []
}
