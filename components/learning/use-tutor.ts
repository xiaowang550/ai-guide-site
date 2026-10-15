'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { runAssistant } from '@/lib/assistant-client'
import type { ModelCatalog } from '@/lib/assistant-models'
export function useTutor(enabled = true) {
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null),
    [loading, setLoading] = useState(enabled),
    [model, setModel] = useState(''),
    [busy, setBusy] = useState(false),
    [elapsed, setElapsed] = useState(0),
    [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null),
    quickChoice = useRef(''),
    pathname = usePathname()
  useEffect(() => {
    if (!enabled) return
    setLoading(true)
    let alive = true
    const catalogAbort = new AbortController()
    const timeout = setTimeout(() => catalogAbort.abort(), 12000)
    fetch('/api/assistant/models', { cache: 'no-store', signal: catalogAbort.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error('模型目录暂时无法读取。')
        const value = (await r.json()) as ModelCatalog
        if (!alive) return
        setCatalog(value)
        const usable = value.models.filter((m) => m.available && value.connected[m.provider])
        // The service orders verified models by measured first-token latency.
        const quick = usable[0]?.id ?? ''
        quickChoice.current = quick
        setModel(quick)
      })
      .catch((e) => {
        if (alive)
          setError(catalogAbort.signal.aborted ? '连接准备超时，可以先做示例练习。' : e.message)
      })
      .finally(() => {
        clearTimeout(timeout)
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
      clearTimeout(timeout)
      catalogAbort.abort()
      controller.current?.abort()
    }
  }, [enabled])
  useEffect(() => {
    if (!busy) return
    const timer = setInterval(() => setElapsed((seconds) => seconds + 1), 1000)
    return () => clearInterval(timer)
  }, [busy])
  const current = catalog?.models.find((m) => m.id === model)
  const ready =
    !!current &&
    current.available &&
    !!catalog?.enabled &&
    !!catalog.connected[current.provider] &&
    (!catalog.stale || current.provider !== 'openrouter')
  async function run(
    text: string,
    onText: (value: string) => void,
    options?: { image?: string; history?: { role: string; content: string }[] },
  ) {
    if (controller.current) throw new Error('请等当前回答完成。')
    if (!ready) throw new Error('免费 AI 连接暂不可用，仍可先看示例和完成练习。')
    const abort = new AbortController()
    controller.current = abort
    setBusy(true)
    setElapsed(0)
    setError('')
    try {
      await runAssistant({
        model,
        page: pathname,
        mode: 'practice',
        signal: abort.signal,
        image: options?.image,
        messages: [
          ...(options?.history ?? []).slice(-6),
          { role: 'user', content: text.slice(0, 4000) },
        ],
        onText,
      })
    } catch (e) {
      const message = abort.signal.aborted
        ? '已停止，收到的文字保留在这里。'
        : e instanceof Error
          ? e.message
          : '暂时没有收到回答，请重试。'
      setError(message)
      throw new Error(message)
    } finally {
      if (controller.current === abort) controller.current = null
      setBusy(false)
    }
  }
  return {
    catalog,
    loading,
    model,
    setModel,
    resetQuickModel: () => {
      if (quickChoice.current) setModel(quickChoice.current)
    },
    ready,
    current,
    run,
    busy,
    elapsed,
    error,
    setError,
    stop: () => controller.current?.abort(),
  }
}
