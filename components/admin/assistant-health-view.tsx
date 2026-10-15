'use client'
import { useEffect, useState } from 'react'
import { apiGet, apiSend } from './api-client'
import type { FreeModel, ModelHealth } from '@/lib/assistant-models'
interface HealthSummary {
  runId: string | null
  startedAt: string | null
  completedAt: string | null
  source: string | null
  total: number
  checked: number
  checks: ModelHealth[]
  models: FreeModel[]
  lastDailyAt: string | null
}
export function AssistantHealthView({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const [state, setState] = useState<HealthSummary | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [progress, setProgress] = useState('')
  async function refresh() {
    setState(await apiGet<HealthSummary>('/api/admin/assistant/health'))
  }
  useEffect(() => {
    void refresh().catch(() => {})
  }, [])
  async function checkAll() {
    setBusy(true)
    setMessage('')
    try {
      const plan = await apiSend<{ runId: string; models: FreeModel[] }>(
        '/api/admin/assistant/health',
        'POST',
        { phase: 'start' },
      )
      for (let i = 0; i < plan.models.length; i++) {
        const model = plan.models[i]
        setProgress(`${i + 1} / ${plan.models.length} · ${model.name}`)
        await apiSend('/api/admin/assistant/health', 'POST', {
          phase: 'probe',
          runId: plan.runId,
          model: model.id,
        })
        await refresh()
        await onRefresh()
        if (i + 1 < plan.models.length) await new Promise((resolve) => setTimeout(resolve, 3500))
      }
      setState(
        await apiSend<HealthSummary>('/api/admin/assistant/health', 'POST', {
          phase: 'finish',
          runId: plan.runId,
        }),
      )
      await onRefresh()
      setMessage('检查完成。小助手只显示回答测试通过的免费模型。')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '检查中断，点击按钮可以继续。')
    } finally {
      setBusy(false)
      setProgress('')
    }
  }
  const failed = state?.checks.filter((c) => !c.ok) ?? []
  return (
    <section className="mt-5 rounded-xl border p-4" aria-label="免费模型回答测试">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">免费模型回答测试</h3>
        <button
          type="button"
          disabled={busy}
          onClick={() => void checkAll()}
          className="min-h-11 rounded-lg bg-primary px-4 text-xs text-primary-foreground"
        >
          {busy ? '正在逐个测试…' : '检查全部免费模型'}
        </button>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        每天
        08:40（北京时间）检查官方目录，新增模型先通过真实回答测试，再加入小助手。测试使用平台免费次数。
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        最近每日检查：
        {state?.lastDailyAt ? new Date(state.lastDailyAt).toLocaleString('zh-CN') : '尚未运行'}
        {state?.total ? ` · 最近一轮 ${state.checked} / ${state.total} 个` : ''}
      </p>
      {progress && (
        <p role="status" className="mt-3 text-sm">
          {progress}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
      {!!failed.length && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs">
            未通过的模型（{failed.length} 个，不在可用列表中）
          </summary>
          <ul className="mt-3 space-y-2 text-xs">
            {failed.map((c) => (
              <li key={c.model} className="rounded-lg bg-muted/50 p-3">
                <strong className="break-all">
                  {state?.models.find((m) => m.id === c.model)?.name ?? c.model}
                </strong>
                <p className="mt-1 text-muted-foreground">
                  {c.message ?? '实际回答测试未通过。'} ·{' '}
                  {new Date(c.checkedAt).toLocaleString('zh-CN')}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
