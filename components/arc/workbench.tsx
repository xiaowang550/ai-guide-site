'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowDown,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  PenLine,
  RefreshCw,
  Route,
  Square,
  X,
} from 'lucide-react'
import { runAssistant } from '@/lib/assistant-client'
import { isTaskModel, type ModelCatalog } from '@/lib/assistant-models'
import { FormattedAnswer } from '@/components/assistant/formatted-answer'
import { readableAnswer } from '@/lib/answer-text'
import { copyText } from '@/lib/copy-text'
import './workbench.css'

export type ArcTaskMode = 'write' | 'read' | 'plan' | 'code'
export type ArcWorkbenchTask = { prompt: string; mode?: ArcTaskMode; key?: number }

const tasks = [
  {
    id: 'write' as const,
    title: '写作',
    icon: PenLine,
    placeholder: '贴入要改写的材料，说说给谁看、希望是什么语气。',
    exampleLabel: '写一条会议提醒',
    example:
      '帮我给同事写一条会议提醒：明天下午三点，在三楼会议室讨论产品发布。请大家带上各自的进展。语气自然，80字以内，不增加其他安排。',
  },
  {
    id: 'read' as const,
    title: '整理',
    icon: FileText,
    placeholder: '贴入一段记录或长文本，告诉我需要找出什么。',
    exampleLabel: '整理一份行动清单',
    example:
      '把这份虚构的项目记录整理成行动清单，列出任务、负责人和时间，待确认事项单独列出，不补写信息：小林周三完成设计，小陈周五给出技术排期。预算还没有确定，需要下次会议再讨论。',
  },
  {
    id: 'plan' as const,
    title: '规划',
    icon: Route,
    placeholder: '写下目标、可用的时间和限制，一起拆成小步骤。',
    exampleLabel: '安排一周的入门练习',
    example:
      '我想用一周学习AI，每天能花20分钟，主要用来写工作消息和整理会议记录。请为每天安排一个能亲手完成的小任务，并说明怎么检查结果。',
  },
  {
    id: 'code' as const,
    title: '编程',
    icon: Code2,
    placeholder: '描述你想做的功能，或者贴入代码和遇到的问题。',
    exampleLabel: '做一个倒计时按钮',
    example:
      '用原生HTML、CSS和JavaScript做一个倒计时按钮：点击后倒计时60秒，期间禁用。请给出能直接保存为HTML并打开的完整例子，说明怎么使用。',
  },
]

type Phase = 'idle' | 'waiting' | 'receiving' | 'done' | 'stopped' | 'error'
const phaseLabels: Record<Phase, string> = {
  idle: '等待你的想法',
  waiting: '正在连接模型',
  receiving: '正在生成',
  done: '回答已完成',
  stopped: '已停止',
  error: '这次没有完成',
}

export function ArcWorkbench({
  open,
  onClose,
  task,
}: {
  open: boolean
  onClose: () => void
  task?: ArcWorkbenchTask | null
}) {
  const headingId = useId()
  const inputId = useId()
  const [mode, setMode] = useState<ArcTaskMode>('write')
  const [prompt, setPrompt] = useState('')
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState<{ prompt: string; mode: ArcTaskMode } | null>(null)
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null)
  const [model, setModel] = useState('')
  const [actualModel, setActualModel] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [refreshing, setRefreshing] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const [connectionError, setConnectionError] = useState('')
  const [error, setError] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [copied, setCopied] = useState(false)
  const [following, setFollowing] = useState(true)
  const dialog = useRef<HTMLDivElement>(null)
  const field = useRef<HTMLTextAreaElement>(null)
  const output = useRef<HTMLDivElement>(null)
  const answerContent = useRef<HTMLDivElement>(null)
  const abort = useRef<AbortController | null>(null)
  const mounted = useRef(true)
  const closeCallback = useRef(onClose)
  const current = useRef({ mode, prompt })
  const drafts = useRef<Partial<Record<ArcTaskMode, string>>>({})
  const lastTask = useRef<ArcWorkbenchTask | null>(null)
  const follow = useRef(true)
  const selectedTask = tasks.find((item) => item.id === mode) ?? tasks[0]
  const valid = (catalog?.models ?? []).filter(
    (item) =>
      catalog?.enabled && item.available && catalog.connected[item.provider] && isTaskModel(item),
  )
  const canRun = !busy && !refreshing && !!prompt.trim() && valid.some((item) => item.id === model)
  const hasAnswer = !!answer

  useEffect(() => {
    closeCallback.current = onClose
    current.current = { mode, prompt }
  }, [onClose, mode, prompt])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      abort.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const previousFocus = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = setTimeout(() => field.current?.focus({ preventScroll: true }), 60)
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        abort.current?.abort()
        closeCallback.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], summary, [tabindex="0"]',
        ) ?? [],
      ).filter((element) => element.getClientRects().length > 0)
      const first = items[0],
        last = items.at(-1)
      if (!first || !last) return
      if (
        event.shiftKey &&
        (document.activeElement === first || !dialog.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || !dialog.current?.contains(document.activeElement))
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', keydown)
    return () => {
      clearTimeout(timer)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', keydown)
      abort.current?.abort()
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true })
    }
  }, [open])

  useEffect(() => {
    if (!open || !task || lastTask.current === task) return
    lastTask.current = task
    if (abort.current) return
    const previous = current.current
    drafts.current[previous.mode] = previous.prompt
    if (task.mode && tasks.some((item) => item.id === task.mode)) setMode(task.mode)
    setPrompt(task.prompt.slice(0, 4000))
    setAnswer('')
    setActualModel('')
    setSubmitted(null)
    setError('')
    setCopyStatus('')
    setCopied(false)
    setPhase('idle')
    follow.current = true
    setFollowing(true)
  }, [open, task])

  useEffect(() => {
    if (!open) return
    let alive = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    setRefreshing(true)
    setConnectionError('')
    fetch('/api/assistant/models', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error()
        const next: ModelCatalog = await response.json()
        const available = next.models.filter(
          (item) =>
            next.enabled && item.available && next.connected[item.provider] && isTaskModel(item),
        )
        if (!alive) return
        setCatalog(next)
        setModel((previous) =>
          available.some((item) => item.id === previous)
            ? previous
            : ((available.find((item) => item.id === next.defaultModel) ?? available[0])?.id ?? ''),
        )
      })
      .catch(() => {
        if (!alive) return
        setCatalog(null)
        setConnectionError('暂时没有连上模型。可以刷新连接，已写的内容会保留。')
      })
      .finally(() => {
        clearTimeout(timer)
        if (alive) setRefreshing(false)
      })
    return () => {
      alive = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [open, attempt])

  useEffect(() => {
    if (follow.current && output.current) output.current.scrollTop = output.current.scrollHeight
  }, [answer])
  useEffect(() => {
    if (!open || !answerContent.current) return
    const observer = new ResizeObserver(() => {
      if (follow.current && output.current) output.current.scrollTop = output.current.scrollHeight
    })
    observer.observe(answerContent.current)
    return () => observer.disconnect()
  }, [open, hasAnswer])

  function chooseMode(next: ArcTaskMode) {
    if (abort.current || next === mode) return
    drafts.current[mode] = prompt
    setMode(next)
    setPrompt(drafts.current[next] ?? '')
  }
  function close() {
    abort.current?.abort()
    onClose()
  }
  async function run(retry?: { prompt: string; mode: ArcTaskMode }) {
    const request = (retry?.prompt ?? prompt).trim()
    if (abort.current || busy || refreshing || !request || !valid.some((item) => item.id === model))
      return
    if (retry) {
      drafts.current[mode] = prompt
      setMode(retry.mode)
      setPrompt(retry.prompt)
    }
    const controller = new AbortController()
    abort.current = controller
    setBusy(true)
    setPhase('waiting')
    setSubmitted({ prompt: request, mode: retry?.mode ?? mode })
    setAnswer('')
    setActualModel('')
    setError('')
    setCopyStatus('')
    setCopied(false)
    follow.current = true
    setFollowing(true)
    try {
      await runAssistant({
        model,
        page: '/preview/arc/',
        mode: 'practice',
        messages: [{ role: 'user', content: request }],
        signal: controller.signal,
        onText: (text) => {
          if (!mounted.current || controller.signal.aborted) return
          setPhase('receiving')
          setAnswer((previous) => previous + text)
        },
        onMeta: (name) => {
          if (mounted.current && !controller.signal.aborted) setActualModel(name)
        },
      })
      if (mounted.current) setPhase(controller.signal.aborted ? 'stopped' : 'done')
    } catch (cause) {
      if (!mounted.current) return
      setPhase(controller.signal.aborted ? 'stopped' : 'error')
      setError(
        controller.signal.aborted
          ? '已停止，收到的内容已保留。'
          : cause instanceof Error
            ? cause.message
            : '连接中断，收到的内容已保留。请再试一次。',
      )
    } finally {
      if (mounted.current) setBusy(false)
      if (abort.current === controller) abort.current = null
    }
  }

  if (!open || typeof document === 'undefined') return null
  return createPortal(
    <div
      className="arc-wb-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <div
        className="arc-wb-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        ref={dialog}
      >
        <header className="arc-wb-header">
          <div className="arc-wb-identity">
            <span aria-hidden="true">∿</span>
            <span>弦域工作室</span>
          </div>
          <div className="arc-wb-header-title">
            <span>一个想法，一次尝试。</span>
            <h2 id={headingId}>从这里，把它做出来。</h2>
          </div>
          <button type="button" className="arc-wb-close" aria-label="关闭工作台" onClick={close}>
            <X size={21} />
          </button>
        </header>
        <div className="arc-wb-grid">
          <div className="arc-wb-editor">
            <div className="arc-wb-tabs" aria-label="任务类型">
              {tasks.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={mode === item.id}
                  disabled={busy}
                  onClick={() => chooseMode(item.id)}
                >
                  <item.icon size={15} />
                  {item.title}
                </button>
              ))}
            </div>
            <div className="arc-wb-input-heading">
              <label htmlFor={inputId}>这次想做什么？</label>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPrompt(selectedTask.example)
                  field.current?.focus({ preventScroll: true })
                }}
              >
                {selectedTask.exampleLabel}
                <ArrowUpRight size={13} />
              </button>
            </div>
            <div className="arc-wb-input-frame">
              <textarea
                id={inputId}
                ref={field}
                aria-describedby={`${inputId}-hint`}
                className="arc-wb-prompt"
                value={prompt}
                maxLength={4000}
                disabled={busy}
                placeholder={selectedTask.placeholder}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === 'Enter' &&
                    (event.ctrlKey || event.metaKey) &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault()
                    void run()
                  }
                }}
              />
              <div className="arc-wb-input-foot" id={`${inputId}-hint`}>
                <span>Ctrl / ⌘ + Enter 发送</span>
                <span>{Array.from(prompt).length} / 4,000</span>
              </div>
            </div>
            <div className="arc-wb-model-row">
              <label className="arc-wb-model">
                <span className="arc-wb-model-dot" data-ready={valid.length > 0} />
                <span className="sr-only">选择AI模型</span>
                <select
                  aria-label="选择AI模型"
                  value={model}
                  disabled={busy || refreshing || !valid.length}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {!valid.length && (
                    <option value="">{refreshing ? '正在读取模型' : '暂无可用模型'}</option>
                  )}
                  {valid.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={13} />
              </label>
              <button
                type="button"
                className="arc-wb-refresh"
                aria-label="刷新模型连接"
                title="刷新模型连接"
                disabled={busy || refreshing}
                onClick={() => setAttempt((previous) => previous + 1)}
              >
                <RefreshCw size={15} className={refreshing ? 'arc-wb-spinning' : ''} />
              </button>
            </div>
            {connectionError && (
              <p className="arc-wb-message" role="status">
                {connectionError}
              </p>
            )}
            {catalog && !refreshing && !valid.length && (
              <p className="arc-wb-message" role="status">
                当前没有可用的对话模型。可以稍后刷新连接。
              </p>
            )}
            <div className="arc-wb-send-row">
              <p>
                实际调用模型。
                <br />
                重要信息请核对。
              </p>
              {busy ? (
                <button
                  type="button"
                  className="arc-wb-send arc-wb-stop"
                  onClick={() => abort.current?.abort()}
                >
                  <Square size={13} />
                  停止生成
                </button>
              ) : (
                <button
                  type="button"
                  className="arc-wb-send"
                  disabled={!canRun}
                  onClick={() => void run()}
                >
                  开始生成
                  <ArrowUpRight size={17} />
                </button>
              )}
            </div>
          </div>
          <section className="arc-wb-result" aria-label="AI生成结果">
            <div className="arc-wb-result-heading">
              <div>
                <span className="arc-wb-status-dot" data-phase={phase} />
                <span role="status">{phaseLabels[phase]}</span>
              </div>
              {answer && (
                <button
                  type="button"
                  className="arc-wb-copy"
                  aria-label="复制结果"
                  onClick={async () => {
                    const success = await copyText(readableAnswer(answerContent.current, answer))
                    setCopied(success)
                    setCopyStatus(success ? '已复制。' : '复制失败，请手动选择文字。')
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? '已复制' : '复制'}
                </button>
              )}
            </div>
            <div
              className="arc-wb-output"
              ref={output}
              onScroll={() => {
                const el = output.current
                if (!el) return
                const near = el.scrollHeight - el.scrollTop - el.clientHeight < 70
                follow.current = near
                setFollowing(near)
              }}
            >
              {answer ? (
                <div className="arc-wb-answer" ref={answerContent}>
                  <FormattedAnswer text={answer} />
                </div>
              ) : (
                <div className="arc-wb-empty">
                  <div
                    className={`arc-wb-empty-art ${busy ? 'arc-wb-generating' : ''}`}
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <span>∿</span>
                  </div>
                  <h3>{busy ? '想法正在成形。' : '留一个位置，给你的下一份作品。'}</h3>
                  <p>
                    {busy
                      ? '回答会逐步出现，可以随时停止。'
                      : '先写下一句需求，或者从旁边的示例开始。'}
                  </p>
                  {busy && (
                    <span className="arc-wb-dots" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </div>
              )}
              {error && (
                <p className="arc-wb-error" role="status">
                  {error}
                </p>
              )}
            </div>
            <div className="arc-wb-result-foot">
              {copyStatus && (
                <p className="arc-wb-copy-status" role="status">
                  {copyStatus}
                </p>
              )}
              {!following && busy && answer && (
                <button
                  type="button"
                  className="arc-wb-latest"
                  onClick={() => {
                    follow.current = true
                    setFollowing(true)
                    if (output.current) output.current.scrollTop = output.current.scrollHeight
                  }}
                >
                  看最新内容
                  <ArrowDown size={13} />
                </button>
              )}
              {submitted && (
                <details className="arc-wb-original">
                  <summary>
                    这次交给 AI 的要求
                    <ChevronDown size={13} />
                  </summary>
                  <p>{submitted.prompt}</p>
                </details>
              )}
              {submitted && !busy && (
                <div className="arc-wb-result-actions">
                  <span>
                    {actualModel
                      ? `由 ${actualModel} 回答`
                      : phase === 'error'
                        ? '可以修改需求，或换一个模型重试。'
                        : '可以直接修改左边的需求，再试一次。'}
                  </span>
                  <button
                    type="button"
                    disabled={!valid.some((item) => item.id === model) || refreshing}
                    onClick={() => void run(submitted)}
                  >
                    <RefreshCw size={13} />
                    {phase === 'error' || phase === 'stopped' ? '重试这次任务' : '再生成一次'}
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
