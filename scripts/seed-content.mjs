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
    // 注意要等 report()，不能直接 return ——
    // 第一版这里写的是 `await seedRemote(); return`，
    // 于是 --remote 分支永远不打印「完成：新建 N 条」那行，
    // 灌完内容却看不到任何结果，看起来像是失败了。
    const result = await seedRemote()
    report(result)
    return
  }

  const db = await openLocalDb()
  const result = await seedInto(db)
  db.close()
  report(result)
}

/** 本地：写进 admin:dev 用的同一个 sqlite 文件 */
async function openLocalDb() {
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = createSqliteDb({ path: dbPath })
  await db.exec(readFileSync(schemaPath, 'utf8'))
  return db
}

/**
 * 线上：通过 D1 的 REST API 执行。
 *
 * **为什么不 shell out 调 `npx wrangler`**：
 * 第一版是 `execFile('npx', [...])`，在 macOS/Linux 上能跑，在 Windows 上必然失败 ——
 * `npx` 实际是 `npx.cmd`，Node 的 execFile 不带 `shell: true` 找不到它，
 * 报 `spawn npx ENOENT`。而这个 bug 只在 `--remote` 分支里，
 * 本地开发走的是 sqlite 路径，所以本地测试完全测不到。
 *
 * 改成直接调 REST API 之后：跨平台一致、少了 shell 引号转义这一类问题、
 * 也不用等 npx 把 wrangler 装/解析一遍。
 *
 * D1 的 query 接口一次只吃一条语句，所以按语句逐条发。
 * 22 个工具 × 2 条 = 44 次请求，几秒钟的事 —— 内容迁移是一次性操作，
 * 不值得为了减少请求数去冒批量拼接 SQL 的风险。
 */
async function d1Query(sql, params = []) {
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId()}/d1/database/${databaseId()}/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token()}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
    signal: AbortSignal.timeout(30000),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || body?.success === false) {
    const msg = body?.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`
    throw new Error(`D1 查询失败：${msg}\nSQL: ${sql.slice(0, 120)}`)
  }
  return body?.result?.[0]?.results ?? []
}

function token() {
  const t = process.env.CLOUDFLARE_API_TOKEN
  if (!t) throw new Error('缺少 CLOUDFLARE_API_TOKEN 环境变量')
  return t
}

function accountId() {
  const a = process.env.CLOUDFLARE_ACCOUNT_ID
  if (!a) throw new Error('缺少 CLOUDFLARE_ACCOUNT_ID 环境变量')
  return a
}

/**
 * 从 wrangler.toml 里读 database_id。只做最小解析，不引 TOML 依赖。
 *
 * **解析前必须剥掉注释行** —— 第一版没剥，而 wrangler.toml 第 5 行的说明注释里
 * 写着「D1 数据库绑定（[[d1_databases]]）」，比真正的块早出现三十多行。
 * 于是 `split('[[d1_databases]]')[1]` 取到的是注释和真块之间的空白，
 * 读不到 database_id，脚本直接退出。
 * 这已经是本轮第三次栽在「正则/切分匹配到了注释里的说明文字」上了，
 * 所以这里只剥整行注释，不做更聪明的处理 —— 整行注释不可能是有效配置。
 */
function databaseId() {
  if (process.env.D1_DATABASE_ID) return process.env.D1_DATABASE_ID
  const raw = readFileSync(join(projectRoot, 'wrangler.toml'), 'utf8')
  const code = raw
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith('#'))
    .join('\n')

  const block = code.split('[[d1_databases]]')[1]
  const id = block?.match(/database_id\s*=\s*"([^"]+)"/)?.[1]
  if (!id) {
    throw new Error(
      'wrangler.toml 里读不到 database_id。启用 [[d1_databases]] 段并填入真实 UUID' +
        '（见 docs/admin-backend.md 第 2 步），或用 D1_DATABASE_ID 环境变量指定。'
    )
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`wrangler.toml 里的 database_id 不是合法 UUID：${id}`)
  }
  return id
}

/**
 * 把 schema 拆成一条条语句。
 *
 * 先剥掉 `--` 行注释再按 `;` 切，否则注释里出现的分号会把语句切坏。
 * 本站 schema 里的字符串字面量不含分号 —— 这一点由下面的测试守着，
 * 万一将来有人往 CHECK 约束里写了带分号的默认值，这里会立刻暴露。
 */
export function splitSql(sql) {
  return sql
    .split(/\r?\n/)
    .map((line) => (line.trimStart().startsWith('--') ? '' : line))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s !== '')
}

async function seedRemote() {
  log('目标：线上 D1（通过 REST API）')
  log(`库：${databaseId()}  账号：${accountId()}`)

  // 1. 表结构：只在缺失时补，避免每次跑都发 28 条请求
  const existing = await d1Query(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='content_items'"
  )
  if (existing.length === 0) {
    log('检测到 content_items 表不存在，先应用 db/schema.sql')
    const statements = splitSql(readFileSync(schemaPath, 'utf8'))
    for (const [i, sql] of statements.entries()) {
      await d1Query(sql)
      if ((i + 1) % 10 === 0) log(`  已应用 ${i + 1}/${statements.length} 条`)
    }
    log(`表结构已应用（${statements.length} 条语句）`)
  } else {
    log('表结构已存在，跳过 schema.sql')
  }

  // 2. 插入内容
  let inserted = 0
  let skipped = 0
  const now = new Date().toISOString()

  for (const tool of baselineTools) {
    const itemId = `tool:${tool.id}`
    const serialized = JSON.stringify({
      ...stripDerivedFields(tool),
      updatedAt: tool.updatedAt,
    })

    const seen = await d1Query('SELECT version FROM content_versions WHERE item_id = ? AND version = 1', [
      itemId,
    ])
    if (seen.length > 0 && !force) {
      skipped++
      continue
    }

    await d1Query(
      `INSERT INTO content_items (id,kind,slug,published_version,published_title,published_at,edit_version,created_at,updated_at)
       VALUES (?,?,?,1,?,?,0,?,?)
       ON CONFLICT(id) DO UPDATE SET
         published_version = 1, published_title = excluded.published_title, updated_at = excluded.updated_at`,
      [itemId, 'tool', tool.id, tool.name, tool.updatedAt ?? now, now, now]
    )

    await d1Query(
      `INSERT INTO content_versions (item_id,version,data,change_note,size_bytes,actor,created_at)
       VALUES (?,1,?,?,?,?,?)
       ON CONFLICT(item_id, version) DO UPDATE SET data = excluded.data`,
      [itemId, serialized, '从仓库基线迁移', serialized.length, 'migration', now]
    )
    inserted++
  }

  await d1Query(
    'INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?,?,?,?,?)',
    [now, 'migration', 'seed', null, JSON.stringify({ inserted, skipped, total: baselineTools.length })]
  )

  return { inserted, skipped, total: baselineTools.length }
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
  if (useRemote) {
    log('下一步：设置 ADMIN_PASSWORD 与 SITE_SALT 两个 Secret，见 docs/admin-backend.md')
  } else {
    log(`数据库：${dbPath}`)
    log('下一步：设置 ADMIN_PASSWORD 环境变量后运行 npm run admin:dev')
  }
}

await main()
