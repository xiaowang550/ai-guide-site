'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { runAssistant } from '@/lib/assistant-client'
import type { ModelCatalog } from '@/lib/assistant-models'
export function useTutor() {
  const [catalog, setCatalog] = useState<ModelCatalog | null>(null),
    [model, setModel] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null),
    pathname = usePathname()
  useEffect(() => {
    let alive = true
    fetch('/api/assistant/models', { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error('模型目录暂时无法读取。')
        const value = (await r.json()) as ModelCatalog
        if (!alive) return
        setCatalog(value)
        const usable = value.models.filter((m) => m.available && value.connected[m.provider])
        setModel(
          (
            usable.find((m) => m.id === 'liquid/lfm-2.5-2.6b:free') ??
            usable.find((m) => m.id.startsWith('google/gemma')) ??
            usable.find((m) => m.id !== 'openrouter/free' && !m.reasoning) ??
            usable.find((m) => m.id !== 'openrouter/free') ??
            usable[0]
          )?.id ?? '',
        )
      })
      .catch((e) => {
        if (alive) setError(e.message)
      })
    return () => {
      alive = false
      controller.current?.abort()
    }
  }, [])
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
    setError('')
    try {
      await runAssistant({
        model,
        page: pathname,
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
    model,
    setModel,
    ready,
    current,
    run,
    busy,
    error,
    setError,
    stop: () => controller.current?.abort(),
  }
}
