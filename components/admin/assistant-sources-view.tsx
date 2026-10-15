'use client'
import { useEffect, useRef, useState } from 'react'
import { apiGet, apiSend, ApiError } from './api-client'

type Model = {
  id: string
  name: string
  originalName: string
  state: 'pending' | 'testing' | 'passed' | 'failed'
  published: boolean
  checkedAt: string | null
  latencyMs: number | null
  error: string | null
}
type Source = {
  id: string
  name: string
  baseUrl: string
  runId: string
  discoveredAt: string | null
  error: string | null
  catalogCount: number
  paused: boolean
  deletedCount: number
  models: Model[]
}
type State = { sources: Source[] }
const endpoint = '/api/admin/assistant/sources'
const field = 'min-h-11 w-full min-w-0 rounded-xl border bg-background px-3 py-2 text-sm'
const button = 'min-h-11 rounded-lg border px-3 py-2 text-sm disabled:opacity-50'
function notifyModels() {
  window.dispatchEvent(new Event('ai-map:assistant-models-changed'))
  try {
    localStorage.setItem('ai-map:assistant-catalog:v1', String(Date.now()))
  } catch {}
}
export function AssistantSourcesView({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [state, setState] = useState<State>({ sources: [] }),
    [selected, setSelected] = useState('')
  const [name, setName] = useState(''),
    [url, setUrl] = useState(''),
    [key, setKey] = useState('')
  const [busy, setBusy] = useState(false),
    [working, setWorking] = useState(''),
    [message, setMessage] = useState('')
  const [query, setQuery] = useState(''),
    [tab, setTab] = useState<'passed' | 'failed' | 'pending'>('passed')
  const [editing, setEditing] = useState(''),
    [label, setLabel] = useState(''),
    [removing, setRemoving] = useState(false)
  const abort = useRef<AbortController | null>(null),
    stopped = useRef(false),
    active = useRef<{ id: string; runId: string } | null>(null),
    alive = useRef(true)
  const source = state.sources.find((s) => s.id === selected)
  async function refresh(signal?: AbortSignal) {
    const value = await apiGet<State>(endpoint, signal)
    if (alive.current) setState(value)
    return value
  }
  useEffect(() => {
    alive.current = true
    void refresh().catch((e) => setMessage(e.message))
    return () => {
      alive.current = false
      stopped.current = true
      abort.current?.abort()
      if (active.current)
        void apiSend(endpoint, 'POST', {
          phase: 'pause',
          sourceId: active.current.id,
          runId: active.current.runId,
        }).catch(() => {})
    }
  }, [])
  function pick(id: string) {
    const s = state.sources.find((x) => x.id === id)
    setSelected(id)
    setName(s?.name ?? '')
    setUrl(s?.baseUrl ?? '')
    setKey('')
    setRemoving(false)
    setEditing('')
    setMessage('')
    setQuery('')
  }
  async function change(body: Record<string, unknown>, text: string) {
    setMessage('')
    try {
      setState(await apiSend<State>(endpoint, 'POST', body))
      setMessage(text)
      notifyModels()
      await onRefresh()
      return true
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '操作未完成，请重试。')
      return false
    }
  }
  async function stop() {
    stopped.current = true
    abort.current?.abort()
    setWorking('')
    setMessage('已停止，检测结果已保留。点击继续检测可以接着检查。')
    const run = active.current
    if (run) {
      try {
        setState(
          await apiSend<State>(endpoint, 'POST', {
            phase: 'pause',
            sourceId: run.id,
            runId: run.runId,
          }),
        )
        notifyModels()
      } catch {
        setMessage('本页已停止，暂停状态未能保存，请联网后刷新检查。')
      }
    }
  }
  async function scan(discover: boolean, only?: Model) {
    if (busy) return
    setBusy(true)
    setMessage('')
    stopped.current = false
    const controller = new AbortController()
    abort.current = controller
    let run: { id: string; runId: string; models: Model[] } | undefined
    try {
      if (discover) {
        setWorking('正在读取模型目录…')
        const result = await apiSend<{ sourceId: string; runId: string; models: Model[] }>(
          endpoint,
          'POST',
          {
            phase: 'discover',
            ...(selected ? { sourceId: selected } : {}),
            baseUrl: url,
            name,
            ...(key.trim() ? { apiKey: key.trim() } : {}),
          },
          controller.signal,
        )
        run = { id: result.sourceId, runId: result.runId, models: result.models }
        setSelected(run.id)
        setKey('')
      } else {
        if (!source) throw Error('请先填写连接并发现模型。')
        await apiSend(
          endpoint,
          'POST',
          { phase: 'resume', sourceId: source.id, runId: source.runId },
          controller.signal,
        )
        if (only)
          await apiSend(
            endpoint,
            'POST',
            { phase: 'retest', model: only.id, runId: source.runId },
            controller.signal,
          )
        run = {
          id: source.id,
          runId: source.runId,
          models: only ? [{ ...only, state: 'pending' }] : source.models,
        }
      }
      active.current = { id: run.id, runId: run.runId }
      await refresh(controller.signal)
      const pending = run.models.filter((m) => m.state === 'pending' || m.state === 'testing')
      if (pending.length) setTab('pending')
      for (let i = 0; i < pending.length; i++) {
        if (stopped.current) break
        setWorking(`${i + 1} / ${pending.length} · ${pending[i].name}`)
        for (let attempt = 0; ; attempt++) {
          try {
            await apiSend(
              endpoint,
              'POST',
              { phase: 'probe', model: pending[i].id, runId: run.runId },
              controller.signal,
            )
            break
          } catch (e) {
            if (!(e instanceof ApiError && e.status === 409 && attempt < 2 && !stopped.current))
              throw e
            await new Promise((r) => setTimeout(r, 2500))
          }
        }
        await refresh(controller.signal)
        notifyModels()
        if (i + 1 < pending.length && !stopped.current)
          await new Promise((r) => setTimeout(r, 1500))
      }
      if (!stopped.current) {
        setTab('passed')
        setMessage('检测完成。可用模型点击“添加到两端”后生效。')
      }
      await onRefresh()
    } catch (e) {
      if (!stopped.current)
        setMessage(
          e instanceof TypeError
            ? '网络连接中断，已完成的结果已保留，可以继续检测。'
            : e instanceof Error
              ? e.message
              : '检测中断，可以继续。',
        )
    } finally {
      if (alive.current) {
        setBusy(false)
        setWorking('')
        void refresh().catch(() => {})
      }
      abort.current = null
      active.current = null
    }
  }
  const counts = {
    passed: source?.models.filter((m) => m.state === 'passed').length ?? 0,
    failed: source?.models.filter((m) => m.state === 'failed').length ?? 0,
    pending:
      source?.models.filter((m) => m.state === 'pending' || m.state === 'testing').length ?? 0,
  }
  const shown =
    source?.models.filter(
      (m) =>
        (tab === 'pending' ? m.state === 'pending' || m.state === 'testing' : m.state === tab) &&
        (m.name + ' ' + m.originalName).toLowerCase().includes(query.toLowerCase()),
    ) ?? []
  return (
    <section className="my-6 rounded-2xl border p-4 sm:p-5" aria-label="模型接入测试">
      <h3 className="text-lg font-semibold">模型接入测试</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        填地址和 Key，自动发现并逐个测试。通过后再添加到网页端与教师端。
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <label className="min-w-0 flex-1 text-sm">
          已保存的连接
          <select
            aria-label="选择测试连接"
            className={field + ' mt-1'}
            value={selected}
            disabled={busy}
            onChange={(e) => pick(e.target.value)}
          >
            <option value="">＋ 新建连接</option>
            {state.sources.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <button
            type="button"
            className={button + ' self-end'}
            disabled={busy}
            onClick={() => pick('')}
          >
            新建
          </button>
        )}
        <button
          type="button"
          className={button + ' self-end'}
          disabled={busy}
          onClick={() => void refresh().catch((e) => setMessage(e.message))}
        >
          刷新列表
        </button>
      </div>
      <form
        className="mt-3 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void scan(true)
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            API URL
            <input
              className={field}
              value={url}
              disabled={busy}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              required
              type="url"
              autoComplete="off"
            />
          </label>
          <label className="grid gap-1 text-sm">
            API Key
            <input
              className={field}
              value={key}
              disabled={busy}
              onChange={(e) => setKey(e.target.value)}
              placeholder={selected ? '留空沿用已保存的 Key' : '仅加密保存在服务器'}
              type="password"
              autoComplete="new-password"
              required={!selected}
              maxLength={512}
            />
          </label>
        </div>
        <label className="grid gap-1 text-sm">
          连接名称（选填）
          <input
            className={field}
            value={name}
            disabled={busy}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="默认使用接口域名"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            className={button + ' bg-primary text-primary-foreground'}
            disabled={busy || !url.trim()}
            type="submit"
          >
            {selected ? '保存并重新检测' : '发现并检测全部模型'}
          </button>
          {source && (
            <button
              className={button}
              type="button"
              disabled={busy || !counts.pending}
              onClick={() => void scan(false)}
            >
              继续检测（{counts.pending}）
            </button>
          )}
          {busy && (
            <button
              className={button + ' border-primary text-primary'}
              type="button"
              onClick={() => void stop()}
            >
              停止测试
            </button>
          )}
          {source && !busy && (
            <button className={button} type="button" onClick={() => setRemoving(!removing)}>
              删除连接
            </button>
          )}
        </div>
      </form>
      {removing && source && (
        <div className="mt-3 rounded-lg bg-muted p-3 text-sm">
          <p>删除“{source.name}”及其模型？两端会同时下架。</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className={button}
              onClick={async () => {
                if (await change({ phase: 'remove', sourceId: source.id }, '连接已删除。')) pick('')
              }}
            >
              确认删除连接
            </button>
            <button type="button" className={button} onClick={() => setRemoving(false)}>
              取消
            </button>
          </div>
        </div>
      )}
      {(working || message) && (
        <p role="status" className="mt-3 break-words rounded-lg bg-accent p-3 text-sm">
          {working || message}
        </p>
      )}
      {source?.error && (
        <p role="alert" className="mt-3 break-words text-sm">
          {source.error}
        </p>
      )}
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        支持 OpenAI
        兼容接口。检测只确认可调用，不证明型号真实性或长期免费。每日复测已保存且未暂停的连接；新模型仍需点击添加。
      </p>
      {source && (
        <>
          <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="模型检测结果分类">
            {(
              [
                ['passed', '可用'],
                ['failed', '不可用'],
                ['pending', '待检测'],
              ] as const
            ).map(([id, title]) => (
              <button
                type="button"
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
                className={button + (tab === id ? ' bg-accent font-semibold text-primary' : '')}
              >
                {title}（{counts[id]}）
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              aria-label="搜索接入模型"
              className={field + ' flex-1'}
              placeholder="搜索模型名称"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {tab === 'failed' && counts.failed > 0 && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() =>
                  void change(
                    { phase: 'deleteFailed', sourceId: source.id, runId: source.runId },
                    '已删除失败模型；后续扫描不会自动恢复。',
                  )
                }
              >
                删除全部失败项
              </button>
            )}
            {source.deletedCount > 0 && (
              <button
                type="button"
                disabled={busy}
                className={button}
                onClick={() =>
                  void change(
                    { phase: 'restoreDeleted', sourceId: source.id, runId: source.runId },
                    '模型已恢复到待检测列表，需要重新检测。',
                  )
                }
              >
                恢复已删除（{source.deletedCount}）
              </button>
            )}
          </div>
          <div
            className="mt-3 max-h-[36rem] space-y-2 overflow-y-auto overscroll-contain pr-1"
            aria-label="接入模型列表"
          >
            {shown.map((m) => (
              <article key={m.id} className="rounded-xl border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="break-all text-sm font-semibold">{m.name}</h4>
                    {m.name !== m.originalName && (
                      <p className="break-all text-xs text-muted-foreground">{m.originalName}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.state === 'passed'
                        ? '回答测试通过'
                        : m.state === 'failed'
                          ? '暂不可用'
                          : m.state === 'testing'
                            ? '正在检测'
                            : '等待检测'}
                      {m.published ? ' · 已添加到两端' : ''}
                      {m.latencyMs !== null ? ` · ${(m.latencyMs / 1000).toFixed(1)}秒` : ''}
                    </p>
                  </div>
                </div>
                {m.error && (
                  <p className="mt-2 break-words text-sm text-muted-foreground">{m.error}</p>
                )}
                {m.checkedAt && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    检测于 {new Date(m.checkedAt).toLocaleString('zh-CN')}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  {m.state === 'passed' && (
                    <button
                      type="button"
                      className={
                        button + (m.published ? '' : ' bg-primary text-primary-foreground')
                      }
                      disabled={busy}
                      onClick={() =>
                        void change(
                          {
                            phase: 'publish',
                            model: m.id,
                            runId: source.runId,
                            published: !m.published,
                          },
                          m.published ? '已从两端下架。' : '已添加，网页端与教师端同步可用。',
                        )
                      }
                    >
                      {m.published ? '从两端下架' : '添加到两端'}
                    </button>
                  )}
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => void scan(false, m)}
                  >
                    单独复测
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => {
                      setEditing(m.id)
                      setLabel(m.name)
                    }}
                  >
                    改名
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() =>
                      void change(
                        { phase: 'deleteModel', model: m.id, runId: source.runId },
                        '模型已删除并下架，后续扫描不会自动恢复。',
                      )
                    }
                  >
                    删除模型
                  </button>
                </div>
                {editing === m.id && (
                  <form
                    className="mt-2 flex flex-wrap gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      const saved = await change(
                        { phase: 'editModel', model: m.id, runId: source.runId, label },
                        '模型名称已更新。',
                      )
                      if (saved) setEditing('')
                    }}
                  >
                    <input
                      aria-label="模型显示名称"
                      className={field + ' flex-1'}
                      value={label}
                      onChange={(e) => setLabel(e.target.value)}
                      maxLength={80}
                      required
                    />
                    <button className={button} type="submit">
                      保存名称
                    </button>
                    <button className={button} type="button" onClick={() => setEditing('')}>
                      取消
                    </button>
                  </form>
                )}
              </article>
            ))}
            {!shown.length && (
              <p className="p-4 text-sm text-muted-foreground">
                {query
                  ? '没有匹配的模型。'
                  : tab === 'passed'
                    ? '还没有通过测试的模型。'
                    : tab === 'failed'
                      ? '没有失败的模型。'
                      : '没有待检测模型。'}
              </p>
            )}
          </div>
        </>
      )}
    </section>
  )
}
