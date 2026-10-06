import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_AI_CONFIG, parseAiResponse, testAiConnection, type AiConfig } from '../ai-client'

const base: AiConfig = {
  ...DEFAULT_AI_CONFIG,
  mode: 'live',
  endpoint: 'https://opencode.ai/zen/v1/chat/completions',
  model: 'space-bunny-free',
  apiKey: '',
}

describe('推理模型的响应解析', () => {
  it('正文为空时回落到 reasoning_content（否则会误判为"没有返回内容"）', () => {
    const r = parseAiResponse({
      choices: [{ message: { content: '', reasoning_content: '先思考一下…' } }],
    })
    expect(r.ok).toBe(true)
    expect(r.text).toContain('先思考一下')
  })

  it('正文存在时优先用正文', () => {
    const r = parseAiResponse({
      choices: [{ message: { content: '可用', reasoning_content: '推理…' } }],
    })
    expect(r.text).toBe('可用')
  })

  it('两条都空才算失败', () => {
    const r = parseAiResponse({ choices: [{ message: { content: '', reasoning_content: '' } }] })
    expect(r.ok).toBe(false)
  })

  it('reasoning_tokens 计入用量信息', () => {
    const r = parseAiResponse({
      choices: [{ message: { content: '可用' } }],
      usage: { completion_tokens_details: { reasoning_tokens: 53 } },
    })
    expect(r.ok).toBe(true)
  })
})

describe('Zen 免费通道（免 Key，但需代理）', () => {
  function stub(status: number, body: unknown) {
    return vi.fn(async () =>
      new Response(typeof body === 'string' ? body : JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    ) as unknown as typeof fetch
  }

  it('免 Key 也能连通（不因为缺 Key 直接拒绝）', async () => {
    const f = stub(200, { choices: [{ message: { content: '可用' } }] })
    const r = await testAiConnection(base, f)
    expect(r.ok).toBe(true)
  })

  it('模型 ID 不带前缀是正确的（Zen 通道本身就是 space-bunny-free）', async () => {
    const f = stub(200, { choices: [{ message: { content: '可用' } }] })
    const r = await testAiConnection(base, f)
    expect(r.modelUsed).toBe('space-bunny-free')
    expect(r.ok).toBe(true)
  })

  it('测试请求给了足够预算（推理模型需要）', async () => {
    let sentBody = ''
    const f = vi.fn(async (_url: string, init: RequestInit) => {
      sentBody = String(init.body)
      return new Response(JSON.stringify({ choices: [{ message: { content: '可用' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }) as unknown as typeof fetch

    await testAiConnection(base, f)
    const body = JSON.parse(sentBody) as { max_tokens?: number; messages: { content: string }[] }
    expect(body.max_tokens).toBeGreaterThanOrEqual(256)
    // 连通性测试也要求中文，避免用户误以为模型不配合中文
    expect(body.messages[0].content).toContain('中文')
  })
})