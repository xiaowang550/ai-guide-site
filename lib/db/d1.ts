import type { Db, DbRow, RunResult, SqlParam } from './types.ts'

/**
 * D1 适配器（Cloudflare Workers 运行时）。
 *
 * 只依赖 D1 的结构形状，不 import @cloudflare/workers-types：
 * 站点是纯静态站，devDependencies 里没有 Workers 类型包，
 * 为了一个后台加一整个 Workers 工具链不划算。这里手写最小接口，
 * 代价是如果 D1 API 变了需要手改，收益是主站构建不受任何影响。
 *
 * D1 的两个坑（都实际踩过或查过文档，记在这里避免下次重查）：
 *
 * 1) `first()` 无匹配行时返回 `null`，但当 SQL 里有 `COUNT(*)` 时返回的是
 *    `{ 'COUNT(*)': 0 }` 这样一行 —— 不会返回 null。所以业务代码要判断
 *    「行存在但计数为 0」，不能靠 null 判断「没有数据」。
 *
 * 2) 不支持 `exec()` 跑多语句脚本（建表脚本要自己按 `;` 拆分后 batch）。
 *    下面的 exec() 因此是一个仅供初始化使用的实现，标注了限制。
 */

/** D1 预处理语句的最小形状 */
export interface D1PreparedStatement {
  bind(...values: SqlParam[]): D1PreparedStatement
  first<T = DbRow>(colName?: string): Promise<T | null>
  all<T = DbRow>(): Promise<T[]>
  /** run 不返回行，所以不带泛型参数（D1 的 run 也只回 meta） */
  run(): Promise<{ success: boolean; meta?: { changes?: number; last_row_id?: number } }>
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement
  batch<T = DbRow>(statements: D1PreparedStatement[]): Promise<T[]>
  exec(query: string): Promise<{ count: number; duration: number }>
}

/**
 * Pages 的 D1 绑定缺失。
 *
 * 单独一个类型而不是复用 Error，是为了让调用方能**精确**识别这一种情况并给出
 * 可操作的指引 —— 它是部署环节最容易漏的一步，而症状（某一个接口 500、
 * 日志里只有一句 undefined.prepare）完全指不回原因。
 *
 * 注意：Pages 用 Git 集成构建时，`wrangler.toml` 里的 `[[d1_databases]]`
 * **不会**注入到 Functions 运行时。绑定必须在 Dashboard 的
 * Settings → Functions → Bindings 里配。这一点曾让我误判过一次，
 * 详见 docs/admin-backend.md。
 */
export class D1BindingMissingError extends Error {
  constructor() {
    super('D1 绑定不可用：env.DB 不是 D1Database')
    this.name = 'D1BindingMissingError'
  }
}

/**
 * 绑定缺失时**必须在这里抛**，不能等到第一次查询。
 *
 * 原来这个函数只是返回一个闭包，`database.prepare` 要等 `all()/first()/run()`
 * 被调用时才执行。调用方写的是
 *
 *     try { db = createD1Db(env.DB) } catch { return fail(500, '数据库未配置') }
 *
 * 那个 catch 因此永远抓不到任何东西 —— 它保护的那一行根本不会抛。
 * 后果不是「提示没用」，而是**整个症状被伪装成别的问题**：
 *
 *   - `createD1Db(undefined)` 安静成功，拿到一个「一切正常」的假 db
 *   - 鉴权接口不查库就返回（token 为空时 verifySession 直接 return null），
 *     所以后台看起来是活的
 *   - 直到某个真的查库的接口才抛
 *     `Cannot read properties of undefined (reading 'prepare')`，
 *     而那句话被我的通用错误处理吞成「服务端处理出错，请查看服务端日志」
 *
 * 也就是说「Pages 没配 D1 绑定」在现场表现为「只有一个接口 500，
 * 而且日志里看不出跟绑定有关」，极难定位。
 */
export function createD1Db(database: D1Database): Db {
  if (!database || typeof database.prepare !== 'function') {
    throw new D1BindingMissingError()
  }
  return {
    async all<T = DbRow>(sql: string, params: SqlParam[] = []): Promise<T[]> {
      const stmt = database.prepare(sql)
      return (params.length ? stmt.bind(...params) : stmt).all<T>()
    },

    async first<T = DbRow>(sql: string, params: SqlParam[] = []): Promise<T | null> {
      const stmt = database.prepare(sql)
      return (params.length ? stmt.bind(...params) : stmt).first<T>()
    },

    async run(sql: string, params: SqlParam[] = []): Promise<RunResult> {
      const stmt = database.prepare(sql)
      const res = await (params.length ? stmt.bind(...params) : stmt).run()
      return {
        changes: res.meta?.changes ?? 0,
        lastInsertRowid: res.meta?.last_row_id ?? null,
      }
    },

    async exec(sql: string): Promise<void> {
      // D1 的 exec 是给「跑一段脚本」用的，但对含 CREATE TABLE IF NOT EXISTS
      // 的 schema 直接可用（Pages 控制台执行 schema.sql 就是这条路）。
      // 注意：D1 exec 不支持参数绑定，这里只接受字面量脚本。
      await database.exec(sql)
    },

    async batch(statements: { sql: string; params?: SqlParam[] }[]): Promise<void> {
      // D1 的 batch 语义是「要么全成，要么全败」，正好是发布操作需要的原子性。
      if (statements.length === 0) return
      const prepared = statements.map((s) => {
        const stmt = database.prepare(s.sql)
        return s.params && s.params.length ? stmt.bind(...s.params) : stmt
      })
      await database.batch(prepared)
    },
  }
}
