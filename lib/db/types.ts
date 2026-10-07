/**
 * 数据库访问的统一接口。
 *
 * 为什么要有这一层：D1 和本地测试用的是**同一个 SQLite 引擎**，SQL 语句完全相同，
 * 差别只在「怎么执行」——
 *   · D1（Cloudflare Workers）：`env.DB.prepare(sql).bind(...args).all()`
 *   · node:sqlite（本地与测试）：`db.prepare(sql).all(...args)`
 *
 * 把这个差别收在适配器里，业务逻辑（lib/admin/*）只依赖下面这个 Db 接口，
 * 于是**同一份 SQL 能在本地用真引擎跑**。这不是为了省事写个 mock ——
 * 用 mock 的话，「SQLite 在这个版本上不支持 xxx」这类问题要等到线上才暴露。
 */

/** SQL 参数。只允许标量：D1 不接受对象、数组或 undefined */
export type SqlParam = string | number | bigint | null

export type DbRow = Record<string, unknown>

export interface RunResult {
  /** 受影响行数。D1 叫 meta.changes，node:sqlite 叫 changes，这里统一成 changes */
  changes: number
  /** 自增主键；仅在 INSERT 后有意义 */
  lastInsertRowid: number | bigint | null
}

export interface Db {
  /**
   * 返回类型不加 `extends DbRow` 约束。
   *
   * 约束加上会让所有调用方定义的 `interface` 都编译不过 —— TypeScript 只给
   * **类型别名**隐式索引签名，不给 interface 加。逼着每个调用方把 interface
   * 改写成 type 别名，纯粹是徒增摩擦，没有安全收益（行数据本来就来自 SQL，
   * 形状由查询决定，不由类型系统保证）。
   */
  all<T = DbRow>(sql: string, params?: SqlParam[]): Promise<T[]>
  /** 无匹配行时返回 null（D1 的 first() 与此一致，不用 undefined 混着写） */
  first<T = DbRow>(sql: string, params?: SqlParam[]): Promise<T | null>
  run(sql: string, params?: SqlParam[]): Promise<RunResult>
  /** 执行不含参数的多语句脚本（建表等）。不接受参数是有意的：拼字符串执行多语句是注入面 */
  exec(sql: string): Promise<void>
  /** 批量执行同构语句（D1 的 batch）。用于「发布 + 写审计」这类必须一起成功的多步操作 */
  batch(statements: { sql: string; params?: SqlParam[] }[]): Promise<void>
}

/**
 * SQLite 用 INTEGER 存布尔（0/1），没有 BOOLEAN 类型。
 * D1 与 node:sqlite 在这一点的行为一致，但**读出来一律是 number**，
 * 直接写 `if (row.is_published)` 会永远为真（1 是 truthy）——
 * 所以必须走这两个转换函数，不能在业务代码里裸用。
 */
export function toSqlBool(value: boolean): number {
  return value ? 1 : 0
}

export function fromSqlBool(value: unknown): boolean {
  return value === 1 || value === true || value === '1'
}

/**
 * 安全取整数。
 *
 * 为什么需要：D1 与 node:sqlite 对 COUNT(*) 的返回值类型不完全一致
 * （D1 返回 number，node:sqlite 返回 number，但某些聚合路径会返回 bigint 或 string）。
 * 直接 `as number` 断言会在运行时留下 NaN 或字符串参与算术的坑。
 */
export function toInt(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === 'bigint') return Number(value)
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return Math.trunc(n)
  }
  return fallback
}

/** 安全取字符串。JSON 列偶尔被驱动当成 Blob 回来的兜底 */
export function toText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  if (value instanceof Uint8Array) return new TextDecoder().decode(value)
  return String(value)
}
