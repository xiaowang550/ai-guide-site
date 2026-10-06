/**
 * AI 代理 —— Cloudflare Worker（可直接部署，无需构建步骤）
 *
 * 为什么需要它（两件事都是硬需求）：
 *
 * 1) Key 安全：网站是纯静态导出，把 Key 写进前端 = 公开给所有访客。
 *    代理让 Key 只存在于服务端环境变量里，浏览器只跟自己的域名通信。
 *
 * 2) CORS：部分服务商不允许浏览器直连（实测 OpenCode Zen 的预检 OPTIONS 返回 404，
 *    浏览器两种请求方式都 Failed to fetch），必须由服务端转发。
 *
 * 部署步骤：
 *   1. 登录 Cloudflare Dashboard → Workers & Pages → Create Worker
 *   2. 粘贴本文件代码 → Deploy
 *   3. Settings → Variables and Secrets 添加：
 *        UPSTREAM_URL  = 上游地址，例如 https://opencode.ai/zen/v1/chat/completions
 *        UPSTREAM_KEY  = 上游 API Key（如果上游免 Key 可不填）
 *      用 Secrets 而不是普通变量，Key 不会出现在代码里
 *   4. 在助手「设置 → AI 模式」把接口地址填成
 *        https://<你的 worker 域名>/v1/chat/completions
 *
 * 额外能力：
 *   - 白名单来源域名（避免被别人白嫖你的额度）
 *   - 按 IP 的基础限流
 *   - 只允许 POST 与 chat/completions 路径
 *   - 透传上游返回（含错误原文），便于定位问题
 */

// ── 需要你填的配置 ──────────────────────────────
const ALLOWED_ORIGINS = [
  // 把你的站点域名加进来；本地调试可保留 http://localhost:4000
  'http://localhost:4000',
  // 'https://你的站点域名',
]
const RATE_LIMIT_PER_MIN = 30 // 每分钟每个 IP 的请求上限
// ────────────────────────────────────────────────

const memory = new Map() // ip -> { minute, count }

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

function jsonResponse(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
  })
}

function rateLimited(ip) {
  const minute = Math.floor(Date.now() / 60000)
  const entry = memory.get(ip)
  if (!entry || entry.minute !== minute) {
    memory.set(ip, { minute, count: 1 })
    return false
  }
  entry.count += 1
  return entry.count > RATE_LIMIT_PER_MIN
}

const worker = {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) })
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: { message: '只接受 POST' } }, 405, origin)
    }
    if (!url.pathname.endsWith('/chat/completions')) {
      return jsonResponse({ error: { message: '路径必须是 /v1/chat/completions' } }, 404, origin)
    }
    if (!env.UPSTREAM_URL) {
      return jsonResponse(
        { error: { message: '代理未配置：请在 Worker 设置里添加变量 UPSTREAM_URL' } },
        500,
        origin
      )
    }

    const ip =
      request.headers.get('CF-Connecting-IP') ||
      request.headers.get('X-Forwarded-For') ||
      'unknown'
    if (rateLimited(ip)) {
      return jsonResponse(
        { error: { message: `请求过于频繁，每分钟最多 ${RATE_LIMIT_PER_MIN} 次` } },
        429,
        origin
      )
    }

    let body
    try {
      body = await request.text()
    } catch {
      return jsonResponse({ error: { message: '读取请求体失败' } }, 400, origin)
    }

    try {
      const upstream = await fetch(env.UPSTREAM_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(env.UPSTREAM_KEY ? { authorization: `Bearer ${env.UPSTREAM_KEY}` } : {}),
        },
        body,
      })

      // 原样透传上游响应与状态码：成功是 completion，失败是上游的错误原文，
      // 前端据此给出可操作的提示，不要在这里吞掉。
      const text = await upstream.text()
      return new Response(text, {
        status: upstream.status,
        headers: { 'content-type': 'application/json; charset=utf-8', ...corsHeaders(origin) },
      })
    } catch (e) {
      return jsonResponse(
        { error: { message: `代理请求上游失败：${e instanceof Error ? e.message : String(e)}` } },
        502,
        origin
      )
    }
  },
}

export default worker
