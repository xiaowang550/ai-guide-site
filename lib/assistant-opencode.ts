import type { FreeModel } from './assistant-models.ts'
import { reasoningSupport } from './assistant-models.ts'
export const ZEN_PRICING_URL = 'https://opencode.ai/v2/docs/console/models/'
const text = (value: string) =>
  value
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|amp);/g, ' ')
    .trim()
const normalized = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '')
/** A free suffix alone is not evidence: require the official price row and chat endpoint too. */
export function zenFreeModels(catalog: unknown, html: string): FreeModel[] {
  if (!catalog || !Array.isArray((catalog as { data?: unknown }).data) || html.length > 3000000)
    return []
  const prices = new Set<string>(),
    compatible = new Map<string, string>()
  for (const row of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => text(c[1]))
    if (cells.length >= 3 && cells[1] === 'Free' && cells[2] === 'Free' && cells.slice(3).every((c) => c === 'Free' || /^[-—–]$/.test(c)))
      prices.add(normalized(cells[0]))
    if (
      cells.length >= 3 &&
      cells.some((c) => c.includes('https://opencode.ai/zen/v1/chat/completions')) &&
      /^[a-z0-9.-]+$/.test(cells[1] ?? '')
    )
      compatible.set(cells[1], cells[0])
  }
  return (catalog as { data: Record<string, unknown>[] }).data.flatMap((raw) => {
    if (typeof raw?.id !== 'string' || raw.id.length > 120) return []
    const name = compatible.get(raw.id)
    if (!name || !prices.has(normalized(name))) return []
    const support = reasoningSupport(raw.reasoning)
    return [
      {
        id: 'opencode:' + raw.id,
        name,
        provider: 'opencode' as const,
        context: Math.max(0, Number(raw.context_length) || 0),
        vision: false,
        reasoning: !!support,
        tools: false,
        available: true,
        note: '官方免费期内开放，实际测试通过后启用',
        ...(support ? { reasoningSupport: support } : {}),
      },
    ]
  })
}
