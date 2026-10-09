import { describe, expect, it } from 'vitest'
import { DEFAULT_LAYOUT, homeCandidates, orderedIds } from '@/lib/site-layout'
import { DEFAULT_SITE_CONFIG } from '@/lib/site-modules'
import { siteNavigation } from '@/lib/site-navigation'
import { login, makeTestEnv, request } from './helpers/admin-test-env'

describe('DIY 导航与首页布局', () => {
  it('默认导航符合站主指定顺序，首页可以移动，学校专区仍可另行启用', () => {
    expect(siteNavigation(DEFAULT_SITE_CONFIG).map((item) => item.label)).toEqual([
      '首页',
      '教程',
      '案例',
      '工具库',
      '知识库',
      'AI 资讯',
    ])
    const changed = {
      ...DEFAULT_SITE_CONFIG,
      layout: {
        ...DEFAULT_LAYOUT,
        navigation: ['tools', 'home', 'news'],
        hiddenNavigation: DEFAULT_LAYOUT.hiddenNavigation.filter((id) => id !== 'school'),
      },
    }
    expect(
      siteNavigation(changed)
        .map((item) => item.label)
        .slice(0, 3),
    ).toEqual(['工具库', '首页', 'AI 资讯'])
    expect(siteNavigation(changed).some((item) => item.href === '/edu')).toBe(true)
  })
  it('旧站点补上布局存储，既有开关、模块与密钥配置不被覆盖', async () => {
    const env = await makeTestEnv()
    await request(env, 'GET', '/api/site')
    await env.db.run(
      "UPDATE site_modules SET data=json_set(data,'$.enabled',json('false'),'$.version',99) WHERE id='school'",
    )
    await env.db.run('UPDATE site_features SET data=? WHERE id=1', [
      JSON.stringify({ assistant: false, onboarding: false }),
    ])
    await env.db.exec('DROP TABLE site_layout')
    const fresh = await request(env, 'GET', '/api/site')
    expect(fresh.status).toBe(200)
    expect(fresh.json.layout.navigation).toEqual(DEFAULT_LAYOUT.navigation)
    expect(fresh.json.features).toEqual({ assistant: false, onboarding: false })
    expect(
      fresh.json.modules.find((module: { id: string }) => module.id === 'school').version,
    ).toBe(99)
    expect(
      fresh.json.modules.find((module: { id: string }) => module.id === 'school').enabled,
    ).toBe(false)
  })
  it('布局编辑需要管理员与同源请求，不改变栏目是否公开', async () => {
    const env = await makeTestEnv()
    expect(
      (
        await request(env, 'PATCH', '/api/admin/layout', {
          version: 1,
          navigation: ['tools', 'home'],
        })
      ).status,
    ).toBe(401)
    await login(env)
    expect(
      (
        await request(
          env,
          'PATCH',
          '/api/admin/layout',
          { version: 1, navigation: ['tools', 'home'] },
          { origin: 'https://evil.test' },
        )
      ).status,
    ).toBe(403)
    const response = await request(env, 'PATCH', '/api/admin/layout', {
      version: 1,
      navigation: ['tools', 'home', 'guides'],
      home: ['news', 'hero', 'metrics'],
      hiddenHome: ['tools'],
    })
    expect(response.status).toBe(200)
    env.cookies.clear()
    const live = (await request(env, 'GET', '/api/site')).json
    expect(siteNavigation(live)[0].href).toBe('/tools')
    expect(live.layout.home.slice(0, 2)).toEqual(['news', 'hero'])
    expect(live.layout.hiddenHome).toEqual(['tools'])
    expect(live.modules.find((module: { id: string }) => module.id === 'tools').enabled).toBe(true)
    expect(live.layout.version).toBe(2)
    expect(live.features).toEqual({ assistant: true, onboarding: true })
  })
  it('拒绝无效 ID、重复、错误字段和隐藏首页，失败不部分保存', async () => {
    const env = await makeTestEnv()
    await login(env)
    for (const patch of [
      { navigation: ['home', 'home'] },
      { home: ['missing'] },
      { navigation: 'home' },
      { hiddenNavigation: ['home'] },
      { hiddenHome: ['missing'] },
      { script: '<script>' },
      { navigation: [null] },
    ])
      expect(
        (await request(env, 'PATCH', '/api/admin/layout', { version: 1, ...patch })).status,
      ).toBe(400)
    const unchanged = (await request(env, 'GET', '/api/admin/modules')).json
    expect(unchanged.layout.version).toBe(1)
    expect(unchanged.layout.navigation).toEqual(DEFAULT_LAYOUT.navigation)
  })
  it('两个编辑页面不会相互覆盖布局，导航与首页可以独立调整', async () => {
    const env = await makeTestEnv()
    await login(env)
    await request(env, 'GET', '/api/admin/modules')
    const results = await Promise.all([
      request(env, 'PATCH', '/api/admin/layout', { version: 1, navigation: ['news', 'home'] }),
      request(env, 'PATCH', '/api/admin/layout', { version: 1, navigation: ['tools', 'home'] }),
    ])
    expect(results.map((result) => result.status).sort()).toEqual([200, 409])
    const winner = results.find((result) => result.status === 200)!.json.layout
    const homeChange = await request(env, 'PATCH', '/api/admin/layout', {
      version: 2,
      home: ['tools', 'metrics'],
    })
    expect(homeChange.status).toBe(200)
    expect(homeChange.json.layout.navigation).toEqual(winner.navigation)
    expect(homeChange.json.layout.home).toEqual(['tools', 'metrics'])
  })
  it('新模块进入可排序区域，草稿 ID 不泄露，归档后移除而不损坏其他顺序', async () => {
    const env = await makeTestEnv()
    await login(env)
    const created = await request(env, 'POST', '/api/admin/modules', {
      title: '布局测试模块',
      description: '测试',
      kind: 'cards',
      enabled: false,
      home: true,
      navigation: true,
      blocks: [{ title: '第一项', text: '测试内容' }],
    })
    const id = created.json.id
    const ordered = await request(env, 'PATCH', '/api/admin/layout', {
      version: 1,
      navigation: [id, 'home'],
      home: [id, 'hero'],
    })
    expect(ordered.status).toBe(200)
    env.cookies.clear()
    expect(JSON.stringify((await request(env, 'GET', '/api/site')).json)).not.toContain(id)
    await login(env)
    await request(env, 'PATCH', `/api/admin/modules/${id}`, { version: 1, enabled: true })
    env.cookies.clear()
    const live = (await request(env, 'GET', '/api/site')).json
    expect(siteNavigation(live)[0].label).toBe('布局测试模块')
    expect(orderedIds(live.layout.home, homeCandidates(live.modules))[0]).toBe(id)
    await login(env)
    await request(env, 'DELETE', `/api/admin/modules/${id}`)
    expect((await request(env, 'GET', '/api/site')).json.layout.home).toEqual(['hero'])
  })
  it('动态模块默认追加，未知和重复排序项不会丢失可用内容', () => {
    expect(
      orderedIds(['news', 'missing', 'news'], [{ id: 'hero' }, { id: 'news' }, { id: 'new' }]),
    ).toEqual(['news', 'hero', 'new'])
  })
})
