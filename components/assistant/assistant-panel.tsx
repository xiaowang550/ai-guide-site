'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { ArrowUp, Check, Copy, LoaderCircle, RotateCcw, Square, X } from 'lucide-react'
import type { AssistantToolsIndex } from '@/lib/assistant'
import type { ModelCatalog } from '@/lib/assistant-models'
import { readSse } from '@/lib/assistant-stream'
import { copyText } from '@/lib/copy-text'
import { computeDockPosition } from '@/lib/dock-position'
import { toggleSaved, validLearningEntry, type LearningEntry } from '@/lib/learning/library'
import { AssistantAvatar } from './assistant-avatar'
import { ModelPicker } from './model-picker'
import { useSiteModules } from '@/components/site-module-context'
import { pathEnabled, moduleEnabled } from '@/lib/site-modules'
import './assistant.css'

interface Source {
  title: string
  href: string
  summary: string
  kind: string
}
interface Turn {
  id: string
  role: 'user' | 'assistant'
  text: string
  model?: string
  sources?: Source[]
  error?: string
}
const BASIC = '帮我写一份通知。'
const IMPROVED =
  '你是学校办公室的老师。请为全体高中教师起草一份教研活动通知，80–120 字。已知：本周五下午 4 点，在学校会议室交流 AI 辅助备课经验；每人带一个使用案例。用标题、时间地点、准备事项三部分输出。缺失信息写【待补充】，不要编造。这是教学练习示例。'
export function AssistantPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLTextAreaElement>(null),
    feed = useRef<HTMLDivElement>(null),
    abort = useRef<AbortController | null>(null)
  const panelPosition = useRef<{ x: number; y: number } | null>(null)
  const panelDrag = useRef<{ id: number; dx: number; dy: number } | null>(null)
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null),
    [index, setIndex] = useState<AssistantToolsIndex | null>(null)
  const [mode, setMode] = useState<'chat' | 'practice' | 'search'>('chat'),
    [selected, setSelected] = useState('openrouter/free'),
    [draft, setDraft] = useState(''),
    [turns, setTurns] = useState<Turn[]>([])
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(''),
    [copied, setCopied] = useState(''),
    [prompts, setPrompts] = useState([BASIC, IMPROVED]),
    [results, setResults] = useState(['', ''])
  const pathname = usePathname()
  const { config } = useSiteModules()
  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current?.close()
    if (open && !window.matchMedia('(pointer: coarse)').matches)
      input.current?.focus({ preventScroll: true })
  }, [open])
  useEffect(() => {
    if (!open) return
    function place() {
      const el = dialog.current,
        v = window.visualViewport
      if (!el) return
      const width = v?.width ?? window.innerWidth,
        height = v?.height ?? window.innerHeight
      const left = v?.offsetLeft ?? 0,
        top = v?.offsetTop ?? 0,
        mobile = window.innerWidth <= 600
      el.style.width = `${Math.min(480, width - (mobile ? 16 : 32))}px`
      el.style.height = `${Math.min(mobile ? height : 740, height - (mobile ? 16 : 32))}px`
      const rect = el.getBoundingClientRect()
      const next = computeDockPosition(
        mobile ? { x: left + 8, y: top + 8 } : (panelPosition.current ?? 'bottom-right'),
        { width, height, left, top, gap: mobile ? 8 : 16 },
        false,
        { width: rect.width, height: rect.height },
      )
      el.style.inset = 'auto'
      el.style.left = `${next.left}px`
      el.style.top = `${next.top}px`
      el.style.setProperty('--assistant-visible-height', `${height}px`)
    }
    place()
    window.addEventListener('resize', place)
    window.visualViewport?.addEventListener('resize', place)
    window.visualViewport?.addEventListener('scroll', place)
    return () => {
      window.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('resize', place)
      window.visualViewport?.removeEventListener('scroll', place)
    }
  }, [open])
  useEffect(() => () => abort.current?.abort(), [])
  useEffect(() => {
    if (!open) return
    let alive = true
    const load = () =>
      fetch('/api/assistant/models', { cache: 'no-store' })
        .then(async (r) => {
          if (!r.ok) throw new Error()
          return (await r.json()) as ModelCatalog
        })
        .then((c) => {
          if (!alive) return
          setCatalog(c)
          setSelected((old) => {
            let saved = old
            try {
              saved = localStorage.getItem('ai-map:assistant-model:v1') ?? old
            } catch {}
            return c.models.some((m) => m.id === saved && m.available) ? saved : c.defaultModel
          })
        })
        .catch(() => {
          if (alive) setNotice('模型目录暂时没有连上，站内查找仍可使用。')
        })
    void load()
    const timer = setInterval(() => {
      if (!document.hidden) void load()
    }, 60000)
    fetch('/assistant-index.json')
      .then((r) => r.json())
      .then((data) => {
        if (alive) setIndex(data)
      })
      .catch(() => {
        if (alive) setNotice('站内资料正在加载，请稍后重试。')
      })
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [open])
  useEffect(() => {
    if (
      feed.current &&
      feed.current.scrollHeight - feed.current.scrollTop - feed.current.clientHeight < 240
    )
      feed.current.scrollTop = feed.current.scrollHeight
  }, [turns, busy])
  const model = catalog?.models.find((m) => m.id === selected),
    ready =
      !!model &&
      !!catalog?.connected[model.provider] &&
      !!catalog?.enabled &&
      (!catalog?.stale || model.provider === 'opencode')
  function choose(id: string) {
    setSelected(id)
    setNotice('')
    try {
      localStorage.setItem('ai-map:assistant-model:v1', id)
    } catch {}
  }
  async function generate(
    messages: { role: string; content: string }[],
    onText: (text: string) => void,
    onMeta?: (name: string, sources: Source[]) => void,
  ) {
    const controller = new AbortController()
    abort.current = controller
    const response = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: selected, messages, page: pathname }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error ?? '模型暂时没有响应，请稍后再试。')
    }
    if (!response.body) throw new Error('没有收到流式响应。')
    let complete = false,
      streamError = ''
    await readSse(response.body, (data) => {
      const event = JSON.parse(data)
      if (event.type === 'meta') onMeta?.(event.name, event.sources)
      if (event.type === 'model') onMeta?.(event.name, [])
      if (event.type === 'delta') onText(event.text)
      if (event.type === 'done') complete = true
      if (event.type === 'error') streamError = event.message
    })
    if (streamError || !complete) throw new Error(streamError || '生成中断了，可以重试。')
  }
  async function ask(text = draft, recovery?: { id: string; continue: boolean }) {
    const q = text.trim()
    if (!q || busy) return
    setDraft('')
    setNotice('')
    const user: Turn = { id: crypto.randomUUID(), role: 'user', text: q },
      reply: Turn = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: '',
        model: mode === 'search' ? '站内查找' : model?.name,
      }
    const recoveringAt = recovery ? turns.findIndex((t) => t.id === recovery.id) : -1
    const prior =
      recoveringAt >= 0
        ? turns.slice(0, recovery?.continue ? recoveringAt + 1 : recoveringAt - 1)
        : turns
    const history = prior.filter((t) => t.text && (!t.error || recovery?.continue)).slice(-6)
    setTurns((old) => [...old.slice(-18), user, reply])
    setBusy(true)
    const update = (patch: Partial<Turn>) =>
      setTurns((old) => old.map((t) => (t.id === reply.id ? { ...t, ...patch } : t)))
    try {
      if (mode === 'search') {
        if (!index) throw new Error('资料还在加载，请稍后重试。')
        const { answer } = await import('@/lib/assistant'),
          response = answer(q, {
            ...index,
            tools: index.tools.filter((t) => pathEnabled(config, '/tools/' + t.id + '/')),
            concepts: index.concepts.filter((c) => pathEnabled(config, '/learn/' + c.id + '/')),
            guides: index.guides.filter((g) => pathEnabled(config, '/guides/' + g.id + '/')),
            searchDocs: index.searchDocs.filter((d) =>
              pathEnabled(config, new URL(d.href, location.origin).pathname),
            ),
          })
        update({
          text: [response.headline, ...response.paragraphs].join('\n\n'),
          sources: response.links
            .filter((l) => pathEnabled(config, new URL(l.href, location.origin).pathname))
            .map((l) => {
              const doc = index.searchDocs.find((d) => d.href === l.href)
              return {
                title: doc?.title ?? l.label,
                href: l.href,
                summary: doc?.summary ?? '',
                kind: doc?.type ?? 'guide',
              }
            }),
        })
      } else {
        let accumulated = ''
        await generate(
          [
            ...history.map((t) => ({
              role: t.role,
              content:
                recovery?.continue && t.id === recovery.id
                  ? t.text.slice(-3000)
                  : t.text.slice(0, 1500),
            })),
            { role: 'user', content: q },
          ],
          (text) => {
            accumulated += text
            update({ text: accumulated })
          },
          (name, sources) => update({ model: name, ...(sources.length ? { sources } : {}) }),
        )
      }
    } catch (e) {
      update({
        error:
          e instanceof DOMException && e.name === 'AbortError'
            ? '已停止生成，收到的文字已保留。'
            : e instanceof Error
              ? e.message
              : '生成暂时失败，请重试。',
      })
    } finally {
      setBusy(false)
      abort.current = null
      input.current?.focus()
    }
  }
  async function practice() {
    if (busy) return
    setBusy(true)
    setResults(['', ''])
    setNotice('')
    try {
      for (let i = 0; i < 2; i++) {
        let accumulated = ''
        await generate([{ role: 'user', content: prompts[i] }], (text) => {
          accumulated += text
          setResults((old) => old.map((r, j) => (j === i ? accumulated : r)))
        })
      }
    } catch (e) {
      setNotice(
        e instanceof DOMException && e.name === 'AbortError'
          ? '已停止，结果已保留。'
          : e instanceof Error
            ? e.message
            : '生成暂时失败。',
      )
    } finally {
      setBusy(false)
      abort.current = null
    }
  }
  async function copy(text: string, id: string) {
    const ok = await copyText(text)
    if (ok) {
      setCopied(id)
      setTimeout(() => setCopied(''), 1800)
    } else setNotice('复制未成功，请选中文字手动复制。')
  }
  function save(source: Source) {
    const entry = { ...source, kind: source.kind, at: new Date().toISOString() } as LearningEntry
    if (!validLearningEntry(entry)) {
      setNotice('这项内容可以直接打开浏览。')
      return
    }
    setNotice(toggleSaved(entry).message)
  }
  return createPortal(
    <dialog
      ref={dialog}
      className="assistant-dialog"
      aria-label="小芽站内学习助手"
      tabIndex={-1}
      onCancel={() => {
        abort.current?.abort()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === dialog.current) {
          const r = dialog.current.getBoundingClientRect()
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            onClose()
        }
      }}
    >
      <div className="assistant-surface">
        <header
          className="assistant-heading"
          onPointerDown={(e) => {
            if (
              !e.isPrimary ||
              e.button !== 0 ||
              window.innerWidth <= 600 ||
              (e.target as HTMLElement).closest('button')
            )
              return
            const rect = dialog.current!.getBoundingClientRect()
            panelDrag.current = {
              id: e.pointerId,
              dx: e.clientX - rect.left,
              dy: e.clientY - rect.top,
            }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            const drag = panelDrag.current,
              el = dialog.current
            if (!drag || !el || drag.id !== e.pointerId) return
            const rect = el.getBoundingClientRect()
            const next = computeDockPosition(
              { x: e.clientX - drag.dx, y: e.clientY - drag.dy },
              { width: window.innerWidth, height: window.innerHeight },
              false,
              { width: rect.width, height: rect.height },
            )
            el.style.left = `${next.left}px`
            el.style.top = `${next.top}px`
            panelPosition.current = { x: next.left, y: next.top }
          }}
          onPointerUp={() => {
            panelDrag.current = null
          }}
          onPointerCancel={() => {
            panelDrag.current = null
          }}
          onLostPointerCapture={() => {
            panelDrag.current = null
          }}
        >
          <AssistantAvatar thinking={busy} />
          <div>
            <strong>
              小芽 <span>· 你的学习搭子</span>
            </strong>
            <p>{busy ? '正在生成，文字会陆续出现' : '找工具、做练习，把想法变成步骤'}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="收起助手">
            <X size={19} />
          </button>
        </header>
        <nav className="assistant-tabs" aria-label="助手功能">
          {(
            [
              ['chat', '问 AI'],
              ['practice', '提示词实验'],
              ['search', '站内查找'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              disabled={busy}
              onClick={() => {
                setMode(id)
                setNotice('')
              }}
            >
              {label}
            </button>
          ))}
        </nav>
        <div ref={feed} className="assistant-body" aria-busy={busy}>
          {mode === 'practice' ? (
            <div className="assistant-practice">
              <span className="assistant-eyebrow">一件事，两种问法</span>
              <h2>说清楚，结果会怎样？</h2>
              <p>用同一个模型，比较任务、背景和格式是否让回答更有用。</p>
              {['随口一问', '把要求说清楚'].map((title, i) => (
                <section key={title}>
                  <label htmlFor={'practice-' + i}>
                    <span>{i + 1}</span>
                    {title}
                  </label>
                  <textarea
                    id={'practice-' + i}
                    value={prompts[i]}
                    maxLength={4000}
                    disabled={busy}
                    onChange={(e) =>
                      setPrompts((old) => old.map((v, j) => (i === j ? e.target.value : v)))
                    }
                  />
                  <div className="assistant-practice-result">
                    {results[i] || '生成后，结果会出现在这里。'}
                  </div>
                  {results[i] && (
                    <button type="button" onClick={() => void copy(results[i], 'practice-' + i)}>
                      {copied === 'practice-' + i ? '已复制' : '复制结果'}
                    </button>
                  )}
                </section>
              ))}
              <p className="assistant-practice-tip">
                看三件事：有没有编造？格式是否清楚？能不能直接修改使用？
              </p>
              <button
                type="button"
                className="assistant-primary"
                disabled={busy || !ready || prompts.some((p) => !p.trim())}
                onClick={() => void practice()}
              >
                {busy ? (
                  <>
                    <LoaderCircle size={16} className="assistant-spin" />
                    正在生成两份结果…
                  </>
                ) : (
                  '用当前模型分别生成'
                )}
              </button>
              <small>这会使用两次免费体验请求，结果均由模型实时生成。</small>
            </div>
          ) : (
            <>
              {!turns.length && (
                <div className="assistant-welcome">
                  <div className="assistant-welcome-mark">
                    <AssistantAvatar />
                  </div>
                  <h2>今天，我们试点什么？</h2>
                  <p>
                    {mode === 'search'
                      ? '说说要完成的事，我帮你找本站的工具与教程。'
                      : '选一个免费模型，给它一个具体的小任务。'}
                  </p>
                  <div className="assistant-starters">
                    {['推荐适合备课的工具', '用一个工作例子解释 RAG', '帮我改进一条提示词'].map(
                      (q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => {
                            setDraft(q)
                            input.current?.focus()
                          }}
                        >
                          {q}
                          <span>↗</span>
                        </button>
                      ),
                    )}
                  </div>
                </div>
              )}
              {turns.map((t) => (
                <article className={'assistant-turn ' + t.role} key={t.id}>
                  <div className="assistant-turn-label">
                    {t.role === 'user' ? '你' : (t.model ?? '小芽')}
                  </div>
                  <div className="assistant-message">
                    {t.text ||
                      (!t.error && (
                        <span className="assistant-typing">
                          正在组织回答<span>•••</span>
                        </span>
                      ))}
                  </div>
                  {t.error && (
                    <p className="assistant-error" role="status">
                      {t.error}
                    </p>
                  )}
                  {t.error &&
                    t.role === 'assistant' &&
                    t.id === turns.at(-1)?.id &&
                    mode === 'chat' && (
                      <div className="assistant-message-actions">
                        <button
                          type="button"
                          disabled={busy || !ready}
                          onClick={() => {
                            const q = turns[turns.findIndex((x) => x.id === t.id) - 1]?.text
                            if (q) void ask(q, { id: t.id, continue: false })
                          }}
                        >
                          重试回答
                        </button>
                        {t.text && (
                          <button
                            type="button"
                            disabled={busy || !ready}
                            onClick={() =>
                              void ask('请接着上一个回答继续，不要重复已有内容。', {
                                id: t.id,
                                continue: true,
                              })
                            }
                          >
                            接着回答
                          </button>
                        )}
                      </div>
                    )}
                  {t.role === 'assistant' && t.text && (
                    <div className="assistant-message-actions">
                      <button type="button" onClick={() => void copy(t.text, t.id)}>
                        {copied === t.id ? <Check size={13} /> : <Copy size={13} />}{' '}
                        {copied === t.id ? '已复制' : '复制'}
                      </button>
                    </div>
                  )}
                  {t.sources?.length ? (
                    <div className="assistant-source-cards">
                      {t.sources.slice(0, 3).map((s) => (
                        <div key={s.href}>
                          <Link href={s.href} onClick={onClose}>
                            {s.title} <span>↗</span>
                          </Link>
                          {moduleEnabled(config, 'saved') &&
                            validLearningEntry({
                              ...s,
                              at: new Date().toISOString(),
                            } as LearningEntry) && (
                              <button type="button" onClick={() => save(s)}>
                                加入学习夹
                              </button>
                            )}
                        </div>
                      ))}
                      {t.sources.filter((s) => s.kind === 'tool').length >= 2 && (
                        <Link
                          href={
                            '/compare/?ids=' +
                            t.sources
                              .filter((s) => s.kind === 'tool')
                              .slice(0, 3)
                              .map((s) => s.href.split('/')[2])
                              .join(',')
                          }
                          onClick={onClose}
                        >
                          打开工具对比 →
                        </Link>
                      )}
                    </div>
                  ) : null}
                </article>
              ))}
            </>
          )}
        </div>
        <footer className="assistant-footer">
          {notice && (
            <p className="assistant-notice" role="status">
              {notice}
            </p>
          )}
          {mode !== 'search' && !ready && (
            <p className="assistant-connection">
              {!catalog
                ? '正在读取免费模型目录…'
                : !catalog.enabled
                  ? 'AI 体验暂时关闭。'
                  : !catalog.connected[model?.provider ?? 'openrouter']
                    ? '这个平台正在连接准备中。'
                    : '免费目录暂时无法核验。'}{' '}
              <button type="button" onClick={() => setMode('search')}>
                先试站内查找
              </button>
            </p>
          )}
          {mode !== 'practice' && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void ask()
              }}
            >
              <textarea
                ref={input}
                value={draft}
                maxLength={4000}
                rows={2}
                aria-label="问小芽"
                placeholder={mode === 'search' ? '说说你想找什么…' : '输入任务，或粘贴一条提示词…'}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault()
                    if (draft.trim() && !busy && (mode === 'search' || ready)) void ask()
                  }
                }}
              />
              <div className="assistant-composer-tools">
                {mode !== 'search' ? (
                  <ModelPicker
                    catalog={catalog}
                    selected={selected}
                    onChange={choose}
                    busy={busy}
                  />
                ) : (
                  <span className="assistant-local-tag">本站资料 · 无需 AI 连接</span>
                )}
                {busy ? (
                  <button
                    type="button"
                    className="assistant-send"
                    aria-label="停止生成"
                    onClick={() => abort.current?.abort()}
                  >
                    <Square size={15} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="assistant-send"
                    aria-label="发送消息"
                    disabled={!draft.trim() || (mode === 'chat' && !ready)}
                  >
                    <ArrowUp size={19} />
                  </button>
                )}
              </div>
            </form>
          )}
          {mode === 'practice' && (
            <div className="assistant-practice-controls">
              <ModelPicker catalog={catalog} selected={selected} onChange={choose} busy={busy} />
              {busy && (
                <button type="button" onClick={() => abort.current?.abort()}>
                  停止生成
                </button>
              )}
            </div>
          )}
          <div className="assistant-footer-note">
            <span>
              {mode === 'search'
                ? '结论来自站内资料'
                : 'AI 可能出错，请核对重要内容；不要输入敏感资料'}
            </span>
            {turns.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setTurns([])
                  setNotice('')
                }}
              >
                <RotateCcw size={12} /> 新对话
              </button>
            )}
          </div>
        </footer>
      </div>
    </dialog>,
    document.body,
  )
}
