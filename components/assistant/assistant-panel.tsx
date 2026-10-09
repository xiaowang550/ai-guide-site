'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Bot, ChevronDown, Send, X } from 'lucide-react'
import type { AssistantAnswer, AssistantToolsIndex } from '@/lib/assistant'
import { aiConfigReady, explainAiError, parseAiResponse, type AiConfig } from '@/lib/ai-client'
import { buildAiHeaders, buildAiRequestBody } from '@/lib/ai-client'
import { daysSince } from '@/lib/freshness'
import { Button } from '@/components/ui/button'

/**
 * 助手面板（**按需加载**）。
 *
 * 为什么单独拆一个文件：这个组件会用 import() 动态引入 `lib/assistant`（进而引入决策器引擎与整份工具数据）。
 * 如果让浮窗组件静态引入它，整份数据会被打进 layout chunk —— 全站每个页面都要为它付费
 * （实测首屏会从 166 KB 涨到 314 KB）。
 * 所以浮窗用 next/dynamic 只在「用户打开助手」时才加载本组件，数据再由本组件按需引入。
 */
export function AssistantPanel({
  onClose,
  onHide,
  aiConfig,
  onToggleAi,
  width,
}: {
  onClose: () => void
  onHide: () => void
  aiConfig: AiConfig | null
  onToggleAi: () => void
  /** 面板宽度：由浮窗按视口计算，窄屏不会超出屏幕 */
  width: number
}) {
  const [index, setIndex] = useState<AssistantToolsIndex | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [answerState, setAnswerState] = useState<AssistantAnswer | null>(null)
  const [aiThinking, setAiThinking] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const aiLive = aiConfig?.mode === 'live'

  // 打开时才拉索引（首屏不下载）
  useEffect(() => {
    let alive = true
    fetch('/assistant-index.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<AssistantToolsIndex>
      })
      .then((data) => {
        if (!alive) return
        setIndex(data)
        setLoading(false)
      })
      .catch(() => {
        if (!alive) return
        setLoadError('助手索引加载失败，请刷新页面重试。')
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  async function askAi(text: string) {
    if (!aiConfig || !index) return
    if (!aiConfig.endpoint) {
      setAiError('接口连接未就绪，可以切回站内规则模式继续查阅。')
      return
    }
    setAiThinking(true)
    setAiError(null)
    // 动态引入：引擎与事实抽取只在真正提问时才进包
    const { extractSiteFacts } = await import('@/lib/assistant')
    const facts = extractSiteFacts(text, index)
    try {
      const res = await fetch(aiConfig.endpoint, {
        method: 'POST',
        headers: buildAiHeaders(aiConfig),
        body: JSON.stringify(buildAiRequestBody(aiConfig, text, facts)),
      })
      const raw = await res.text()
      if (!res.ok) {
        setAiError(explainAiError(res.status, raw).message)
        return
      }
      let payload: unknown
      try {
        payload = JSON.parse(raw)
      } catch {
        setAiError('接口返回的不是 JSON，可能是代理地址填错了。')
        return
      }
      const parsed = parseAiResponse(payload)
      if (!parsed.ok) {
        setAiError(parsed.error ?? '模型没有返回内容')
        return
      }
      setAnswerState({
        intent: 'search',
        headline: 'AI 模式回答',
        paragraphs: [parsed.text],
        links: facts.relevant.slice(0, 4).map((r) => ({ href: r.href, label: r.title })),
        followUps: ['这个工具有什么弱点？', '什么是 RAG', '数据多久没更新了'],
        basis: `由 ${aiConfig.model} 生成，只提供了站内最相关的 ${facts.relevant.length} 条事实作为上下文。AI 可能出错，重要结论请点开来源核对。`,
      })
    } catch {
      setAiError(explainAiError(null).message)
    } finally {
      setAiThinking(false)
    }
  }

  function ask(text: string) {
    if (aiLive) {
      void askAi(text)
      return
    }
    const q = text.trim()
    if (!q || !index) return
    setQuestion(q)
    setAiError(null)
    void import('@/lib/assistant').then(({ answer }) => {
      setAnswerState(answer(q, index, new Date()))
    })
  }

  const staleHint = useMemo(() => {
    if (!index) return null
    const oldest = index.tools
      .map((t) => ({ t, age: daysSince(t.updatedAt) }))
      .sort((a, b) => b.age - a.age)[0]
    if (!oldest || oldest.age < 90) return null
    return `最旧的一条：${oldest.t.name}（${oldest.age} 天前复核）`
  }, [index])

  const QUICK_ASKS = ['不知道该用哪个工具', '这个工具有什么坑', '什么是 RAG', '数据多久没更新了']

  return (
    <div
      className="mb-2 animate-slide-up overflow-hidden rounded-xl border bg-popover shadow-2xl"
      style={{ width }}
    >
      <div className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Bot className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight">站内助手</p>
          <p className="text-[11px] leading-tight text-muted-foreground">
            {aiLive
              ? 'AI 模式 · 由外部模型生成，请核对来源'
              : '规则模式 · 只查本站数据 · 结论可溯源'}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleAi}
          className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={aiLive ? '切回规则模式' : '切换到 AI 模式'}
          title={aiLive ? '切回规则模式（不联网）' : '切到已配置的 AI 模式'}
        >
          {aiLive ? 'AI 模式' : '规则模式'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="收起助手"
        >
          <ChevronDown className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={onHide}
          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="关闭助手面板"
          title="关闭助手面板"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="max-h-[52vh] overflow-y-auto px-3.5 py-3 text-sm">
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">正在加载站内索引…</p>
        ) : aiThinking ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {aiLive ? `正在请求 ${aiConfig?.model ?? 'AI 模型'}…` : '思考中…'}
          </p>
        ) : aiConfig && aiLive && !aiConfigReady(aiConfig) ? (
          <div className="py-3">
            <p className="text-[13px] leading-6 text-foreground/85">
              当前连接未就绪，可以切回站内规则模式。
            </p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              站内规则模式无需账号，直接查询工具、教程与概念。
            </p>
          </div>
        ) : loadError ? (
          <div className="py-4 text-center">
            <p className="text-xs text-danger">{loadError}</p>
          </div>
        ) : answerState ? (
          <div className="space-y-3">
            <div>
              <p className="text-[13px] font-semibold leading-6">{answerState.headline}</p>
              <div className="mt-2 space-y-2">
                {answerState.paragraphs.map((p, i) => (
                  <p key={i} className="text-[13px] leading-6 text-foreground/85">
                    {p}
                  </p>
                ))}
              </div>
            </div>

            {answerState.links.length > 0 ? (
              <ul className="space-y-1.5">
                {answerState.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="flex items-baseline gap-1.5 text-[13px] text-primary hover:underline"
                    >
                      <span>→</span>
                      <span>{l.label}</span>
                      {l.hint ? (
                        <span className="text-[11px] text-muted-foreground">{l.hint}</span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            {answerState.basis ? (
              <p className="border-t border-hairline pt-2 text-[11px] leading-5 text-muted-foreground">
                依据：{answerState.basis}
              </p>
            ) : null}

            <div className="border-t border-hairline pt-2">
              <p className="text-[11px] text-muted-foreground">继续问</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {answerState.followUps.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => ask(f)}
                    className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 py-1">
            {aiConfig && !aiLive && aiConfigReady(aiConfig) ? (
              <div className="rounded-lg border border-primary/40 bg-accent/40 p-3">
                <p className="text-[12px] leading-5">
                  AI 模式已配置完成，但现在是<strong className="text-foreground">规则模式</strong>。
                </p>
                <button
                  type="button"
                  onClick={onToggleAi}
                  className="mt-2 rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-primary-foreground"
                >
                  切换到 AI 模式
                </button>
              </div>
            ) : null}
            <p className="text-[13px] leading-6 text-muted-foreground">
              我不联网、不调用大模型，只查这个站里的数据（工具、概念、教程、决策器规则）。
              问我「该用哪个工具」「这个工具有什么坑」「什么是 RAG」这类问题就行。
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_ASKS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => ask(q)}
                  className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {aiError ? (
        <div className="border-t border-danger/40 bg-danger/5 px-3.5 py-2.5 text-[11px] leading-5 text-danger">
          {aiError}
        </div>
      ) : null}

      <form
        className="flex items-center gap-2 border-t px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault()
          ask(question)
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={aiLive ? '问点什么（会发送到外部模型）…' : '描述你要做的事…'}
          className="h-8 min-w-0 flex-1 rounded-md border bg-background px-2.5 text-[13px] outline-none focus-visible:border-primary"
          aria-label="向站内助手提问"
          disabled={!index}
        />
        <Button type="submit" size="sm" disabled={!index || question.trim() === '' || aiThinking}>
          <Send className="h-3.5 w-3.5" aria-hidden />
        </Button>
      </form>

      {staleHint ? (
        <p className="border-t px-3.5 py-2 text-[11px] leading-4 text-muted-foreground">
          数据状态：{staleHint}
        </p>
      ) : null}
    </div>
  )
}
