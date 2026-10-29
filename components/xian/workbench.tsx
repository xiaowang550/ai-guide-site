'use client'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Code2,
  Copy,
  FileText,
  History,
  PenLine,
  RefreshCw,
  RotateCcw,
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
    examples: [
      {
        label: '会议提醒',
        text: '帮我给同事写一条简短的会议提醒：明天下午三点，三楼会议室，讨论下周的产品发布；请大家带上各自的进展。语气自然，不超过80字。',
      },
      {
        label: '改一条通知',
        text: '把这条虚构的通知改得简洁、自然，不增加新信息：因工作安排需要，原定本周三进行的项目交流活动，现调整至本周五下午两点，地点仍为二楼会议室，请相关同事按时参加。',
      },
      {
        label: '客户回复',
        text: '帮我回复客户：已经收到对新版首页的建议，我们会在周四之前提供修改方向，具体上线时间需要评估后确认。语气专业、友好，不承诺尚未确定的时间。',
      },
    ],
  },
  {
    id: 'read',
    name: '提炼',
    icon: FileText,
    placeholder: '贴入长文本，告诉我需要提取哪些信息。',
    examples: [
      {
        label: '行动清单',
        text: '把这段虚构的项目记录整理成行动清单：今天讨论了新版首页。小林周三完成设计，小陈周五给出技术排期；预算还没确认，需要下次会议讨论。分别列出已确定、负责人和待确认事项。',
      },
      {
        label: '提炼要点',
        text: '请把这段虚构的工作记录提炼成三条要点：这周收到了18条试用反馈，其中12条提到首次使用时找不到入口，4条希望增加示例，另外2条反映手机上的按钮太小。我们计划先优化入口说明和手机操作，示例数量下周再讨论。只整理已知信息，不推断原因。',
      },
      {
        label: '找待确认项',
        text: '检查这份虚构的活动安排，列出需要进一步确认的问题：准备下周举办一次团队分享，计划邀请两位同事介绍AI的工作用法，场地考虑会议室或线上，参与人数和具体日期还没确定。不要替我补齐缺失信息。',
      },
    ],
  },
  {
    id: 'code',
    name: '编程',
    icon: Code2,
    placeholder: '描述功能，或贴入代码与遇到的问题。',
    examples: [
      {
        label: '倒计时按钮',
        text: '用原生HTML、CSS和JavaScript做一个倒计时按钮，点击后倒计时60秒，期间禁用。给出可直接运行的完整例子，解释关键的几行代码。',
      },
      {
        label: '表单校验',
        text: '写一个原生HTML和JavaScript表单：包含姓名和邮箱，提交前检查两项非空、邮箱格式正确。错误就显示在对应输入框旁边。只在浏览器里演示，不发送任何信息。提供完整例子。',
      },
      {
        label: '解释代码',
        text: '用初学者能懂的话解释这段JavaScript，并给出输入与输出例子：const unique = items => [...new Set(items)]; 请说明它能处理什么、不能保证什么，不用复杂术语。',
      },
    ],
  },
  {
    id: 'plan',
    name: '规划',
    icon: Route,
    placeholder: '告诉我目标、时间和约束，一起拆成可执行步骤。',
    examples: [
      {
        label: '一周入门',
        text: '我想用一周学习AI，每天只有20分钟。主要用来写工作消息和整理会议记录，请安排每天一个能实际完成的小任务。',
      },
      {
        label: '拆解项目',
        text: '帮我把“整理团队常用的工作模板”拆成可执行的小任务。我们只有两个人，每人每天能花30分钟，希望一周内整理出通知、会议记录和周报三个模板。请标注先后顺序，不编造负责人姓名。',
      },
      {
        label: '汇报提纲',
        text: '我需要做一份5分钟的项目进展汇报。已知材料包括本周完成事项、遇到的问题和下周计划。请先给出汇报结构，并告诉我每一部分还需要准备什么资料，不替我编写实际业绩。',
      },
    ],
  },
]
type Phase = 'idle' | 'waiting' | 'receiving' | 'done' | 'stopped' | 'error'
type RunRecord = {
  id: string
  prompt: string
  answer: string
  mode: number
  model: string
  actual: string
  phase: 'done' | 'stopped' | 'error'
  error: string
}
const phaseLabels: Record<Phase, string> = {
  idle: '等待你的第一个任务',
  waiting: '正在等待模型回答',
  receiving: '正在接收回答',
  done: '回答已完成',
  stopped: '已停止',
  error: '这次任务未完成',
}

export type WorkbenchTask = { prompt: string; mode: number }
export function XianWorkbench({
  task,
  onTaskHandled,
}: { task?: WorkbenchTask | null; onTaskHandled?: () => void } = {}) {
  const [mode, setMode] = useState(0),
    [prompt, setPrompt] = useState(''),
    [answer, setAnswer] = useState('')
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null),
    [model, setModel] = useState(''),
    [actual, setActual] = useState('')
  const [busy, setBusy] = useState(false),
    [phase, setPhase] = useState<Phase>('idle'),
    [error, setError] = useState('')
  const [connectionError, setConnectionError] = useState(''),
    [refreshing, setRefreshing] = useState(true)
  const [copied, setCopied] = useState(false),
    [copyStatus, setCopyStatus] = useState(''),
    [attempt, setAttempt] = useState(0)
  const [submitted, setSubmitted] = useState<{ text: string; mode: number } | null>(null)
  const [history, setHistory] = useState<RunRecord[]>([]),
    [selectedRun, setSelectedRun] = useState('')
  const [following, setFollowing] = useState(true)
  const abort = useRef<AbortController | null>(null),
    mounted = useRef(true)
  const input = useRef<HTMLTextAreaElement>(null),
    output = useRef<HTMLDivElement>(null)
  const outputContent = useRef<HTMLDivElement>(null),
    follow = useRef(true),
    drafts = useRef<Record<number, string>>({})
  const valid = (catalog?.models ?? []).filter(
    (m) => catalog?.enabled && m.available && catalog.connected[m.provider] && isTaskModel(m),
  )
  const canRun = !!prompt.trim() && !refreshing && valid.some((m) => m.id === model)
  const hasAnswer = !!answer
  const activeStep =
    busy || (submitted && answer && submitted.text === prompt.trim()) ? 2 : prompt.trim() ? 1 : 0

  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    setRefreshing(true)
    setConnectionError('')
    fetch('/api/assistant/models', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw Error()
        const next: ModelCatalog = await response.json()
        if (!alive) return
        setCatalog(next)
        const available = next.models.filter(
          (m) => m.available && next.connected[m.provider] && isTaskModel(m),
        )
        const first = available.find((m) => m.id === next.defaultModel) ?? available[0]
        setModel((current) =>
          available.some((m) => m.id === current) ? current : (first?.id ?? ''),
        )
      })
      .catch(() => {
        if (alive) setConnectionError('模型连接暂不可用，请刷新连接，或先跟着教程练习。')
      })
      .finally(() => {
        clearTimeout(timer)
        if (alive) setRefreshing(false)
      })
    return () => {
      alive = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [attempt])

  useEffect(() => {
    mounted.current = true
    const refresh = () => {
      if (!abort.current) setAttempt((a) => a + 1)
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('ai-map:assistant-models-changed', refresh)
    return () => {
      mounted.current = false
      window.removeEventListener('focus', refresh)
      window.removeEventListener('ai-map:assistant-models-changed', refresh)
      abort.current?.abort()
    }
  }, [])

  useEffect(() => {
    const fill = (event: Event) => {
      if (abort.current) return
      const detail: unknown = (event as CustomEvent).detail
      let value: string
      if (typeof detail === 'string') value = detail
      else if (
        detail &&
        typeof detail === 'object' &&
        'prompt' in detail &&
        typeof detail.prompt === 'string' &&
        'mode' in detail &&
        typeof detail.mode === 'number' &&
        Number.isInteger(detail.mode) &&
        detail.mode >= 0 &&
        detail.mode < modes.length
      ) {
        drafts.current[mode] = prompt
        setMode(detail.mode)
        value = detail.prompt
      } else return
      setPrompt(value.slice(0, 4000))
      input.current?.focus({ preventScroll: true })
    }
    window.addEventListener('xian:prompt', fill)
    return () => window.removeEventListener('xian:prompt', fill)
  }, [mode, prompt])

  // The home page retains this handoff while the task panel's code loads.
  useEffect(() => {
    if (!task) return
    window.dispatchEvent(new CustomEvent('xian:prompt', { detail: task }))
    onTaskHandled?.()
  }, [task, onTaskHandled])

  useEffect(() => {
    if (follow.current && output.current) output.current.scrollTop = output.current.scrollHeight
  }, [answer])
  useEffect(() => {
    if (!hasAnswer || !outputContent.current) return
    const observer = new ResizeObserver(() => {
      if (follow.current && output.current) output.current.scrollTop = output.current.scrollHeight
    })
    observer.observe(outputContent.current)
    return () => observer.disconnect()
  }, [hasAnswer])

  function fillExample(text: string) {
    if (abort.current) return
    setPrompt(text)
    input.current?.focus({ preventScroll: true })
  }
  function chooseMode(index: number) {
    if (abort.current || index === mode) return
    drafts.current[mode] = prompt
    setMode(index)
    setPrompt(drafts.current[index] ?? '')
  }
  function viewRun(record: RunRecord) {
    if (abort.current) return
    follow.current = false
    setFollowing(false)
    setAnswer(record.answer)
    setActual(record.actual)
    setPhase(record.phase)
    setError(record.error)
    setSubmitted({ text: record.prompt, mode: record.mode })
    setSelectedRun(record.id)
    setCopied(false)
    setCopyStatus('')
    if (output.current) output.current.scrollTop = 0
  }
  async function run(retryPrompt?: string, retryMode = mode) {
    const request = (retryPrompt ?? prompt).trim()
    if (abort.current || busy || refreshing || !request || !valid.some((m) => m.id === model))
      return
    const controller = new AbortController()
    abort.current = controller
    const record: RunRecord = {
      id: crypto.randomUUID(),
      prompt: request,
      answer: '',
      mode: retryMode,
      model,
      actual: '',
      phase: 'done',
      error: '',
    }
    if (retryPrompt !== undefined) {
      if (retryMode !== mode) drafts.current[mode] = prompt
      setMode(retryMode)
      setPrompt(request)
    }
    follow.current = true
    setFollowing(true)
    setBusy(true)
    setPhase('waiting')
    setError('')
    setAnswer('')
    setActual('')
    setCopied(false)
    setCopyStatus('')
    setSubmitted({ text: request, mode: retryMode })
    setSelectedRun(record.id)
    try {
      await runAssistant({
        model,
        page: '/',
        mode: 'practice',
        messages: [{ role: 'user', content: request }],
        signal: controller.signal,
        onText: (text) => {
          record.answer += text
          if (mounted.current) {
            setAnswer(record.answer)
            setPhase('receiving')
          }
        },
        onMeta: (name) => {
          record.actual = name
          if (mounted.current) setActual(name)
        },
      })
      record.phase = controller.signal.aborted ? 'stopped' : 'done'
      if (record.phase === 'stopped') record.error = '已停止，收到的内容已保留。'
    } catch (cause) {
      record.phase = controller.signal.aborted ? 'stopped' : 'error'
      record.error = controller.signal.aborted
        ? '已停止，收到的内容已保留。'
        : cause instanceof Error
          ? cause.message
          : '连接中断，请再试一次。'
    } finally {
      if (mounted.current) {
        setPhase(record.phase)
        setError(record.error)
        setHistory((previous) => [record, ...previous].slice(0, 3))
        setBusy(false)
      }
      if (abort.current === controller) abort.current = null
    }
  }

  return (
    <section id="workspace" className="x-section x-workspace xl-workspace">
      <div className="x-section-heading">
        <div>
          <span className="x-eyebrow">02 / 任务工作台</span>
          <h2>让想法，开始运行。</h2>
        </div>
        <p>选一件事，写下需求，带走可以继续修改的结果。</p>
      </div>
      <div className="xl-steps" aria-label="使用步骤">
        {['选任务', '写需求', '看结果'].map((label, index) => (
          <span key={label} aria-current={index === activeStep ? 'step' : undefined}>
            <i>{index < activeStep ? <Check size={12} aria-hidden /> : `0${index + 1}`}</i>
            {label}
            {index < 2 && <ArrowRight size={13} aria-hidden />}
          </span>
        ))}
        <small>需求越具体，越容易得到合用的回答。</small>
      </div>
      <div className="x-terminal xl-panel">
        <div className="x-terminal-top xl-panel-top">
          <span>
            <i />
            <i />
            <i />
          </span>
          <span>一件事，一次试验。</span>
          <span className="xl-connection">
            <i className={valid.length ? 'xl-connected' : ''} />
            {refreshing ? '正在读取模型' : valid.length ? '模型已就绪' : '等待可用模型'}
          </span>
        </div>
        <div className="x-terminal-grid xl-grid">
          <div className="x-terminal-input xl-input-panel">
            <div className="x-mode-tabs xl-mode-tabs" aria-label="任务类型">
              {modes.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={mode === index}
                  disabled={busy}
                  onClick={() => chooseMode(index)}
                >
                  <item.icon size={16} aria-hidden />
                  {item.name}
                </button>
              ))}
            </div>
            <div className="xl-examples" aria-label={`${modes[mode].name}示例`}>
              <span>从示例开始</span>
              {modes[mode].examples.map((example) => (
                <button
                  key={example.label}
                  type="button"
                  disabled={busy}
                  onClick={() => fillExample(example.text)}
                >
                  {example.label}
                  <ArrowUpRight size={11} aria-hidden />
                </button>
              ))}
            </div>
            <div className="x-editor-label xl-editor-label">
              <label htmlFor="xian-prompt">这次想完成什么？</label>
              <button
                type="button"
                disabled={busy}
                onClick={() => fillExample(modes[mode].examples[0].text)}
              >
                填入示例 <Sparkles size={12} aria-hidden />
              </button>
            </div>
            <div className="xl-editor-frame">
              <textarea
                ref={input}
                id="xian-prompt"
                aria-describedby="xl-input-hint"
                maxLength={4000}
                value={prompt}
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
                placeholder={modes[mode].placeholder}
                disabled={busy}
              />
              <div className="xl-editor-foot" id="xl-input-hint">
                <span>
                  <kbd>Ctrl</kbd> / <kbd>⌘</kbd> + <kbd>Enter</kbd> 运行
                </span>
                <span>{Array.from(prompt).length.toLocaleString()} / 4,000</span>
              </div>
            </div>
            <div className="x-terminal-actions xl-actions">
              <label>
                <span className="sr-only">选择AI模型</span>
                <select
                  aria-label="选择AI模型"
                  value={model}
                  disabled={busy || !valid.length || refreshing}
                  onChange={(event) => setModel(event.target.value)}
                >
                  {!valid.length && <option value="">暂无可用连接</option>}
                  {valid.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                aria-label="刷新模型连接"
                title="刷新模型连接"
                disabled={busy || refreshing}
                onClick={() => setAttempt((value) => value + 1)}
                className={`x-refresh-model xl-refresh ${refreshing ? 'xl-refreshing' : ''}`}
              >
                <RefreshCw size={15} aria-hidden />
              </button>
              {busy ? (
                <button
                  type="button"
                  className="x-button xl-run"
                  onClick={() => abort.current?.abort()}
                >
                  <Square size={13} aria-hidden />
                  停止
                </button>
              ) : (
                <button
                  type="button"
                  className="x-button xl-run"
                  disabled={!canRun}
                  onClick={() => void run()}
                >
                  运行任务
                  <ArrowUpRight size={16} aria-hidden />
                </button>
              )}
            </div>
            {connectionError && (
              <p className="x-terminal-error xl-connection-error" role="status">
                {connectionError}
              </p>
            )}
            {!refreshing && catalog && !valid.length && !connectionError && (
              <p className="x-terminal-error xl-connection-error" role="status">
                {catalog.enabled
                  ? '暂时没有可用的模型，可以刷新连接后再试。'
                  : 'AI 体验暂未开放，先到教程里练一练。'}
              </p>
            )}
            {history.length > 0 && (
              <div className="xl-history">
                <div className="xl-history-heading">
                  <span>
                    <History size={12} aria-hidden />
                    最近任务
                  </span>
                  <small>仅保留在本页</small>
                </div>
                <div className="xl-history-list" aria-label="最近三次任务">
                  {history.map((record, index) => (
                    <button
                      key={record.id}
                      type="button"
                      disabled={busy}
                      aria-pressed={selectedRun === record.id}
                      aria-label={`查看任务：${record.prompt.slice(0, 30)}`}
                      onClick={() => viewRun(record)}
                    >
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{record.prompt}</strong>
                      <small>
                        {record.phase === 'done'
                          ? '已完成'
                          : record.phase === 'stopped'
                            ? '已停止'
                            : '未完成'}
                      </small>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="x-terminal-output xl-output-panel" aria-busy={busy}>
            <div className="x-output-label xl-output-heading">
              <span>生成结果</span>
              <span className={`xl-phase xl-phase-${phase}`} role="status">
                {busy && <i />} {phaseLabels[phase]}
              </span>
              {answer && (
                <button
                  type="button"
                  aria-label="复制结果"
                  title="复制结果"
                  onClick={async () => {
                    const result = await copyText(readableAnswer(output.current, answer))
                    setCopied(result)
                    setCopyStatus(result ? '已复制结果。' : '复制失败，请手动选择结果。')
                  }}
                >
                  {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
                </button>
              )}
            </div>
            {busy && (
              <div className="xl-flowline" aria-hidden="true">
                <span />
              </div>
            )}
            {submitted && (
              <details className="xl-request">
                <summary>
                  对照原需求<span>{modes[submitted.mode].name}</span>
                  <ChevronDown size={13} aria-hidden />
                </summary>
                <p>{submitted.text}</p>
              </details>
            )}
            {answer ? (
              <div className="xl-answer-wrap">
                <div
                  className="x-answer xl-answer"
                  ref={output}
                  tabIndex={0}
                  aria-label="AI回答"
                  onScroll={(event) => {
                    const element = event.currentTarget
                    follow.current =
                      element.scrollHeight - element.scrollTop - element.clientHeight < 48
                    setFollowing(follow.current)
                  }}
                >
                  <div ref={outputContent} className="xl-answer-content">
                    <FormattedAnswer text={answer} />
                  </div>
                </div>
                {busy && !following && (
                  <button
                    className="xl-follow"
                    type="button"
                    onClick={() => {
                      follow.current = true
                      setFollowing(true)
                      output.current?.scrollTo({
                        top: output.current.scrollHeight,
                        behavior: 'instant',
                      })
                    }}
                  >
                    回到最新
                    <ArrowDown size={12} aria-hidden />
                  </button>
                )}
              </div>
            ) : (
              <div className="x-output-empty xl-empty">
                <div
                  className={busy ? 'xl-empty-orbit is-working' : 'xl-empty-orbit'}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <span>✳</span>
                </div>
                <h3>
                  {busy
                    ? '正在等待第一段回答'
                    : submitted
                      ? '这次没有收到回答'
                      : '先给它一件具体的事。'}
                </h3>
                <p>
                  {busy
                    ? '连接成功后，回答会逐步出现在这里。'
                    : submitted
                      ? '可以保留原需求，换个模型再试一次。'
                      : '不必一次写得完美，先试，再改。'}
                </p>
              </div>
            )}
            {error && (
              <p className="x-terminal-error xl-result-error" role="status">
                {error}
              </p>
            )}
            {copyStatus && (
              <p className="xl-copy-status" role="status">
                {copyStatus}
              </p>
            )}
            {submitted && !busy && (
              <div className="xl-result-actions">
                <button
                  type="button"
                  disabled={refreshing || !valid.some((item) => item.id === model)}
                  onClick={() => void run(submitted.text, submitted.mode)}
                >
                  <RotateCcw size={13} aria-hidden />
                  再试一次
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (abort.current) return
                    if (submitted.mode !== mode) drafts.current[mode] = prompt
                    setMode(submitted.mode)
                    setPrompt(submitted.text)
                    input.current?.focus({ preventScroll: true })
                  }}
                >
                  修改这个需求
                  <PenLine size={13} aria-hidden />
                </button>
              </div>
            )}
            <div className="x-output-model xl-output-foot">
              {actual ? <span>由 {actual} 回答</span> : <span>回答来自所选模型</span>}
              <span>重要信息请核对</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
