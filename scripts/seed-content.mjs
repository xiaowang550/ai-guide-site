/**
 * 内容迁移：把仓库里的基线工具资料灌进数据库（本地 sqlite 或线上 D1）。
 *
 * ── 为什么需要这一步 ──
 *
 * 后台要能编辑一条工具资料，前提是这条资料已经「存在」于后台里。
 * 全新部署时 D1 是空的，于是列表页什么都没有、编辑器也打不开任何东西。
 * 这个脚本把 22 个工具作为**版本 1** 一次性灌进去，之后它们就和其他内容
 * 一样由后台管理了。
 *
 * ── 灌完之后 data/*.ts 还需要保留吗 ──
 *
 * 需要，而且它仍然是基线：
 *   · 194 项 data 门禁的输入就是它
 *   · 内容源不可达时，站点照常按基线发布（后台故障不会导致全站发不出去）
 *   · 新增工具应该走 git（代码变更，需要评审），而不是后台新建
 *
 * 也就是说 D1 是「增量的编辑层」，不是「内容的唯一存放处」。
 *
 * ── 幂等 ──
 *
 * 已存在的 (item_id, version) 会跳过，所以重复执行安全。
 * 想把基线强制重新灌一遍，加 --force（它会新建版本而不是覆盖历史）。
 *
 * 用法：
 *   # 本地开发库（默认 .data/admin-dev.db，与 admin:dev 同一个文件）
 *   npm run admin:seed
 *
 *   # 线上 D1（需要 wrangler 已登录）
 *   node --experimental-strip-types scripts/seed-content.mjs --remote
 */
import { mkdirSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { tools as baselineTools } from '../data/tools.ts'
import { createSqliteDb } from '../lib/db/sqlite.ts'
import { stripDerivedFields } from '../lib/admin/content.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const args = process.argv.slice(2)
const useRemote = args.includes('--remote')
const force = args.includes('--force')
const dbPath = join(projectRoot, '.data', 'admin-dev.db')
const schemaPath = join(projectRoot, 'db', 'schema.sql')

function log(...args) {
  console.log('[seed]', ...args)
}

async function main() {
  log(`基线工具 ${baselineTools.length} 个`)

  if (useRemote) {
    await seedRemote()
    return
  }
  await seedLocal()
}

/** 本地：写进 admin:dev 用的同一个 sqlite 文件 */
async function seedLocal() {
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = createSqliteDb({ path: dbPath })
  await db.exec(readFileSync(schemaPath, 'utf8'))

  const result = await seedInto(db)
  report(result)
  db.close()
}

/**
 * 线上：通过 wrangler d1 execute 执行同样的 SQL。
 *
 * 不走 API 的原因：这是**首次初始化**，此刻还没有管理员账号，
 * 调用管理接口必然被 401 挡住；而用 wrangler 直连 D1 不需要任何凭据文件。
 */
async function seedRemote() {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const run = promisify(execFile)

  log('目标：线上 D1（通过 wrangler）')

  // 1. 建表
  const schema = readFileSync(schemaPath, 'utf8')
  const schemaFile = join(projectRoot, '.cache', 'schema-for-wrangler.sql')
  mkdirSync(dirname(schemaFile), { recursive: true })
  const { writeFileSync } = await import('node:fs')
  writeFileSync(schemaFile, schema, 'utf8')

  await run('npx', ['wrangler', 'd1', 'execute', 'ai-guide-site', '--remote', '--file', schemaFile], {
    cwd: projectRoot,
    maxBuffer: 32 * 1024 * 1024,
  })
  log('表结构已应用')

  // 2. 插入内容（UPSERT，幂等）
  const stmts = []
  for (const tool of baselineTools) {
    const itemId = `tool:${tool.id}`
    const serialized = JSON.stringify({ ...stripDerivedFields(tool), updatedAt: tool.updatedAt })
    const now = new Date().toISOString()
    stmts.push(
      `INSERT INTO content_items (id,kind,slug,published_version,published_title,published_at,edit_version,created_at,updated_at) VALUES ('${itemId}','tool','${tool.id}',1,'${tool.name.replace(/'/g, "''")}','${now}',0,'${now}','${now}') ON CONFLICT(id) DO NOTHING;`,
      `INSERT INTO content_versions (item_id,version,data,change_note,size_bytes,actor,created_at) VALUES ('${itemId}',1,'${serialized.replace(/'/g, "''")}','从仓库基线迁移',${serialized.length},'migration','${now}') ON CONFLICT(item_id,version) DO NOTHING;`
    )
  }

  const sqlFile = join(projectRoot, '.cache', 'seed-for-wrangler.sql')
  writeFileSync(sqlFile, stmts.join('\n'), 'utf8')

  await run('npx', ['wrangler', 'd1', 'execute', 'ai-guide-site', '--remote', '--file', sqlFile], {
    cwd: projectRoot,
    maxBuffer: 64 * 1024 * 1024,
  })
  log(`已提交 ${stmts.length} 条语句（UPSERT，重复执行安全）`)
  log('下一步：设置 ADMIN_PASSWORD 与 SITE_SALT 两个 Secret，见 docs/admin-backend.md')
}

async function seedInto(env) {
  // 直接用底层 Db 接口操作，不绕 handleApi —— 此刻还没有任何账号，走 API 必然被 401 挡住
  const db = env
  let inserted = 0
  let skipped = 0

  const now = new Date().toISOString()
  for (const tool of baselineTools) {
    const itemId = `tool:${tool.id}`
    const serialized = JSON.stringify({ ...stripDerivedFields(tool), updatedAt: tool.updatedAt })

    const existing = await db.first('SELECT version FROM content_versions WHERE item_id = ? AND version = 1', [
      itemId,
    ])
    if (existing && !force) {
      skipped++
      continue
    }

    await db.run(
      `INSERT INTO content_items (id,kind,slug,published_version,published_title,published_at,edit_version,created_at,updated_at)
       VALUES (?,?,?,1,?,?,0,?,?)
       ON CONFLICT(id) DO UPDATE SET
         published_version = 1, published_title = excluded.published_title, updated_at = excluded.updated_at`,
      [itemId, 'tool', tool.id, tool.name, tool.updatedAt ?? now, now, now]
    )

    if (!existing) {
      await db.run(
        `INSERT INTO content_versions (item_id,version,data,change_note,size_bytes,actor,created_at)
         VALUES (?,1,?,?,?,?,?)
         ON CONFLICT(item_id, version) DO UPDATE SET data = excluded.data`,
        [itemId, serialized, '从仓库基线迁移', serialized.length, 'migration', now]
      )
      inserted++
    } else {
      skipped++
    }
  }

  await db.run('INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?,?,?,?,?)', [
    now,
    'migration',
    'seed',
    null,
    JSON.stringify({ inserted, skipped, total: baselineTools.length }),
  ])

  return { inserted, skipped, total: baselineTools.length }
}

function report(result) {
  log(`完成：新建 ${result.inserted} 条，跳过 ${result.skipped} 条（已存在，共 ${result.total} 个工具）`)
  if (result.inserted === 0 && result.skipped > 0) {
    log('数据已经灌过了。要强制重建请加 --force')
  }
  log(`数据库：${dbPath}`)
  log('下一步：设置 ADMIN_PASSWORD 环境变量后运行 npm run admin:dev')
}

await main()
