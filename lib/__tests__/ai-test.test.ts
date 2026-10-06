import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_AI_CONFIG, testAiConnection, type AiConfig } from '../ai-client'

const base: AiConfig = {
  ...DEFAULT_AI_CONFIG,
  mode: 'live',
  endpoint: 'https://api.example.com/v1/chat/completions',
  model: 'stealth/space-bunny-alpha',
  apiKey: 'sk-test',
}

/** 构造一个最小 fetch 替身 */
function stubFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })) as unknown as typeof fetch
}

describe('testAiConnection（诊断连通性）', () => {
  it('缺地址时直接给出可操作提示', async () => {
    const r = await testAiConnection({ ...base, endpoint: '' })
    expect(r.ok).toBe(false)
    expect(r.message).toContain('接口地址')
    expect(r.hint).toContain('chat/completions')
  })

  it('没填 Key 时不提前拦截，而是照常请求由上游判定（Zen 就是免 Key 通道）', async () => {
    const f = stubFetch(200, { choices: [{ message: { content: '可用' } }] })
    const r = await testAiConnection({ ...base, apiKey: '' }, f)
    expect(r.ok).toBe(true)
    // 请求确实发出去了
    expect((f as unknown as { mock: { calls: unknown[] } }).mock.calls.length).toBeGreaterThan(0)
  })

  it('连接成功时回传模型回复预览', async () => {
    const f = stubFetch(200, { choices: [{ message: { content: '可用' } }] })
    const r = await testAiConnection(base, f)
    expect(r.ok).toBe(true)
    expect(r.preview).toContain('可用')
    expect(r.modelUsed).toBe('stealth/space-bunny-alpha')
  })

  it('401 时带出服务商的原始报错', async () => {
    const f = stubFetch(401, { error: { message: 'Invalid API key provided' } })
    const r = await testAiConnection(base, f)
    expect(r.ok).toBe(false)
    expect(r.providerMessage).toContain('Invalid API key')
    expect(r.hint).toContain('Key 无效')
  })

  it('404 时提示地址或模型名不对', async () => {
    const f = stubFetch(404, { error: { message: 'No model found' } })
    const r = await testAiConnection(base, f)
    expect(r.hint).toContain('模型')
    expect(r.providerMessage).toContain('No model')
  })

  it('429 时提示限流或额度', async () => {
    const f = stubFetch(429, { error: { message: 'rate limited' } })
    const r = await testAiConnection(base, f)
    expect(r.hint).toContain('限流')
  })

  it('返回非 JSON 时提示地址可能填错', async () => {
    const f = stubFetch(200, '<html>login page</html>')
    const r = await testAiConnection(base, f)
    expect(r.ok).toBe(false)
    expect(r.message).toContain('不是 JSON')
  })

  it('能通但没有 choices 时提示检查模型名', async () => {
    const f = stubFetch(200, { ok: true })
    const r = await testAiConnection(base, f)
    expect(r.message).toContain('没有拿到模型回复')
  })

  it('网络异常时不抛错，转成可读提示', async () => {
    const f = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    }) as unknown as typeof fetch
    const r = await testAiConnection(base, f)
    expect(r.ok).toBe(false)
    expect(r.providerMessage).toContain('Failed to fetch')
    expect(r.hint).toContain('代理')
  })

  it('自建代理地址可以不填 Key', async () => {
    const f = stubFetch(200, { choices: [{ message: { content: 'ok' } }] })
    const r = await testAiConnection({ ...base, endpoint: 'http://localhost:8787/v1/chat/completions', apiKey: '' }, f)
    expect(r.ok).toBe(true)
  })

  it('结果里始终带上实际请求的地址与模型，便于核对', async () => {
    const f = stubFetch(401, { error: { message: 'x' } })
    const r = await testAiConnection(base, f)
    expect(r.endpointUsed).toBe(base.endpoint)
    expect(r.modelUsed).toBe(base.model)
  })
})