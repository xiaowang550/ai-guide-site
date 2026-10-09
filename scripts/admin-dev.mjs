import { checkToolSources } from '../lib/news/tool-watch.ts'
import { refreshNews } from '../lib/news/service.ts'
import { NEWS_REFRESH_MS } from '../lib/news/types.ts'
/**
 * 本地后台开发服务器。
 *
 * 存在的理由：后台需要一个能跑起来的地方，而 Cloudflare D1 需要线上资源。
 * 如果本地只能用 mock 验证，就会出现「本地全绿、线上 500」这类问题 ——
 * 尤其 D1 的 batch 语义、参数绑定、first() 返回 null 这些地方最容易出偏差。
 *
 * 所以这里**不重新实现任何逻辑**，只做三件事：
 *   1. 把 Node 的 req/res 翻译成 Web 标准 Request/Response
 *   2. 把 /api/* 交给 `handleApi` —— 与 Pages Functions 完全相同的函数
 *   3. 其余路径按静态文件提供（读 out/）
 *
 * 底层的 D1 由 `createD1Shim(createSqliteDb())` 提供，
 * 于是连 `createD1Db()` 这段适配代码也是本机跑过的。
 *
 * 用法：
 *   node --experimental-strip-types scripts/admin-dev.mjs 4100
 *   ADMIN_PASSWORD=... node --experimental-strip-types scripts/admin-dev.mjs 4100
 *
 * PowerShell 里设环境变量：
 *   $env:ADMIN_PASSWORD="你的密码"; npm run admin:dev
 */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createCodexBridge } from './codex-bridge.mjs'
import { readSiteConfig } from '../lib/admin/modules.ts'
import { moduleForPath, pathEnabled } from '../lib/site-modules.ts'
import { verifySession, parseCookies, SESSION_COOKIE } from '../lib/admin/auth.ts'
import { handleApi } from '../lib/admin/api.ts'
import { createSqliteDb } from '../lib/db/sqlite.ts'
import { createD1Shim } from '../lib/db/d1-shim.ts'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const projectRoot = resolve(__dirname, '..')
const outDir = join(projectRoot, 'out')
const schemaPath = join(projectRoot, 'db', 'schema.sql')
const dbPath = join(projectRoot, '.data', 'admin-dev.db')

const port = Number(process.argv[2]) || 4100

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
}

/** 建库并应用 schema */
async function openDb() {
  if (!existsSync(dbPath)) {
    const { mkdir } = await import('node:fs/promises')
    await mkdir(join(projectRoot, '.data'), { recursive: true })
  }
  const db = createSqliteDb({ path: dbPath })
  await db.exec(readFileSync(schemaPath, 'utf8'))
  return db
}

/** 读取请求体为 Buffer（构造 Web Request 需要已完整的 body） */
async function readBodyBuffer(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

/** Web Response → Node res。set-cookie 可能有多个，必须分开写 */
async function writeWebResponse(res, response) {
  const headers = {}
  for (const [k, v] of response.headers) {
    if (k === 'set-cookie') continue
    headers[k] = v
  }
  const setCookies =
    typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
  if (setCookies.length > 0) headers['set-cookie'] = setCookies

  res.writeHead(response.status, headers)
  const body = response.body ? Buffer.from(await response.arrayBuffer()) : Buffer.alloc(0)
  res.end(body)
}

/** 静态文件（读 out/），与站点现有的 trailingSlash: true 约定一致 */
async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname)
  if (rel.endsWith('/')) rel += 'index.html'
  // 目录穿越防护：归一化后必须仍在 out/ 之内
  const target = normalize(join(outDir, rel))
  if (!target.startsWith(outDir)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('Forbidden')
    return
  }

  let filePath = target
  try {
    const s = await stat(filePath)
    if (s.isDirectory()) filePath = join(filePath, 'index.html')
  } catch {
    // 没有扩展名时按目录式路由再试一次（/tools/kimi → /tools/kimi/index.html）
    if (!extname(target)) filePath = join(target, 'index.html')
  }

  try {
    const buf = await readFile(filePath)
    const type = MIME[extname(filePath)] ?? 'application/octet-stream'
    const isHtml = extname(filePath) === '.html'
    res.writeHead(200, {
      'content-type': type,
      'cache-control': isHtml ? 'no-cache' : 'public, max-age=0, must-revalidate',
    })
    res.end(buf)
  } catch {
    res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' })
    res.end(
      '<meta charset="utf-8"><h1>404</h1><p>本地开发服务器只提供 out/ 里的产物。先跑 <code>npm run build</code>。</p>',
    )
  }
}

const db = await openDb()
const codexBridge = await createCodexBridge(projectRoot, db)
const refreshLocalNews = () =>
  refreshNews(db)
    .then(async (result) => ({ ...result, tools: await checkToolSources(db) }))
    .then((result) => {
      if (!result.skipped) console.log('[news] 自动同步', JSON.stringify(result))
    })
    .catch((error) => console.error('[news] 自动同步失败', error.message))
void refreshLocalNews()
setInterval(() => void refreshLocalNews(), NEWS_REFRESH_MS).unref()

if (!existsSync(outDir)) {
  console.warn('[admin-dev] 提示：out/ 不存在，静态页面会 404。先运行 npm run build。')
}

const server = createServer(async (req, res) => {
  const host = req.headers.host ?? `localhost:${port}`
  const origin = `http://${host}`

  try {
    const url = new URL(req.url ?? '/', origin)

    if (url.pathname.startsWith('/api/')) {
      const body = await readBodyBuffer(req)
      const webReq = new Request(url, {
        method: req.method,
        headers: (() => {
          const h = new Headers()
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === 'string') h.set(k, v)
            else if (Array.isArray(v)) h.set(k, v.join(', '))
          }
          return h
        })(),
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      })

      const response = await handleApi(webReq, {
        DB: createD1Shim(db),
        CODEX_BRIDGE: codexBridge,
        SITE_SALT: process.env.SITE_SALT || 'local-dev-salt',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
        ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
      })

      if (response) {
        await writeWebResponse(res, response)
        return
      }
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' })
      res.end(JSON.stringify({ error: '接口不存在。' }))
      return
    }

    if (moduleForPath(url.pathname)) {
      const config = await readSiteConfig(db)
      const token = parseCookies(req.headers.cookie ?? null)[SESSION_COOKIE]
      const ownerPreview =
        url.searchParams.get('admin-preview') === '1' &&
        (await verifySession(db, token))?.role === 'owner'
      if (!pathEnabled(config, url.pathname) && !ownerPreview) {
        res.writeHead(404, {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
        })
        res.end('<meta charset="utf-8"><h1>这个栏目暂时关闭</h1><a href="/">返回首页</a>')
        return
      }
    }
    await serveStatic(req, res, url.pathname)
  } catch (e) {
    console.error('[admin-dev] 出错：', e)
    res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }))
  }
})

server.listen(port, () => {
  console.log(`[admin-dev] 后台开发服务器  http://localhost:${port}/admin/`)
  console.log(`[admin-dev] 数据库文件    ${dbPath}`)
  console.log(
    process.env.ADMIN_PASSWORD
      ? `[admin-dev] 初始管理员密码来自环境变量 ADMIN_PASSWORD`
      : `[admin-dev] 未设 ADMIN_PASSWORD。首次登录前请设置，或直接用 sqlite 建账号。`,
  )
})
