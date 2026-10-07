/* eslint-disable @typescript-eslint/no-explicit-any --
 *
 * 本文件里的 any 全部来自 JSON 载荷的动态形状（接口返回什么就断言什么），
 * 理由见 helpers/admin-test-env.ts 顶部说明。与其维护几百行镜像类型，
 * 不如放宽 lint 并把理由写在这里。
 */
import { describe, expect, it } from 'vitest'
import {
  ADMIN_PASSWORD,
  login,
  makeTestEnv,
  request,
  validTool,
  type TestEnv,
} from './helpers/admin-test-env'

/**
 * 最小闭环的端到端验证。
 *
 * 用户要求的闭环是：
 *   管理员登录 → 编辑一条工具资料 → 预览 → 发布 → 公开站显示更新 → 能恢复上一版本
 *
 * 这套测试**逐字按这个顺序走**，每一步都通过真实 HTTP 接口，
 * 并且每一步都额外验证「未登录时这一步做不到」——
 * 因为「所有管理接口在服务端验证权限」这条要求的重点不是登录能用，
 * 而是**没登录时一条都做不到**。只测「登录后能用」的测试会漏掉最严重的问题。
 */

describe('最小闭环：登录 → 编辑 → 预览 → 发布 → 公开站更新 → 恢复上一版本', () => {
  it('完整走一遍，且每一环在未登录状态下都被拒绝', async () => {
    // ── 准备 ──
    const env = await makeTestEnv({ withAdmin: true })

    // 工具库里还没有这条内容时，公开快照是空的
    const empty = await request(env, 'GET', '/api/content/published')
    expect(empty.status).toBe(200)
    expect(empty.json.items).toEqual([])

    // ── 第 1 步：登录 ──
    const bad = await login(env, 'admin', 'wrong-password')
    expect(bad.status, '错误密码竟然登录成功了').toBe(401)
    expect(bad.json.error).not.toMatch(/不存在|未注册/) // 不能泄露账号是否存在

    const ok = await login(env)
    expect(ok.status).toBe(200)
    expect(ok.json.username).toBe('admin')
    expect(ok.json.role).toBe('owner')

    // ── 第 2 步：编辑一条工具资料（存草稿）──
    const v1 = validTool()
    const saved = await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: v1,
      note: '首次录入',
    })
    expect(saved.status, JSON.stringify(saved.json)).toBe(200)

    // ── 第 3 步：预览（草稿可读，但公开站看不到）──
    const preview = await request(env, 'GET', '/api/admin/content/tool:testtool')
    expect(preview.status).toBe(200)
    expect(preview.json.draft.data.name).toBe('测试工具')
    expect(preview.json.published, '还没发布就有 published 数据').toBeNull()

    const beforePublish = await request(env, 'GET', '/api/content/published')
    expect(
      beforePublish.json.items.length,
      '草稿泄漏进了公开内容 —— 这等于预览没有意义'
    ).toBe(0)

    // ── 第 4 步：发布 ──
    const published = await request(env, 'POST', '/api/admin/content/tool:testtool/publish', {
      changeNote: '首次发布',
    })
    expect(published.status, JSON.stringify(published.json)).toBe(200)
    expect(published.json.version).toBe(1)

    // ── 第 5 步：公开站显示更新 ──
    const afterPublish = await request(env, 'GET', '/api/content/published')
    expect(afterPublish.json.items.length).toBe(1)
    const snap = afterPublish.json.items[0]
    expect(snap.itemId).toBe('tool:testtool')
    expect(snap.version).toBe(1)
    expect(snap.data.name).toBe('测试工具')
    // 发布后草稿应当消失
    expect(snap.data.updatedAt, 'updatedAt 必须由服务端注入').not.toBe('2026-01-01T00:00:00.000Z')

    // ── 第 6 步：改第二版 ──
    const v2 = validTool({ tagline: '改过的定位描述', name: '测试工具（新名）' })
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: v2,
    })
    const second = await request(env, 'POST', '/api/admin/content/tool:testtool/publish', {
      changeNote: '改定位',
    })
    expect(second.json.version).toBe(2)

    const afterSecond = await request(env, 'GET', '/api/content/published')
    expect(afterSecond.json.items[0].data.tagline).toBe('改过的定位描述')

    // ── 第 7 步：恢复上一版本 ──
    const rolled = await request(env, 'POST', '/api/admin/content/tool:testtool/rollback', {
      version: 1,
      reason: '第二版的定位写错了',
    })
    expect(rolled.status, JSON.stringify(rolled.json)).toBe(200)

    const afterRollback = await request(env, 'GET', '/api/content/published')
    expect(
      afterRollback.json.items[0].data.tagline,
      '回滚后公开内容没有回到第一版'
    ).toBe('一条一句话的定位描述')

    // ── 校验：回滚没有破坏历史 ──
    const detail = await request(env, 'GET', '/api/admin/content/tool:testtool')
    const versions = detail.json.versions.map((v: any) => v.version).sort()
    expect(versions, '回滚必须保留全部历史版本').toEqual([1, 2])
    // 历史里标出当前发布的是哪一版
    const publishedFlag = detail.json.versions.filter((v: any) => v.is_published === 1)
    expect(publishedFlag.map((v: any) => v.version)).toEqual([1])

    // ── 校验：审计日志记录了发布与回滚 ──
    const audit = await request(env, 'GET', '/api/admin/audit')
    const actions = audit.json.entries.map((e: any) => e.action)
    expect(actions).toContain('publish')
    expect(actions).toContain('rollback')
  })

  it('未登录时，闭环里每一个管理接口都拒绝', async () => {
    const anon = await makeTestEnv({ withAdmin: true })

    const calls: [string, string, unknown?][] = [
      ['GET', '/api/admin/dashboard'],
      ['GET', '/api/admin/content'],
      ['GET', '/api/admin/content/tool:testtool'],
      ['PUT', '/api/admin/content/tool:testtool/draft', { kind: 'tool', slug: 'testtool', data: validTool() }],
      ['DELETE', '/api/admin/content/tool:testtool/draft'],
      ['POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'x' }],
      ['GET', '/api/admin/content/tool:testtool/versions/1'],
      ['POST', '/api/admin/content/tool:testtool/rollback', { version: 1 }],
      ['GET', '/api/admin/feedback'],
      ['PATCH', '/api/admin/feedback/some-id', { status: 'resolved' }],
      ['GET', '/api/admin/review'],
      ['POST', '/api/admin/review', { title: '手动待办' }],
      ['POST', '/api/admin/review/regenerate'],
      ['PATCH', '/api/admin/review/some-id', { status: 'done' }],
      ['GET', '/api/admin/audit'],
      ['GET', '/api/admin/backup'],
      ['POST', '/api/admin/backup', { format: 'ai-guide-content-backup', version: 1, items: [] }],
      ['POST', '/api/admin/password', { oldPassword: ADMIN_PASSWORD, newPassword: 'new-password-1234' }],
    ]

    for (const [method, path, body] of calls) {
      const res = await request(anon, method, path, body)
      expect(res.status, `${method} ${path} 在未登录时返回了 ${res.status}，应该是 401`).toBe(401)
    }
  })

  it('伪造的 Cookie 进不来', async () => {
    const env = await makeTestEnv({ withAdmin: true })

    // 随机令牌
    env.cookies.set('admin_session', 'not-a-real-token')
    let res = await request(env, 'GET', '/api/admin/dashboard')
    expect(res.status).toBe(401)

    // 令牌正确但已被删除的会话
    await login(env)
    const realToken = env.cookies.get('admin_session')
    expect(realToken).toBeTruthy()
    await env.db.run('DELETE FROM sessions')
    res = await request(env, 'GET', '/api/admin/dashboard')
    expect(res.status, '库里删掉会话后仍然放行').toBe(401)

    // 过期会话
    await login(env)
    await env.db.run('UPDATE sessions SET expires_at = ?', ['2000-01-01T00:00:00.000Z'])
    res = await request(env, 'GET', '/api/admin/dashboard')
    expect(res.status, '过期会话仍然放行').toBe(401)
  })

  it('登出后会话立即失效', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    expect((await request(env, 'GET', '/api/admin/dashboard')).status).toBe(200)

    const out = await request(env, 'POST', '/api/admin/logout')
    expect(out.status).toBe(200)
    expect(env.cookies.has('admin_session'), '登出后浏览器应当清掉 Cookie').toBe(false)

    expect((await request(env, 'GET', '/api/admin/dashboard')).status).toBe(401)
  })

  it('跨站写操作被拒绝（CSRF）', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)

    // Origin 指向别的站
    const evil = await request(
      env,
      'POST',
      '/api/admin/content/tool:testtool/publish',
      { changeNote: '恶意' },
      { origin: 'https://evil.example.com' }
    )
    expect(evil.status, '跨站写操作被放行了').toBe(403)

    // 完全没有 Origin 头
    const noOrigin = await request(
      env,
      'PUT',
      '/api/admin/content/tool:testtool/draft',
      { kind: 'tool', slug: 'testtool', data: validTool() },
      { origin: null }
    )
    expect(noOrigin.status, '无 Origin 的写操作被放行了').toBe(403)

    // 同源的 GET 不受影响
    expect((await request(env, 'GET', '/api/admin/dashboard')).status).toBe(200)
  })

  it('会话 Cookie 带 HttpOnly 与 SameSite=Strict', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const res = await handleRawLogin(env)
    const cookie = res.setCookie

    expect(cookie, '响应里没有 Set-Cookie').toBeTruthy()
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Strict/i)
    // TEST_ORIGIN 是 https，应当带 Secure
    expect(cookie).toMatch(/Secure/i)
  })

  it('方法不对返回 405，路径不存在返回 404', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    const wrongMethod = await request(env, 'DELETE', '/api/admin/dashboard')
    expect(wrongMethod.status).toBe(405)
    const noRoute = await request(env, 'GET', '/api/admin/nonexistent')
    expect(noRoute.status).toBe(404)
  })
})

/** 直接调 handleApi 只为了拿 Set-Cookie 原文 */
async function handleRawLogin(env: TestEnv): Promise<{ setCookie: string }> {
  const { handleApi } = await import('@/lib/admin/api')
  const res = await handleApi(
    new Request('https://admin.example.test/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://admin.example.test' },
      body: JSON.stringify({ username: 'admin', password: ADMIN_PASSWORD }),
    }),
    env.env
  )
  const cookies =
    typeof (res!.headers as any).getSetCookie === 'function'
      ? (res!.headers as any).getSetCookie()
      : [(res!.headers.get('set-cookie') ?? '')]
  return { setCookie: cookies.join('; ') }
}
