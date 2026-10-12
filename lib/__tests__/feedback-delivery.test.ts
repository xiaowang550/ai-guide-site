import { describe, expect, it, vi } from 'vitest'
import { handleApi } from '@/lib/admin/api'
import {
  FEEDBACK_BODY_BYTES,
  readFeedbackBody,
  deliverFeedback,
} from '@/lib/admin/feedback-delivery'
import { makeTestEnv, request, login, TEST_ORIGIN } from './helpers/admin-test-env'

const PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZy0AAAAASUVORK5CYII='
const payload = {
  message: '这是反馈功能的测试，学习路径入口可以再清楚一些。',
  kind: 'suggestion',
  screenshots: [{ data: PNG }],
}
const secret = 're_feedback_test_private_key_123456'
async function mailEnv() {
  const env = await makeTestEnv({ withAdmin: true })
  env.env.AI_CREDENTIALS_KEY = 'feedback-test-encryption-secret-0123456789'
  env.env.FEEDBACK_FETCH = vi.fn(
    async () =>
      new Response(JSON.stringify({ id: 'provider-test-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
  ) as typeof fetch
  await login(env)
  await request(env, 'PUT', '/api/admin/feedback-mail', {
    sender: 'onboarding@resend.dev',
    key: secret,
  })
  env.cookies.clear()
  return env
}
describe('公开反馈与私有截图', () => {
  it('无需登录提交截图与文字，后台能读、匿名无法读；邮件未配置也保留完整记录', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const sub = await request(env, 'POST', '/api/feedback', {
      ...payload,
      contact: 'visitor@example.com',
      pageUrl: '/tools/chatgpt/',
    })
    expect(sub.status).toBe(200)
    expect(sub.json).toEqual({ ok: true, id: expect.any(String) })
    await login(env)
    const list = await request(env, 'GET', '/api/admin/feedback')
    const item = list.json.items[0]
    expect(item.message).toBe(payload.message)
    expect(item.screenshots).toHaveLength(1)
    expect(item.notification.status).toBe('unconfigured')
    expect(JSON.stringify(list.json)).not.toContain(PNG.slice(PNG.indexOf(',') + 1))
    const cookie = [...env.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
    const asset = await handleApi(
      new Request(`${TEST_ORIGIN}/api/admin/feedback-assets/${item.screenshots[0].id}`, {
        headers: { Cookie: cookie },
      }),
      env.env,
    )
    expect(asset?.status).toBe(200)
    expect(asset?.headers.get('content-type')).toBe('image/png')
    expect(asset?.headers.get('cache-control')).toBe('no-store')
    expect(asset?.headers.get('x-content-type-options')).toBe('nosniff')
    expect(new Uint8Array(await asset!.arrayBuffer()).slice(1, 4)).toEqual(
      new Uint8Array([80, 78, 71]),
    )
    env.cookies.clear()
    expect(
      (await request(env, 'GET', `/api/admin/feedback-assets/${item.screenshots[0].id}`)).status,
    ).toBe(401)
    expect((await request(env, 'GET', '/api/admin/feedback-mail')).status).toBe(401)
    expect((await request(env, 'POST', '/api/admin/feedback-mail/retry', {})).status).toBe(401)
  })
  it.each([
    [{ data: 'data:image/svg+xml;base64,' + btoa('<svg onload="alert(1)"/>') }],
    [{ data: 'data:image/png;base64,' + btoa('<html>not an image</html>') }],
    [{ data: 'data:image/jpeg;base64,!!!!!' }],
    Array.from({ length: 4 }, () => ({ data: PNG })),
    [{ data: 'data:image/png;base64,' + 'A'.repeat(500000) }],
  ])('拒绝非图片、伪造格式、超数量或超大截图，且不落半条记录 %#', async (screenshots) => {
    const env = await makeTestEnv()
    const result = await request(env, 'POST', '/api/feedback', { ...payload, screenshots })
    expect(result.status).toBe(400)
    expect((await env.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM feedback'))?.n).toBe(0)
  })
  it('限长读取没有 Content-Length 的分块请求', async () => {
    let cancelled = false
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(FEEDBACK_BODY_BYTES))
        controller.enqueue(new Uint8Array(1))
      },
      cancel() {
        cancelled = true
      },
    })
    const input = new Request(TEST_ORIGIN, {
      method: 'POST',
      body: stream,
      duplex: 'half',
    } as RequestInit)
    await expect(readFeedbackBody(input)).rejects.toThrow('过大')
    expect(cancelled).toBe(true)
  })
  it('同一提交编号重试仅建单一次，修改内容不能复用编号', async () => {
    const env = await makeTestEnv()
    const body = { ...payload, requestId: crypto.randomUUID() }
    const first = await request(env, 'POST', '/api/feedback', body)
    const again = await request(env, 'POST', '/api/feedback', body)
    expect(again.json.id).toBe(first.json.id)
    const changed = await request(env, 'POST', '/api/feedback', {
      ...body,
      message: '内容已经改变，应产生新的提交编号。',
    })
    expect(changed.status).toBe(400)
    expect((await env.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM feedback'))?.n).toBe(1)
    expect(
      (await env.db.first<{ n: number }>('SELECT COUNT(*) AS n FROM feedback_assets'))?.n,
    ).toBe(1)
  })
})
describe('反馈邮件安全配置与通知', () => {
  it('Key 加密保存、读取与审计均不泄露；空 Key 保留、明确移除清除', async () => {
    const env = await mailEnv()
    const stored = await env.db.first<{ credential: string }>(
      'SELECT credential FROM feedback_mail_settings',
    )
    expect(stored?.credential).not.toContain(secret)
    await login(env)
    const status = await request(env, 'GET', '/api/admin/feedback-mail')
    expect(status.json.configured).toBe(true)
    expect(status.json.recipient).toBe('1987215931@qq.com')
    expect(JSON.stringify(status.json)).not.toContain(secret)
    const audit = await request(env, 'GET', '/api/admin/audit')
    expect(JSON.stringify(audit.json)).not.toContain(secret)
    await request(env, 'PUT', '/api/admin/feedback-mail', {
      sender: 'notify@verified.example.com',
      key: '',
    })
    expect((await request(env, 'GET', '/api/admin/feedback-mail')).json.configured).toBe(true)
    await request(env, 'PUT', '/api/admin/feedback-mail', {
      sender: 'notify@verified.example.com',
      clearKey: true,
    })
    expect((await request(env, 'GET', '/api/admin/feedback-mail')).json.configured).toBe(false)
  })
  it('通知固定给站长邮箱，包含截图；并发或重复重试不重复发已确认邮件', async () => {
    const env = await mailEnv()
    const sub = await request(env, 'POST', '/api/feedback', {
      ...payload,
      contact: 'visitor@other.example.com',
    })
    expect(sub.status).toBe(200)
    const mock = vi.mocked(env.env.FEEDBACK_FETCH!)
    expect(mock).toHaveBeenCalledTimes(1)
    const [url, options] = mock.mock.calls[0]
    expect(url).toBe('https://api.resend.com/emails')
    expect(options?.redirect).toBe('manual')
    const email = JSON.parse(String(options?.body))
    expect(email.to).toEqual(['1987215931@qq.com'])
    expect(email.text).toContain(payload.message)
    expect(email.text).toContain('visitor@other.example.com')
    expect(email.attachments[0].content).toBe(PNG.split(',')[1])
    expect((options?.headers as Record<string, string>)['Idempotency-Key']).toBe(
      'feedback/' + sub.json.id,
    )
    await Promise.all([
      deliverFeedback(env.db, env.env, sub.json.id, true),
      deliverFeedback(env.db, env.env, sub.json.id, true),
    ])
    expect(mock).toHaveBeenCalledTimes(1)
    await login(env)
    expect(
      (await request(env, 'GET', '/api/admin/feedback')).json.items[0].notification.status,
    ).toBe('sent')
  })
  it('供应商失败仍返回反馈成功、保留截图，可补发，且不记录原始敏感报错', async () => {
    const env = await mailEnv()
    const mock = vi.mocked(env.env.FEEDBACK_FETCH!)
    mock.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'error leaked ' + secret }), { status: 429 }),
    )
    const sub = await request(env, 'POST', '/api/feedback', payload)
    expect(sub.status).toBe(200)
    await login(env)
    const list = await request(env, 'GET', '/api/admin/feedback')
    expect(list.json.items[0].notification.status).toBe('failed')
    expect(list.json.items[0].screenshots).toHaveLength(1)
    expect(JSON.stringify(list.json)).not.toContain(secret)
    expect(
      (await request(env, 'POST', `/api/admin/feedback/${sub.json.id}/retry`, {})).status,
    ).toBe(200)
    expect(
      (await request(env, 'GET', '/api/admin/feedback')).json.items[0].notification.status,
    ).toBe('sent')
    expect(mock).toHaveBeenCalledTimes(2)
    expect((mock.mock.calls[0][1]?.headers as Record<string, string>)['Idempotency-Key']).toBe(
      (mock.mock.calls[1][1]?.headers as Record<string, string>)['Idempotency-Key'],
    )
  })
  it('配置之后能补发此前没有配置时收到的记录，测试邮件不占用反馈记录', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await request(env, 'POST', '/api/feedback', payload)
    await login(env)
    expect((await request(env, 'POST', '/api/admin/feedback-mail/test', {})).status).toBe(400)
    env.env.RESEND_API_KEY = secret
    const mock = vi.fn(async () => new Response(JSON.stringify({ id: 'test-or-retry' })))
    env.env.FEEDBACK_FETCH = mock as typeof fetch
    expect((await request(env, 'POST', '/api/admin/feedback-mail/test', {})).status).toBe(200)
    const result = await request(env, 'POST', '/api/admin/feedback-mail/retry', {})
    expect(result.json.processed).toBe(1)
    expect(mock).toHaveBeenCalledTimes(2)
    expect((await request(env, 'GET', '/api/admin/feedback')).json.items).toHaveLength(1)
  })
  it('仅 owner 能管理邮件，跨站保存/测试/补发被阻止，发件地址不能注入邮件头', async () => {
    const env = await mailEnv()
    await login(env)
    const invalid = await request(env, 'PUT', '/api/admin/feedback-mail', {
      sender: 'owner@example.com\r\nBcc: attacker@example.com',
      key: secret,
    })
    expect(invalid.status).toBe(400)
    for (const [method, path] of [
      ['PUT', '/api/admin/feedback-mail'],
      ['POST', '/api/admin/feedback-mail/test'],
      ['POST', '/api/admin/feedback-mail/retry'],
    ])
      expect(
        (await request(env, method, path, {}, { origin: 'https://evil.example.com' })).status,
      ).toBe(403)
    await env.db.run("UPDATE admins SET role='editor' WHERE username='admin'")
    expect((await request(env, 'GET', '/api/admin/feedback-mail')).status).toBe(403)
    expect((await request(env, 'GET', '/api/admin/feedback-assets/anything')).status).toBe(403)
  })
})
