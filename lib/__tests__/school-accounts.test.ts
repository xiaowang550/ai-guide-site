import { describe, expect, it } from 'vitest'
import { login, makeTestEnv, request, TEST_ORIGIN, type TestEnv } from './helpers/admin-test-env'
import { onRequest } from '../../functions/_middleware'
import { schoolPath } from '../admin/schools'
import { searchDocs } from '@/data'
import sitemap from '@/app/sitemap'
import { buildFreshnessReport } from '@/lib/freshness'

const PASSWORD = 'Teacher-test-password-2026'
const browser = (env: TestEnv): TestEnv => ({ ...env, cookies: new Map() })
async function owner() {
  const env = await makeTestEnv()
  await login(env)
  return env
}
async function create(env: TestEnv, username = 'school01') {
  const r = await request(env, 'POST', '/api/admin/school-accounts', {
    schoolName: '测试中学',
    username,
    password: PASSWORD,
  })
  expect(r.status).toBe(201)
  return r.json.account
}
async function signIn(env: TestEnv, username = 'school01', password = PASSWORD) {
  return request(env, 'POST', '/api/school/login', { username, password })
}

describe('学校账号与大众端隔离', () => {
  it('仅所有者分配账号，学校账号与管理员账号不能相互登录', async () => {
    const env = await owner(),
      guest = browser(env)
    expect((await request(guest, 'POST', '/api/admin/school-accounts', {})).status).toBe(401)
    expect((await request(guest, 'GET', '/api/school/config')).status).toBe(401)
    const account = await create(env)
    expect(account.username).toBe('school01')
    const duplicate = await request(env, 'POST', '/api/admin/school-accounts', {
      schoolName: '另一学校',
      username: 'school01',
      password: PASSWORD,
    })
    expect(duplicate.status).toBe(400)
    expect(
      (
        await request(guest, 'POST', '/api/admin/login', {
          username: 'school01',
          password: PASSWORD,
        })
      ).status,
    ).toBe(401)
    const result = await signIn(guest)
    expect(result.status).toBe(200)
    expect(result.json.role).toBe('school')
    expect((await request(guest, 'GET', '/api/admin/school-accounts')).status).toBe(401)
    expect((await request(guest, 'GET', '/api/admin/modules')).status).toBe(401)
    expect((await request(guest, 'POST', '/api/admin/school-accounts', {})).status).toBe(401)
    expect((await request(guest, 'GET', '/api/school/config')).status).toBe(200)
    const list = (await request(env, 'GET', '/api/admin/school-accounts')).json
    expect(JSON.stringify(list)).not.toMatch(/password|salt|iterations|token/)
  })
  it('Cookie 使用服务端会话、过期检查与安全标记；复制学校令牌不能冒用管理员', async () => {
    const env = await owner()
    await create(env)
    const teacher = browser(env)
    const r = await signIn(teacher),
      cookie = r.headers.get('set-cookie')!
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
    const raw = teacher.cookies.get('school_session')!
    const row = await env.db.first<{ token_hash: string }>('SELECT token_hash FROM school_sessions')
    expect(row!.token_hash).not.toBe(raw)
    teacher.cookies.set('admin_session', raw)
    expect((await request(teacher, 'GET', '/api/admin/session')).json.authenticated).toBe(false)
    await env.db.run("UPDATE school_sessions SET expires_at='2000-01-01T00:00:00Z'")
    expect((await request(teacher, 'GET', '/api/school/session')).json.authenticated).toBe(false)
    expect((await request(teacher, 'GET', '/api/school/config')).status).toBe(401)
  })
  it('停用、改密码会撤销该学校所有会话；另一所学校不受影响', async () => {
    const env = await owner(),
      first = await create(env),
      second = await create(env, 'school02')
    const a = browser(env),
      b = browser(env),
      other = browser(env)
    await signIn(a)
    await signIn(b)
    await signIn(other, 'school02')
    let changed = await request(env, 'PATCH', '/api/admin/school-accounts/' + first.id, {
      version: first.version,
      enabled: false,
    })
    expect(changed.status).toBe(200)
    expect((await request(a, 'GET', '/api/school/config')).status).toBe(401)
    expect((await request(b, 'GET', '/api/school/config')).status).toBe(401)
    expect((await signIn(browser(env))).status).toBe(401)
    expect((await request(other, 'GET', '/api/school/session')).json.id).toBe(second.id)
    changed = await request(env, 'PATCH', '/api/admin/school-accounts/' + first.id, {
      version: changed.json.account.version,
      enabled: true,
      password: 'New-teacher-password-2026',
    })
    expect(changed.status).toBe(200)
    expect((await request(a, 'GET', '/api/school/session')).json.authenticated).toBe(false)
    expect((await signIn(browser(env))).status).toBe(401)
    const newTeacher = browser(env)
    expect((await signIn(newTeacher, 'school01', 'New-teacher-password-2026')).status).toBe(200)
    const reset = await request(env, 'PATCH', '/api/admin/school-accounts/' + first.id, {
      version: changed.json.account.version,
      password: 'Another-teacher-password-2026',
    })
    expect(reset.status).toBe(200)
    expect((await request(newTeacher, 'GET', '/api/school/config')).status).toBe(401)
    const audit = await env.db.all('SELECT detail FROM audit_log')
    expect(JSON.stringify(audit)).not.toContain(PASSWORD)
    expect(JSON.stringify(audit)).not.toContain('Another-teacher-password-2026')
  })
  it('拒绝跨站登录与更新，错误密码连续尝试会限流', async () => {
    const env = await owner(),
      acc = await create(env),
      visitor = browser(env)
    expect(
      (
        await request(
          visitor,
          'POST',
          '/api/school/login',
          { username: 'school01', password: PASSWORD },
          { origin: 'https://outside.test' },
        )
      ).status,
    ).toBe(403)
    expect(
      (
        await request(
          env,
          'PATCH',
          '/api/admin/school-accounts/' + acc.id,
          { version: acc.version, enabled: false },
          { origin: 'https://outside.test' },
        )
      ).status,
    ).toBe(403)
    for (let i = 0; i < 5; i++)
      expect((await signIn(visitor, 'school01', 'wrong-password')).status).toBe(401)
    expect((await signIn(visitor)).status).toBe(429)
  })
  it('并发修改只允许一个版本成功，失败操作不会部分停用或撤销会话', async () => {
    const env = await owner(),
      acc = await create(env),
      teacher = browser(env)
    await signIn(teacher)
    const results = await Promise.all([
      request(env, 'PATCH', '/api/admin/school-accounts/' + acc.id, {
        version: acc.version,
        schoolName: '学校甲',
      }),
      request(env, 'PATCH', '/api/admin/school-accounts/' + acc.id, {
        version: acc.version,
        schoolName: '学校乙',
      }),
    ])
    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect(
      (
        await request(env, 'PATCH', '/api/admin/school-accounts/' + acc.id, {
          version: acc.version,
          enabled: false,
          password: 'Stale-change-password-2026',
        })
      ).status,
    ).toBe(409)
    expect((await request(teacher, 'GET', '/api/school/config')).status).toBe(200)
  })
  it('HTML、静态 RSC 和编码的课程路径均经过真实服务端门禁，且不允许缓存', async () => {
    const env = await owner()
    await create(env)
    const teacher = browser(env)
    await signIn(teacher)
    for (const path of [
      '/edu/',
      '/edu/toolkits/',
      '/edu/toolkits/highschool-ai.txt',
      '/edu.html',
      '/edu%2Fprograms/',
      '/EDU/toolkits/',
      '/edu%5ctoolkits/',
      '/foo%2f..%2fedu%2ftoolkits/',
      '/edu.txt/',
    ]) {
      expect(schoolPath(new URL(path, TEST_ORIGIN).pathname)).toBe(true)
      let served = false
      const anonymous = await onRequest({
        request: new Request(new URL(path, TEST_ORIGIN)),
        env: env.env,
        next: async () => {
          served = true
          return new Response('private lesson')
        },
      })
      expect(anonymous.status).toBe(303)
      expect(anonymous.headers.get('location')).toMatch(/^\/school\/login\//)
      expect(served).toBe(false)
      const cookie = [...teacher.cookies].map(([k, v]) => `${k}=${v}`).join('; ')
      const allowed = await onRequest({
        request: new Request(new URL(path, TEST_ORIGIN), { headers: { cookie } }),
        env: env.env,
        next: async () =>
          new Response('private lesson', { headers: { 'content-type': 'text/html' } }),
      })
      expect(allowed.status).toBe(200)
      expect(allowed.headers.get('cache-control')).toContain('no-store')
      expect(allowed.headers.get('x-robots-tag')).toContain('noindex')
    }
  })
  it('学校专属模块不出现在公开配置、搜索、站点地图，学校登录后可使用并实时更新', async () => {
    const env = await owner()
    await create(env)
    const made = await request(env, 'POST', '/api/admin/modules', {
      title: '学校备课资料',
      description: '教师共享',
      kind: 'cards',
      audience: 'school',
      home: true,
      navigation: true,
      enabled: true,
      order: 90,
      blocks: [{ title: '校内备课模板', text: '学校专属测试资料' }],
    })
    expect(made.status).toBe(200)
    const moduleId = made.json.id
    const guest = browser(env),
      teacher = browser(env)
    const publicConfig = (await request(guest, 'GET', '/api/site')).json
    expect(
      publicConfig.modules.some((m: { id: string }) => m.id === moduleId || m.id === 'school'),
    ).toBe(false)
    expect(JSON.stringify(publicConfig)).not.toContain('学校专属测试资料')
    expect(searchDocs.some((d) => d.href.startsWith('/edu'))).toBe(false)
    expect(sitemap().some((d) => new URL(d.url).pathname.startsWith('/edu'))).toBe(false)
    expect(
      buildFreshnessReport({ includeSchool: false }).items.some((d) => d.href.startsWith('/edu')),
    ).toBe(false)
    await signIn(teacher)
    const schoolConfig = (await request(teacher, 'GET', '/api/school/config')).json
    expect(schoolConfig.modules.find((m: { id: string }) => m.id === moduleId).blocks[0].text).toBe(
      '学校专属测试资料',
    )
    expect(
      (
        await request(env, 'PATCH', '/api/admin/modules/' + moduleId, {
          version: made.json.version,
          enabled: false,
        })
      ).status,
    ).toBe(200)
    expect(
      (await request(teacher, 'GET', '/api/school/config')).json.modules.some(
        (m: { id: string }) => m.id === moduleId,
      ),
    ).toBe(false)
    await request(teacher, 'POST', '/api/school/logout')
    expect((await request(teacher, 'GET', '/api/school/config')).status).toBe(401)
  })
})
