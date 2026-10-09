import { describe, expect, it, vi } from 'vitest'
import { freeModels } from '@/lib/assistant-models'
import { readSse } from '@/lib/assistant-stream'
import { generationWatchdog, normalizeAssistantUrl } from '@/lib/assistant-upstream'
import { makeTestEnv, request, login } from './helpers/admin-test-env'
const KEY = 'test-only-provider-key-not-a-real-secret'
const MODEL = {
  id: 'test/simple:free',
  name: 'Test Free',
  pricing: { prompt: '0', completion: '0' },
  context_length: 8000,
  architecture: { input_modalities: ['text'], output_modalities: ['text'] },
  supported_parameters: ['max_tokens'],
}
const json = (v: unknown, status = 200) =>
  new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })
async function fixture(
  stream = 'data: {"choices":[{"delta":{"content":"你好，小芽"}}]}\n\ndata: [DONE]\n\n',
) {
  const env = await makeTestEnv()
  const fetcher = vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
    new Request(String(input), _init)
    if (String(input).endsWith('/chat/completions'))
      return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
    if (String(input).endsWith('/key')) return json({ data: { label: 'test' } })
    return json({ data: [MODEL] })
  })
  env.env.ASSISTANT_FETCH = fetcher as typeof fetch
  env.env.AI_CREDENTIALS_KEY = 'test-encryption-key-with-at-least-32-characters'
  return { env, fetcher }
}
const message = {
  model: MODEL.id,
  messages: [{ role: 'user', content: '用一个例子解释 RAG' }],
  page: '/',
}
describe('免费模型目录', () => {
  it('按真实价格筛选，未标 free 的零价模型也收录；付费、额外费用和过期模型排除', () => {
    const value = freeModels({
      data: [
        MODEL,
        { ...MODEL, id: 'test/preview' },
        { ...MODEL, id: 'test/paid:free', pricing: { prompt: '0.1', completion: '0' } },
        { ...MODEL, id: 'test/fees', pricing: { prompt: '0', completion: '0', request: '1' } },
        { ...MODEL, id: 'test/unknown', pricing: {} },
        { ...MODEL, id: 'test/negative', pricing: { prompt: '-1', completion: '0' } },
        { ...MODEL, id: 'test/expired', expiration_date: '2000-01-01' },
        MODEL,
      ],
    })
    expect(value.map((m) => m.id).sort()).toEqual(['test/preview', MODEL.id].sort())
  })
  it('音频模型保留在全集目录中，但不能用于文字助手', () => {
    const m = freeModels({
      data: [{ ...MODEL, architecture: { output_modalities: ['text', 'audio'] } }],
    })[0]
    expect(m.available).toBe(false)
  })
})
describe('流式事件', () => {
  it('逐字节读取中文和 CRLF，不把网络分片当作完整 JSON', async () => {
    const text = ': heartbeat\r\n\r\ndata: {"text":"你好🌱"}\r\n\r\ndata: [DONE]\r\n\r\n'
    const bytes = new TextEncoder().encode(text),
      events: string[] = []
    await readSse(
      new ReadableStream({
        start(c) {
          for (const byte of bytes) c.enqueue(new Uint8Array([byte]))
          c.close()
        },
      }),
      (data) => {
        events.push(data)
      },
    )
    expect(events).toEqual(['{"text":"你好🌱"}', '[DONE]'])
  })
})
describe('助手私有配置与公开推理', () => {
  it('未登录无法查看或保存 Key，公开目录不包含任何密钥', async () => {
    const { env } = await fixture()
    expect((await request(env, 'GET', '/api/admin/assistant')).status).toBe(401)
    expect(
      (await request(env, 'PATCH', '/api/admin/assistant', { provider: 'openrouter', apiKey: KEY }))
        .status,
    ).toBe(401)
    const catalog = await request(env, 'GET', '/api/assistant/models')
    expect(catalog.status).toBe(200)
    expect(JSON.stringify(catalog.json)).not.toContain(KEY)
    expect(catalog.json.connected.openrouter).toBe(false)
  })
  it('保存时加密，返回与审计都不泄露；移除后无法调用', async () => {
    const { env } = await fixture()
    await login(env)
    const configured = await request(env, 'PATCH', '/api/admin/assistant', {
      provider: 'openrouter',
      apiKey: KEY,
    })
    expect(configured.status).toBe(200)
    expect(configured.json.connected.openrouter).toBe(true)
    const row = await env.db.first<{ data: string }>(
      "SELECT data FROM assistant_store WHERE id='key:openrouter'",
    )
    expect(row?.data).not.toContain(KEY)
    expect(JSON.parse(row!.data).ciphertext).toBeTruthy()
    expect(JSON.stringify(configured.json)).not.toContain(KEY)
    const audit = await env.db.all('SELECT detail FROM audit_log')
    expect(JSON.stringify(audit)).not.toContain(KEY)
    await request(env, 'PATCH', '/api/admin/assistant', { provider: 'openrouter', removeKey: true })
    env.cookies.clear()
    expect((await request(env, 'POST', '/api/assistant/chat', message)).status).toBe(503)
  })
  it('未配置加密密钥时拒绝接收 API Key', async () => {
    const { env } = await fixture()
    await login(env)
    env.env.AI_CREDENTIALS_KEY = undefined
    expect(
      (await request(env, 'PATCH', '/api/admin/assistant', { provider: 'openrouter', apiKey: KEY }))
        .status,
    ).toBe(503)
  })
  it('只允许免费模型，同源且无需登录，固定零价路由；真实文本流与完成事件分开', async () => {
    const { env, fetcher } = await fixture()
    env.env.OPENROUTER_API_KEY = KEY
    expect(
      (await request(env, 'POST', '/api/assistant/chat', { ...message, model: 'test/paid' }))
        .status,
    ).toBe(400)
    expect(
      (
        await request(env, 'POST', '/api/assistant/chat', message, {
          origin: 'https://external.test',
        })
      ).status,
    ).toBe(403)
    const { handleApi } = await import('@/lib/admin/api')
    const res = await handleApi(
      new Request('https://admin.example.test/api/assistant/chat', {
        method: 'POST',
        headers: { Origin: 'https://admin.example.test' },
        body: JSON.stringify(message),
      }),
      env.env,
    )
    expect(res!.headers.get('content-type')).toContain('text/event-stream')
    const events: Record<string, unknown>[] = []
    await readSse(res!.body!, (data) => {
      events.push(JSON.parse(data))
    })
    expect(events.some((e) => e.type === 'delta' && e.text === '你好，小芽')).toBe(true)
    expect(events.at(-1)?.type).toBe('done')
    const call = fetcher.mock.calls.find(([url]) => String(url).endsWith('/chat/completions'))!
    const payload = JSON.parse(String(call[1]?.body))
    expect(payload.provider).toEqual({
      max_price: { prompt: 0, completion: 0 },
      allow_fallbacks: true,
    })
    expect(payload.stream).toBe(true)
    expect(await env.db.all('SELECT * FROM assistant_slots')).toEqual([])
    expect(JSON.stringify(await env.db.all('SELECT * FROM assistant_usage'))).not.toContain(
      message.messages[0].content,
    )
  })
  it('中途上游错误不会假装生成成功或泄露内部错误', async () => {
    const { env } = await fixture(
      'data: {"choices":[{"delta":{"content":"部分"}}]}\n\ndata: {"error":{"message":"SECRET INTERNAL ERROR"}}\n\n',
    )
    env.env.OPENROUTER_API_KEY = KEY
    const { handleApi } = await import('@/lib/admin/api')
    const res = await handleApi(
      new Request('https://admin.example.test/api/assistant/chat', {
        method: 'POST',
        headers: { Origin: 'https://admin.example.test' },
        body: JSON.stringify(message),
      }),
      env.env,
    )
    const text = await res!.text()
    expect(text).toContain('"type":"error"')
    expect(text).not.toContain('SECRET INTERNAL ERROR')
    expect(text).not.toContain('"type":"done"')
  })
  it('全站关闭助手或每天额度用完时，拒绝新推理', async () => {
    const { env } = await fixture()
    env.env.OPENROUTER_API_KEY = KEY
    await login(env)
    await request(env, 'PATCH', '/api/admin/assistant', { dailyLimit: 2 })
    env.cookies.clear()
    for (let i = 0; i < 2; i++)
      expect((await request(env, 'POST', '/api/assistant/chat', message)).status).toBe(200)
    expect((await request(env, 'POST', '/api/assistant/chat', message)).status).toBe(429)
    await login(env)
    await request(env, 'PATCH', '/api/admin/site-settings', { assistant: false })
    env.cookies.clear()
    expect((await request(env, 'POST', '/api/assistant/chat', message)).status).toBe(503)
  })
})

describe('连接诊断与断流恢复', () => {
  it('填写官方首页和完整接口地址均规范化，拒绝将 Key 发往代理、HTTP 或跳转目标', async () => {
    expect(normalizeAssistantUrl('https://openrouter.ai', 'openrouter')).toBe(
      'https://openrouter.ai/api/v1',
    )
    expect(
      normalizeAssistantUrl('https://openrouter.ai/api/v1/chat/completions', 'openrouter'),
    ).toBe('https://openrouter.ai/api/v1')
    for (const url of [
      'https://evil.test/api/v1',
      'http://openrouter.ai',
      'https://openrouter.ai@evil.test',
      'https://openrouter.ai/api/v1?next=evil',
      'https://127.0.0.1',
    ])
      expect(() => normalizeAssistantUrl(url, 'openrouter')).toThrow()
    const { env, fetcher } = await fixture()
    expect(
      (await request(env, 'POST', '/api/admin/assistant/test', { provider: 'openrouter' })).status,
    ).toBe(401)
    await login(env)
    expect(
      (
        await request(env, 'POST', '/api/admin/assistant/test', {
          provider: 'openrouter',
          apiKey: KEY,
          baseUrl: 'https://evil.test',
        })
      ).status,
    ).toBe(400)
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('新 Key 可以读取账号额度与免费模型，但不覆盖原有加密连接；实际测试单独触发', async () => {
    const { env, fetcher } = await fixture()
    await login(env)
    await request(env, 'PATCH', '/api/admin/assistant', { provider: 'openrouter', apiKey: KEY })
    const before = await env.db.first<{ data: string }>(
      "SELECT data FROM assistant_store WHERE id='key:openrouter'",
    )
    fetcher.mockImplementation(async (input, init) => {
      new Request(String(input), init)
      if (String(input).endsWith('/key'))
        return json({
          data: {
            is_free_tier: true,
            limit_remaining: 0,
            free_model_daily_requests: { used: 3, limit: 50, remaining: 47 },
          },
        })
      if (String(input).endsWith('/chat/completions'))
        return new Response(
          'data: {"id":"gen-test","model":"test/actual-free","choices":[{"delta":{"content":"连接正常"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        )
      return json({
        data: [MODEL, { ...MODEL, id: 'test/paid', pricing: { prompt: '1', completion: '1' } }],
      })
    })
    const report = await request(env, 'POST', '/api/admin/assistant/test', {
      provider: 'openrouter',
      apiKey: 'candidate-new-key-only-for-testing',
      baseUrl: 'https://openrouter.ai',
    })
    expect(report.status).toBe(200)
    expect(report.json.authenticated).toBe(true)
    expect(report.json.models.map((m: { id: string }) => m.id)).toEqual([MODEL.id])
    expect(report.json.account.freeDaily.remaining).toBe(47)
    expect(report.json.probe).toBeUndefined()
    expect(
      await env.db.first("SELECT data FROM assistant_store WHERE id='key:openrouter'"),
    ).toEqual(before)
    const tested = await request(env, 'POST', '/api/admin/assistant/test', {
      provider: 'openrouter',
      infer: true,
      model: MODEL.id,
    })
    expect(tested.json.probe.ok).toBe(true)
    expect(tested.json.probe.actualModel).toBe('test/actual-free')
    expect(tested.json.probe.firstTokenMs).not.toBeNull()
    expect(JSON.stringify(tested.json)).not.toContain(KEY)
    expect(JSON.stringify(await env.db.all('SELECT * FROM assistant_store'))).not.toContain(
      '连接正常',
    )
    expect(await env.db.all('SELECT * FROM assistant_slots')).toEqual([])
  })
  it('账号限制的模型不能由前台绕过，也不将目录核验当作推理成功', async () => {
    const { env, fetcher } = await fixture()
    env.env.OPENROUTER_API_KEY = KEY
    fetcher.mockImplementation(async (input) =>
      String(input).endsWith('/key')
        ? json({ data: {} })
        : json({ data: String(input).endsWith('/models/user') ? [] : [MODEL] }),
    )
    const catalog = await request(env, 'GET', '/api/assistant/models')
    expect(catalog.json.models.find((m: { id: string }) => m.id === MODEL.id).available).toBe(false)
    expect((await request(env, 'POST', '/api/assistant/chat', message)).status).toBe(400)
  })
  it('上游 429 的错误码准确显示且不泄露原始错误或 Key', async () => {
    const { env, fetcher } = await fixture()
    env.env.OPENROUTER_API_KEY = KEY
    fetcher.mockImplementation(async (input) =>
      String(input).endsWith('/chat/completions')
        ? json({ error: { code: 429, message: 'SECRET INTERNAL ' + KEY } }, 429)
        : String(input).endsWith('/key')
          ? json({ data: {} })
          : json({ data: [MODEL] }),
    )
    const response = await request(env, 'POST', '/api/assistant/chat', message)
    expect(response.status).toBe(429)
    expect(response.json.error).toContain('限流')
    expect(JSON.stringify(response.json)).not.toContain(KEY)
    await login(env)
    const state = await request(env, 'GET', '/api/admin/assistant')
    expect(state.json.recentGeneration.code).toBe(429)
    expect(JSON.stringify(state.json)).not.toContain('SECRET INTERNAL')
  })
  it('长度截断保留部分文字但不冒充完成，后台有可追溯的原因', async () => {
    const { env } = await fixture(
      'data: {"choices":[{"delta":{"content":"部分答案"},"finish_reason":"length"}]}\n\ndata: [DONE]\n\n',
    )
    env.env.OPENROUTER_API_KEY = KEY
    const { handleApi } = await import('@/lib/admin/api')
    const res = await handleApi(
      new Request('https://admin.example.test/api/assistant/chat', {
        method: 'POST',
        headers: { Origin: 'https://admin.example.test' },
        body: JSON.stringify(message),
      }),
      env.env,
    )
    const text = await res!.text()
    expect(text).toContain('部分答案')
    expect(text).toContain('"code":"length"')
    expect(text).not.toContain('"type":"done"')
    const row = await env.db.first<{ data: string }>(
      "SELECT data FROM assistant_store WHERE id='connection:generation'",
    )
    expect(JSON.parse(row!.data).code).toBe('length')
    expect(row!.data).not.toContain('部分答案')
  })
  it('思考/排队心跳持续时超过旧 90 秒仍能继续，完全空闲与整体超时则停止', () => {
    vi.useFakeTimers()
    try {
      const watch = generationWatchdog(new AbortController().signal)
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(45000)
        watch.activity()
      }
      expect(watch.controller.signal.aborted).toBe(false)
      vi.advanceTimersByTime(60000)
      expect(watch.controller.signal.aborted).toBe(true)
      watch.clear()
      const total = generationWatchdog(new AbortController().signal)
      for (let i = 0; i < 4; i++) {
        vi.advanceTimersByTime(55000)
        total.activity()
      }
      vi.advanceTimersByTime(20000)
      expect(total.controller.signal.aborted).toBe(true)
      total.clear()
    } finally {
      vi.useRealTimers()
    }
  })
  it('流式解析报错会取消上游读取，释放提供商连接', async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: bad-json\n\n'))
      },
      cancel,
    })
    await expect(
      readSse(stream, () => {
        throw new Error('bad event')
      }),
    ).rejects.toThrow('bad event')
    expect(cancel).toHaveBeenCalledOnce()
  })
})
