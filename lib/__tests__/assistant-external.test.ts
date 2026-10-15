import { describe, it, expect, vi } from 'vitest'
import { makeTestEnv, login, request } from './helpers/admin-test-env'
import { assistantExternal } from '@/lib/assistant-external'
import { externalBaseUrl, publicAddress } from '@/lib/assistant-external-url'
const KEY = 'fixture-only-external-key-12345678'
const BASE = 'https://api.models.example.com/v1'
const endpoint = '/api/admin/assistant/sources'
const json = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } })
const stream = (text: string) =>
  new Response(
    'data: ' +
      JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: 'stop' }] }) +
      '\n\ndata: [DONE]\n\n',
    { headers: { 'content-type': 'text/event-stream' } },
  )
async function fixture() {
  const env = await makeTestEnv()
  await login(env)
  env.env.AI_CREDENTIALS_KEY = 'fixture-external-encryption-secret-at-least-32-chars'
  let privateDns = false,
    items = [
      { id: 'vendor/good', name: '中文助手' },
      { id: 'vendor/bad' },
      { id: 'vendor/safe' },
      { id: 'vendor/json' },
      { id: 'vendor/embedding-model' },
    ]
  const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input))
    if (url.hostname === 'cloudflare-dns.com') {
      expect(new Headers(init?.headers).has('authorization')).toBe(false)
      return json({
        Status: 0,
        Answer:
          url.searchParams.get('type') === 'A'
            ? [{ type: 1, data: privateDns ? '127.0.0.1' : '8.8.8.8' }]
            : [],
      })
    }
    if (
      url.origin === 'https://api.models.example.com' ||
      url.origin === 'https://other.models.example.com'
    ) {
      expect(init?.redirect).toBe('manual')
      expect(new Headers(init?.headers).get('authorization')).toBe('Bearer ' + KEY)
      if (url.pathname.endsWith('/models')) return json({ data: items })
      const body = JSON.parse(String(init?.body))
      if (body.model === 'vendor/bad') return json({ error: { code: 401, message: KEY } }, 401)
      if (body.model === 'vendor/safe') return stream('User Safety: safe')
      const answer = body.messages.at(-1).content.includes('连接测试')
        ? '连接正常'
        : '已经收到你的任务，这是外部模型的回答。'
      if (body.model === 'vendor/json')
        return json({ choices: [{ message: { content: answer }, finish_reason: 'stop' }] })
      return stream(answer)
    }
    return json({ data: [] })
  })
  env.env.ASSISTANT_FETCH = fetcher as typeof fetch
  const discover = () =>
    request(env, 'POST', endpoint, {
      phase: 'discover',
      baseUrl: BASE,
      apiKey: KEY,
      name: '测试连接',
    })
  return {
    env,
    fetcher,
    discover,
    setPrivate: () => {
      privateDns = true
    },
    setItems: (value: typeof items) => {
      items = value
    },
  }
}
describe('外部模型接入', () => {
  it('只有所有者和本站来源可以保存密钥，列表与错误不泄露密钥', async () => {
    const f = await fixture()
    f.env.cookies.clear()
    expect((await request(f.env, 'GET', endpoint)).status).toBe(401)
    expect((await f.discover()).status).toBe(401)
    expect(f.fetcher).not.toHaveBeenCalled()
    await login(f.env)
    expect(
      (
        await request(
          f.env,
          'POST',
          endpoint,
          { phase: 'discover', baseUrl: BASE, apiKey: KEY },
          { origin: 'https://evil.example.com' },
        )
      ).status,
    ).toBe(403)
    const result = await f.discover()
    expect(result.status).toBe(200)
    expect(JSON.stringify(result.json)).not.toContain(KEY)
    const stored = await f.env.db.first<{ credential: string }>(
      'SELECT credential FROM assistant_external_sources',
    )
    expect(stored?.credential).not.toContain(KEY)
    expect(JSON.parse(stored!.credential).ciphertext).toBeTruthy()
    expect(JSON.stringify((await request(f.env, 'GET', endpoint)).json)).not.toContain('ciphertext')
  })
  it('发现目录不会发布；只有实际回答通过且点击添加才向两端开放', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json,
      good = plan.models.find((m: { name: string }) => m.name === '中文助手')
    expect((await request(f.env, 'GET', '/api/assistant/models')).json.models).toEqual([])
    expect(
      (
        await request(f.env, 'POST', endpoint, {
          phase: 'publish',
          model: good.id,
          runId: plan.runId,
          published: true,
        })
      ).status,
    ).toBe(400)
    const tested = await request(f.env, 'POST', endpoint, {
      phase: 'probe',
      runId: plan.runId,
      model: good.id,
    })
    expect(tested.json.state).toBe('passed')
    const probeCall = f.fetcher.mock.calls.find(([u]) => String(u).endsWith('/chat/completions'))!
    expect(
      JSON.parse(String(probeCall[1]?.body)).messages.map((m: { role: string }) => m.role),
    ).toEqual(['system', 'user'])
    expect((await request(f.env, 'GET', '/api/assistant/models')).json.models).toEqual([])
    await request(f.env, 'POST', endpoint, {
      phase: 'publish',
      model: good.id,
      runId: plan.runId,
      published: true,
    })
    f.env.cookies.clear()
    const catalog = (await request(f.env, 'GET', '/api/assistant/models')).json
    expect(catalog.models).toHaveLength(1)
    expect(catalog.models[0]).toMatchObject({
      id: good.id,
      name: '中文助手',
      provider: 'custom',
      sourceName: '测试连接',
      available: true,
    })
    expect(JSON.stringify(catalog)).not.toContain(KEY)
    const response = await request(f.env, 'POST', '/api/assistant/chat', {
      model: good.id,
      mode: 'experiment',
      messages: [{ role: 'user', content: '帮我写一份通知' }],
      page: '/school/',
    })
    expect(response.status).toBe(200)
    const call = f.fetcher.mock.calls
      .filter(([u]) => String(u).endsWith('/chat/completions'))
      .at(-1)!
    expect(String(call[0])).toBe(BASE + '/chat/completions')
    expect(JSON.parse(String(call[1]?.body)).model).toBe('vendor/good')
    expect(JSON.parse(String(call[1]?.body)).messages.at(-1).content).toBe('帮我写一份通知')
  })
  it('失败、审核标签与不支持对话的模型归入不可用；普通 JSON 响应也能接入', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json
    for (const name of ['vendor/bad', 'vendor/safe', 'vendor/json']) {
      const m = plan.models.find((m: { name: string }) => m.name === name)
      const result = await request(f.env, 'POST', endpoint, {
        phase: 'probe',
        runId: plan.runId,
        model: m.id,
      })
      expect(result.json.state).toBe(name === 'vendor/json' ? 'passed' : 'failed')
      expect(JSON.stringify(result.json)).not.toContain(KEY)
    }
    expect(
      plan.models.find((m: { name: string }) => m.name === 'vendor/embedding-model').state,
    ).toBe('failed')
  })
  it('暂停阻止后续调用，继续检测保留已完成结果且不重复调用已测模型', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json,
      good = plan.models.find((m: { name: string }) => m.name === '中文助手')
    await request(f.env, 'POST', endpoint, {
      phase: 'pause',
      sourceId: plan.sourceId,
      runId: plan.runId,
    })
    expect(
      (
        await request(f.env, 'POST', endpoint, {
          phase: 'probe',
          model: good.id,
          runId: plan.runId,
        })
      ).status,
    ).toBe(409)
    expect(f.fetcher.mock.calls.some(([u]) => String(u).endsWith('/chat/completions'))).toBe(false)
    await request(f.env, 'POST', endpoint, {
      phase: 'resume',
      sourceId: plan.sourceId,
      runId: plan.runId,
    })
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request(f.env, 'POST', endpoint, {
            phase: 'probe',
            model: good.id,
            runId: plan.runId,
          })
        ).json.state,
      ).toBe('passed')
    expect(
      f.fetcher.mock.calls.filter(([u]) => String(u).endsWith('/chat/completions')),
    ).toHaveLength(1)
  })
  it('删除期间到达的旧测试结果不能重新激活模型', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json,
      model = plan.models.find((m: { name: string }) => m.name === '中文助手')
    let complete!: (r: Response) => void
    const original = f.fetcher.getMockImplementation()!
    f.fetcher.mockImplementation(async (u, i) =>
      String(u).endsWith('/chat/completions')
        ? new Promise<Response>((r) => {
            complete = r
          })
        : original(u, i),
    )
    const pending = request(f.env, 'POST', endpoint, {
      phase: 'probe',
      model: model.id,
      runId: plan.runId,
    })
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
    await request(f.env, 'POST', endpoint, {
      phase: 'deleteModel',
      model: model.id,
      runId: plan.runId,
    })
    complete(stream('连接正常'))
    expect((await pending).status).toBe(409)
    const hidden = await f.env.db.first<{ hidden: number; published: number }>(
      'SELECT hidden,published FROM assistant_external_models WHERE id=?',
      [model.id],
    )
    expect(hidden).toMatchObject({ hidden: 1, published: 0 })
  })
  it('删除记录跨扫描保留；恢复、重命名、下架和删除连接均同步生效', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json,
      good = plan.models.find((m: { name: string }) => m.name === '中文助手')
    await request(f.env, 'POST', endpoint, {
      phase: 'deleteModel',
      model: good.id,
      runId: plan.runId,
    })
    const next = (
      await request(f.env, 'POST', endpoint, { phase: 'discover', sourceId: plan.sourceId })
    ).json
    expect(next.models.some((m: { id: string }) => m.id === good.id)).toBe(false)
    await request(f.env, 'POST', endpoint, {
      phase: 'restoreDeleted',
      sourceId: plan.sourceId,
      runId: next.runId,
    })
    await request(f.env, 'POST', endpoint, { phase: 'probe', model: good.id, runId: next.runId })
    await request(f.env, 'POST', endpoint, {
      phase: 'editModel',
      model: good.id,
      runId: next.runId,
      label: '我的助手',
    })
    await request(f.env, 'POST', endpoint, {
      phase: 'publish',
      model: good.id,
      runId: next.runId,
      published: true,
    })
    expect((await request(f.env, 'GET', '/api/assistant/models')).json.models[0].name).toBe(
      '我的助手',
    )
    await request(f.env, 'POST', endpoint, {
      phase: 'publish',
      model: good.id,
      runId: next.runId,
      published: false,
    })
    expect((await request(f.env, 'GET', '/api/assistant/models')).json.models).toEqual([])
    await request(f.env, 'POST', endpoint, { phase: 'remove', sourceId: plan.sourceId })
    expect((await request(f.env, 'GET', endpoint)).json.sources).toEqual([])
  })
  it('Key 或地址改变后撤销旧结果；更改地址不能把旧 Key 发到新服务商', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json,
      good = plan.models.find((m: { name: string }) => m.name === '中文助手')
    await request(f.env, 'POST', endpoint, { phase: 'probe', model: good.id, runId: plan.runId })
    await request(f.env, 'POST', endpoint, {
      phase: 'publish',
      model: good.id,
      runId: plan.runId,
      published: true,
    })
    const changed = await request(f.env, 'POST', endpoint, {
      phase: 'discover',
      sourceId: plan.sourceId,
      baseUrl: 'https://other.models.example.com/v1',
    })
    expect(changed.status).toBe(400)
    expect(
      f.fetcher.mock.calls.some(([u]) => String(u).startsWith('https://other.models.example.com')),
    ).toBe(false)
    await request(f.env, 'POST', endpoint, {
      phase: 'discover',
      sourceId: plan.sourceId,
      apiKey: KEY,
    })
    expect((await request(f.env, 'GET', '/api/assistant/models')).json.models).toEqual([])
    expect(
      (
        await request(f.env, 'POST', endpoint, {
          phase: 'publish',
          model: good.id,
          runId: plan.runId,
          published: true,
        })
      ).status,
    ).toBe(409)
  })
  it('每日身份只检测已保存连接，不能发布、改地址或取消用户的暂停', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json
    const daily = (body: unknown) =>
      assistantExternal(
        f.env.db,
        f.env.env,
        new Request('https://admin.example.test/api/assistant/maintenance', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
        true,
      )
    expect(
      (await daily({ phase: 'publish', model: plan.models[0].id, published: true })).status,
    ).toBe(403)
    expect(
      (await daily({ phase: 'discover', sourceId: plan.sourceId, baseUrl: BASE })).status,
    ).toBe(400)
    await request(f.env, 'POST', endpoint, {
      phase: 'pause',
      sourceId: plan.sourceId,
      runId: plan.runId,
    })
    expect((await daily({ phase: 'discover', sourceId: plan.sourceId })).status).toBe(409)
    await request(f.env, 'POST', endpoint, {
      phase: 'resume',
      sourceId: plan.sourceId,
      runId: plan.runId,
    })
    expect((await daily({ phase: 'discover', sourceId: plan.sourceId })).status).toBe(200)
  })
  it('私网、重定向和元数据地址不会收到 Key；保存后 DNS 变成私网也不能测试', async () => {
    const f = await fixture()
    for (const url of [
      'http://api.models.example.com/v1',
      'https://127.0.0.1/v1',
      'https://[::1]/v1',
      'https://169.254.169.254/latest/meta-data',
      'https://admin.example.test/v1',
      'https://api.models.example.com/v1?key=foo',
    ])
      expect(
        (await request(f.env, 'POST', endpoint, { phase: 'discover', baseUrl: url, apiKey: KEY }))
          .status,
      ).toBe(400)
    expect(
      f.fetcher.mock.calls.some(
        ([u, i]) =>
          String(u).includes('admin.example.test') && new Headers(i?.headers).has('authorization'),
      ),
    ).toBe(false)
    const plan = (await f.discover()).json
    f.setPrivate()
    const result = await request(f.env, 'POST', endpoint, {
      phase: 'probe',
      model: plan.models[0].id,
      runId: plan.runId,
    })
    expect(result.json.state).toBe('failed')
    expect(
      f.fetcher.mock.calls.filter(([u]) => String(u).endsWith('/chat/completions')),
    ).toHaveLength(0)
  })
  it('测试过期自动下架；每日复测恢复已添加模型，但不会替用户发布新模型', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json,
      good = plan.models.find((m: { name: string }) => m.name === '中文助手')
    await request(f.env, 'POST', endpoint, { phase: 'probe', runId: plan.runId, model: good.id })
    await request(f.env, 'POST', endpoint, {
      phase: 'publish',
      model: good.id,
      runId: plan.runId,
      published: true,
    })
    await f.env.db.run('UPDATE assistant_external_models SET checked_at=? WHERE id=?', [
      new Date(Date.now() - 37 * 3600000).toISOString(),
      good.id,
    ])
    expect((await request(f.env, 'GET', '/api/assistant/models')).json.models).toHaveLength(0)
    const daily = (body: unknown) =>
      assistantExternal(
        f.env.db,
        f.env.env,
        new Request('https://admin.example.test/api/assistant/maintenance', {
          method: 'POST',
          body: JSON.stringify(body),
        }),
        true,
      )
    const next = await (await daily({ phase: 'discover', sourceId: plan.sourceId })).json()
    for (const m of next.models.filter((m: { state: string }) => m.state === 'pending'))
      await daily({ phase: 'probe', model: m.id, runId: next.runId })
    const models = (await request(f.env, 'GET', '/api/assistant/models')).json.models
    expect(models).toHaveLength(1)
    expect(models[0].id).toBe(good.id)
  })
  it('模型目录的重定向不转发密钥；暂停期间完成的请求不能写入通过状态', async () => {
    const f = await fixture(),
      base = f.fetcher.getMockImplementation()!
    f.fetcher.mockImplementation(async (u, i) =>
      String(u) === BASE + '/models'
        ? new Response(null, {
            status: 302,
            headers: { location: 'https://evil.example.com/models' },
          })
        : base(u, i),
    )
    expect((await f.discover()).status).toBe(400)
    expect(f.fetcher.mock.calls.some(([u]) => String(u).includes('evil.example.com'))).toBe(false)
    f.fetcher.mockImplementation(base)
    const plan = (await f.discover()).json,
      good = plan.models.find((m: { name: string }) => m.name === '中文助手')
    let complete!: (r: Response) => void
    f.fetcher.mockImplementation(async (u, i) =>
      String(u).endsWith('/chat/completions')
        ? new Promise<Response>((r) => {
            complete = r
          })
        : base(u, i),
    )
    const pending = request(f.env, 'POST', endpoint, {
      phase: 'probe',
      model: good.id,
      runId: plan.runId,
    })
    await vi.waitFor(() => expect(complete).toBeTypeOf('function'))
    await request(f.env, 'POST', endpoint, {
      phase: 'pause',
      sourceId: plan.sourceId,
      runId: plan.runId,
    })
    complete(stream('连接正常'))
    expect((await pending).json.state).toBe('pending')
  })
  it('HTTP 成功且提到测试词语，也不将未按要求回答的内容误判通过', async () => {
    const f = await fixture(),
      plan = (await f.discover()).json,
      good = plan.models.find((m: { name: string }) => m.name === '中文助手'),
      original = f.fetcher.getMockImplementation()!
    f.fetcher.mockImplementation(async (u, i) =>
      String(u).endsWith('/chat/completions')
        ? stream('无法连接正常使用，请检查您的配置。')
        : original(u, i),
    )
    expect(
      (
        await request(f.env, 'POST', endpoint, {
          phase: 'probe',
          runId: plan.runId,
          model: good.id,
        })
      ).json.state,
    ).toBe('failed')
  })
  it('规范化兼容地址，拒绝混合 DNS 记录中的私网和保留网段', () => {
    expect(externalBaseUrl(BASE + '/chat/completions')).toBe(BASE)
    expect(externalBaseUrl('https://api.models.example.com')).toBe(BASE)
    for (const address of [
      '127.0.0.1',
      '10.2.3.4',
      '100.64.0.1',
      '192.168.0.1',
      '198.18.0.1',
      '169.254.169.254',
      '::1',
      '::ffff:127.0.0.1',
      'fc00::1',
      '2001:db8::1',
      '2002:7f00:1::',
    ])
      expect(publicAddress(address)).toBe(false)
    expect(publicAddress('8.8.8.8')).toBe(true)
    expect(publicAddress('2606:4700:4700::1111')).toBe(true)
  })
})
