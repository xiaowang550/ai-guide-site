/* eslint-disable @typescript-eslint/no-explicit-any --
 *
 * 本文件里的 any 全部来自 JSON 载荷的动态形状（接口返回什么就断言什么），
 * 理由见 helpers/admin-test-env.ts 顶部说明。与其维护几百行镜像类型，
 * 不如放宽 lint 并把理由写在这里。
 */
import { describe, expect, it } from 'vitest'
import { makeTestEnv, login, request, validTool } from './helpers/admin-test-env'

/**
 * 内容版本语义。
 *
 * 这些断言针对的是「回滚上一版本」这个功能能不能被信任。
 * 如果版本历史不可靠，恢复出来的内容就可能是错的 ——
 * 而内容错误会直接显示在公开页面上。
 */

async function seed(env: Awaited<ReturnType<typeof makeTestEnv>>, overrides = {}) {
  await login(env)
  await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
    kind: 'tool',
    slug: 'testtool',
    data: validTool(overrides),
  })
  const res = await request(env, 'POST', '/api/admin/content/tool:testtool/publish', {
    changeNote: 'v1',
  })
  return res
}

describe('内容版本：不可变、追加式', () => {
  it('每次发布新增一版，不覆盖旧版', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env, { tagline: '第一版定位' })
    await seed(env, { tagline: '第二版定位' })
    await seed(env, { tagline: '第三版定位' })

    const rows = await env.db.all<{ version: number; data: string }>(
      'SELECT version, data FROM content_versions WHERE item_id = ? ORDER BY version',
      ['tool:testtool']
    )
    expect(rows.map((r) => r.version)).toEqual([1, 2, 3])

    // 每一版的 data 都还在，内容没有被就地改写
    const taglines = rows.map((r) => JSON.parse(r.data).tagline)
    expect(taglines).toEqual(['第一版定位', '第二版定位', '第三版定位'])
  })

  it('回滚只移动指针，不新建版本、不删历史', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env, { tagline: '第一版定位' })
    await seed(env, { tagline: '第二版定位' })

    const before = await env.db.all('SELECT version FROM content_versions')
    const rb = await request(env, 'POST', '/api/admin/content/tool:testtool/rollback', {
      version: 1,
      reason: '改错了',
    })
    expect(rb.status).toBe(200)
    const after = await env.db.all('SELECT version FROM content_versions')

    expect(after.length, '回滚不应该新增版本').toBe(before.length)
    expect(after.map((r: any) => r.version).sort()).toEqual([1, 2])
  })

  it('回滚到不存在的版本会被拒绝', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env)
    const rb = await request(env, 'POST', '/api/admin/content/tool:testtool/rollback', { version: 99 })
    expect(rb.status).toBe(400)
    expect(rb.json.error).toContain('不存在')
  })

  it('回滚到当前版本会被拒绝（无意义的操作）', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env)
    const rb = await request(env, 'POST', '/api/admin/content/tool:testtool/rollback', { version: 1 })
    expect(rb.status).toBe(400)
  })

  it('回滚之后仍能继续发布，且版本号接着往下走', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env, { tagline: 'v1' })
    await seed(env, { tagline: 'v2' })
    await request(env, 'POST', '/api/admin/content/tool:testtool/rollback', { version: 1 })

    // 基于 v1 继续改再发布 —— 应拿到 version 3，不是复用 2
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool({ tagline: 'v3 内容' }),
    })
    const pub = await request(env, 'POST', '/api/admin/content/tool:testtool/publish', {
      changeNote: 'v3',
    })
    expect(pub.json.version, '版本号必须单调递增，不能复用回滚后的指针').toBe(3)
  })
})

describe('草稿与发布的隔离', () => {
  it('草稿永远不进公开快照', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool({ tagline: '只有草稿里有的定位' }),
    })
    const snap = await request(env, 'GET', '/api/content/published')
    expect(snap.json.items.length).toBe(0)
  })

  it('丢弃草稿后公开内容不变', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env, { tagline: '已发布的定位' })
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool({ tagline: '草稿里的另一个定位' }),
    })
    const del = await request(env, 'DELETE', '/api/admin/content/tool:testtool/draft')
    expect(del.json.removed).toBe(true)

    const snap = await request(env, 'GET', '/api/content/published')
    expect(snap.json.items[0].data.tagline).toBe('已发布的定位')
  })

  it('没有草稿时发布会被明确拒绝，而不是静默成功', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env)
    const again = await request(env, 'POST', '/api/admin/content/tool:testtool/publish', {
      changeNote: '重复发布',
    })
    expect(again.status).toBe(400)
    expect(again.json.error).toContain('没有待发布的草稿')
  })
})

describe('并发与冲突', () => {
  it('草稿基于旧版本时发布，返回 409 而不是静默覆盖', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env, { tagline: 'v1' })

    // A 开始编辑（基于 v1）
    await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool({ tagline: 'A 的修改' }),
    })

    // B 抢先发布了一版
    await env.db.run(
      "INSERT INTO content_versions (item_id, version, data, size_bytes, actor, created_at) VALUES (?,?,?,?,?,?)",
      ['tool:testtool', 2, JSON.stringify(validTool({ tagline: 'B 的修改' })), 100, 'b', new Date().toISOString()]
    )
    await env.db.run('UPDATE content_items SET published_version = 2 WHERE id = ?', ['tool:testtool'])

    // A 再发布 —— 必须被拒
    const res = await request(env, 'POST', '/api/admin/content/tool:testtool/publish', { changeNote: 'A' })
    expect(res.status).toBe(409)
    expect(res.json.error).toContain('冲突')

    // B 的发布没有被抹掉
    const snap = await request(env, 'GET', '/api/content/published')
    expect(snap.json.items[0].data.tagline).toBe('B 的修改')
  })

  it('乐观锁：edit_version 不匹配时拒绝保存', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env)

    const wrong = await request(env, 'PUT', '/api/admin/content/tool:testtool/draft', {
      kind: 'tool',
      slug: 'testtool',
      data: validTool(),
      expectedEditVersion: 99,
    })
    expect(wrong.status).toBe(409)
    expect(wrong.json.error).toContain('被改过')
  })
})

describe('备份与恢复', () => {
  it('导出的备份能原样导入（幂等）', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env, { tagline: '备份前的定位' })

    const backup = await request(env, 'GET', '/api/admin/backup')
    expect(backup.status).toBe(200)
    expect(backup.json.format).toBe('ai-guide-content-backup')
    expect(backup.json.items.length).toBe(1)
    expect(backup.headers.get('content-disposition')).toContain('attachment')

    // 换一个新库导入
    const target = await makeTestEnv({ withAdmin: true })
    await request(target, 'GET', '/api/admin/dashboard') // 触发 bootstrap
    await login(target)
    const imp = await request(target, 'POST', '/api/admin/backup', backup.json)
    expect(imp.status).toBe(200)
    expect(imp.json.items).toBe(1)
    expect(imp.json.versions).toBe(1)

    const snap = await request(target, 'GET', '/api/content/published')
    expect(snap.json.items[0].data.tagline).toBe('备份前的定位')
  })

  it('重复导入同一个备份不会产生重复版本', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env)
    const backup = await request(env, 'GET', '/api/admin/backup')

    await request(env, 'POST', '/api/admin/backup', backup.json)
    const second = await request(env, 'POST', '/api/admin/backup', backup.json)

    expect(second.json.skipped, '重复导入应当被跳过而不是新增').toBeGreaterThan(0)
    const versions = await env.db.all('SELECT version FROM content_versions')
    expect(versions.length).toBe(1)
  })

  it('非本站的备份文件被拒绝', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    const bad = await request(env, 'POST', '/api/admin/backup', { hello: 'world' })
    expect(bad.status).toBe(400)
    const bad2 = await request(env, 'POST', '/api/admin/backup', {
      format: 'ai-guide-content-backup',
      version: 99,
      items: [],
    })
    expect(bad2.status, '未知版本号的备份文件不该被接受').toBe(400)
  })
})

describe('公开快照接口', () => {
  it('内容没变时返回 304', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env)

    const first = await request(env, 'GET', '/api/content/published')
    const etag = first.headers.get('etag')
    expect(etag, '没有 ETag，构建时同步没法省流量').toBeTruthy()

    // 直接调 handleApi 拿 304（request() 辅助函数会尝试解析 JSON）
    const { handleApi } = await import('@/lib/admin/api')
    const res = await handleApi(
      new Request('https://admin.example.test/api/content/published', {
        headers: { 'If-None-Match': etag! },
      }),
      env.env
    )
    expect(res!.status).toBe(304)
  })

  it('损坏的版本数据不会让整个接口失败', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await seed(env)
    // 人为把某条版本数据改成非法 JSON
    await env.db.run(
      "UPDATE content_versions SET data = '{ 坏掉的 json' WHERE item_id = ?",
      ['tool:testtool']
    )
    const snap = await request(env, 'GET', '/api/content/published')
    expect(snap.status, '一条坏数据不该让构建同步整体失败').toBe(200)
    expect(snap.json.items.length, '损坏的条目应被跳过').toBe(0)
  })
})
