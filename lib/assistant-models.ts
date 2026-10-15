export type AssistantProvider = 'openrouter' | 'opencode'
export const REASONING_EFFORTS = [
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number]
export type ReasoningChoice =
  'default' | ReasoningEffort | 'budget-1024' | 'budget-2048' | 'budget-4096'
export interface ReasoningSupport {
  efforts: ReasoningEffort[]
  mandatory: boolean
  defaultEffort?: ReasoningEffort
  budget: boolean
}
export interface ModelHealth {
  model: string
  provider: AssistantProvider
  ok: boolean
  checkedAt: string
  latencyMs: number
  firstTokenMs: number | null
  code?: string | number
  message?: string
}
/** 本站调用限制；0 表示无限制，不改变平台自己的免费额度。 */
export interface AssistantLimits {
  dailyLimit: number
  visitorDailyLimit: number
  minuteLimit: number
  concurrentLimit: number
}
export interface FreeModel {
  id: string
  name: string
  provider: AssistantProvider | 'custom'
  sourceName?: string
  context: number
  vision: boolean
  reasoning: boolean
  tools: boolean
  available: boolean
  note: string
  reasoningSupport?: ReasoningSupport
  verifiedAt?: string
  firstTokenMs?: number | null
}
export interface ModelCatalog {
  models: FreeModel[]
  checkedAt: string
  stale: boolean
  connected: Record<AssistantProvider, boolean> & { custom?: boolean }
  defaultModel: string
  enabled: boolean
}
/** 审核分类器虽然输出文字，也不能替代写作、问答模型。 */
export function isTaskModel(model: Pick<FreeModel, 'id' | 'name'>) {
  return !/(?:^|[/:\s_-])(?:content[\s_-]*safety|moderation|(?:llama[\s_-]*)?guard(?:[-\s]?\d+)?|safeguard)(?:$|[/:\s_-])/i.test(
    model.id + ' ' + model.name,
  )
}
export function experimentModels(catalog: ModelCatalog | null): FreeModel[] {
  return (catalog?.models ?? []).filter(
    (m) =>
      m.available && catalog?.connected[m.provider] && m.id !== 'openrouter/free' && isTaskModel(m),
  )
}
/** 只识别纯审核标签，不把正常讨论审核概念的回答当作故障。 */
export function isClassificationOnlyReply(text: string) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const verdict = /^(?:User|Response|Assistant)\s+Safety:\s*(?:safe|unsafe)\.?$/i
  return (
    lines.length > 0 &&
    lines.some((line) => verdict.test(line)) &&
    lines.every(
      (line) => verdict.test(line) || /^Safety Categories:\s*[A-Za-z0-9_, .-]*$/i.test(line),
    )
  )
}
export function reasoningSupport(raw: unknown): ReasoningSupport | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const value = raw as Record<string, unknown>
  const advertised = value.supported_efforts
  const efforts =
    advertised === null
      ? [...REASONING_EFFORTS]
      : Array.isArray(advertised)
        ? REASONING_EFFORTS.filter((e) => advertised.includes(e))
        : []
  return {
    efforts: efforts.filter((e) => e !== 'none' || value.mandatory !== true),
    mandatory: value.mandatory === true,
    budget: value.supports_max_tokens === true,
    ...(REASONING_EFFORTS.includes(value.default_effort as ReasoningEffort)
      ? { defaultEffort: value.default_effort as ReasoningEffort }
      : {}),
  }
}
export interface ConnectionReport {
  checkedAt: string
  baseUrl: string
  authenticated: boolean
  catalogVerified: boolean
  models: FreeModel[]
  allowedIds?: string[]
  error?: string
  account?: {
    isFreeTier: boolean
    limitRemaining: number | null
    freeDaily: { used: number; limit: number; remaining: number } | null
  }
  probe?: {
    ok: boolean
    model: string
    actualModel?: string
    latencyMs: number
    firstTokenMs: number | null
    generationId?: string
    code?: number | string
    message?: string
  }
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
      reasoning: id !== 'openrouter/free' && parameters.includes('reasoning'),
      ...(id !== 'openrouter/free' && raw.reasoning
        ? { reasoningSupport: reasoningSupport(raw.reasoning) }
        : {}),
      tools: parameters.includes('tools'),
      available:
        !audio &&
        isTaskModel({ id, name }) &&
        (architecture?.output_modalities?.includes('text') ?? false),
      note: !isTaskModel({ id, name })
        ? '审核分类专用，不用于写作和对话'
        : audio
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
