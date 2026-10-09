import { describe, expect, it, vi } from 'vitest'
import { createD1Db, type D1Database } from '@/lib/db/d1'
import { createD1Shim } from '@/lib/db/d1-shim'
import { createSqliteDb } from '@/lib/db/sqlite'

describe('Cloudflare D1 返回格式', () => {
  it('从 D1Result.results 读取行，支持有参数和无参数的查询', async () => {
    const row = { id: 'tool:example' }
    const binding = {
      prepare: () => ({
        bind() {
          return this
        },
        all: async () => ({ success: true, meta: {}, results: [row] }),
      }),
    } as unknown as D1Database
    const db = createD1Db(binding)
    expect(await db.all('SELECT id FROM content_items')).toEqual([row])
    expect(await db.all('SELECT id FROM content_items WHERE id = ?', [row.id])).toEqual([row])
  })

  it('本地模拟接口返回真实 D1 的结果对象，空查询也有 results 数组', async () => {
    const sqlite = createSqliteDb({ path: ':memory:' })
    const binding = createD1Shim(sqlite)
    const result = await binding.prepare('SELECT 1 AS value').all<{ value: number }>()
    expect(result).toMatchObject({ success: true, results: [{ value: 1 }] })
    const empty = await binding.prepare('SELECT 1 AS value WHERE 0').all()
    expect(empty).toMatchObject({ success: true, results: [] })
    expect(await createD1Db(binding).all('SELECT 1 AS value WHERE 0')).toEqual([])
    sqlite.close()
  })

  it('多行建表脚本和引号内的分号通过 batch 执行，不调用按行切分的 D1.exec', async () => {
    const sqlite = createSqliteDb({ path: ':memory:' })
    const binding = createD1Shim(sqlite)
    const exec = vi.spyOn(binding, 'exec').mockImplementation(async () => {
      throw new Error('D1.exec splits multiline SQL')
    })
    const db = createD1Db(binding)
    try {
      await db.exec(`-- setup; not a statement
        CREATE TABLE example (
          id INTEGER PRIMARY KEY, text TEXT
        );
        /* block comment; */
        INSERT INTO example VALUES (1, 'first; line\nsecond ''quoted'' line');
        CREATE INDEX example_text ON example(text);`)
      expect(await db.first('SELECT text FROM example')).toEqual({
        text: "first; line\nsecond 'quoted' line",
      })
      expect(exec).not.toHaveBeenCalled()
      await db.exec('-- empty schema;')
    } finally {
      sqlite.close()
    }
  })

  it('D1 查询异常继续向上传递，不伪装成空结果', async () => {
    const binding = {
      prepare: () => ({
        all: async () => {
          throw new Error('D1_ERROR')
        },
      }),
    } as unknown as D1Database
    await expect(createD1Db(binding).all('SELECT 1')).rejects.toThrow('D1_ERROR')
  })
})
