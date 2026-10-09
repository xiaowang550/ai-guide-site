'use client'
import { useEffect, useState } from 'react'
import { apiGet, apiSend } from './api-client'
import type { AssistantProvider, FreeModel } from '@/lib/assistant-models'
interface State {
  enabled: boolean
  defaultModel: string
  dailyLimit: number
  connected: Record<AssistantProvider, boolean>
  models: FreeModel[]
  checkedAt: string
  stale: boolean
  encryptedStorageReady: boolean
  todayRequests: number
}
export function AssistantSettingsView() {
  const [state, setState] = useState<State | null>(null),
    [provider, setProvider] = useState<AssistantProvider>('openrouter'),
    [key, setKey] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    void apiGet<State>('/api/admin/assistant')
      .then(setState)
      .catch((e) => setMessage(e.message))
  }, [])
  async function update(body: Record<string, unknown>) {
    setBusy(true)
    setMessage('')
    try {
      const result = await apiSend<State>('/api/admin/assistant', 'PATCH', body)
      setState(result)
      setKey('')
      setMessage('已保存，访客重新打开助手后即可使用。')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '保存失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="admin-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">免费模型与站内助手</h2>
          <p className="mt-2 max-w-xl text-xs leading-6 text-muted-foreground">
            你配置一次，访客直接使用。Key 加密保存在服务器端，前台只接收模型列表与生成结果。
          </p>
        </div>
        <span className="rounded-full bg-accent px-3 py-1 text-xs text-primary">
          今日 {state?.todayRequests ?? 0} / {state?.dailyLimit ?? 30} 次请求
        </span>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          role="switch"
          aria-label="免费 AI 体验"
          aria-checked={state?.enabled ?? false}
          className="module-switch"
          disabled={!state || busy}
          onClick={() => void update({ enabled: !state?.enabled })}
        >
          <span />
        </button>
        <span className="text-sm">开放免费 AI 体验</span>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          默认模型
          <select
            className="rounded-xl border bg-background p-2.5"
            value={state?.defaultModel ?? 'openrouter/free'}
            disabled={!state || busy}
            onChange={(e) => void update({ defaultModel: e.target.value })}
          >
            {state?.models
              .filter((m) => m.available)
              .map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          全站每日体验上限
          <input
            type="number"
            min={2}
            max={1000}
            className="rounded-xl border bg-background p-2.5"
            defaultValue={state?.dailyLimit ?? 30}
            key={state?.dailyLimit}
            disabled={!state || busy}
            onBlur={(e) => {
              const value = Number(e.target.value)
              if (value !== state?.dailyLimit) void update({ dailyLimit: value })
            }}
          />
          <small className="text-xs text-muted-foreground">
            按 UTC 日重置。平台额度另行限制；每次生成计一次请求。
          </small>
        </label>
      </div>
      <div className="mt-6 rounded-xl border p-4">
        <div className="flex flex-wrap gap-2">
          {(['openrouter', 'opencode'] as const).map((p) => (
            <button
              type="button"
              key={p}
              className={`rounded-lg px-3 py-2 text-xs ${provider === p ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground'}`}
              onClick={() => {
                setProvider(p)
                setKey('')
              }}
            >
              {p === 'openrouter' ? 'OpenRouter · 全部免费模型' : 'OpenCode · 太空兔'}{' '}
              <span>{state?.connected[p] ? '已配置' : '待配置'}</span>
            </button>
          ))}
        </div>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void update({ provider, apiKey: key })
          }}
        >
          <label className="block text-xs">
            {provider === 'openrouter' ? 'OpenRouter' : 'OpenCode Zen'} API Key
            <input
              type="password"
              autoComplete="off"
              aria-label="助手 API Key"
              placeholder={
                state?.connected[provider] ? '已配置，填写新 Key 可替换' : '粘贴此平台的 API Key'
              }
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="mt-2 w-full rounded-xl border bg-background p-3 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-lg bg-primary px-4 py-2 text-xs text-primary-foreground"
              disabled={busy || !key.trim() || !state?.encryptedStorageReady}
            >
              {busy ? '正在保存…' : '安全保存 Key'}
            </button>
            <a
              href={
                provider === 'openrouter'
                  ? 'https://openrouter.ai/settings/keys'
                  : 'https://opencode.ai/auth'
              }
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary"
            >
              到官方创建 Key ↗
            </a>
            {state?.connected[provider] && (
              <button
                type="button"
                className="text-xs text-muted-foreground"
                disabled={busy}
                onClick={() => void update({ provider, removeKey: true })}
              >
                移除连接
              </button>
            )}
          </div>
        </form>
        {provider === 'opencode' && (
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            太空兔使用 OpenCode 的独立 Key，OpenRouter Key
            不能用于这个入口。免费预览是否可用，以实际服务响应为准。
          </p>
        )}
        {state && !state.encryptedStorageReady && (
          <p className="mt-3 text-xs text-muted-foreground">
            服务器的密钥加密尚未配置，暂不接收 Key。
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {state?.models.length ?? 0} 个模型 ·{' '}
          {state?.stale ? '使用目录快照，待重新核验' : '价格目录已核验'}
          {state?.checkedAt
            ? ' · ' +
              new Date(state.checkedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
            : ''}
        </span>
        <button
          type="button"
          className="text-primary"
          disabled={busy}
          onClick={() => void update({ refresh: true })}
        >
          更新免费目录
        </button>
      </div>
      {message && (
        <p className="mt-4 text-sm" role="status">
          {message}
        </p>
      )}
      <p className="mt-4 text-xs leading-6 text-muted-foreground">
        只有价格为零的文字模型可以调用；价格变动、额度不足或服务中断时会提示。对话正文不写入站点数据库，生成材料仍需人工核对。
      </p>
    </section>
  )
}
