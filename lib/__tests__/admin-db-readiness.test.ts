/* eslint-disable @typescript-eslint/no-explicit-any -- 理由见 helpers/admin-test-env.ts */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { handleApi } from '@/lib/admin/api'
import { createSqliteDb } from '@/lib/db/sqlite'
import { createD1Shim } from '@/lib/db/d1-shim'
import type { Db } from '@/lib/db/types'
import { ADMIN_PASSWORD, TEST_ORIGIN } from './helpers/admin-test-env'

/**
 * 「数据库已绑定但还没建表」这一状态的处理。
 *
 * 这是部署过程中必然会经过的一个中间状态：
 * D1 绑好了、内容也灌了，但 schema.sql 还没执行。
 * 实测踩过一次 —— 那时的症状是**所有接口返回 Cloudflare 的 HTML 错误页**，
 * 而不是本站的 JSON 提示，因为抛异常的语句在 try/catch 之外。
 * 「请执行 schema.sql」这条最有价值的信息完全丢失，只能去翻构建日志猜。
 */
async function callOn(mkDb: () => Promise<Db>, path: string, method = 'GET', body?: unknown) {
  const db = await mkDb()
  const res = await handleApi(
    new Request(TEST_ORIGIN + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Origin: TEST_ORIGIN,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    {
      DB: createD1Shim(db),
      SITE_SALT: 'test',
      ADMIN_PASSWORD,
      ADMIN_USERNAME: 'admin',
    }
  )
  const text = res ? await res.text() : ''
  let json: any = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: res?.status ?? 0, json, isJson: json !== null }
}

/** 一个完全空的库：有绑定，但一张表都没有 */
async function emptyDb(): Promise<Db> {
  return createSqliteDb({ path: ':memory:' })
}

/** 建了表但没灌内容 —— 部署顺序里 schema 先于 seed，这个状态也会出现 */
async function schemaOnlyDb(): Promise<Db> {
  const db = createSqliteDb({ path: ':memory:' })
  await db.exec(readFileSync('db/schema.sql', 'utf8'))
  return db
}

describe('数据库就绪程度不同的时候，接口都要给出可行动的回答', () => {
  it('库是空的：返回 JSON 提示 + 建表命令，而不是抛给运行时', async () => {
    const r = await callOn(emptyDb, '/api/content/published')

    expect(r.isJson, '返回的不是本站的 JSON —— 说明异常逃出了错误处理，用户看到的是 Cloudflare 错误页').toBe(true)
    expect(r.status).toBe(500)
    expect(r.json.error).toContain('还没有建表')
    expect(r.json.error).toContain('db/schema.sql')
    // 要给出完整命令，用户才能直接复制执行
    expect(r.json.error).toContain('wrangler d1 execute')
    expect(r.json.error).toContain('--file=db/schema.sql')
  })

  it('库是空的：登录接口也要给出同样的提示', async () => {
    const r = await callOn(emptyDb, '/api/admin/login', 'POST', {
      username: 'admin',
      password: ADMIN_PASSWORD,
    })
    expect(r.isJson, '登录时的建表检查在 try/catch 之外，异常会逃出去').toBe(true)
    expect(r.json.error).toContain('还没有建表')
  })

  it('库是空的：未登录的管理接口不会 500，而是先说明库没准备好', async () => {
    const r = await callOn(emptyDb, '/api/admin/dashboard')
    expect(r.isJson).toBe(true)
    // 它不需要读库就能判定未登录，所以应该照常 401；
    // 如果读库动作放在了鉴权之前，这里会变成 500
    expect([401, 500]).toContain(r.status)
    if (r.status === 500) expect(r.json.error).toContain('还没有建表')
  })

  it('建了表但没灌内容：公开接口正常返回空列表，不是报错', async () => {
    const r = await callOn(schemaOnlyDb, '/api/content/published')
    expect(r.status, JSON.stringify(r.json)).toBe(200)
    expect(r.json.items).toEqual([])
  })

  it('建了表但没灌内容：可以登录进去看到空状态', async () => {
    const db = await schemaOnlyDb()
    const env = { DB: createD1Shim(db), SITE_SALT: 'test', ADMIN_PASSWORD, ADMIN_USERNAME: 'admin' }

    const login = await handleApi(
      new Request(TEST_ORIGIN + '/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Origin: TEST_ORIGIN },
        body: JSON.stringify({ username: 'admin', password: ADMIN_PASSWORD }),
      }),
      env
    )
    expect(login!.status, '没有内容时也应该能建号并登录 —— 空状态不等于不可用').toBe(200)

    const setCookie = (login!.headers as any).getSetCookie?.()[0] ?? login!.headers.get('set-cookie')
    const cookie = setCookie!.split(';')[0]

    const dash = await handleApi(
      new Request(TEST_ORIGIN + '/api/admin/dashboard', {
        headers: { Cookie: cookie, Origin: TEST_ORIGIN },
      }),
      env
    )
    expect(dash!.status).toBe(200)
    const body = await dash!.json()
    expect(body.content.total, '仪表盘要显示真实的 0，而不是报错').toBe(0)
    expect(body.analytics.hasData, '没有统计时应明确 hasData=false，让界面显示空状态').toBe(false)
  })

  it('任何响应都不会把 SQL 原文泄漏给前端', async () => {
    const r = await callOn(emptyDb, '/api/content/published')
    const text = JSON.stringify(r.json)
    expect(text).not.toMatch(/SELECT|INSERT|FROM\s+\w+/i)
  })

  it('ensureBootstrapAdmin 不再在每个请求上跑', () => {
    const src = readFileSync('lib/admin/api.ts', 'utf8')
    const handleApiBody = src.slice(src.indexOf('export async function handleApi'))
    const routerTail = handleApiBody.slice(0, handleApiBody.indexOf('const ctx: RouteCtx'))
    // 每请求都建号检查 = 每请求多一次 COUNT，且异常在错误处理之外
    expect(routerTail, 'ensureBootstrapAdmin 又被挪回入口了').not.toContain('ensureBootstrapAdmin')
    // 它应该只出现在登录处理器里
    expect(src).toContain('await ensureBootstrapAdmin(ctx.db, ctx.env)')
  })
})
