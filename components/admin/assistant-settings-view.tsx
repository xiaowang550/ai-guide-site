'use client'
import { useEffect, useRef, useState } from 'react'
import { apiGet, apiSend } from './api-client'
import type {
  AssistantProvider,
  FreeModel,
  ConnectionReport,
  AssistantLimits,
} from '@/lib/assistant-models'
const limits = [
  { field: 'dailyLimit', label: '全站每日请求', fallback: 30, unit: '次 / 天' },
  { field: 'visitorDailyLimit', label: '单人每日请求', fallback: 10, unit: '次 / 天' },
  { field: 'minuteLimit', label: '单人发送频率', fallback: 4, unit: '次 / 分钟' },
  { field: 'concurrentLimit', label: '同时生成数量', fallback: 2, unit: '份' },
] as const
interface State extends AssistantLimits {
  enabled: boolean
  defaultModel: string
  connected: Record<AssistantProvider, boolean>
  models: FreeModel[]
  checkedAt: string
  stale: boolean
  encryptedStorageReady: boolean
  todayRequests: number
  baseUrl: string
  connection: ConnectionReport | null
  recentGeneration: {
    checkedAt: string
    ok: boolean
    model: string
    code: number | string
    message?: string
    latencyMs: number
  } | null
}
export function AssistantSettingsView() {
  const [state, setState] = useState<State | null>(null),
    [provider, setProvider] = useState<AssistantProvider>('openrouter'),
    [key, setKey] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [baseUrl, setBaseUrl] = useState('https://openrouter.ai/api/v1'),
    [report, setReport] = useState<ConnectionReport | null>(null),
    [testing, setTesting] = useState(false),
    [testModel, setTestModel] = useState(''),
    [filter, setFilter] = useState('')
  const testVersion = useRef(0)
  const connection = report ?? (provider === 'openrouter' && !key.trim() ? state?.connection : null)
  const listed = (connection?.models ?? state?.models ?? []).filter((m) => m.provider === provider)
  const models = listed.filter((m) => (m.name + m.id).toLowerCase().includes(filter.toLowerCase()))
  function invalidate() {
    testVersion.current++
    setReport(null)
    setTesting(false)
  }
  async function check(infer = false) {
    const version = ++testVersion.current
    setTesting(true)
    setMessage('')
    try {
      const result = await apiSend<ConnectionReport>('/api/admin/assistant/test', 'POST', {
        provider,
        baseUrl,
        ...(key.trim() ? { apiKey: key.trim() } : {}),
        ...(infer && testModel ? { model: testModel } : {}),
        infer,
      })
      if (version !== testVersion.current) return
      setReport(result)
      setTestModel((old) =>
        result.models.some((m) => m.id === old && m.available)
          ? old
          : (result.models.find((m) => m.available)?.id ?? ''),
      )
      setMessage(
        result.error ??
          (infer
            ? result.probe?.ok
              ? '实际流式回答已完成，连接可用。'
              : (result.probe?.message ?? '实际回答测试未通过。')
            : 'Key 与账号模型目录已检查。'),
      )
    } catch (e) {
      if (version === testVersion.current)
        setMessage(e instanceof Error ? e.message : '连接检查失败。')
    } finally {
      if (version === testVersion.current) setTesting(false)
    }
  }
  useEffect(() => {
    if (key.trim().length < 12) return
    const timer = setTimeout(() => {
      void check()
    }, 900)
    return () => clearTimeout(timer)
    // 输入稳定后检查目录；实际推理只由按钮触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, baseUrl, provider])
  useEffect(() => {
    void apiGet<State>('/api/admin/assistant')
      .then((s) => {
        setState(s)
        setTestModel(s.defaultModel)
      })
      .catch((e) => setMessage(e.message))
  }, [])
  async function update(body: Record<string, unknown>) {
    setBusy(true)
    setMessage('')
    try {
      const result = await apiSend<State>('/api/admin/assistant', 'PATCH', body)
      setState(result)
      if (body.apiKey !== undefined || body.removeKey) {
        setKey('')
        setReport(null)
      }
      setMessage(
        limits.some(({ field }) => body[field] !== undefined)
          ? '调用限制已保存，立即对新请求生效。'
          : '已保存，访客重新打开助手后即可使用。',
      )
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
          {state ? `今日 ${state.todayRequests} 次请求` : '正在读取调用设置…'}
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
      <div className="mt-5">
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
      </div>
      <div className="mt-5 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">本站调用限制</h3>
          <button
            type="button"
            disabled={!state || busy || limits.every(({ field }) => state[field] === 0)}
            className="min-h-11 rounded-lg bg-accent px-3 text-xs text-primary"
            onClick={() =>
              void update({
                dailyLimit: 0,
                visitorDailyLimit: 0,
                minuteLimit: 0,
                concurrentLimit: 0,
              })
            }
          >
            全部设为无限制
          </button>
        </div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          默认无限制，需要时逐项设置。保存后立即对新请求生效，统计仍正常记录。每日计数按 UTC
          日重置；单人计数按当天匿名网络标识，同一网络可能共享。
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {limits.map(({ field, label, fallback, unit }) => (
            <div key={field} className="space-y-2">
              <label className="grid gap-2 text-sm">
                {label}
                <select
                  aria-label={`${label}限制方式`}
                  className="min-h-11 rounded-xl border bg-background p-2.5"
                  value={state?.[field] === 0 ? 'unlimited' : 'limited'}
                  disabled={!state || busy}
                  onChange={(event) =>
                    void update({ [field]: event.target.value === 'unlimited' ? 0 : fallback })
                  }
                >
                  <option value="unlimited">无限制</option>
                  <option value="limited">设置上限</option>
                </select>
              </label>
              {state && state[field] > 0 && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    aria-label={`${label}上限`}
                    type="number"
                    min={1}
                    max={100000}
                    step={1}
                    className="min-h-11 min-w-0 flex-1 rounded-xl border bg-background p-2.5 text-sm text-foreground"
                    defaultValue={state[field]}
                    key={state[field]}
                    disabled={busy}
                    onBlur={(event) => {
                      if (!event.target.value.trim() || !event.target.validity.valid) {
                        setMessage('请填写 1–100000 的整数，或选择无限制。')
                        return
                      }
                      const value = Number(event.target.value)
                      if (value !== state[field]) void update({ [field]: value })
                    }}
                  />
                  {unit}
                </label>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          这里调整本站限制。OpenRouter / OpenCode 的免费额度、模型限流和服务状态仍以平台为准。
        </p>
      </div>
      <div className="mt-6 rounded-xl border p-4">
        <div className="flex flex-wrap gap-2">
          {(['openrouter', 'opencode'] as const).map((p) => (
            <button
              type="button"
              key={p}
              className={`rounded-lg px-3 py-2 text-xs ${provider === p ? 'bg-accent text-primary' : 'bg-muted text-muted-foreground'}`}
              onClick={() => {
                invalidate()
                setProvider(p)
                setKey('')
                setTestModel('')
                setFilter('')
                setBaseUrl(
                  p === 'openrouter'
                    ? 'https://openrouter.ai/api/v1'
                    : 'https://opencode.ai/zen/v1',
                )
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
            void update({ provider, apiKey: key, baseUrl })
          }}
        >
          <label className="block text-xs">
            平台网址 / API 地址
            <input
              type="url"
              aria-label="助手 API 地址"
              value={baseUrl}
              disabled={testing || busy}
              onChange={(e) => {
                invalidate()
                setBaseUrl(e.target.value)
              }}
              className="mt-2 w-full rounded-xl border bg-background p-3 text-sm"
            />
          </label>
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
              onChange={(e) => {
                invalidate()
                setKey(e.target.value)
              }}
              className="mt-2 w-full rounded-xl border bg-background p-3 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="rounded-lg bg-primary px-4 py-2 text-xs text-primary-foreground"
              disabled={busy || testing || !key.trim() || !state?.encryptedStorageReady}
            >
              {busy ? '正在保存…' : '安全保存 Key'}
            </button>
            <button
              type="button"
              disabled={busy || testing || (!key.trim() && !state?.connected[provider])}
              className="rounded-lg border px-4 py-2 text-xs"
              onClick={() => void check()}
            >
              {testing ? '正在检查…' : '检查连接与免费模型'}
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
      <div className="mt-5 rounded-xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-medium">连接状态与可用免费模型</h3>
          <span className="text-xs text-muted-foreground">
            {connection?.checkedAt
              ? new Date(connection.checkedAt).toLocaleString('zh-CN')
              : '尚未检查'}
          </span>
        </div>
        <p className="mt-3 text-xs leading-6" role="status">
          {testing
            ? '正在核验平台连接，请稍候…'
            : connection?.authenticated
              ? 'Key 验证通过'
              : connection
                ? 'Key 尚未验证通过'
                : '填写 Key 后自动检查，也可以测试已保存的连接。'}
          {connection?.catalogVerified
            ? ` · 账号目录核验通过 · ${listed.filter((m) => m.available).length} 个免费文字模型`
            : ''}
        </p>
        {connection?.error && (
          <p className="mt-2 text-xs text-muted-foreground">{connection.error}</p>
        )}
        {connection?.account && (
          <p className="mt-2 text-xs text-muted-foreground">
            平台免费请求：
            {connection.account.freeDaily
              ? `今日 ${connection.account.freeDaily.used} / ${connection.account.freeDaily.limit}，剩余 ${connection.account.freeDaily.remaining} 次`
              : '平台未返回剩余次数，以实际调用为准'}
            {connection.account.limitRemaining !== null
              ? ` · Key 支出限额剩余 $${connection.account.limitRemaining}`
              : ''}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <select
            aria-label="连接测试模型"
            value={testModel}
            onChange={(e) => setTestModel(e.target.value)}
            disabled={testing || busy}
            className="min-w-0 flex-1 rounded-lg border bg-background p-2 text-xs"
          >
            <option value="">自动选择免费模型</option>
            {listed
              .filter((m) => m.available)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
          <button
            type="button"
            onClick={() => void check(true)}
            disabled={testing || busy || (!key.trim() && !state?.connected[provider])}
            className="rounded-lg bg-accent px-4 py-2 text-xs text-primary"
          >
            {testing ? '测试中…' : '实际回答测试'}
          </button>
        </div>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          检查目录不生成回答；实际测试会消耗一次平台免费请求，最长等待 4 分钟。留空 Key
          会使用已保存连接，新 Key 测试通过后仍需点安全保存。
        </p>
        {connection?.probe && (
          <p className="mt-3 rounded-lg bg-muted p-3 text-xs leading-6" role="status">
            {connection.probe.ok ? '实际流式回答完成' : '实际回答未完整完成'} ·{' '}
            {(connection.probe.latencyMs / 1000).toFixed(1)} 秒
            {connection.probe.firstTokenMs !== null
              ? ` · 首字 ${(connection.probe.firstTokenMs / 1000).toFixed(1)} 秒`
              : ''}
            {connection.probe.actualModel ? ` · ${connection.probe.actualModel}` : ''}
            {connection.probe.message ? ` · ${connection.probe.message}` : ''}
          </p>
        )}
        <input
          aria-label="筛选免费模型"
          placeholder="搜索模型名称…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="mt-4 w-full rounded-lg border bg-background p-2 text-xs"
        />
        <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
          {models.map((m) => (
            <div
              key={m.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-muted/50 p-3 text-xs"
            >
              <div className="min-w-0">
                <p className="font-medium">{m.name}</p>
                <p className="mt-1 break-all text-muted-foreground">{m.id}</p>
              </div>
              <span className="shrink-0 text-muted-foreground">
                {connection?.probe?.model === m.id
                  ? connection.probe.ok
                    ? '回答测试通过'
                    : '测试未通过'
                  : m.available
                    ? connection?.catalogVerified
                      ? '账号可选 · 待回答测试'
                      : '零价格 · 待核验'
                    : '非文字模型'}
              </span>
            </div>
          ))}
          {connection?.catalogVerified && !models.length && (
            <p className="text-xs text-muted-foreground">
              没有匹配的免费模型，请检查账号的提供商、隐私或模型限制。
            </p>
          )}
        </div>
        {provider === 'openrouter' && state?.recentGeneration && (
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            最近一次站内生成：
            {state.recentGeneration.ok
              ? '完整完成'
              : (state.recentGeneration.message ?? `未完成（${state.recentGeneration.code}）`)}{' '}
            · {state.recentGeneration.model}
          </p>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          {state ? `${state.models.length} 个模型 ·` : '正在读取模型目录…'}{' '}
          {state ? (state.stale ? '使用目录快照，待重新核验' : '价格目录已核验') : ''}
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
