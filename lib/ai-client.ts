'use client'

/**
 * AI 模式客户端（可选增强）。
 *
 * ⚠️ 安全前提： 本站是纯静态导出，**没有服务端**。
 * 所以这里绝不内置任何 API Key —— 内置即公开，等于把别人的 Key 送出去。
 * 只支持两种可控方式：
 *   1. 使用者自己的 Key：存在本机 localStorage，浏览器直连服务商
 *   2. 自建代理：Edge Function / Worker 持有 Key，这里只填地址
 *
 * 兼容任何 OpenAI 风格接口（AIMLAPI / OpenRouter / OpenCode Zen 等）。
 * 默认保持「规则模式」：不联网、不花钱、离线可用、结论可溯源。
 */

export type AiMode = 'rules' | 'live'

export interface AiConfig {
  mode: AiMode
  /** 接口地址：留空则用环境变量 NEXT_PUBLIC_AI_PROXY_URL */
  endpoint: string
  /** 模型名，如 stealth/space-bunny-alpha */
  model: string
  /** 使用者自己的 Key（仅存本机；自建代理模式下可留空） */
  apiKey: string
  /** 温度：默认 0.3，站内事实型问答不需要发散 */
  temperature: number
}

export const DEFAULT_AI_CONFIG: AiConfig = {
  mode: 'rules',
  endpoint: '',
  model: 'stealth/space-bunny-alpha',
  apiKey: '',
  temperature: 0.3,
}

const KEY_PREFIX = 'ai-map:ai-config:v1'

export function readAiConfig(): AiConfig {
  if (typeof window === 'undefined') return DEFAULT_AI_CONFIG
  try {
    const raw = localStorage.getItem(KEY_PREFIX)
    if (!raw) return { ...DEFAULT_AI_CONFIG, endpoint: defaultEndpoint(), model: defaultModel() }
    const parsed = JSON.parse(raw) as Partial<AiConfig>
    return {
      mode: parsed.mode === 'live' ? 'live' : 'rules',
      endpoint: typeof parsed.endpoint === 'string' ? parsed.endpoint : defaultEndpoint(),
      model: typeof parsed.model === 'string' && parsed.model ? parsed.model : defaultModel(),
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.3,
    }
  } catch {
    return DEFAULT_AI_CONFIG
  }
}

export function writeAiConfig(patch: Partial<AiConfig>): AiConfig {
  const next = { ...readAiConfig(), ...patch }
  if (typeof window === 'undefined') return next
  try {
    localStorage.setItem(KEY_PREFIX, JSON.stringify(next))
  } catch {
    /* 隐私模式忽略 */
  }
  window.dispatchEvent(new CustomEvent('ai-map:ai-config-change', { detail: next }))
  return next
}

export function clearAiKey(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      KEY_PREFIX,
      JSON.stringify({ ...readAiConfig(), apiKey: '' })
    )
  } catch {
    /* 忽略 */
  }
}

function defaultEndpoint(): string {
  return process.env.NEXT_PUBLIC_AI_PROXY_URL ?? ''
}

function defaultModel(): string {
  return process.env.NEXT_PUBLIC_AI_MODEL ?? DEFAULT_AI_CONFIG.model
}

// ---------- 提示词构造（纯函数，可单测） ----------

export interface SiteFacts {
  /** 站点事实摘要，会作为系统提示的一部分 */
  siteSummary: string
  /** 与问题相关的站内条目（标题 + 链接 + 一句话） */
  relevant: { title: string; href: string; note: string }[]
}

/**
 * 构造发给模型的消息。
 *
 * 关键取舍：**不把整站数据塞进提示词**（几十万 token 不现实，也没必要）。
 * 只给「站点事实 + 与问题最相关的几条」，并要求模型：
 * - 只用给定事实回答，缺信息就说不知道
 * - 不编造工具能力、价格、链接
 * - 给结论时附上使用到的事实来自哪条（带链接）
 */
export function buildAiMessages(
  question: string,
  facts: SiteFacts
): { role: 'system' | 'user'; content: string }[] {
  const relevantText = facts.relevant.length
    ? facts.relevant.map((r, i) => `${i + 1}. ${r.title}（${r.href}）：${r.note}`).join('\n')
    : '（本次没有匹配到站内条目）'

  const system = `你是「AI 能力地图」站内的助手，服务对象主要是中小学教师与学生。

**必须用简体中文回答**，即使提问是英文或夹杂外文术语；专有名词（如 RAG、Prompt）保留英文原名并在首次出现时用括号给中文解释。

必须遵守：
1. 只使用下面「站内事实」作答。事实里没有的信息，明确说"站内没有这条数据"，不要推测。
2. 不要编造工具能力、价格、版本、链接或政策文件。
3. 回答面向一线教师与学生，用平实的中文，不要营销腔，不要过度热情。
4. 涉及工具能力取舍时，必须同时说"强项"和"弱项/不适合的场景"。
5. 涉及学生使用 AI 时，必须提醒核验与学术诚信。
6. 控制在 300 字以内，用 2-4 个短段落或要点。

站内事实：
${facts.siteSummary}

与本次问题最相关的站内内容：
${relevantText}`

  // 强化中文输出：实测这些模型默认倾向用英文回答，
  // 只在 system 里要求不够稳（长提示词会稀释），
  // 所以在 user 消息里也前置一句 —— 最近的消息权重最高。
  const reinforced = `请用简体中文回答。\n\n${question}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: reinforced },
  ]
}

// ---------- 响应解析（纯函数，可单测） ----------

export interface AiResult {
  ok: boolean
  text: string
  error?: string
  /** 用量信息，便于用户了解成本 */
  usage?: { promptTokens?: number; completionTokens?: number; totalTokens?: number }
}

/**
 * 解析 OpenAI 兼容响应。
 * 不同服务商字段位置略有差异（有的把 meta 放在 usage.usage），这里都兼容。
 */
export function parseAiResponse(payload: unknown): AiResult {
  if (!payload || typeof payload !== 'object') {
    return { ok: false, text: '', error: '返回内容不是合法 JSON' }
  }
  const p = payload as {
    choices?: { message?: { content?: string; reasoning_content?: string }; text?: string }[]
    error?: { message?: string }
    usage?: Record<string, unknown>
    meta?: { usage?: Record<string, unknown> }
  }

  if (p.error?.message) {
    return { ok: false, text: '', error: p.error.message }
  }

  const choice = p.choices?.[0]
  // 推理模型（如 Space Bunny）会先输出 reasoning_content，正文在其后。
  // 当思考预算被吃满时 content 是空字符串 —— 注意不能用 ?? 做回落，
  // 因为 '' 不是 nullish，必须显式判断是否有内容。
  const content = choice?.message?.content ?? choice?.text ?? ''
  const reasoning = choice?.message?.reasoning_content ?? ''
  const text = content.trim() ? content : reasoning
  if (!text) {
    return { ok: false, text: '', error: '模型没有返回内容' }
  }

  const usageRaw = (p.usage ?? {}) as Record<string, unknown>
  const metaUsage = (p.meta?.usage ?? {}) as Record<string, unknown>
  const pick = (key: string): number | undefined => {
    const v = usageRaw[key] ?? metaUsage[key]
    return typeof v === 'number' ? v : undefined
  }

  return {
    ok: true,
    text: String(text).trim(),
    usage: {
      promptTokens: pick('prompt_tokens'),
      completionTokens: pick('completion_tokens'),
      totalTokens: pick('total_tokens'),
    },
  }
}

export interface AiErrorKind {
  kind: 'no-key' | 'no-endpoint' | 'auth' | 'rate-limit' | 'network' | 'http' | 'unknown'
  message: string
}

/** 把 HTTP 状态与异常翻译成用户能看懂、能自己处理的话 */
export function explainAiError(status: number | null, body?: string): AiErrorKind {
  if (!status) {
    return { kind: 'network', message: '请求没有到达接口：检查网络，或该接口是否允许浏览器直连（自建代理可绕过 CORS）。' }
  }
  if (status === 401 || status === 403) {
    return {
      kind: 'auth',
      message:
        'Key 无效或没有权限：如果这个通道需要 Key，请检查是否复制完整；' +
        '如果它是免 Key 通道，说明该通道不允许浏览器直连，请改用自建代理地址。',
    }
  }
  if (status === 429) {
    return { kind: 'rate-limit', message: '触发服务商限流或额度用尽：稍后重试，或切换模型。' }
  }
  if (status === 404) {
    return { kind: 'http', message: '接口地址不对：请检查是否填了完整的 .../v1/chat/completions。' }
  }
  if (status >= 500) {
    return { kind: 'http', message: '服务商暂时不可用（5xx），稍后重试。' }
  }
  return { kind: 'unknown', message: `请求失败（HTTP ${status}）：${(body ?? '').slice(0, 120)}` }
}

/** 组装请求体（纯函数，便于单测形状是否正确） */
export function buildAiRequestBody(config: AiConfig, question: string, facts: SiteFacts) {
  return {
    model: config.model,
    messages: buildAiMessages(question, facts),
    temperature: config.temperature,
    // 推理模型会先写 reasoning_content，预算太小正文会被截断
    max_tokens: 1024,
    stream: false,
  }
}

/** 构造请求头：只有使用者自带 Key 时才加 Authorization（代理模式下不加） */
export function buildAiHeaders(config: AiConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`
  return headers
}

/**
 * 判断配置是否可用。
 *
 * 规则要明确，否则 UI 会出现"显示就绪但一发请求就 401"的情况：
 * - 规则模式：不需要任何配置，永远可用
 * - AI 模式：必须有接口地址
 * - 有 Key：直接就绪
 * - 没 Key：只有当地址看起来是「本地/自建代理」时才就绪
 *   （本地地址或构建时用 NEXT_PUBLIC_AI_PROXY_URL 指定的代理，不需要前端带 Key）
 */
export function looksLikeSelfHostedProxy(endpoint: string): boolean {
  if (!endpoint) return false
  if (/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|\/)/i.test(endpoint)) return true
  const configured = process.env.NEXT_PUBLIC_AI_PROXY_URL
  return Boolean(configured && endpoint === configured)
}

export function aiConfigReady(config: AiConfig): boolean {
  if (config.mode !== 'live') return false
  if (!config.endpoint) return false
  if (config.apiKey) return true
  return looksLikeSelfHostedProxy(config.endpoint)
}

export const AI_CONFIG_STORAGE_KEY = KEY_PREFIX

/**
 * 测试连接：用最小请求探一次，把服务商的真实错误原样带回。
 *
 * 为什么需要它：配置页只显示「配置完整」是不够的 ——
 * 用户真正想知道的是「Key 有没有效 / 模型名对不对 / 地址填对了吗」。
 * 逐个猜很浪费时间，直接发一次请求看返回最快。
 */
export interface AiTestResult {
  ok: boolean
  /** 面向用户的一句话结论 */
  message: string
  /** 服务商返回的原始错误（如果有），便于定位 */
  providerMessage?: string
  /** 服务商回了内容时的预览 */
  preview?: string
  /** 实际发出的地址，便于用户核对 */
  endpointUsed: string
  modelUsed: string
  hint?: string
}

export async function testAiConnection(
  config: AiConfig,
  fetchImpl: typeof fetch = fetch
): Promise<AiTestResult> {
  const base = {
    endpointUsed: config.endpoint || '(未填写)',
    modelUsed: config.model,
  }

  if (!config.endpoint) {
    return {
      ...base,
      ok: false,
      message: '还没填写接口地址',
      hint: '填完整地址，例如 https://api.aimlapi.com/v1/chat/completions',
    }
  }
  // 注意：不能用「有没有 Key」预判这个通道能不能用 ——
  // 有些通道（如 OpenCode Zen）本来就是免 Key 的，而自建代理也不需要前端带 Key。
  // 所以这里一律照常发请求，由上游的真实响应来说话。

  try {
    const res = await fetchImpl(config.endpoint, {
      method: 'POST',
      headers: buildAiHeaders(config),
      body: JSON.stringify({
        model: config.model,
        // 推理模型会先花预算写 reasoning_content，max_tokens 给太小会拿不到正文。
        // 这里只验证连通性，所以给足思考预算、但不要求长回答。
        max_tokens: 512,
        messages: [
          { role: 'system', content: '你正在做连通性测试。用简体中文回答。' },
          // 必须带一条 user 消息：实测只发 system 会被部分通道判为 invalid request
          { role: 'user', content: '请只用中文两个字回复：可用' },
        ],
      }),
    })

    const raw = await res.text()

    if (!res.ok) {
      const translated = explainAiError(res.status, raw)
      let providerMessage = raw
      try {
        const parsed = JSON.parse(raw) as { error?: { message?: string }; message?: string }
        providerMessage = parsed.error?.message ?? parsed.message ?? raw
      } catch {
        /* 不是 JSON 就原样返回 */
      }
      return {
        ...base,
        ok: false,
        message: translated.message,
        providerMessage: providerMessage.slice(0, 300),
        hint: hintForStatus(res.status, config, providerMessage),
      }
    }

    let parsedBody: unknown
    try {
      parsedBody = JSON.parse(raw)
    } catch {
      return {
        ...base,
        ok: false,
        message: '接口返回的不是 JSON',
        providerMessage: raw.slice(0, 200),
        hint: '地址可能填成了网页地址，而不是 /v1/chat/completions 接口',
      }
    }

    const result = parseAiResponse(parsedBody)
    if (!result.ok) {
      return {
        ...base,
        ok: false,
        message: '地址能通，但没有拿到模型回复',
        providerMessage: raw.slice(0, 300),
        hint: '检查模型名是否正确、该 Key 是否有权访问该模型',
      }
    }

    return {
      ...base,
      ok: true,
      message: '连接成功，助手可以切到 AI 模式使用',
      preview: result.text.slice(0, 80),
    }
  } catch (e) {
    return {
      ...base,
      ok: false,
      message: explainAiError(null).message,
      providerMessage: e instanceof Error ? e.message : String(e),
      hint: '若是网络或跨域问题，改用自建代理地址',
    }
  }
}

/** 按状态码给出针对性建议（比通用文案有用） */
function hintForStatus(status: number, config: AiConfig, rawBody?: string): string | undefined {
  if (status === 400 && /not a valid model|invalid model|unknown model/i.test(rawBody ?? '')) {
    const full = suggestFullModelId(config.model)
    return full !== config.model
      ? '模型 ID 不完整：聚合平台需要「厂商/模型」完整写法，例如 ' + full
      : '模型 ID 不正确：去服务商模型列表页复制完整 ID（含厂商前缀）'
  }
  if (status === 401 || status === 403) {
    return 'Key 无效或没有该模型的权限：确认 Key 是否完整复制、是否已开通该模型'
  }
  if (status === 404) {
    return '地址或模型名不对：模型应写成 ' + config.model + '，地址结尾是 /chat/completions'
  }
  if (status === 429) {
    return '触发限流或额度不足：稍后重试，或检查账户余额'
  }
  if (status === 400) {
    // 最常见的一种：模型 id 少了「厂商/」前缀
    return '请求被服务商拒绝：常见原因是参数不兼容或模型 ID 不完整'
  }
  if (status >= 500) {
    return '服务商自身故障：稍后重试'
  }
  return undefined
}

/**
 * 常见模型（供设置页一键选择，避免手输时漏掉命名空间前缀）。
 *
 * 踩过的坑：OpenRouter / AIMLAPI 的模型 id 必须是「厂商/模型」完整形式，
 * 只写 `space-bunny-alpha` 会得到 400 "is not a valid model ID"，
 * 而这个错误信息本身并不提示正确写法，所以在这里内置成可选项。
 */
export const KNOWN_MODELS: { id: string; label: string; note?: string }[] = [
  {
    id: 'stealth/space-bunny-alpha',
    label: 'Space Bunny Alpha',
    note: '匿名模型，1M 上下文，多平台在售',
  },
  {
    id: 'space-bunny-free',
    label: 'Space Bunny Free',
    note: 'OpenCode Zen 免费通道',
  },
]

/**
 * 检查模型 id 是否缺少「厂商/」前缀。
 * 聚合平台（openrouter / aimlapi）返回 "not a valid model ID" 时，
 * 基本都是这个原因 —— 直接告诉用户正确写法，而不是让他去猜。
 */
export function looksLikeMissingNamespace(modelId: string, endpoint: string): boolean {
  const id = modelId.trim()
  if (!id) return false
  if (id.includes('/')) return false
  return /openrouter|aimlapi|opencode\.ai/i.test(endpoint)
}

/** 把用户填的模型名补全为完整 id（有前缀就原样返回） */
export function suggestFullModelId(modelId: string): string {
  const id = modelId.trim()
  if (!id || id.includes('/')) return id
  const hit = KNOWN_MODELS.find((m) => m.id === id || m.id.endsWith('/' + id))
  return hit?.id ?? id
}