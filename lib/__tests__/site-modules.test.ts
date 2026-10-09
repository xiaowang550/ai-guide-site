import { afterEach, describe, expect, it } from 'vitest'
import { login, makeTestEnv, request } from './helpers/admin-test-env'
import { DEFAULT_SITE_CONFIG, pathEnabled, safeModuleLink } from '@/lib/site-modules'
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
// Node 执行器不会进入 Cloudflare Functions 的依赖链。
// @ts-expect-error 本地 mjs 的运行接口由下方行为验证。
import { copyDraftWorkspace, readDraftChanges, codexExecArgs } from '../../scripts/codex-bridge.mjs'

const draft = {
  title: '教师备课练习',
  description: '三步完成一份待核对任务单',
  kind: 'steps',
  enabled: false,
  home: true,
  navigation: true,
  order: 90,
  blocks: [
    { title: '提供材料', text: '使用公开课文和虚构学情。', href: '/guides/structured-handoff' },
  ],
}
let temporary = ''
afterEach(() => {
  if (temporary) {
    rmSync(temporary, { recursive: true, force: true })
    temporary = ''
  }
})
describe('模块发布与所有者权限', () => {
  it('匿名可读公开配置，所有新管理接口与执行器都需要 owner 登录', async () => {
    const env = await makeTestEnv()
    const publicResponse = await request(env, 'GET', '/api/site')
    expect(publicResponse.status).toBe(200)
    expect(publicResponse.json.modules.length).toBe(DEFAULT_SITE_CONFIG.modules.length)
    expect(publicResponse.headers.get('cache-control')).toBe('no-store')
    for (const path of [
      '/api/admin/modules',
      '/api/admin/builds',
      '/api/admin/builds/no-id/changes',
    ])
      expect((await request(env, 'GET', path)).status).toBe(401)
    for (const path of ['/api/admin/modules', '/api/admin/builds', '/api/admin/builds/no-id/run'])
      expect((await request(env, 'POST', path, draft)).status).toBe(401)
  })
  it('草稿不泄露，发布与关闭无需构建，归档保留数据且不公开', async () => {
    const env = await makeTestEnv()
    await login(env)
    const created = await request(env, 'POST', '/api/admin/modules', draft)
    expect(created.status).toBe(200)
    const id = created.json.id
    env.cookies.clear()
    expect(
      (await request(env, 'GET', '/api/site')).json.modules.some(
        (item: { id: string }) => item.id === id,
      ),
    ).toBe(false)
    await login(env)
    const published = await request(env, 'PATCH', `/api/admin/modules/${id}`, {
      version: 1,
      enabled: true,
    })
    expect(published.status).toBe(200)
    env.cookies.clear()
    expect(
      (await request(env, 'GET', '/api/site')).json.modules.find(
        (item: { id: string }) => item.id === id,
      ).blocks[0].text,
    ).toBe(draft.blocks[0].text)
    await login(env)
    expect(
      (await request(env, 'PATCH', `/api/admin/modules/${id}`, { version: 2, enabled: false }))
        .status,
    ).toBe(200)
    expect((await request(env, 'DELETE', `/api/admin/modules/${id}`)).status).toBe(200)
    expect(
      (
        await env.db.first<{ archived: number }>('SELECT archived FROM site_modules WHERE id=?', [
          id,
        ])
      )?.archived,
    ).toBe(1)
    env.cookies.clear()
    expect(JSON.stringify((await request(env, 'GET', '/api/site')).json)).not.toContain(draft.title)
  })
  it('同源、版本冲突、模板升级、执行链接与空模块在服务端验证', async () => {
    const env = await makeTestEnv()
    await login(env)
    expect(
      (await request(env, 'POST', '/api/admin/modules', draft, { origin: 'https://evil.test' }))
        .status,
    ).toBe(403)
    expect(
      (await request(env, 'POST', '/api/admin/modules', { ...draft, blocks: [], enabled: true }))
        .status,
    ).toBe(400)
    expect(
      (
        await request(env, 'POST', '/api/admin/modules', {
          ...draft,
          blocks: [{ title: '危险链接', text: '示例', href: 'javascript:alert(1)' }],
        })
      ).status,
    ).toBe(400)
    const created = await request(env, 'POST', '/api/admin/modules', draft),
      id = created.json.id
    expect(
      (await request(env, 'PATCH', `/api/admin/modules/${id}`, { version: 0, enabled: true }))
        .status,
    ).toBe(409)
    expect(
      (await request(env, 'PATCH', `/api/admin/modules/${id}`, { version: 1, kind: 'builtin' }))
        .status,
    ).toBe(400)
    expect(
      (await request(env, 'PATCH', '/api/admin/modules/tools', { version: 1, title: '改名' }))
        .status,
    ).toBe(400)
  })
  it('全站功能在服务器保存，关闭基础库也关闭其进阶入口', async () => {
    const env = await makeTestEnv()
    await login(env)
    const featureUpdates = await Promise.all([
      request(env, 'PATCH', '/api/admin/site-settings', { assistant: false }),
      request(env, 'PATCH', '/api/admin/site-settings', { onboarding: false }),
    ])
    expect(featureUpdates.map((item) => item.status)).toEqual([200, 200])
    expect(
      (await request(env, 'PATCH', '/api/admin/modules/knowledge', { version: 1, enabled: false }))
        .status,
    ).toBe(200)
    env.cookies.clear()
    const config = (await request(env, 'GET', '/api/site')).json
    expect(config.features).toEqual({ assistant: false, onboarding: false })
    expect(pathEnabled(config, '/learn/advanced/')).toBe(false)
    expect(pathEnabled(config, '/tools/')).toBe(true)
  })
  it('需求保留为私有草稿，执行器不可用时不假报生成成功', async () => {
    const env = await makeTestEnv()
    await login(env)
    const item = await request(env, 'POST', '/api/admin/builds', {
      title: '收藏资料',
      request: '为教师增加可以保存提示词的本机收藏功能。',
    })
    expect(item.status).toBe(200)
    expect(item.json.status).toBe('draft')
    expect((await request(env, 'POST', `/api/admin/builds/${item.json.id}/run`)).status).toBe(503)
    expect((await request(env, 'GET', '/api/admin/builds')).json.bridge.available).toBe(false)
    env.cookies.clear()
    expect(JSON.stringify((await request(env, 'GET', '/api/site')).json)).not.toContain('收藏资料')
  })
  it('保护链接与公开入口，不将管理员预览放进离线缓存', () => {
    for (const link of [
      'javascript:alert(1)',
      '//evil.test',
      '/\\evil.test',
      '/%5cevil.test',
      'https://user:pass@evil.test',
    ])
      expect(safeModuleLink(link), link).toBe(false)
    expect(safeModuleLink('/guides/?q=AI')).toBe(true)
    expect(pathEnabled(DEFAULT_SITE_CONFIG, '/tools/gemma/')).toBe(true)
    expect(readFileSync('public/sw.js', 'utf8')).toContain("searchParams.has('admin-preview')")
    expect(readFileSync('lib/site.ts', 'utf8')).not.toContain("href: '/settings'")
  })
})
describe('Codex 独立草稿执行器', () => {
  it('副本排除凭据和数据库，改动检查不修改原项目，CLI 参数使用受限工作目录', async () => {
    temporary = mkdtempSync(join(tmpdir(), 'ai-site-codex-test-'))
    const project = join(temporary, 'project'),
      workspace = join(temporary, 'job')
    mkdirSync(join(project, 'app'), { recursive: true })
    mkdirSync(join(project, '.data'))
    writeFileSync(join(project, '.env'), 'SECRET=do-not-copy')
    writeFileSync(join(project, '.data', 'owner.db'), 'private')
    writeFileSync(join(project, 'app', 'page.tsx'), 'before')
    writeFileSync(join(project, 'package.json'), '{}')
    const baseline = await copyDraftWorkspace(project, workspace)
    expect(Object.keys(baseline)).toEqual(['app/page.tsx', 'package.json'])
    writeFileSync(join(workspace, 'app', 'page.tsx'), 'after')
    writeFileSync(join(workspace, 'app', 'new.tsx'), 'new')
    expect(await readDraftChanges(workspace, baseline)).toEqual([
      { path: 'app/new.tsx', before: null, after: 'new' },
      { path: 'app/page.tsx', before: 'before', after: 'after' },
    ])
    expect(readFileSync(join(project, 'app', 'page.tsx'), 'utf8')).toBe('before')
    expect(codexExecArgs(workspace, join(temporary, 'result.txt'))).toContain('workspace-write')
    expect(codexExecArgs(workspace, 'out')).not.toContain(
      '--dangerously-bypass-approvals-and-sandbox',
    )
  })
})
