/**
 * D1 适配器的本地替身：把已有的 `Db` 接口包装成 D1 的形状。
 *
 * 存在的意义：`createD1Db()` 本身也是代码，也会有 bug。
 * 如果只有线上 Cloudflare 才跑过它，那它就是**零覆盖的关键路径** ——
 * 而后台所有接口都经过它。
 *
 * 包一层之后，本地开发与 vitest 都能真正跑一遍 `createD1Db` 的代码，
 * 包括参数绑定、`first()` 返回 null、batch 语义这些容易写错的细节。
 * 线上与本地跑的是同一段适配器代码，只是底下的引擎不同。
 */
import type { Db, SqlParam } from './types.ts'
import type { D1Database, D1PreparedStatement } from './d1.ts'

/**
 * 语句对象 → 原始 {sql, params} 的登记处。
 *
 * batch 拿到的只是 D1PreparedStatement 形状的对象，必须能反查回它的
 * SQL 与参数才能交给 Db.batch()。用 WeakMap 是为了不阻止语句对象被回收。
 *
 * 登记的 state 对象是**活的**：bind() 会改写 state.params，
 * batch 在调用时才读，所以读到的是最终绑定好的参数
 * （第一版在 prepare 时就把 params 快照存下了，结果 bind 的值丢失）。
 */
const SHIM_REGISTRY = new WeakMap<D1PreparedStatement, { sql: string; params: SqlParam[] }>()

export function createD1Shim(db: Db): D1Database {
  function prepare(sql: string): D1PreparedStatement {
    const state = { sql, params: [] as SqlParam[] }

    const stmt: D1PreparedStatement = {
      bind(...values: SqlParam[]): D1PreparedStatement {
        // D1 的 bind 返回自身（可重复调用，后一次覆盖前一次）
        state.params = values
        return stmt
      },
      async first<T>(colName?: string): Promise<T | null> {
        const row = await db.first<Record<string, unknown>>(state.sql, state.params)
        if (!row) return null
        // first('col') 是 D1 取聚合单列的写法
        return (colName ? (row[colName] as T) : (row as T)) ?? null
      },
      async all<T>(): Promise<T[]> {
        return db.all<T>(state.sql, state.params)
      },
      async run() {
        const res = await db.run(state.sql, state.params)
        return {
          success: true,
          meta: { changes: res.changes, last_row_id: Number(res.lastInsertRowid ?? 0) },
        }
      },
    }

    SHIM_REGISTRY.set(stmt, state)
    return stmt
  }

  return {
    prepare,
    async batch<T>(statements: D1PreparedStatement[]): Promise<T[]> {
      const collected: { sql: string; params?: SqlParam[] }[] = []
      for (const s of statements) {
        const state = SHIM_REGISTRY.get(s)
        if (state) collected.push({ sql: state.sql, params: state.params })
      }
      if (collected.length !== statements.length) {
        // 宁可直接报错也不要静默少执行几条 —— 那会造成难以察觉的数据不一致
        throw new Error(
          `D1 shim: batch 里有 ${statements.length - collected.length} 条语句不是本 shim 创建的`
        )
      }
      await db.batch(collected)
      // D1 的 batch 会返回每条语句的结果，本站的调用方从不读取它，
      // 所以返回空数组；泛型签名保留是为了满足 D1Database 的类型。
      return [] as T[]
    },
    async exec(query: string) {
      await db.exec(query)
      return { count: 1, duration: 0 }
    },
  }
}
