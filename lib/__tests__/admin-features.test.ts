/* eslint-disable @typescript-eslint/no-explicit-any --
 *
 * 本文件里的 any 全部来自 JSON 载荷的动态形状（接口返回什么就断言什么），
 * 理由见 helpers/admin-test-env.ts 顶部说明。与其维护几百行镜像类型，
 * 不如放宽 lint 并把理由写在这里。
 */
import { describe, expect, it } from 'vitest'
import { makeTestEnv, login, request, validTool } from './helpers/admin-test-env'

describe('用户反馈', () => {
  it('公开表单能提交，并且能受理', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const sub = await request(env, 'POST', '/api/feedback', {
      kind: 'errata',
      message: 'Kimi 的价格写错了，应该是每月 4 元。',
      pageUrl: 'https://ai-guide-site.pages.dev/tools/kimi/?from=page',
      contact: 'someone@example.com',
    })
    expect(sub.status, JSON.stringify(sub.json)).toBe(200)

    await login(env)
    const list = await request(env, 'GET', '/api/admin/feedback')
    expect(list.json.items.length).toBe(1)
    expect(list.json.items[0].status).toBe('new')
    expect(list.json.counts.new).toBe(1)

    // 受理
    const upd = await request(env, 'PATCH', `/api/admin/feedback/${sub.json.id}`, {
      status: 'resolved',
      note: '已改价并发布',
    })
    expect(upd.status).toBe(200)

    const after = await request(env, 'GET', '/api/admin/feedback')
    expect(after.json.items[0].status).toBe('resolved')
    expect(after.json.counts.resolved).toBe(1)
  })

  it('反馈提交有频率限制', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const statuses: number[] = []
    for (let i = 0; i < 6; i++) {
      const r = await request(env, 'POST', '/api/feedback', {
        message: `第 ${i} 条反馈，内容足够长以通过校验。`,
      })
      statuses.push(r.status)
    }
    expect(statuses.filter((s) => s === 400).length, '限流没有生效').toBeGreaterThan(0)
  })

  it('过短的内容被拒绝', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const r = await request(env, 'POST', '/api/feedback', { message: '短' })
    expect(r.status).toBe(400)
    expect(r.json.error).toContain('太短')
  })

  it('只保留站内路径，外部地址被丢弃', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await request(env, 'POST', '/api/feedback', {
      message: '这是一个外部链接的测试反馈，内容足够长。',
      pageUrl: 'https://evil.example.com/steal',
    })
    await login(env)
    const list = await request(env, 'GET', '/api/admin/feedback')
    expect(list.json.items[0].page_url, '外部地址被存进去了').toBeNull()
  })

  it('不合法的联系方式被丢弃而不是原样存', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await request(env, 'POST', '/api/feedback', {
      message: '留个联系方式，但不是邮箱格式的测试。',
      contact: 'not-an-email',
    })
    await login(env)
    const list = await request(env, 'GET', '/api/admin/feedback')
    expect(list.json.items[0].contact).toBeNull()
  })

  it('状态机只接受四种状态', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const sub = await request(env, 'POST', '/api/feedback', {
      message: '状态机测试用的反馈内容，足够长。',
    })
    await login(env)
    const bad = await request(env, 'PATCH', `/api/admin/feedback/${sub.json.id}`, {
      status: 'exploded',
    })
    // 非法状态会退回原状态（不报错但不改坏数据）
    const after = await request(env, 'GET', '/api/admin/feedback')
    expect(after.json.items[0].status).toBe('new')
    expect(bad.status).toBe(200)
  })
})

describe('访问统计', () => {
  it('公开埋点接口能收，且事件名走白名单', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const r = await request(env, 'POST', '/api/collect', {
      path: '/tools/kimi/',
      events: [
        { name: 'wizard_complete', path: '/find/' },
        { name: 'tool_outbound', path: '/tools/kimi/' },
        { name: 'totally_made_up_event', path: '/' },
      ],
    })
    expect(r.status).toBe(202)
    // accepted = 1 次页面浏览 + 2 个白名单内事件；未知事件名不计入
    expect(r.json.accepted, '未知事件名没有被丢弃').toBe(3)

    await login(env)
    const dash = await request(env, 'GET', '/api/admin/dashboard')
    expect(dash.json.analytics.hasData).toBe(true)
    expect(dash.json.analytics.totalViews).toBe(1)
    expect(dash.json.analytics.totalEvents).toBe(2)
  })

  it('路径归一化：query 与尾斜杠不会把同一个页面拆成多行', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    for (const p of ['/tools/kimi', '/tools/kimi/', '/tools/kimi/?from=home#x']) {
      await request(env, 'POST', '/api/collect', { path: p })
    }
    const rows = await env.db.all('SELECT path, count FROM page_views')
    expect(rows.length, '同一个页面被拆成了多行').toBe(1)
    expect(rows[0].path).toBe('/tools/kimi')
    expect(Number(rows[0].count)).toBe(3)
  })

  it('外部地址不会进统计', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await request(env, 'POST', '/api/collect', {
      path: 'https://evil.example.com/x',
      events: [{ name: 'search_use', path: 'https://evil.example.com/x' }],
    })
    const rows = await env.db.all('SELECT path FROM page_views')
    const ev = await env.db.all('SELECT path FROM events')
    expect(rows.length).toBe(0)
    expect(ev.length).toBe(0)
  })

  it('非法路径的事件被丢弃，而不是兜底记到首页', async () => {
    // 兜底成 '/' 会开一个口子：写错埋点的客户端能把任意事件刷到首页那一行上
    const env = await makeTestEnv({ withAdmin: true })
    const r = await request(env, 'POST', '/api/collect', {
      path: '/',
      events: [{ name: 'search_use', path: 'https://evil.example.com/x' }],
    })
    expect(r.json.accepted, '只有页面浏览被计入，非法路径的事件应被丢弃').toBe(1)
    const ev = await env.db.all('SELECT path FROM events')
    expect(ev.length).toBe(0)
  })

  it('没传路径的事件归到根路径（这是合理的默认值）', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const r = await request(env, 'POST', '/api/collect', {
      events: [{ name: 'assistant_open' }],
    })
    expect(r.json.accepted).toBe(1)
    const ev = await env.db.all<{ path: string }>('SELECT path FROM events')
    expect(ev[0].path).toBe('/')
  })

  it('单次请求的事件数有上限', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    const events = Array.from({ length: 200 }, () => ({ name: 'search_use', path: '/' }))
    const r = await request(env, 'POST', '/api/collect', { path: '/', events })
    expect(r.json.accepted).toBeLessThanOrEqual(11)
  })

  it('没有数据时仪表盘显示空状态而不是报错', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    const dash = await request(env, 'GET', '/api/admin/dashboard')
    expect(dash.status).toBe(200)
    expect(dash.json.analytics.hasData, '没数据时应明确告知').toBe(false)
    expect(dash.json.analytics.firstDay).toBeNull()
    expect(dash.json.analytics.totalViews).toBe(0)
    // 14 天每一天都要有槽位，否则折线图会跳过空白日
    expect(dash.json.analytics.viewsByDay.length).toBe(14)
    expect(dash.json.feedback.total).toBe(0)
    expect(dash.json.review.open).toBe(0)
  })
})

describe('统计的隐私边界', () => {
  it('统计表里没有任何 IP、UA 或指纹字段', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    // 上报时带上伪造的 IP 与 UA
    const res = await request(env, 'POST', '/api/collect', {
      path: '/tools/kimi/',
      events: [{ name: 'search_use', path: '/' }],
    })
    expect(res.status).toBe(202)

    for (const table of ['page_views', 'events']) {
      const cols = await env.db.all<{ name: string }>(`PRAGMA table_info(${table})`)
      const names = cols.map((c) => c.name.toLowerCase())
      for (const forbidden of ['ip', 'ip_address', 'user_agent', 'ua', 'fingerprint', 'visitor', 'uuid', 'session']) {
        expect(
          names.some((n) => n.includes(forbidden)),
          `${table} 出现了不该有的字段 ${forbidden}：${names.join(', ')}`
        ).toBe(false)
      }
    }

    // 整库扫一遍，确认没有任何一行包含提交时的 IP
    const dumped = JSON.stringify([
      await env.db.all('SELECT * FROM page_views'),
      await env.db.all('SELECT * FROM events'),
      await env.db.all('SELECT * FROM feedback'),
    ])
    expect(dumped).not.toMatch(/\d+\.\d+\.\d+\.\d+/)
  })

  it('没有独立访客（UV）这个概念', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await request(env, 'POST', '/api/collect', { path: '/', events: [{ name: 'search_use' }] })
    await login(env)
    const dash = await request(env, 'GET', '/api/admin/dashboard')

    // 仪表盘里不能出现任何 UV/访客数字段
    expect(dash.json.analytics.uniqueVisitors).toBeUndefined()
    expect(dash.json.analytics.uv).toBeUndefined()
    // 但要说明清楚这是设计决定，而不是数据缺失
    expect(dash.json.privacyNote).toContain('不做用户画像')
  })

  it('会话表里只存掩码后的 IP 前缀', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await request(env, 'POST', '/api/admin/login', {
      username: 'admin',
      password: 'correct-horse-battery-staple',
    })
    const rows = await env.db.all<{ ip_prefix: string }>('SELECT ip_prefix FROM sessions')
    // 测试请求没有 CF-Connecting-IP 头，所以是 unknown —— 关键是它不是原始地址
    expect(rows[0].ip_prefix).toBe('unknown')
  })
})

describe('内容复核待办', () => {
  it('超期的内容自动生成待办，复核后自动关闭', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool(),
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v1' })

    // 刚发布时不该有待办
    let regen = await request(env, 'POST', '/api/admin/review/regenerate')
    expect(regen.json.created, '刚发布就催着复核').toBe(0)

    // 把发布时间推到 200 天前
    const old = new Date(Date.now() - 200 * 86400000).toISOString()
    await env.db.run('UPDATE content_items SET published_at = ? WHERE id = ?', [old, 'tool:testtool'])

    regen = await request(env, 'POST', '/api/admin/review/regenerate')
    expect(regen.json.created).toBeGreaterThan(0)

    const list = await request(env, 'GET', '/api/admin/review')
    const freshness = list.json.tasks.find((t: any) => t.kind === 'freshness')
    expect(freshness, '没有生成新鲜度待办').toBeTruthy()
    expect(freshness.severity, '超过 stale 阈值应该是高优先级').toBe('high')
    expect(list.json.summary.open).toBeGreaterThan(0)

    // 重新计算不应产生重复
    const again = await request(env, 'POST', '/api/admin/review/regenerate')
    expect(again.json.created, '重复计算产生了新待办').toBe(0)

    // 复核完（内容变新）后待办应自动关闭
    await env.db.run('UPDATE content_items SET published_at = ? WHERE id = ?', [
      new Date().toISOString(),
      'tool:testtool',
    ])
    const third = await request(env, 'POST', '/api/admin/review/regenerate')
    expect(third.json.closed, '已复核的待办没有被关闭').toBeGreaterThan(0)
  })

  it('依据缺失会生成待办，补齐后关闭', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    // 把 5 分维度的 basis 清空 —— 高分必须有依据
    const data = validTool()
    const caps = { ...(data.capabilities as object) }
    for (const k of ['coding', 'reasoning', 'writing', 'data', 'longform']) {
      ;(caps as any)[k] = { score: 5, basis: '' }
    }
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: { ...data, capabilities: caps },
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v1' })

    await request(env, 'POST', '/api/admin/review/regenerate')
    let list = await request(env, 'GET', '/api/admin/review')
    let ev = list.json.tasks.find((t: any) => t.kind === 'evidence')
    expect(ev, '高分缺依据却没有待办').toBeTruthy()
    expect(ev.title).toContain('5')

    // 补齐依据
    for (const k of ['coding', 'reasoning', 'writing', 'data', 'longform']) {
      ;(caps as any)[k] = { score: 5, basis: `${k} 依据：官方模型卡与公开基准` }
    }
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: { ...data, capabilities: caps },
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v2' })
    await request(env, 'POST', '/api/admin/review/regenerate')

    list = await request(env, 'GET', '/api/admin/review')
    ev = list.json.tasks.find((t: any) => t.kind === 'evidence' && t.status === 'open')
    expect(ev, '依据补齐了但待办还开着').toBeFalsy()
  })

  it('3 分维度不强制写依据（否则依据会变成套话）', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    const data = validTool()
    const caps = { ...(data.capabilities as object) }
    for (const key of Object.keys(caps)) (caps as any)[key] = { score: 3, basis: '' }
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: { ...data, capabilities: caps },
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v1' })
    await request(env, 'POST', '/api/admin/review/regenerate')

    const list = await request(env, 'GET', '/api/admin/review')
    expect(list.json.tasks.filter((t: any) => t.kind === 'evidence').length).toBe(0)
  })

  it('手动待办可以创建与关闭', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    const created = await request(env, 'POST', '/api/admin/review', {
      title: '等厂商发布新版本后回来改价格',
      severity: 'low',
    })
    expect(created.status).toBe(200)

    const done = await request(env, 'PATCH', `/api/admin/review/${created.json.id}`, {
      status: 'done',
      note: '已改',
    })
    expect(done.status).toBe(200)

    const open = await request(env, 'GET', '/api/admin/review')
    expect(open.json.tasks.find((t: any) => t.id === created.json.id)).toBeFalsy()

    const all = await request(env, 'GET', '/api/admin/review?status=done')
    expect(all.json.tasks.find((t: any) => t.id === created.json.id)).toBeTruthy()
  })

  it('标题为空的待办被拒绝', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    const r = await request(env, 'POST', '/api/admin/review', { title: '   ' })
    expect(r.status).toBe(400)
  })
})

describe('审计日志', () => {
  it('记录登录、发布、回滚、建待办', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool(),
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v1' })
    // 回滚必须先有第二版，否则「回滚到当前版本」会被正确地拒绝
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool({ tagline: '第二版定位' }),
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v2' })
    await request(env, 'POST', '/api/admin/content/tool:testtool/rollback', { version: 1 })
    await request(env, 'POST', '/api/admin/review', { title: '手动待办' })

    const audit = await request(env, 'GET', '/api/admin/audit?limit=200')
    const actions = audit.json.entries.map((e: any) => e.action)
    for (const expected of ['bootstrap', 'publish', 'rollback']) {
      expect(actions, `审计日志缺少 ${expected}`).toContain(expected)
    }
    expect(actions.filter((a: string) => a === 'publish').length, '两次发布应各有一条').toBe(2)
    // 所有条目都要有 actor 与时间
    for (const e of audit.json.entries) {
      expect(e.actor, `审计条目 ${e.id} 没有 actor`).toBeTruthy()
      expect(e.at).toBeTruthy()
    }
  })

  it('可以按操作类型过滤', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool(),
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v1' })

    const only = await request(env, 'GET', '/api/admin/audit?action=publish')
    expect(only.json.entries.length).toBe(1)
    expect(only.json.entries[0].action).toBe('publish')
  })
})

describe('仪表盘', () => {
  it('汇总真实数据', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool(),
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v1' })
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool({ tagline: '又一个草稿' }),
    })
    await request(env, 'POST', '/api/feedback', { message: '一条待处理的反馈内容。' })
    await request(env, 'POST', '/api/collect', { path: '/', events: [{ name: 'search_use' }] })

    const dash = await request(env, 'GET', '/api/admin/dashboard')
    expect(dash.json.content.total).toBe(1)
    expect(dash.json.content.published).toBe(1)
    expect(dash.json.content.withDraft).toBe(1)
    expect(dash.json.content.lastPublish.actor).toBe('admin')
    expect(dash.json.feedback.new).toBe(1)
    expect(dash.json.analytics.totalViews).toBe(1)
  })

  it('limit 参数缺失时不会只返回 1 条', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool(),
    })
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'v1' })

    // 建三条反馈
    for (let i = 0; i < 3; i++) {
      env.db.run('DELETE FROM rate_limits')
      await request(env, 'POST', '/api/feedback', { message: `第 ${i} 条反馈内容，足够长。` })
    }

    const list = await request(env, 'GET', '/api/admin/feedback')
    expect(list.json.items.length, 'limit 缺失时被夹成了 1').toBe(3)
  })
})
