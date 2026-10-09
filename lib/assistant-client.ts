import { readSse } from './assistant-stream'
export async function runAssistant(options: {
  model: string
  messages: { role: string; content: string }[]
  page: string
  image?: string
  signal: AbortSignal
  onText: (text: string) => void
  onMeta?: (
    name: string,
    sources: { title: string; href: string; summary: string; kind: string }[],
  ) => void
}) {
  const response = await fetch('/api/assistant/chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: options.signal,
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      page: options.page,
      ...(options.image ? { image: options.image } : {}),
    }),
  })
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error ?? '暂时没有连上模型，请重试。')
  }
  if (!response.body) throw new Error('没有收到回答，请重试。')
  let complete = false,
    error = ''
  await readSse(response.body, (data) => {
    const event = JSON.parse(data)
    if (event.type === 'meta') options.onMeta?.(event.name, event.sources)
    if (event.type === 'model') options.onMeta?.(event.name, [])
    if (event.type === 'delta') options.onText(event.text)
    if (event.type === 'done') complete = true
    if (event.type === 'error') error = event.message
  })
  if (error || !complete) throw new Error(error || '回答中断，收到的文字已保留。')
}
