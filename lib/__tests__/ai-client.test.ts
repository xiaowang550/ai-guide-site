import { describe, expect, it } from 'vitest'
import { DEFAULT_AI_CONFIG, aiConfigReady, buildAiHeaders, buildAiRequestBody, buildAiMessages, explainAiError, parseAiResponse } from '../ai-client'

const facts = {
  siteSummary: '本站是一个中文 AI 学习与工具指南站。',
  relevant: [{ title: 'DeepSeek', href: '/tools/deepseek', note: '推理性价比标杆' }],
}

describe('buildAiMessages（提示词构造）', () => {
  const messages = buildAiMessages('写代码用什么好', facts)

  it('system 提示必须包含防编造约束', () => {
    const system = messages[0].content
    expect(system).toContain('不要编造')
    expect(system).toContain('站内没有这条数据')
    expect(system).toContain('弱项')
  })

  it('system 提示包含站内事实与相关内容', () => {
    expect(messages[0].content).toContain(facts.siteSummary)
    expect(messages[0].content).toContain('DeepSeek')
    expect(messages[0].content).toContain('/tools/deepseek')
  })

  it('user 消息前置中文要求（实测模型默认倾向英文）', () => {
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('请用简体中文回答')
    // 原始问题必须完整保留，不能被改写掉
    expect(messages[1].content).toContain('写代码用什么好')
  })

  it('测试连接类请求必须带 user 消息（只发 system 会被判 invalid request）', () => {
    // 这一条针对 testAiConnection 的请求体，见 reasoning-model.test.ts
    expect(messages.length).toBe(2)
    expect(messages[1].role).toBe('user')
  })

  it('没有匹配内容时明确标注，而不是留空', () => {
    const empty = buildAiMessages('随便问问', { siteSummary: 'x', relevant: [] })
    expect(empty[0].content).toContain('本次没有匹配到站内条目')
  })
})

describe('buildAiRequestBody / buildAiHeaders', () => {
  it('请求体形状正确且关闭流式', () => {
    const body = buildAiRequestBody({ ...DEFAULT_AI_CONFIG, model: 'stealth/space-bunny-alpha' }, 'q', facts)
    expect(body.model).toBe('stealth/space-bunny-alpha')
    expect(body.stream).toBe(false)
    expect(body.messages).toHaveLength(2)
    expect(typeof body.temperature).toBe('number')
  })

  it('有 Key 时才带 Authorization（代理模式不带）', () => {
    expect(buildAiHeaders({ ...DEFAULT_AI_CONFIG, apiKey: 'sk-test' }).Authorization).toBe('Bearer sk-test')
    expect(buildAiHeaders({ ...DEFAULT_AI_CONFIG, apiKey: '' }).Authorization).toBeUndefined()
  })

  it('永远以 JSON content-type 发出', () => {
    expect(buildAiHeaders(DEFAULT_AI_CONFIG)['Content-Type']).toBe('application/json')
  })
})

describe('parseAiResponse（响应解析）', () => {
  it('解析标准 OpenAI 形状', () => {
    const r = parseAiResponse({
      choices: [{ message: { content: '  建议用 Cursor。  ' } }],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    })
    expect(r.ok).toBe(true)
    expect(r.text).toBe('建议用 Cursor。')
    expect(r.usage?.totalTokens).toBe(30)
  })

  it('兼容 meta.usage 的服务商变体', () => {
    const r = parseAiResponse({
      choices: [{ message: { content: 'ok' } }],
      usage: {},
      meta: { usage: { total_tokens: 42 } },
    })
    expect(r.usage?.totalTokens).toBe(42)
  })

  it('返回 error 对象时给出错误信息', () => {
    const r = parseAiResponse({ error: { message: 'invalid api key' } })
    expect(r.ok).toBe(false)
    expect(r.error).toBe('invalid api key')
  })

  it('内容为空 / 结构异常时不崩', () => {
    expect(parseAiResponse(null).ok).toBe(false)
    expect(parseAiResponse({}).ok).toBe(false)
    expect(parseAiResponse({ choices: [] }).ok).toBe(false)
  })
})

describe('explainAiError（错误翻译）', () => {
  it('区分鉴权、限流、地址错误、服务端错误与网络失败', () => {
    expect(explainAiError(null).kind).toBe('network')
    expect(explainAiError(401).kind).toBe('auth')
    expect(explainAiError(403).kind).toBe('auth')
    expect(explainAiError(429).kind).toBe('rate-limit')
    expect(explainAiError(404).kind).toBe('http')
    expect(explainAiError(500).kind).toBe('http')
    expect(explainAiError(400).kind).toBe('unknown')
  })

  it('每条提示都给出可操作的下一步', () => {
    expect(explainAiError(401).message).toContain('检查')
    expect(explainAiError(401).message).toContain('代理')
    expect(explainAiError(429).message).toContain('重试')
    expect(explainAiError(null).message).toContain('网络')
  })
})

describe('aiConfigReady（配置完整性）', () => {
  it('规则模式永远不需要配置', () => {
    expect(aiConfigReady({ ...DEFAULT_AI_CONFIG, mode: 'rules' })).toBe(false)
  })

  it('AI 模式缺地址或缺 Key 时判定为未就绪', () => {
    expect(aiConfigReady({ ...DEFAULT_AI_CONFIG, mode: 'live', endpoint: '', apiKey: 'k' })).toBe(false)
    expect(aiConfigReady({ ...DEFAULT_AI_CONFIG, mode: 'live', endpoint: 'https://x/v1/chat/completions', apiKey: '' })).toBe(false)
  })

  it('有地址且有 Key 时就绪', () => {
    expect(
      aiConfigReady({ ...DEFAULT_AI_CONFIG, mode: 'live', endpoint: 'https://x/v1/chat/completions', apiKey: 'k' })
    ).toBe(true)
  })
})