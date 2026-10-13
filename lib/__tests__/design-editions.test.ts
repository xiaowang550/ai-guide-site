import { describe, expect, it } from 'vitest'
import { login, makeTestEnv, request } from './helpers/admin-test-env'

describe('全站界面方案', () => {
  it('只有管理员可修改，刷新读取同一方案，切回原版不影响功能开关', async () => {
    const env = await makeTestEnv()
    expect(
      (await request(env, 'PATCH', '/api/admin/site-settings', { design: 'studio' })).status,
    ).toBe(401)
    await login(env)
    for (const design of ['studio', 'editorial', 'classic']) {
      const saved = await request(env, 'PATCH', '/api/admin/site-settings', { design })
      expect(saved.status).toBe(200)
      expect(saved.json).toMatchObject({ design, assistant: true, onboarding: true })
      expect((await request(env, 'GET', '/api/site')).json.features.design).toBe(design)
      expect((await request(env, 'GET', '/api/admin/modules')).json.features.design).toBe(design)
      expect((await request(env, 'GET', '/api/school/config')).json.features.design).toBe(design)
    }
    await request(env, 'PATCH', '/api/admin/site-settings', { onboarding: false })
    expect((await request(env, 'GET', '/api/site')).json.features).toEqual({
      design: 'classic',
      assistant: true,
      onboarding: false,
    })
    expect((await env.db.all("SELECT * FROM audit_log WHERE action='site-settings'")).length).toBe(
      4,
    )
  })
  it('拒绝未知方案及跨站写入，保留已有设置', async () => {
    const env = await makeTestEnv()
    await login(env)
    for (const design of ['<script>', null, 1, {}, 'dark'])
      expect((await request(env, 'PATCH', '/api/admin/site-settings', { design })).status).toBe(400)
    expect(
      (
        await request(
          env,
          'PATCH',
          '/api/admin/site-settings',
          { design: 'studio' },
          { origin: 'https://evil.test' },
        )
      ).status,
    ).toBe(403)
    expect((await request(env, 'GET', '/api/site')).json.features.design).toBeUndefined()
  })
})
