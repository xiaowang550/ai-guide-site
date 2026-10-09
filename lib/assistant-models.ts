export type AssistantProvider = 'openrouter' | 'opencode'
export interface FreeModel {
  id: string
  name: string
  provider: AssistantProvider
  context: number
  vision: boolean
  reasoning: boolean
  tools: boolean
  available: boolean
  note: string
}
export interface ModelCatalog {
  models: FreeModel[]
  checkedAt: string
  stale: boolean
  connected: Record<AssistantProvider, boolean>
  defaultModel: string
  enabled: boolean
}
/** 价格缺失、负数、非数值、额外正价或过期模型都不进入免费调用名单。 */
export function freeModels(value: unknown, now = Date.now()): FreeModel[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as { data?: unknown }).data))
    return []
  const result: FreeModel[] = [],
    seen = new Set<string>()
  for (const raw of (value as { data: Record<string, unknown>[] }).data) {
    if (!raw || typeof raw !== 'object') continue
    const pricing = raw.pricing as Record<string, unknown> | undefined
    if (!pricing || pricing.prompt == null || pricing.completion == null) continue
    if (
      Object.entries(pricing).some(
        ([key, price]) =>
          key !== 'overrides' &&
          ((typeof price !== 'string' && typeof price !== 'number') ||
            !Number.isFinite(Number(price)) ||
            Number(price) !== 0),
      )
    )
      continue
    if (
      Array.isArray(pricing.overrides) &&
      pricing.overrides.some((p) =>
        Object.entries(p as Record<string, unknown>).some(
          ([k, v]) => k !== 'min_prompt_tokens' && Number(v) !== 0,
        ),
      )
    )
      continue
    const id = raw.id,
      name = raw.name
    if (
      typeof id !== 'string' ||
      !/^[a-z0-9_.-]+\/[a-z0-9_.:-]+$/i.test(id) ||
      id.length > 140 ||
      seen.has(id)
    )
      continue
    if (typeof name !== 'string' || !name.trim()) continue
    if (raw.expiration_date && Date.parse(String(raw.expiration_date)) <= now) continue
    seen.add(id)
    const architecture = raw.architecture as
      { input_modalities?: string[]; output_modalities?: string[] } | undefined
    const parameters = Array.isArray(raw.supported_parameters) ? raw.supported_parameters : []
    const audio = architecture?.output_modalities?.includes('audio') ?? false
    result.push({
      id,
      name: name.replace(/\s*\(free\)\s*/gi, '').trim(),
      provider: 'openrouter',
      context: Math.max(0, Number(raw.context_length) || 0),
      vision: architecture?.input_modalities?.includes('image') ?? false,
      reasoning: parameters.includes('reasoning'),
      tools: parameters.includes('tools'),
      available: !audio && (architecture?.output_modalities?.includes('text') ?? false),
      note: audio
        ? '音频生成模型，暂不用于文字助手'
        : id === 'openrouter/free'
          ? '自动选择可用的免费模型'
          : '输入与输出均为零价格',
    })
  }
  return result.sort(
    (a, b) =>
      Number(b.id === 'openrouter/free') - Number(a.id === 'openrouter/free') ||
      a.name.localeCompare(b.name),
  )
}
