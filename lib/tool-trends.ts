export interface ToolTrends {
  asOf: string
  method: 'snapshot' | 'seven-days'
  items: { toolId: string; model: string; rank: number }[]
}
export function freshTrends(trends: ToolTrends, now = Date.now()): ToolTrends {
  const at = Date.parse(trends.asOf)
  return Number.isFinite(at) && now - at < 7 * 86400000 && at <= now + 86400000
    ? trends
    : { ...trends, items: [] }
}
export function summarizeTrends(payload: unknown): ToolTrends | null {
  const input = payload as {
    meta?: { as_of?: string }
    data?: { model_permaslug?: string; total_tokens?: string }[]
  }
  if (
    !input?.meta?.as_of ||
    !Number.isFinite(Date.parse(input.meta.as_of)) ||
    !Array.isArray(input.data)
  )
    return null
  const totals = new Map<string, bigint>()
  for (const row of input.data) {
    const model = row.model_permaslug
    if (!model || model === 'other' || !/^\d+$/.test(row.total_tokens ?? '')) continue
    totals.set(model, (totals.get(model) ?? 0n) + BigInt(row.total_tokens!))
  }
  const families: [RegExp, string][] = [
    [/^deepseek\//, 'deepseek'],
    [/^z-ai\//, 'glm'],
    [/^anthropic\/claude/, 'claude'],
    [/^openai\/gpt/, 'chatgpt'],
    [/^google\/gemini/, 'gemini'],
    [/^qwen\//, 'qwen'],
    [/^moonshotai\//, 'kimi'],
    [/^mistralai\//, 'mistral'],
  ]
  const items: ToolTrends['items'] = []
  const ranked = [...totals]
    .filter(([, n]) => n > 0n)
    .sort((a, b) => (a[1] === b[1] ? a[0].localeCompare(b[0]) : a[1] > b[1] ? -1 : 1))
    .slice(0, 10)
  ranked.forEach(([model], index) => {
    const toolId = families.find(([pattern]) => pattern.test(model))?.[1]
    if (toolId && !items.some((item) => item.toolId === toolId))
      items.push({ toolId, model, rank: index + 1 })
  })
  return items.length ? { asOf: input.meta.as_of, method: 'seven-days', items } : null
}
