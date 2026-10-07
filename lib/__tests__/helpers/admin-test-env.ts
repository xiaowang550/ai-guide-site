/**
 * 后台测试的公共装置。
 *
 * 核心设计：测试通过**真实的 HTTP 接口**（`handleApi`）操作，
 * 而不是直接调用 lib/admin/* 里的函数。
 *
 * 为什么要绕这一圈：
 *   · 直接调函数测不到「路由表的 auth 标记」「Origin 校验」「Cookie 解析」
 *     这些恰恰是权限要求最容易被漏掉的地方
 *   · 而且登录态要靠 Cookie 传递，绕开 HTTP 就没有 Cookie 了
 *   · 顺带把 createD1Db 这段适配代码也覆盖到（底座是 D1 shim）
 *
 * 所以这套装置模拟的是「一个真实浏览器会发出来的请求序列」。
 */
/* eslint-disable @typescript-eslint/no-explicit-any --
 *
 * 这个文件（以及用到它的几个 admin-* 测试）里大量出现 any，全部来自同一个原因：
 * 接口返回的 JSON 载荷形状随路由而变（列表 / 详情 / 版本 / 仪表盘各不相同），
 * 而测试关心的是**内容**而不是它的静态类型 ——
 * 它们逐字段断言 `res.json.items.length`、`res.json.entries.map(...)` 这些值。
 *
 * 给几十个不同端点各写一套 interface 只会制造几百行没人维护的镜像类型，
 * 一旦后端加字段还要同步改两处，而且不会因为漏改而在运行时暴露问题。
 * 这里选择放宽 lint，并在每个文件顶部写明理由。
 */
import { readFileSync } from 'node:fs'
import { handleApi, type AdminEnv } from '@/lib/admin/api'
import { createSqliteDb } from '@/lib/db/sqlite'
import { createD1Shim } from '@/lib/db/d1-shim'
import type { Db } from '@/lib/db/types'

export const TEST_ORIGIN = 'https://admin.example.test'

export interface TestEnv {
  db: Db
  env: AdminEnv
  /** 维持一个「浏览器」的 Cookie 罐子 */
  cookies: Map<string, string>
}

const SCHEMA = readFileSync('db/schema.sql', 'utf8')

export const ADMIN_PASSWORD = 'correct-horse-battery-staple'

/** 建一个全新的内存库 + 环境 */
export async function makeTestEnv(
  options: {
    withAdmin?: boolean
    siteSalt?: string
    /** 传 null 表示「没配 ADMIN_PASSWORD」，用来测不会凭空建号 */
    adminPassword?: string | null
  } = {}
): Promise<TestEnv> {
  const db = createSqliteDb({ path: ':memory:' })
  await db.exec(SCHEMA)

  const env: AdminEnv = {
    DB: createD1Shim(db),
    SITE_SALT: options.siteSalt ?? 'test-salt-001',
    ADMIN_PASSWORD:
      options.adminPassword === null ? undefined : (options.adminPassword ?? ADMIN_PASSWORD),
    ADMIN_USERNAME: 'admin',
  }

  const testEnv: TestEnv = { db, env, cookies: new Map() }
  if (options.withAdmin) {
    // 走一次真实的 bootstrap 路径，确保被测的是线上会走的代码
    await request(testEnv, 'POST', '/api/admin/login', {
      username: 'admin',
      password: ADMIN_PASSWORD,
    })
    testEnv.cookies.clear()
  }
  return testEnv
}

/**
 * 发一个请求，自动带上已保存的 Cookie 并收集响应里的 Set-Cookie。
 *
 * `origin` 默认传同源 —— 写操作要过 Origin 校验，
 * 需要模拟跨站攻击时显式传别的值。
 */
export async function request(
  env: TestEnv,
  method: string,
  path: string,
  body?: unknown,
  options: { origin?: string | null; headers?: Record<string, string> } = {}
): Promise<{ status: number; json: any; headers: Headers }> {
  const url = new URL(path, TEST_ORIGIN)
  const headers = new Headers(options.headers ?? {})
  if (options.origin !== null) headers.set('Origin', options.origin ?? TEST_ORIGIN)
  if (env.cookies.size > 0) {
    headers.set('Cookie', [...env.cookies].map(([k, v]) => `${k}=${v}`).join('; '))
  }

  const res = await handleApi(
    new Request(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env.env
  )
  if (!res) throw new Error(`接口不存在：${method} ${path}`)

  // 收集 Cookie，模拟浏览器
  const setCookies =
    typeof (res.headers as any).getSetCookie === 'function' ? (res.headers as any).getSetCookie() : []
  for (const c of setCookies) {
    const [pair] = c.split(';')
    const eq = pair.indexOf('=')
    if (eq > 0) {
      const name = pair.slice(0, eq).trim()
      const value = pair.slice(eq + 1).trim()
      if (value === '') env.cookies.delete(name)
      else env.cookies.set(name, value)
    }
  }

  let json: any = null
  try {
    json = await res.clone().json()
  } catch {
    json = null
  }
  return { status: res.status, json, headers: res.headers }
}

export async function login(
  env: TestEnv,
  username = 'admin',
  password = ADMIN_PASSWORD
): Promise<{ status: number; json: any }> {
  return request(env, 'POST', '/api/admin/login', { username, password })
}

/** 一份完整合法的工具资料（可直接通过校验） */
export function validTool(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const capabilities: Record<string, unknown> = {}
  for (const key of [
    'writing', 'longform', 'reasoning', 'math', 'coding', 'research', 'agent',
    'data', 'office', 'imageGen', 'vision', 'video', 'voice', 'realtime',
  ]) {
    capabilities[key] = { score: 3, basis: `${key} 维度：功能可用但没有明显优势` }
  }
  return {
    id: 'testtool',
    name: '测试工具',
    nameEn: 'Test Tool',
    vendor: '测试厂商',
    logo: '/logos/testtool.svg',
    tagline: '一条一句话的定位描述',
    description: '这是一段足够长的介绍文字，用来通过校验里至少二十个字符的下限要求。',
    categories: ['chat'],
    tags: ['测试'],
    capabilities,
    strengths: ['强项一，写得足够具体', '强项二，写得足够具体', '强项三，写得足够具体'],
    weaknesses: ['弱项一，确实存在', '弱项二，确实存在', '弱项三，确实存在'],
    avoidFor: ['别用它做甲', '别用它做乙', '别用它做丙'],
    bestFor: ['最适合甲', '最适合乙', '最适合丙'],
    evidence: '本站不做自建评测。依据来自官方公开资料与社区共识。',
    chineseQuality: { score: 4, basis: '中文表达稳定' },
    chinaAccessible: true,
    contextWindow: '128K tokens',
    multimodal: { image: true, audio: false, video: false },
    hasApi: true,
    pricing: { model: 'freemium', freeTier: '每月 5 次免费' },
    platforms: ['web'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'high',
    alternatives: ['other'],
    officialUrl: 'https://example.com',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}
