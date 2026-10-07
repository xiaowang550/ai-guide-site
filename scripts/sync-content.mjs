/**
 * 构建时内容同步：把后台已发布的内容拉成覆盖文件。
 *
 * ── 为什么不配任何凭据 ──
 *
 * 内容源的地址是 `GET /api/content/published`，**这是一个公开接口**。
 * 它返回的东西本来就是公开的 —— 公开站每个页面都渲染了同样的数据。
 * 所以构建机不需要 wrangler、不需要 API Token、不需要 .env 里的任何密钥。
 *
 * 这一点值得强调，因为它看起来像个漏洞：任何人拿到这个 JSON 都能读到工具资料。
 * 但他们本来就能从页面上读到同样的内容，所以这里没有额外泄露任何东西，
 * 只是省掉了整套构建凭据管理 —— 而凭据管理恰恰是最容易在部署时出错的一环。
 *
 * ── 失败时的行为 ──
 *
 * 拉不到内容（网络不通、后台还没部署、接口 500）时：
 *   1. 沿用上一次成功的覆盖文件（缓存在 .cache/）
 *   2. 都没有则写空覆盖 `{}`
 *   3. **照常构建**，站点保持基线内容发布
 *
 * 绝不能因为内容源不可达就让构建失败 —— 那意味着「后台临时故障 = 全站发不出去」，
 * 把一个局部故障放大成全局故障。
 *
 * 用法：
 *   node scripts/sync-content.mjs
 *   SITE_URL=http://localhost:4100 node --experimental-strip-types scripts/sync-content.mjs
 */
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { tools as baselineTools } from '../data/tools.ts'
import { buildOverrides } from '../lib/content/apply-overrides.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = resolve(__dirname, '..')

const OUT_PATH = join(projectRoot, 'data', 'generated', 'content-override.json')
const CACHE_DIR = join(projectRoot, '.cache')

/** 内容源地址 */
function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '')
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, '')
  return 'https://ai-guide-site.pages.dev'
}

/**
 * 缓存文件按**来源地址**分开存。
 *
 * 为什么必须分开：缓存里存的是「某个内容源的已发布快照」。
 * 如果本地用 SITE_URL=http://localhost:4100 拉到一份、之后构建时没设 SITE_URL
 * （回落到线上地址）而线上又拉不通，脚本会拿**本地那份缓存**去生成覆盖文件 ——
 * 于是本地实验用的内容被静默带进构建产物，而日志只写「沿用上次缓存」。
 * 缓存键加上来源地址之后，这种跨来源污染就不可能发生。
 */
function cachePaths(base) {
  const key = Buffer.from(base).toString('base64url').slice(0, 24)
  return {
    payload: join(CACHE_DIR, `content-published-${key}.json`),
    etag: join(CACHE_DIR, `content-published-${key}.etag`),
  }
}

/** 拉取已发布内容。返回 null 表示「拿不到，用缓存或空覆盖」 */
async function fetchPublished(base) {
  const url = `${base}/api/content/published`
  const { payload: cachePath, etag: etagPath } = cachePaths(base)

  let etag = null
  try {
    etag = (await readFile(etagPath, 'utf8')).trim() || null
  } catch {
    /* 首次运行没有缓存 */
  }

  try {
    const headers = etag ? { 'If-None-Match': etag } : {}
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(20000) })

    if (res.status === 304) {
      console.log('[sync] 内容未变化（304），沿用现有覆盖文件')
      return { items: null, etag }
    }
    if (!res.ok) {
      console.warn(`[sync] 内容源返回 ${res.status} ${res.statusText}，将沿用缓存`)
      return { items: null, etag }
    }

    const newEtag = res.headers.get('etag')
    const payload = await res.json()
    if (!payload || !Array.isArray(payload.items)) {
      console.warn('[sync] 内容源返回的不是预期结构，将沿用缓存')
      return { items: null, etag }
    }

    await mkdir(CACHE_DIR, { recursive: true })
    await writeFile(cachePath, JSON.stringify(payload), 'utf8')
    if (newEtag) await writeFile(etagPath, newEtag, 'utf8')

    return { items: payload.items, etag: newEtag }
  } catch (e) {
    console.warn(
      `[sync] 拉取 ${url} 失败：${e instanceof Error ? e.message : String(e)}`
    )
    return { items: null, etag }
  }
}

async function loadCachedItems(base) {
  try {
    const payload = JSON.parse(await readFile(cachePaths(base).payload, 'utf8'))
    return Array.isArray(payload?.items) ? payload.items : null
  } catch {
    return null
  }
}

function formatBytes(n) {
  return n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`
}

async function main() {
  // 先确保产物目录存在 —— 静态导入要求文件一定在，
  // 所以这个脚本**总是**会写出文件，哪怕内容是空的
  await mkdir(dirname(OUT_PATH), { recursive: true })

  const base = siteUrl()
  let items = null
  let sourceEtag = null

  const fetched = await fetchPublished(base)
  items = fetched.items
  sourceEtag = fetched.etag

  if (items === null) {
    const cached = await loadCachedItems(base)
    if (cached) {
      items = cached
      console.log(`[sync] 沿用 ${base} 上次缓存的内容（${cached.length} 条）`)
    } else {
      items = []
      console.log(`[sync] 无可用内容源（${base}），本次构建使用基线数据`)
    }
  }

  const overrides = buildOverrides(baselineTools, items)
  const count = Object.keys(overrides).length

  const file = {
    format: 'ai-guide-content-overrides',
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceEtag,
    overrides,
  }
  const text = JSON.stringify(file, null, 2)
  await writeFile(OUT_PATH, text, 'utf8')

  const size = (await stat(OUT_PATH)).size
  console.log(`[sync] 基线工具 ${baselineTools.length} 个，已发布内容 ${items.length} 条`)
  console.log(
    count === 0
      ? '[sync] 没有需要覆盖的工具 —— 站点内容与基线一致'
      : `[sync] ${count} 个工具有后台改动：${Object.keys(overrides).join(', ')}`
  )
  console.log(`[sync] 覆盖文件 data/generated/content-override.json（${formatBytes(size)}）`)
}

await main()
