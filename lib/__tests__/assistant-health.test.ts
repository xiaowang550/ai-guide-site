import { describe, it, expect, vi } from 'vitest'
import { makeTestEnv, request, login } from './helpers/admin-test-env'
import { freeModels } from '@/lib/assistant-models'
import { reasoningOptions, supportedReasoning } from '@/lib/assistant-reasoning'
import { zenFreeModels } from '@/lib/assistant-opencode'
import { verifyMaintenanceToken } from '@/lib/assistant-maintenance-auth'
import { toBase64Url } from '@/lib/admin/crypto'
const KEY = 'only-a-fake-health-test-key'
const model = {
  id: 'test/working:free',
  name: 'Working Free',
  pricing: { prompt: '0', completion: '0' },
  architecture: { input_modalities: ['text'], output_modalities: ['text'] },
  supported_parameters: ['reasoning'],
  reasoning: { mandatory: true, supported_efforts: ['high', 'low'] },
}
const bad = { ...model, id: 'test/unavailable:free' }
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
async function fixture() {
  const env = await makeTestEnv()
  env.env.OPENROUTER_API_KEY = KEY
  const fetcher = vi.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
    const path = String(url)
    if (path.endsWith('/key')) return json({ data: {} })
    if (path.endsWith('/chat/completions')) {
      const body = JSON.parse(String(options?.body))
      if (body.model === bad.id)
        return json({ error: { code: 429, message: 'private ' + KEY } }, 429)
      return new Response(
        'data: {"choices":[{"delta":{"content":"连接正常"},"finish_reason":"stop"}]}\n\ndata: [DONE]\n\n',
        { headers: { 'content-type': 'text/event-stream' } },
      )
    }
    return json({
      data: [model, bad, { ...model, id: 'test/paid', pricing: { prompt: '1', completion: '0' } }],
    })
  })
  env.env.ASSISTANT_FETCH = fetcher as typeof fetch
  await login(env)
  return { env, fetcher }
}
describe('实测后才能启用免费模型', () => {
  it('新模型不直接进入前台；成功、失败、重复测试、完成及公开调用均遵守白名单', async () => {
    const { env, fetcher } = await fixture()
    expect((await request(env, 'GET', '/api/assistant/models')).json.models).toHaveLength(0)
    const begin = await request(env, 'POST', '/api/admin/assistant/health', { phase: 'start' })
    expect(begin.json.models.map((m: { id: string }) => m.id)).toEqual([model.id, bad.id])
    const runId = begin.json.runId
    expect(
      (await request(env, 'POST', '/api/admin/assistant/health', { phase: 'finish', runId }))
        .status,
    ).toBe(409)
    const pass = await request(env, 'POST', '/api/admin/assistant/health', {
      phase: 'probe',
      runId,
      model: model.id,
    })
    expect(pass.json.ok).toBe(true)
    const count = fetcher.mock.calls.length
    expect(
      (
        await request(env, 'POST', '/api/admin/assistant/health', {
          phase: 'probe',
          runId,
          model: model.id,
        })
      ).json.ok,
    ).toBe(true)
    expect(fetcher.mock.calls).toHaveLength(count)
    const rejected = await request(env, 'POST', '/api/admin/assistant/health', {
      phase: 'probe',
      runId,
      model: bad.id,
    })
    expect(rejected.json.ok).toBe(false)
    expect(rejected.json.code).toBe(429)
    expect(JSON.stringify(rejected.json)).not.toContain(KEY)
    const finish = await request(env, 'POST', '/api/admin/assistant/health', {
      phase: 'finish',
      runId,
    })
    expect(finish.status).toBe(200)
    const publicModels = (await request(env, 'GET', '/api/assistant/models')).json
    expect(publicModels.models.map((m: { id: string }) => m.id)).toEqual([model.id])
    expect(JSON.stringify(publicModels)).not.toContain('keyTag')
    const payload = {
      model: model.id,
      messages: [{ role: 'user', content: '你好' }],
      reasoning: 'high',
    }
    expect((await request(env, 'POST', '/api/assistant/chat', payload)).status).toBe(200)
    const last = fetcher.mock.calls
      .filter(([url]) => String(url).endsWith('/chat/completions'))
      .at(-1)!
    expect(JSON.parse(String(last[1]?.body)).reasoning).toEqual({ effort: 'high', exclude: true })
    expect(JSON.parse(String(last[1]?.body)).provider.max_price).toEqual({
      prompt: 0,
      completion: 0,
    })
    expect(
      (await request(env, 'POST', '/api/assistant/chat', { ...payload, reasoning: 'none' })).status,
    ).toBe(400)
  })
  it('换 Key、未连接及超过有效期的证据均不能继续使用；未知模型不能探测', async () => {
    const { env } = await fixture()
    const begin = await request(env, 'POST', '/api/admin/assistant/health', { phase: 'start' }),
      runId = begin.json.runId
    expect(
      (
        await request(env, 'POST', '/api/admin/assistant/health', {
          phase: 'probe',
          runId,
          model: 'test/paid',
        })
      ).status,
    ).toBe(400)
    await request(env, 'POST', '/api/admin/assistant/health', {
      phase: 'probe',
      runId,
      model: model.id,
    })
    env.env.OPENROUTER_API_KEY = KEY + 'changed'
    expect((await request(env, 'GET', '/api/assistant/models')).json.models).toHaveLength(0)
    env.env.OPENROUTER_API_KEY = KEY
    const row = await env.db.first<{ data: string }>(
      'SELECT data FROM assistant_store WHERE id=?',
      ['health:' + model.id],
    )
    const health = JSON.parse(row!.data)
    health.checkedAt = new Date(Date.now() - 37 * 3600000).toISOString()
    await env.db.run('UPDATE assistant_store SET data=? WHERE id=?', [
      JSON.stringify(health),
      'health:' + model.id,
    ])
    expect((await request(env, 'GET', '/api/assistant/models')).json.models).toHaveLength(0)
  })
  it('目录检查不把历史探测结果重新标记为刚刚通过', async () => {
    const { env } = await fixture()
    await request(env, 'POST', '/api/admin/assistant/test', {
      provider: 'openrouter',
      infer: true,
      model: model.id,
    })
    const before = await env.db.first<{ data: string }>(
      'SELECT data FROM assistant_store WHERE id=?',
      ['health:' + model.id],
    )
    await request(env, 'POST', '/api/admin/assistant/test', {
      provider: 'openrouter',
      infer: false,
    })
    expect(
      await env.db.first('SELECT data FROM assistant_store WHERE id=?', ['health:' + model.id]),
    ).toEqual(before)
  })
  it('未登录无法批量检查，普通会话不能伪装成定时任务', async () => {
    const { env } = await fixture()
    env.cookies.clear()
    expect(
      (await request(env, 'POST', '/api/admin/assistant/health', { phase: 'start' })).status,
    ).toBe(401)
    expect(
      (await request(env, 'POST', '/api/assistant/maintenance', { phase: 'start' })).status,
    ).toBe(403)
  })
})
describe('推理参数与额外免费来源', () => {
  it('只开放官方档位，必选思考不发送关闭参数，自动路由不猜档位', () => {
    const m = freeModels({ data: [model] })[0]
    expect(m.reasoningSupport?.efforts).toEqual(['low', 'high'])
    expect(supportedReasoning(m, 'max')).toBe(false)
    expect(reasoningOptions(m, 'default', true)).toEqual({
      reasoning: { effort: 'low', exclude: true },
    })
    const router = freeModels({ data: [{ ...model, id: 'openrouter/free' }] })[0]
    expect(reasoningOptions(router, 'default', true)).toEqual({})
  })
  it('OpenCode 后缀不代表免费，同时要求官方价格与文字接口；移除价格后即拒绝', () => {
    const api = { data: [{ id: 'test-free' }, { id: 'fake-free' }] }
    const html =
      '<table><tr><td>Test Free</td><td>test-free</td><td>https://opencode.ai/zen/v1/chat/completions</td></tr><tr><td>Test Free</td><td>Free</td><td>Free</td><td>-</td></tr></table>'
    expect(zenFreeModels(api, html).map((m) => m.id)).toEqual(['opencode:test-free'])
    expect(zenFreeModels(api, html.replace('<td>Free</td>', '<td>$1</td>'))).toHaveLength(0)
    expect(zenFreeModels(api, html.replaceAll('<td>Free</td>', '<td>-</td>'))).toHaveLength(0)
  })
})
describe('每日任务身份', () => {
  it('核验签名、仓库、工作流、分支、用途和过期时间', async () => {
    const keys = (await crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify'],
    )) as CryptoKeyPair
    const kid = crypto.randomUUID(),
      jwk = { ...(await crypto.subtle.exportKey('jwk', keys.publicKey)), kid }
    const fetcher = vi.fn(async () => json({ keys: [jwk] }))
    const now = Math.floor(Date.now() / 1000),
      repository = 'xiaowang550/ai-guide-site',
      origin = 'https://admin.example.test'
    const base = {
      iss: 'https://token.actions.githubusercontent.com',
      aud: origin,
      repository,
      ref: 'refs/heads/main',
      workflow_ref: repository + '/.github/workflows/assistant-model-health.yml@refs/heads/main',
      event_name: 'workflow_dispatch',
      iat: now,
      exp: now + 300,
    }
    async function req(override = {}) {
      const encode = (value: unknown) =>
        toBase64Url(new TextEncoder().encode(JSON.stringify(value)))
      const head = encode({ alg: 'RS256', kid }),
        payload = encode({ ...base, ...override }),
        content = head + '.' + payload
      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        keys.privateKey,
        new TextEncoder().encode(content),
      )
      return new Request(origin + '/api/assistant/maintenance', {
        headers: {
          Authorization: 'Bearer ' + content + '.' + toBase64Url(new Uint8Array(signature)),
        },
      })
    }
    expect(await verifyMaintenanceToken(await req(), repository, fetcher as typeof fetch)).toBe(
      true,
    )
    for (const override of [
      { repository: 'other/repo' },
      { ref: 'refs/pull/1/merge' },
      { workflow_ref: repository + '/.github/workflows/other.yml@refs/heads/main' },
      { event_name: 'pull_request' },
      { aud: 'https://wrong.test' },
      { exp: now - 1 },
    ])
      expect(
        await verifyMaintenanceToken(await req(override), repository, fetcher as typeof fetch),
      ).toBe(false)
    const forged = await req()
    forged.headers.set(
      'Authorization',
      forged.headers.get('Authorization')!.slice(0, -10) + 'AAAAAAAAAA',
    )
    expect(await verifyMaintenanceToken(forged, repository, fetcher as typeof fetch)).toBe(false)
  })
})
