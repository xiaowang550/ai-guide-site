/**
 * 本地预览服务器（带可选 AI 代理）
 *
 * 为什么需要代理：
 * 本站是纯静态导出，浏览器直连第三方 AI 接口有两个问题 ——
 * 1) Key 写在前端等于公开给所有访客
 * 2) 部分服务商（如 OpenCode Zen）不允许浏览器直连，会被 CORS 拦掉
 *
 * 代理把这两件事都解决：Key 只存在服务端，浏览器只跟自己的域名说话。
 * 生产环境请用 proxy/cloudflare-worker.js（同样的逻辑，部署在 Cloudflare 上）。
 *
 * 用法：
 *   node scripts/serve-out.mjs 4000
 *   AI_PROXY_UPSTREAM=https://opencode.ai/zen/v1/chat/completions \
 *   AI_PROXY_KEY=你的key \
 *   node scripts/serve-out.mjs 4000
 * 开启后助手 /settings 里的接口地址填 http://localhost:4000/api/chat 即可。
 */
import { createServer } from 'node:http'
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, normalize, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', 'out')
const port = Number(process.argv[2] ?? 4000)

const PROXY_PATH = '/api/chat'
const UPSTREAM = process.env.AI_PROXY_UPSTREAM ?? ''
const UPSTREAM_KEY = process.env.AI_PROXY_KEY ?? ''
const proxyEnabled = Boolean(UPSTREAM)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.woff2': 'font/woff2',
}

const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.xml', '.txt'])

if (!existsSync(root)) {
  console.error('找不到 out 目录，请先执行：npm run build')
  process.exit(1)
}

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const safe = normalize(clean).replace(/^(\.\.[/\\])+/, '')
  const candidates = [join(root, safe), join(root, safe, 'index.html'), join(root, `${safe}.html`)]
  for (const file of candidates) {
    if (file.startsWith(root) && existsSync(file) && statSync(file).isFile()) return file
  }
  return null
}

function cacheControl(urlPath) {
  if (urlPath.startsWith('/_next/static/')) return 'public, max-age=31536000, immutable'
  if (urlPath.endsWith('.html') || urlPath === '/' || urlPath.endsWith('/')) return 'no-cache'
  if (urlPath.startsWith('/logos/') || urlPath.startsWith('/icon')) return 'public, max-age=2592000'
  return 'public, max-age=3600'
}

const gzipCache = new Map()

function maybeGzip(file, acceptEncoding) {
  const ext = extname(file).toLowerCase()
  if (!COMPRESSIBLE.has(ext)) return null
  if (!/\bgzip\b/.test(acceptEncoding ?? '')) return null
  if (gzipCache.has(file)) return gzipCache.get(file)
  const buf = gzipSync(readFileSync(file), { level: 6 })
  gzipCache.set(file, buf)
  return buf
}

function sendJson(res, status, payload, origin) {
  const buf = Buffer.from(JSON.stringify(payload))
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(buf.length),
    ...(origin ? { 'access-control-allow-origin': origin } : {}),
  })
  res.end(buf)
}

const RATE_LIMIT_FILE = join(__dirname, '.rate-limit')
const RATE_LIMIT_PER_MIN = 20

/** 极简限流：单分钟最多 N 次。生产环境请用 proxy/cloudflare-worker.js（有能力做更强的防护） */
function bumpRateLimit() {
  const minute = Math.floor(Date.now() / 60000)
  try {
    // 首次读取必然是「文件不存在」，这属于正常初始状态，
    // 不能当成错误直接放行 —— 那样计数器永远不会被写入，限流形同虚设。
    let count = 0
    try {
      const [prevMinute, prevCount] = readFileSync(RATE_LIMIT_FILE, 'utf8').trim().split(':')
      if (prevMinute === String(minute)) count = Number(prevCount || 0)
    } catch {
      count = 0 // 还没有计数文件
    }
    if (count >= RATE_LIMIT_PER_MIN) return false
    writeFileSync(RATE_LIMIT_FILE, minute + ':' + (count + 1))
    return true
  } catch (e) {
    // 真写不进去（例如只读文件系统）：宁可放行，也不要让调试功能挡住正常使用
    console.warn('[proxy] 限流状态不可用，本次放行：', e.message)
    return true
  }
}

/** 代理：把浏览器的 OpenAI 兼容请求转发到上游，Key 只在服务端补上 */
async function handleProxy(req, res) {
  // 浏览器跨域调用会先发 OPTIONS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': req.headers.origin || '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'Content-Type, Authorization',
      'access-control-max-age': '86400',
      vary: 'Origin',
    })
    res.end()
    return
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: { message: '只接受 POST' } })
    return
  }
  if (!UPSTREAM_KEY && !/opencode\.ai|localhost/i.test(UPSTREAM)) {
    sendJson(res, 500, {
      error: {
        message:
          '代理没有配置 Key。启动时加上环境变量 AI_PROXY_UPSTREAM 与 AI_PROXY_KEY；' +
          '如果上游是 OpenCode Zen 这类免 Key 通道，则只给 AI_PROXY_UPSTREAM 即可。',
      },
    })
    return
  }

  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')

  let body
  try {
    body = JSON.parse(raw)
  } catch {
    sendJson(res, 400, { error: { message: '请求体不是合法 JSON' } })
    return
  }

  if (!bumpRateLimit()) {
    sendJson(res, 429, { error: { message: `请求过于频繁，每分钟最多 ${RATE_LIMIT_PER_MIN} 次` } })
    return
  }

  try {
    const upstreamRes = await fetch(UPSTREAM, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(UPSTREAM_KEY ? { authorization: `Bearer ${UPSTREAM_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    })
    const text = await upstreamRes.text()
    res.writeHead(upstreamRes.status, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': String(Buffer.byteLength(text)),
    })
    res.end(text)
  } catch (e) {
    sendJson(res, 502, {
      error: { message: `代理请求上游失败：${e instanceof Error ? e.message : String(e)}` },
    })
  }
}

createServer((req, res) => {
  const urlPath = (req.url ?? '/').split('?')[0]

  if (urlPath === PROXY_PATH) {
    void handleProxy(req, res)
    return
  }

  const file = resolveFile(urlPath)
  const target = file ?? join(root, '404.html')
  const status = file ? 200 : 404

  if (!existsSync(target)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('404 Not Found')
    return
  }

  const ext = extname(target).toLowerCase()
  const headers = {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': cacheControl(urlPath),
    vary: 'Accept-Encoding',
  }

  const gz = maybeGzip(target, req.headers['accept-encoding'])
  if (gz) {
    headers['content-encoding'] = 'gzip'
    headers['content-length'] = String(gz.length)
    res.writeHead(status, headers)
    res.end(gz)
    return
  }

  headers['content-length'] = String(statSync(target).size)
  res.writeHead(status, headers)
  createReadStream(target).pipe(res)
}).listen(port, () => {
  console.log(`静态预览已启动：http://localhost:${port}`)
  console.log('已启用 gzip 与缓存头（对齐真实托管）')
  if (proxyEnabled) {
    console.log(`AI 代理已开启：${PROXY_PATH} -> ${UPSTREAM}（Key ${UPSTREAM_KEY ? '已配置' : '未配置，上游免 Key'}）`)
    console.log(`在助手「设置 → AI 模式」里把接口地址填成 http://localhost:${port}${PROXY_PATH}`)
  } else {
    console.log('如需本地测试真实大模型：加环境变量 AI_PROXY_UPSTREAM（可选 AI_PROXY_KEY）后重启')
    console.log('生产环境请部署 proxy/cloudflare-worker.js')
  }
})