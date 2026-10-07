import { describe, expect, it } from 'vitest'
import {
  ADMIN_PASSWORD,
  login,
  makeTestEnv,
  request,
  validTool,
} from './helpers/admin-test-env'
import {
  fromBase64Url,
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  timingSafeEqual,
  toBase64Url,
  verifyPassword,
} from '@/lib/admin/crypto'
import { maskIp, parseCookies, buildSessionCookie } from '@/lib/admin/auth'

describe('密码与令牌原语', () => {
  it('同一密码两次哈希的盐不同，结果也不同', async () => {
    const a = await hashPassword('same-password')
    const b = await hashPassword('same-password')
    expect(a.salt).not.toBe(b.salt)
    expect(a.hash).not.toBe(b.hash)
    // 但都能验证通过
    expect(await verifyPassword('same-password', a)).toBe(true)
    expect(await verifyPassword('same-password', b)).toBe(true)
  })

  it('错误密码验证失败', async () => {
    const rec = await hashPassword('right-password')
    expect(await verifyPassword('wrong-password', rec)).toBe(false)
  })

  it('用户不存在时也走一遍 PBKDF2（防用户名枚举的时间侧信道）', async () => {
    const rec = await hashPassword('x')
    const withUser = performance.now()
    await verifyPassword('y', rec)
    const spentOnReal = performance.now() - withUser

    const withoutUserStart = performance.now()
    await verifyPassword('y', null)
    const spentOnFake = performance.now() - withoutUserStart

    // 允许 3 倍余量：计时噪声大，但「完全不计算」会差两个数量级
    expect(
      spentOnFake,
      `不存在账号时耗时 ${spentOnFake.toFixed(0)}ms，存在时 ${spentOnReal.toFixed(0)}ms —— 差太多说明能被用来枚举账号`
    ).toBeLessThan(Math.max(spentOnReal * 3, 60))
  })

  it('恒定时间比较对长度与内容都敏感', () => {
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 3]))).toBe(true)
    expect(timingSafeEqual(new Uint8Array([1, 2, 3]), new Uint8Array([1, 2, 4]))).toBe(false)
    expect(timingSafeEqual(new Uint8Array([1, 2]), new Uint8Array([1, 2, 3]))).toBe(false)
  })

  it('base64url 能往返各种字节', () => {
    for (const bytes of [new Uint8Array([]), new Uint8Array([0]), new Uint8Array([255, 254, 253]), new Uint8Array(32).fill(7)]) {
      expect([...fromBase64Url(toBase64Url(bytes))]).toEqual([...bytes])
    }
    // base64url 不含 + / =
    expect(toBase64Url(new Uint8Array([255, 255, 255]))).not.toMatch(/[+/=]/)
  })

  it('会话令牌每次都不同，且哈希与原文不同', async () => {
    const a = generateSessionToken()
    const b = generateSessionToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(await hashSessionToken(a)).not.toBe(a)
    expect(await hashSessionToken(a)).toBe(await hashSessionToken(a))
  })
})

describe('IP 掩码与 Cookie', () => {
  it('IPv4 只保留 /24 前缀，末段归零', () => {
    // /24 的网络地址末段必须是 0，写成 203.0.113.45/24 会让人误以为还保留着主机位
    expect(maskIp('203.0.113.45')).toBe('203.0.113.0/24')
    expect(maskIp('198.51.100.7')).toBe('198.51.100.0/24')
    expect(maskIp('192.168.1.255')).toBe('192.168.1.0/24')
  })

  it('不同地址得到不同掩码', () => {
    expect(maskIp('203.0.113.45')).not.toBe(maskIp('203.0.114.45'))
  })

  it('IPv6 取 /48', () => {
    expect(maskIp('2001:db8:1234:5678::1')).toContain('/48')
  })

  it('无法解析的输入一律 unknown，不把原文写进库', () => {
    expect(maskIp('')).toBe('unknown')
    expect(maskIp('garbage')).toBe('unknown')
    // 段值超过 255：不是合法 IPv4，不该被当成合法地址写进库
    expect(maskIp('999.999.999.999')).toBe('unknown')
    expect(maskIp('1.2.3')).toBe('unknown')
  })

  it('Cookie 解析处理多个键与空值', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' })
    expect(parseCookies('')).toEqual({})
    expect(parseCookies(null)).toEqual({})
    expect(parseCookies('token=abc%3Ddef')).toEqual({ token: 'abc=def' })
  })

  it('非 localhost 时必须带 Secure', () => {
    expect(buildSessionCookie('t', { secure: true })).toMatch(/Secure/)
    expect(buildSessionCookie('t', { secure: false })).not.toMatch(/Secure/)
  })
})

describe('登录限流', () => {
  it('连续失败到阈值后锁定，锁定期内即使密码正确也进不去', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    env.cookies.clear()

    const results: number[] = []
    for (let i = 0; i < 5; i++) {
      const r = await login(env, 'admin', `wrong-${i}`)
      results.push(r.status)
    }
    expect(results.slice(0, 4), '前几次应当是 401').toEqual([401, 401, 401, 401])
    expect(results[4], '达到阈值那次应当被锁').toBe(429)

    // 锁定期间用正确密码也进不去
    const correct = await login(env, 'admin', ADMIN_PASSWORD)
    expect(correct.status, '锁定期间正确密码被放行了').toBe(429)
  })

  it('登录成功后清空失败计数', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    env.cookies.clear()
    for (let i = 0; i < 3; i++) await login(env, 'admin', `wrong-${i}`)

    const ok = await login(env, 'admin', ADMIN_PASSWORD)
    expect(ok.status).toBe(200)

    const attempts = await env.db.all('SELECT COUNT(*) AS n FROM login_attempts')
    expect(Number(attempts[0].n)).toBe(0)
  })

  it('限流表里不出现原始 IP', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    env.cookies.clear()
    await login(env, 'admin', 'wrong')
    const rows = await env.db.all<Record<string, unknown>>('SELECT * FROM login_attempts')
    const dumped = JSON.stringify(rows)
    expect(dumped).not.toMatch(/\d+\.\d+\.\d+\.\d+/)
  })
})

describe('改密码', () => {
  it('改完密码后其他会话失效，当前会话仍可用', async () => {
    const env = await makeTestEnv({ withAdmin: true })

    // 同一套数据库开两个会话（两个 TestEnv 会各自建库，所以这里手动换 Cookie）
    await login(env)
    const tokenA = env.cookies.get('admin_session')!
    await request(env, 'POST', '/api/admin/logout')

    await login(env)
    const tokenB = env.cookies.get('admin_session')!
    expect(tokenA).not.toBe(tokenB)

    // 当前是 B 会话
    expect((await request(env, 'GET', '/api/admin/dashboard')).status).toBe(200)

    const changed = await request(env, 'POST', '/api/admin/password', {
      oldPassword: ADMIN_PASSWORD,
      newPassword: 'a-brand-new-long-password',
    })
    expect(changed.status, JSON.stringify(changed.json)).toBe(200)

    // B（当前会话）还能用
    expect((await request(env, 'GET', '/api/admin/dashboard')).status).toBe(200)

    // A 被踢掉
    env.cookies.set('admin_session', tokenA)
    expect((await request(env, 'GET', '/api/admin/dashboard')).status, '改密码后旧会话仍然有效').toBe(401)
  })

  it('旧密码错误时拒绝，且需要 12 位以上', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)

    const wrongOld = await request(env, 'POST', '/api/admin/password', {
      oldPassword: 'not-it',
      newPassword: 'a-brand-new-long-password',
    })
    expect(wrongOld.status).toBe(400)

    const tooShort = await request(env, 'POST', '/api/admin/password', {
      oldPassword: ADMIN_PASSWORD,
      newPassword: 'short',
    })
    expect(tooShort.status).toBe(400)
    expect(tooShort.json.error).toContain('12')
  })
})

describe('初始管理员 bootstrap', () => {
  it('没配 ADMIN_PASSWORD 时不会凭空造出管理员', async () => {
    const env = await makeTestEnv({ adminPassword: null })
    const res = await login(env, 'admin', ADMIN_PASSWORD)
    expect(res.status).toBe(401)
    const admins = await env.db.all('SELECT username FROM admins')
    expect(admins.length).toBe(0)
  })

  it('ADMIN_PASSWORD 只在 admins 表为空时生效一次，之后不再被读取', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    // withAdmin 造完环境会清掉 Cookie（避免污染后续用例），所以这里重新登录
    expect((await login(env)).status).toBe(200)
    expect((await request(env, 'GET', '/api/admin/dashboard')).status).toBe(200)

    // 已有账号后再改 secret：
    //  · 旧密码仍然有效（这是对的 —— secret 只用于建号，不该覆盖已存密码）
    //  · 但 secret 的**新值**绝不能变成可用的密码
    env.env.ADMIN_PASSWORD = 'a-completely-different-password'
    env.cookies.clear()

    const withStored = await login(env, 'admin', ADMIN_PASSWORD)
    expect(withStored.status, '已有账号的密码不该被 secret 改动影响').toBe(200)

    env.cookies.clear()
    const withSecretValue = await login(env, 'admin', 'a-completely-different-password')
    expect(withSecretValue.status, 'secret 在已有账号后变成了密码 —— 这是严重漏洞').toBe(401)

    // 账号数量没有因为 secret 改变而增加
    const admins = await env.db.all('SELECT username FROM admins')
    expect(admins.length).toBe(1)
  })

  it('多出一个空 admins 表时不会重复建号', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    env.cookies.clear()
    await login(env, 'admin', ADMIN_PASSWORD)
    await login(env, 'admin', ADMIN_PASSWORD)
    const admins = await env.db.all('SELECT username FROM admins')
    expect(admins.length).toBe(1)
  })
})

describe('内容校验在写入口生效', () => {
  it('不合法的内容在保存阶段就被挡下', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)

    // 复制一份能力维度再改，避免直接改到 validTool() 内部的共享对象
    const capsOf = (over: (c: Record<string, unknown>) => void = () => {}) => {
      const c: Record<string, unknown> = { ...(validTool().capabilities as object) }
      over(c)
      return c
    }

    const cases: [string, unknown][] = [
      ['缺少 id', { ...validTool(), id: undefined }],
      ['id 与条目不一致', { ...validTool(), id: 'other' }],
      ['强项不足 3 条', { ...validTool(), strengths: ['只有一条'] }],
      ['弱项不足 3 条', { ...validTool(), weaknesses: ['只有一条'] }],
      ['能力维度缺失', { ...validTool(), capabilities: capsOf((c) => delete c.coding) }],
      ['能力维度多出未知项', {
        ...validTool(),
        capabilities: capsOf((c) => { c.unknownDim = { score: 3, basis: 'x' } }),
      }],
      ['分数越界', {
        ...validTool(),
        capabilities: capsOf((c) => { c.coding = { score: 9, basis: 'x' } }),
      }],
      ['把自己列为替代品', { ...validTool(), alternatives: ['testtool'] }],
      ['替代品重复', { ...validTool(), alternatives: ['a', 'a'] }],
      ['chinaAccessible 非布尔', { ...validTool(), chinaAccessible: 'yes' }],
      ['定价模式非法', { ...validTool(), pricing: { model: 'magic', freeTier: 'x' } }],
    ]

    for (const [label, data] of cases) {
      const res = await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
        kind: 'tool',
        slug: 'testtool',
        data,
      })
      expect(res.status, `${label} 竟然通过了校验`).toBe(422)
      expect(Array.isArray(res.json.issues), `${label} 没有返回字段级问题`).toBe(true)
      expect(res.json.issues.length).toBeGreaterThan(0)
    }
  })
})
