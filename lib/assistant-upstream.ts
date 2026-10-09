import { readSse } from './assistant-stream.ts'

export const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
export const ZEN_BASE = 'https://opencode.ai/zen/v1'
/** 只接受平台官方地址，不把共享 Key 发送到任意代理或跳转目标。 */
export function normalizeAssistantUrl(value: unknown, provider: 'openrouter' | 'opencode') {
  const base = provider === 'openrouter' ? OPENROUTER_BASE : ZEN_BASE
  if (value === undefined || value === '') return base
  if (typeof value !== 'string' || value.length > 200) throw new Error('请填写平台官方接口地址。')
  const url = new URL(value.trim())
  const allowed =
    provider === 'openrouter'
      ? ['', '/', '/api/v1', '/api/v1/', '/api/v1/chat/completions']
      : ['/zen/v1', '/zen/v1/', '/zen/v1/chat/completions']
  if (
    url.origin !== new URL(base).origin ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !allowed.includes(url.pathname)
  )
    throw new Error('请使用 ' + base + '，也可以填写平台官网地址。')
  return base
}
export function upstreamMessage(code: number) {
  return code === 429
    ? '免费模型被限流或免费额度已用完，请稍后重试或换一个免费模型。'
    : code === 401 || code === 403
      ? '平台拒绝了连接，请管理员检查 Key、账号权限和隐私设置。'
      : code === 402
        ? '平台账户额度不足，请管理员检查 OpenRouter 账户状态。'
        : code === 404 || code === 503
          ? '这个模型目前没有可用的免费通道，请换一个免费模型。'
          : code === 408 || code === 504
            ? '等待模型响应超时，收到的文字已保留，请重试或换一个模型。'
            : code === 413
              ? '回答或思考已达到长度上限，请缩短任务或换一个模型。'
              : '模型服务暂时中断，收到的文字已保留，请重试或切换模型。'
}
export class UpstreamError extends Error {
  code: number
  constructor(code: number) {
    super(upstreamMessage(code))
    this.code = code
  }
}
export async function upstreamFailure(response: Response) {
  // 平台错误体可能包含原始请求、用户材料和凭据，只取数字错误码。
  const body = (await response.json().catch(() => null)) as { error?: { code?: unknown } } | null
  const n = Number(body?.error?.code)
  return new UpstreamError(Number.isInteger(n) && n >= 400 && n <= 599 ? n : response.status)
}
export function generationWatchdog(signal: AbortSignal) {
  const controller = new AbortController()
  let idle: ReturnType<typeof setTimeout>
  const activity = () => {
    clearTimeout(idle)
    idle = setTimeout(() => controller.abort(), 60000)
  }
  // 队列/思考心跳能延长空闲期限，整体仍有明确上限。
  const total = setTimeout(() => controller.abort(), 240000)
  const abort = () => controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  if (signal.aborted) controller.abort()
  activity()
  return {
    controller,
    activity,
    clear: () => {
      clearTimeout(idle)
      clearTimeout(total)
      signal.removeEventListener('abort', abort)
    },
  }
}
export const freeProvider = { max_price: { prompt: 0, completion: 0 }, allow_fallbacks: true }
export function generationOptions(reasoning: boolean, maxTokens = 4096) {
  return {
    max_tokens: maxTokens,
    provider: freeProvider,
    ...(reasoning ? { reasoning: { effort: 'low', exclude: true } } : {}),
  }
}
interface StreamResult {
  characters: number
  finishReason: string
  generationId?: string
  actualModel?: string
}
export async function consumeGeneration(
  response: Response,
  onText: (text: string) => void,
  onActivity: () => void,
  onModel?: (model: string) => void,
): Promise<StreamResult> {
  if (!response.ok) throw await upstreamFailure(response)
  if (!response.body) throw new UpstreamError(502)
  let characters = 0,
    finished = false,
    finishReason = '',
    generationId: string | undefined,
    actualModel: string | undefined
  await readSse(
    response.body,
    (data) => {
      if (data === '[DONE]') {
        finished = true
        return
      }
      const event = JSON.parse(data) as {
        id?: string
        model?: string
        error?: { code?: unknown }
        choices?: { delta?: { content?: string }; finish_reason?: string }[]
      }
      if (event.error || event.choices?.some((c) => c.finish_reason === 'error')) {
        const n = Number(event.error?.code)
        throw new UpstreamError(Number.isInteger(n) && n >= 400 && n <= 599 ? n : 502)
      }
      if (typeof event.id === 'string' && /^[a-zA-Z0-9_-]{1,160}$/.test(event.id))
        generationId = event.id
      if (
        typeof event.model === 'string' &&
        /^[a-zA-Z0-9_.:/-]{1,160}$/.test(event.model) &&
        event.model !== actualModel
      ) {
        actualModel = event.model
        onModel?.(actualModel)
      }
      const choice = event.choices?.[0],
        text = choice?.delta?.content
      if (typeof text === 'string' && text) {
        characters += text.length
        if (characters > 20000) throw new UpstreamError(413)
        onText(text)
      }
      if (choice?.finish_reason) {
        finished = true
        finishReason = choice.finish_reason
      }
    },
    onActivity,
  )
  if (!finished || !characters) throw new UpstreamError(finishReason === 'length' ? 413 : 502)
  return { characters, finishReason, generationId, actualModel }
}
