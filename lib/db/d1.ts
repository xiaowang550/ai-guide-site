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

export function createD1Db(database: D1Database): Db {
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
