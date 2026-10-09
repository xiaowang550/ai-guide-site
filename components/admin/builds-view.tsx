'use client'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiSend } from './api-client'
import type { BuildRequest } from '@/lib/admin/modules'
type Changes = { path: string; before: string | null; after: string | null }[]
interface BuildState {
  items: BuildRequest[]
  bridge: { available: boolean; message: string; version?: string }
}
const statusLabels: Record<string, string> = {
  draft: '待生成',
  queued: '排队中',
  running: '正在构建',
  ready: '草稿已完成',
  failed: '未完成',
}
export function BuildsView() {
  const [state, setState] = useState<BuildState | null>(null),
    [title, setTitle] = useState(''),
    [request, setRequest] = useState(''),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [changes, setChanges] = useState<Record<string, Changes>>({})
  const load = useCallback(async () => {
    try {
      setState(await apiGet('/api/admin/builds'))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [])
  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 10000)
    return () => clearInterval(timer)
  }, [load])
  async function act(task: () => Promise<unknown>) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await task()
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
      return false
    } finally {
      setBusy(false)
    }
  }
  async function copy(item: BuildRequest) {
    try {
      await navigator.clipboard.writeText(
        `请完善 AI 能力图谱网站。\n需求：${item.title}\n${item.request}\n\n先阅读项目说明，保持访客无需登录、后台仅管理员可用，新增功能附必要验证。生成可预览的改动，完成后说明测试与限制。`,
      )
      setMessage('需求已复制，可粘贴到 Codex。')
    } catch {
      setError('复制失败，可以直接选中下面的需求文字。')
    }
  }
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-semibold">Codex 功能构建</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          把想法写成需求，生成独立的代码草稿，检查后再纳入网站。
        </p>
      </div>
      <section className="admin-card p-6">
        <p className="text-sm font-medium">
          {state?.bridge.available ? '本地 Codex 已连接' : 'Codex 执行状态'}
        </p>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          {state?.bridge.message ?? '正在检查…'} {state?.bridge.version}
        </p>
        <div className="mt-5 grid gap-4">
          <label className="module-field">
            功能名称
            <input
              maxLength={100}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：教师提示词收藏夹"
            />
          </label>
          <label className="module-field">
            想要实现什么
            <textarea
              rows={5}
              maxLength={8000}
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              placeholder="写清给谁用、放在哪个页面、点击后发生什么，以及希望看到的结果。"
            />
          </label>
          <div>
            <button
              disabled={busy || !title.trim() || request.trim().length < 10}
              className="admin-primary-button"
              onClick={() =>
                void act(() => apiSend('/api/admin/builds', 'POST', { title, request })).then(
                  (ok) => {
                    if (ok) {
                      setTitle('')
                      setRequest('')
                      setMessage('需求已保存。')
                    }
                  },
                )
              }
            >
              保存功能需求
            </button>
          </div>
        </div>
      </section>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm text-primary">
          {message}
        </p>
      )}
      <div className="space-y-4">
        {state?.items.map((item) => (
          <article key={item.id} className="admin-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">{item.title}</h2>
              <span className="rounded-full bg-accent px-3 py-1 text-xs">
                {statusLabels[item.status] ?? item.status}
              </span>
            </div>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">
              {item.request}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button className="admin-secondary-button" onClick={() => void copy(item)}>
                复制到 Codex
              </button>
              {['draft', 'failed'].includes(item.status) && (
                <button
                  className="admin-primary-button"
                  disabled={busy || !state.bridge.available}
                  onClick={() =>
                    void act(() => apiSend(`/api/admin/builds/${item.id}/run`, 'POST')).then(
                      (ok) => {
                        if (ok) setMessage('任务已启动，页面会自动更新进度。')
                      },
                    )
                  }
                >
                  生成代码草稿
                </button>
              )}
              {item.status === 'ready' && (
                <button
                  className="admin-secondary-button"
                  onClick={() =>
                    void act(async () => {
                      const result = await apiGet<{ items: Changes }>(
                        `/api/admin/builds/${item.id}/changes`,
                      )
                      setChanges((previous) => ({ ...previous, [item.id]: result.items }))
                    })
                  }
                >
                  查看代码改动
                </button>
              )}
            </div>
            {item.result && (
              <details className="mt-5">
                <summary className="cursor-pointer text-sm font-medium">构建说明</summary>
                <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6">
                  {item.result}
                </pre>
              </details>
            )}
            {changes[item.id]?.map((change) => (
              <details key={change.path} className="mt-4 rounded-xl border p-4">
                <summary className="cursor-pointer text-xs font-medium">
                  {change.path} ·{' '}
                  {change.before === null ? '新增' : change.after === null ? '删除' : '修改'}
                </summary>
                <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">原内容</p>
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all text-[11px]">
                      {change.before ?? '（不存在）'}
                    </pre>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">草稿</p>
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all text-[11px]">
                      {change.after ?? '（已删除）'}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </article>
        ))}
      </div>
      <p className="text-xs leading-6 text-muted-foreground">
        本地执行器使用已登录的
        Codex，在独立副本中生成草稿。需要新功能上线时，先检查改动和测试结果，再构建发布。线上后台需单独接入执行器；内容模块的开关与发布不依赖
        Codex。
      </p>
    </div>
  )
}
