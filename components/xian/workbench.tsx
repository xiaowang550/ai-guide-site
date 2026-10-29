'use client'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Check,
  Copy,
  Cpu,
  FileText,
  PenLine,
  Code2,
  Route,
  Square,
  Sparkles,
} from 'lucide-react'
import { runAssistant } from '@/lib/assistant-client'
import type { ModelCatalog } from '@/lib/assistant-models'
import { isTaskModel } from '@/lib/assistant-models'
import { FormattedAnswer } from '@/components/assistant/formatted-answer'
import { copyText } from '@/lib/copy-text'
import { readableAnswer } from '@/lib/answer-text'

const modes = [
  {
    id: 'write',
    name: '写作',
    icon: PenLine,
    placeholder: '贴入要改写的材料，告诉我发给谁、想表达什么。',
    sample:
      '帮我给同事写一条简短的会议提醒：明天下午三点，三楼会议室，讨论下周的产品发布；请大家带上各自的进展。语气自然，不超过80字。',
  },
  {
    id: 'read',
    name: '提炼',
    icon: FileText,
    placeholder: '贴入长文本，告诉我需要提取哪些信息。',
    sample:
      '把这段虚构的项目记录整理成行动清单：今天讨论了新版首页。小林周三完成设计，小陈周五给出技术排期；预算还没确认，需要下次会议讨论。分别列出已确定、负责人和待确认事项。',
  },
  {
    id: 'code',
    name: '编程',
    icon: Code2,
    placeholder: '描述功能，或贴入代码与遇到的问题。',
    sample:
      '用原生HTML、CSS和JavaScript做一个倒计时按钮，点击后倒计时60秒，期间禁用。给出可直接运行的完整例子，解释关键的几行代码。',
  },
  {
    id: 'plan',
    name: '规划',
    icon: Route,
    placeholder: '告诉我目标、时间和约束，一起拆成可执行步骤。',
    sample:
      '我想用一周学习AI，每天只有20分钟。主要用来写工作消息和整理会议记录，请安排每天一个能实际完成的小任务。',
  },
]
export function XianWorkbench() {
  const [mode, setMode] = useState(0),
    [prompt, setPrompt] = useState(''),
    [answer, setAnswer] = useState('')
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null),
    [model, setModel] = useState(''),
    [actual, setActual] = useState('')
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [copied, setCopied] = useState(false),
    [copyStatus, setCopyStatus] = useState(''),
    [attempt, setAttempt] = useState(0)
  const abort = useRef<AbortController | null>(null),
    input = useRef<HTMLTextAreaElement>(null),
    output = useRef<HTMLDivElement>(null)
  const valid = (catalog?.models ?? []).filter(
    (m) => catalog?.enabled && m.available && catalog.connected[m.provider] && isTaskModel(m),
  )
  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    fetch('/api/assistant/models', { signal: controller.signal, cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw Error()
        const c: ModelCatalog = await r.json()
        if (!alive) return
        setCatalog(c)
        const first =
          c.models.find(
            (m) =>
              m.id === c.defaultModel && m.available && c.connected[m.provider] && isTaskModel(m),
          ) ?? c.models.find((m) => m.available && c.connected[m.provider] && isTaskModel(m))
        setModel((current) =>
          c.models.some((m) => m.id === current && m.available && c.connected[m.provider])
            ? current
            : (first?.id ?? ''),
        )
      })
      .catch(() => {
        if (alive) setError('模型连接暂不可用，请刷新连接，或先跟着教程练习。')
      })
      .finally(() => clearTimeout(timer))
    const fill = (e: Event) => {
      if (abort.current) return
      setPrompt((e as CustomEvent<string>).detail)
      input.current?.focus({ preventScroll: true })
    }
    window.addEventListener('xian:prompt', fill)
    return () => {
      alive = false
      controller.abort()
      clearTimeout(timer)
      window.removeEventListener('xian:prompt', fill)
    }
  }, [attempt])
  useEffect(() => {
    const refresh = () => {
      if (!abort.current) setAttempt((a) => a + 1)
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('ai-map:assistant-models-changed', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('ai-map:assistant-models-changed', refresh)
      abort.current?.abort()
    }
  }, [])
  async function run() {
    if (busy || !prompt.trim() || !valid.some((m) => m.id === model)) return
    abort.current = new AbortController()
    setBusy(true)
    setError('')
    setAnswer('')
    setActual('')
    setCopied(false)
    setCopyStatus('')
    try {
      await runAssistant({
        model,
        page: '/',
        mode: 'practice',
        messages: [{ role: 'user', content: prompt.trim() }],
        signal: abort.current.signal,
        onText: (t) => setAnswer((a) => a + t),
        onMeta: (name) => setActual(name),
      })
    } catch (e) {
      setError(
        abort.current?.signal.aborted
          ? '已停止，收到的内容已保留。'
          : e instanceof Error
            ? e.message
            : '连接中断，请再试一次。',
      )
    } finally {
      setBusy(false)
      abort.current = null
    }
  }
  return (
    <section id="workspace" className="x-section x-workspace">
      <div className="x-section-heading">
        <div>
          <span className="x-eyebrow">02 / PLAYGROUND</span>
          <h2>让想法，开始运行。</h2>
        </div>
        <p>写下真实需求，直接和 AI 做一件事。</p>
      </div>
      <div className="x-terminal">
        <div className="x-terminal-top">
          <span>
            <i />
            <i />
            <i />
          </span>
          <span>workspace / new-session</span>
          <span>
            <Cpu size={13} /> AI 任务终端
          </span>
        </div>
        <div className="x-terminal-grid">
          <div className="x-terminal-input">
            <div className="x-mode-tabs" aria-label="任务类型">
              {modes.map((m, i) => (
                <button
                  key={m.id}
                  aria-pressed={mode === i}
                  disabled={busy}
                  onClick={() => {
                    setMode(i)
                    setPrompt('')
                  }}
                >
                  <m.icon size={15} />
                  {m.name}
                </button>
              ))}
            </div>
            <label className="x-editor-label" htmlFor="xian-prompt">
              <span>INPUT</span>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setPrompt(modes[mode].sample)
                  input.current?.focus()
                }}
              >
                填入示例 <Sparkles size={12} />
              </button>
            </label>
            <textarea
              ref={input}
              id="xian-prompt"
              maxLength={4000}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={modes[mode].placeholder}
              disabled={busy}
            />
            <div className="x-terminal-actions">
              <label>
                <span className="sr-only">选择AI模型</span>
                <select
                  aria-label="选择AI模型"
                  value={model}
                  disabled={busy || !valid.length}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {!valid.length && <option value="">暂无可用连接</option>}
                  {valid.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label="刷新模型连接"
                disabled={busy}
                onClick={() => {
                  setError('')
                  setAttempt((a) => a + 1)
                }}
                className="x-refresh-model"
              >
                ↻
              </button>
              {busy ? (
                <button className="x-button" onClick={() => abort.current?.abort()}>
                  <Square size={14} />
                  停止
                </button>
              ) : (
                <button
                  className="x-button"
                  disabled={!prompt.trim() || !valid.length}
                  onClick={() => void run()}
                >
                  运行任务 <ArrowUpRight size={16} />
                </button>
              )}
            </div>
          </div>
          <div className="x-terminal-output">
            <div className="x-output-label">
              <span>
                {busy ? 'GENERATING' : 'OUTPUT'}
                {busy && <i className="x-status-dot" />}
              </span>
              {answer && (
                <button
                  aria-label="复制结果"
                  onClick={async () => {
                    const r = await copyText(readableAnswer(output.current, answer))
                    setCopied(r)
                    setCopyStatus(r ? '已复制结果。' : '复制失败，请手动选择结果。')
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              )}
            </div>
            {answer ? (
              <div className="x-answer" ref={output}>
                <FormattedAnswer text={answer} />
              </div>
            ) : (
              <div className="x-output-empty">
                <span className="x-empty-cross">✳</span>
                <h3>{busy ? '正在把想法变成答案' : '下一份作品，从这里开始'}</h3>
                <p>{busy ? '回答会逐步出现在这里。' : '选一个任务，写下需求，或从示例开始。'}</p>
              </div>
            )}
            {copyStatus && (
              <p className="x-output-model" role="status">
                {copyStatus}
              </p>
            )}
            {error && (
              <p className="x-terminal-error" role="status">
                {error}
              </p>
            )}
            {actual && <span className="x-output-model">由 {actual} 回答 · 重要信息请核对</span>}
          </div>
        </div>
      </div>
    </section>
  )
}
