import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { makeTestEnv, login, request, validTool } from './helpers/admin-test-env'
import { readPublishedAll } from '@/lib/admin/content'
import type { Db } from '@/lib/db/types'

/**
 * readPublishedAll 的查询次数与容错。
 *
 * 为什么单独测「查询次数」：这个接口每次 Cloudflare 构建都会被调一次，
 * 而它在 Workers 上。第一版是 1 次查 items + N 次逐条查 data，
 * 用 JOIN 减少数据库往返，并验证草稿、发布和回滚后的快照。
 * 线上 500 的根因是适配器把 D1Result 当数组，见 d1-contract.test.ts。
 */
describe('readPublishedAll', () => {
  it('用一条查询读完所有已发布内容', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    for (const id of ['a', 'b', 'c']) {
      await request(env, 'PUT', `/api/admin/content/tool:${id}/draft`, {
        kind: 'tool',
        slug: id,
        data: validTool({ id }),
      })
      await request(env, 'POST', `/api/admin/content/tool:${id}/publish`, { changeNote: 'v1' })
    }

    let statements = 0
    const counting: Db = {
      all: (sql, params) => {
        statements++
        return env.db.all(sql, params)
      },
      first: (sql, params) => {
        statements++
        return env.db.first(sql, params)
      },
      run: (sql, params) => env.db.run(sql, params),
      exec: (sql) => env.db.exec(sql),
      batch: (s) => env.db.batch(s),
    }

    const items = await readPublishedAll(counting)
    expect(items.length).toBe(3)
    expect(
      statements,
      `读了 ${items.length} 条内容却用了 ${statements} 次查询 —— 必须是一条 JOIN，` +
        'N 次往返在 Workers 上既慢又吃子请求配额'
    ).toBe(1)
  })

  it('只返回已发布版本，草稿不进公开快照', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:x/draft', {
      kind: 'tool',
      slug: 'x',
      data: validTool({ id: 'x', tagline: '草稿里的' }),
    })
    await request(env, 'POST', '/api/admin/content/tool:x/publish', { changeNote: 'v1' })

    // 再存一个不发布的草稿
    await request(env, 'PUT', '/api/admin/content/tool:x/draft', {
      kind: 'tool',
      slug: 'x',
      data: validTool({ id: 'x', tagline: '草稿里的（未发布）' }),
    })

    const snap = await request(env, 'GET', '/api/content/published')
    expect(snap.json.items.length).toBe(1)
    expect(snap.json.items[0].data.tagline).toBe('草稿里的')
  })

  it('回滚后快照指向旧版本', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:x/draft', {
      kind: 'tool',
      slug: 'x',
      data: validTool({ id: 'x', tagline: '第一版' }),
    })
    await request(env, 'POST', '/api/admin/content/tool:x/publish', { changeNote: 'v1' })
    await request(env, 'PUT', '/api/admin/content/tool:x/draft', {
      kind: 'tool',
      slug: 'x',
      data: validTool({ id: 'x', tagline: '第二版' }),
    })
    await request(env, 'POST', '/api/admin/content/tool:x/publish', { changeNote: 'v2' })

    await request(env, 'POST', '/api/admin/content/tool:x/rollback', { version: 1 })

    const snap = await request(env, 'GET', '/api/content/published')
    expect(snap.json.items[0].data.tagline).toBe('第一版')
    expect(snap.json.items[0].version).toBe(1)
  })

  it('某一条的 JSON 损坏时跳过它，其余照常返回', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    for (const id of ['ok1', 'broken', 'ok2']) {
      await request(env, 'PUT', `/api/admin/content/tool:${id}/draft`, {
        kind: 'tool',
        slug: id,
        data: validTool({ id }),
      })
      await request(env, 'POST', `/api/admin/content/tool:${id}/publish`, { changeNote: 'v1' })
    }
    await env.db.run("UPDATE content_versions SET data = '{ 坏掉的' WHERE item_id = 'tool:broken'")

    const items = await readPublishedAll(env.db)
    expect(items.map((i) => i.itemId).sort()).toEqual(['tool:ok1', 'tool:ok2'])

    const snap = await request(env, 'GET', '/api/content/published')
    expect(snap.status, '一条坏数据不该让整个接口失败').toBe(200)
    expect(snap.json.items.length).toBe(2)
  })

  it('指针指向不存在的版本时该条目被跳过（JOIN 自然排除）', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:x/draft', {
      kind: 'tool',
      slug: 'x',
      data: validTool({ id: 'x' }),
    })
    await request(env, 'POST', '/api/admin/content/tool:x/publish', { changeNote: 'v1' })
    await env.db.run('DELETE FROM content_versions WHERE item_id = ?', ['tool:x'])

    const items = await readPublishedAll(env.db)
    expect(items.length).toBe(0)
  })

  it('实现里不再有逐条查询的循环', () => {
    const src = readFileSync('lib/admin/content.ts', 'utf8')
    const fn = src.slice(src.indexOf('export async function readPublishedAll'))
    expect(fn).toContain('JOIN content_versions')
    expect(fn, '实现里又出现了 getVersionData 逐条取数据').not.toContain('getVersionData')
  })
})
