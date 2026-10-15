import { describe, expect, it } from 'vitest'
import { login, makeTestEnv, request, validTool } from './helpers/admin-test-env'

const region = (id = 'extra') => ({
  id,
  title: '工作提示',
  description: '操作前阅读',
  kind: 'cards',
  enabled: true,
  blocks: [
    { id: 'card-1', title: '整理材料', text: '先准备原始资料。', href: '/guides', enabled: true },
  ],
})

describe('页面区块保存、权限与公开投影', () => {
  it('升级已有站点时补齐首页编辑配置，保留原模块与功能开关', async () => {
    const env = await makeTestEnv()
    await request(env, 'GET', '/api/site')
    await env.db.run("DELETE FROM site_modules WHERE id='home'")
    await env.db.run('UPDATE site_features SET data=? WHERE id=1', [
      JSON.stringify({ assistant: false, onboarding: false }),
    ])
    const config = await request(env, 'GET', '/api/site')
    expect(config.json.modules.find((m: { id: string }) => m.id === 'home').enabled).toBe(true)
    expect(config.json.features.assistant).toBe(false)
    expect(
      (await request(env, 'PATCH', '/api/admin/modules/home', { version: 1, regions: [region()] }))
        .status,
    ).toBe(401)
  })
  it('支持区块与子内容的增改、排序、隐藏和删除，隐藏正文不对外返回', async () => {
    const env = await makeTestEnv()
    await login(env)
    const hidden = { ...region('secret'), title: '私有草稿区块', enabled: false }
    const notes = {
      ...region('notes'),
      kind: 'native',
      blocks: [
        { id: 'second', title: '第二项', text: '已调整顺序', enabled: true },
        { id: 'hidden', title: '隐藏小内容', text: '管理员内部文字', enabled: false },
      ],
    }
    const saved = await request(env, 'PATCH', '/api/admin/modules/tools', {
      version: 1,
      regions: [notes, region(), hidden],
    })
    expect(saved.status).toBe(200)
    const privateConfig = await request(env, 'GET', '/api/admin/modules')
    expect(JSON.stringify(privateConfig.json)).toContain('管理员内部文字')
    const publicConfig = await request(env, 'GET', '/api/site')
    const page = publicConfig.json.modules.find((m: { id: string }) => m.id === 'tools')
    expect(page.regions.map((r: { id: string }) => r.id)).toEqual(['notes', 'extra'])
    expect(page.regions[0].blocks.map((b: { id: string }) => b.id)).toEqual(['second'])
    expect(JSON.stringify(publicConfig.json)).not.toMatch(/私有草稿区块|管理员内部文字|隐藏小内容/)
    const next = await request(env, 'PATCH', '/api/admin/modules/tools', {
      version: 2,
      regions: [region(), { ...notes, deleted: true, enabled: false }],
    })
    expect(next.status).toBe(200)
    const deleted = (await request(env, 'GET', '/api/site')).json.modules.find(
      (m: { id: string }) => m.id === 'tools',
    ).regions
    expect(deleted[1]).toMatchObject({ id: 'notes', kind: 'native', enabled: false, deleted: true })
    expect(deleted[1].blocks).toBeUndefined()
    expect(
      (
        await request(env, 'PATCH', '/api/admin/modules/tools', {
          version: 3,
          regions: [region(), notes],
        })
      ).status,
    ).toBe(200)
  })
  it('关闭栏目不泄露内部区块；学校内容不进入公开配置', async () => {
    const env = await makeTestEnv()
    await login(env)
    await request(env, 'PATCH', '/api/admin/modules/tools', {
      version: 1,
      enabled: false,
      regions: [{ ...region(), title: '停止公开的说明' }],
    })
    await request(env, 'PATCH', '/api/admin/modules/school', {
      version: 1,
      regions: [{ ...region(), title: '教师内部卡片' }],
    })
    const json = (await request(env, 'GET', '/api/site')).json
    expect(JSON.stringify(json)).not.toMatch(/停止公开的说明|教师内部卡片/)
    env.cookies.clear()
    expect((await request(env, 'GET', '/api/school/config')).status).toBe(401)
  })
  it('拒绝危险链接、重复标识、伪造内置区块和破坏功能区，错误不会写入配置', async () => {
    const env = await makeTestEnv()
    await login(env)
    const broken = [
      [region(), region()],
      [{ ...region(), blocks: [...region().blocks, ...region().blocks] }],
      [{ ...region(), blocks: [{ ...region().blocks[0], href: 'javascript:alert(1)' }] }],
      [{ ...region('unknown-native'), kind: 'native' }],
      [{ ...region('library'), kind: 'native' }],
      [{ ...region('library') }],
      [{ ...region(), enabled: 'yes' }],
    ]
    for (const regions of broken)
      expect(
        (await request(env, 'PATCH', '/api/admin/modules/tools', { version: 1, regions })).status,
      ).toBe(400)
    expect(
      (await request(env, 'GET', '/api/site')).json.modules.find(
        (m: { id: string }) => m.id === 'tools',
      ).version,
    ).toBe(1)
  })
  it('并发修改与跨站写入被拒绝；首页不能被关闭', async () => {
    const env = await makeTestEnv()
    await login(env)
    expect(
      (
        await request(
          env,
          'PATCH',
          '/api/admin/modules/tools',
          { version: 1, regions: [region()] },
          { origin: 'https://evil.test' },
        )
      ).status,
    ).toBe(403)
    expect(
      (await request(env, 'PATCH', '/api/admin/modules/tools', { version: 1, regions: [region()] }))
        .status,
    ).toBe(200)
    expect(
      (await request(env, 'PATCH', '/api/admin/modules/tools', { version: 1, regions: [] })).status,
    ).toBe(409)
    expect(
      (await request(env, 'PATCH', '/api/admin/modules/home', { version: 1, enabled: false }))
        .status,
    ).toBe(400)
  })
})

describe('仅管理员可见的复核状态', () => {
  it('未登录不可读取，状态按人工发布的复核日期计算，草稿不计入', async () => {
    const env = await makeTestEnv()
    expect((await request(env, 'GET', '/api/admin/review')).status).toBe(401)
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool(),
    })
    expect((await request(env, 'GET', '/api/admin/review')).json.overview.total).toBe(0)
    await request(env, 'POST', '/api/admin/content/tool:testtool/publish', {
      changeNote: '人工复核',
    })
    expect((await request(env, 'GET', '/api/admin/review')).json.overview).toMatchObject({
      total: 1,
      fresh: 1,
      stale: 0,
    })
    const old = new Date(Date.now() - 200 * 86400000).toISOString()
    await env.db.run('UPDATE content_items SET published_at=? WHERE id=?', [old, 'tool:testtool'])
    const state = await request(env, 'GET', '/api/admin/review')
    expect(state.json.overview).toMatchObject({ total: 1, fresh: 0, aging: 0, stale: 1 })
    expect(state.json.overview.items[0]).toMatchObject({
      id: 'tool:testtool',
      status: 'stale',
      updatedAt: old,
    })
    expect(state.headers.get('cache-control')).toBe('no-store')
  })
})
