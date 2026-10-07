import { DatabaseSync } from 'node:sqlite'
import type { Db, DbRow, RunResult, SqlParam } from './types.ts'

/**
 * node:sqlite 适配器 —— 本地开发与测试用。
 *
 * **为什么这不只是「测试替身」**：D1 底层就是 SQLite，用同一个引擎跑本地，
 * 意味着「SQLite 不支持这个语法」「这个 UPSERT 在这个版本行为不同」这类问题
 * 在本机就会暴露，而不是等到部署后才发现。用 mock 的话这些全都会漏过去。
 *
 * 与 D1 的三处必须对齐的差异（都在下面显式处理了）：
 *   1. 参数不接受 undefined —— 传进去直接抛错。D1 会当成 NULL。这里统一转成 null。
 *   2. 没有 batch()。D1 的 batch 是原子的，这里用 BEGIN/COMMIT/ROLLBACK 补上。
 *   3. 外键约束默认关闭，必须显式开，否则 ON DELETE CASCADE 静默失效
 *      —— 测试里会「删了父行、子行还在」而线上是删掉的。
 */

export interface SqliteDbOptions {
  /** 文件路径；':memory:' 用于测试 */
  path?: string
  /** 是否开启外键约束。默认开，因为 schema 依赖 ON DELETE CASCADE */
  foreignKeys?: boolean
}

export function createSqliteDb(options: SqliteDbOptions = {}): Db & { close(): void } {
  const db = new DatabaseSync(options.path ?? ':memory:')
  if (options.foreignKeys !== false) db.exec('PRAGMA foreign_keys = ON')

  /** D1 接受 null 与标量，不接受 undefined；node:sqlite 遇到 undefined 直接抛 */
  const bind = (params: SqlParam[]): SqlParam[] =>
    params.map((p) => (p === undefined ? null : p))

  const prepare = (sql: string) => {
    // 不缓存 Statement 对象：node:sqlite 的 StatementSync 复用时行为微妙，
    // 而这里的调用量（后台低频操作）远不到需要缓存的程度。可靠性优先。
    try {
      return db.prepare(sql)
    } catch (e) {
      throw new Error(`SQL 准备失败: ${sql}\n${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const runInTransaction = <T>(fn: () => T): T => {
    db.exec('BEGIN')
    try {
      const out = fn()
      db.exec('COMMIT')
      return out
    } catch (e) {
      // 回滚失败要吞掉：原始异常更有信息量，回滚异常只是善后
      try {
        db.exec('ROLLBACK')
      } catch {
        /* 忽略 */
      }
      throw e
    }
  }

  return {
    async all<T = DbRow>(sql: string, params: SqlParam[] = []): Promise<T[]> {
      return prepare(sql).all(...bind(params)) as T[]
    },

    async first<T = DbRow>(sql: string, params: SqlParam[] = []): Promise<T | null> {
      // node:sqlite 无匹配行返回 undefined；统一成 D1 的 null，
      // 免得业务代码里同时要处理 undefined 和 null
      const row = prepare(sql).get(...bind(params))
      return (row as T | undefined) ?? null
    },

    async run(sql: string, params: SqlParam[] = []): Promise<RunResult> {
      const res = prepare(sql).run(...bind(params))
      return {
        changes: Number(res.changes),
        lastInsertRowid: res.lastInsertRowid ?? null,
      }
    },

    async exec(sql: string): Promise<void> {
      db.exec(sql)
    },

    async batch(statements: { sql: string; params?: SqlParam[] }[]): Promise<void> {
      if (statements.length === 0) return
      // D1 的 batch 保证「全成或全败」，这里用事务达到同样效果。
      // 发布内容 = 插版本 + 改指针 + 删草稿 + 写审计，必须原子。
      runInTransaction(() => {
        for (const s of statements) {
          prepare(s.sql).run(...bind(s.params ?? []))
        }
      })
    },

    close() {
      db.close()
    },
  }
}

/**
 * 按文件路径打开一个已应用 schema 的库（本地开发用）。
 *
 * 为什么单独提供：本地开发要的是「数据留在文件里，重启还在」，
 * 而测试要的是「每次全新的内存库」。混在一起会出现测试之间互相污染。
 */
export async function openMigratedSqlite(path: string, schemaSql: string): Promise<Db> {
  const db = createSqliteDb({ path })
  await db.exec(schemaSql)
  return db
}
