/**
 * HTTP 层的共用工具：JSON 响应、错误格式、请求来源校验。
 *
 * 有意保持零依赖：站点是纯静态站，后台相关的依赖越少，
 * 部署时出问题的可能性就越小。这里需要的东西（Request/Response/
 * URL/Headers/crypto）全是 Web 标准，在 Workers 与 Node 上行为一致。
 */

export interface ApiError {
  error: string
  /** 字段级校验问题，前端表单直接渲染 */
  issues?: { field: string; message: string }[]
  /** 剩余登录次数等 */
  meta?: Record<string, unknown>
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // 后台接口一律不缓存：缓存一个带权限判断的响应，
      // 会在「A 登出后 B 看到 A 的数据」这类问题上直接翻车。
      'cache-control': 'no-store',
      // JSON 接口只要带 nosniff，浏览器就不会把返回内容当成 HTML 执行。
      // 这里的响应体会包含用户提交的反馈文本，不能冒这个险。
      'x-content-type-options': 'nosniff',
      ...headers,
    },
  })
}

export function fail(status: number, error: string, extra?: Omit<ApiError, 'error'>): Response {
  return json({ error, ...extra }, status)
}

export const unauthorized = () => fail(401, '未登录或会话已过期，请重新登录。')
export const forbidden = (msg = '没有权限执行该操作。') => fail(403, msg)
export const notFound = (msg = '内容不存在。') => fail(404, msg)

/**
 * 校验写操作的来源。
 *
 * 会话 Cookie 已经是 SameSite=Strict，跨站请求不会带上它，
 * 这一层是第二道防线：万一将来 Cookie 属性被改宽了，
 * 这里还能挡住「诱导管理员点开一个恶意页面就发一次写请求」。
 *
 * 判据是 Origin 与请求自身 URL 的 origin 是否一致。
 * 不用 Sec-Fetch-Site 是因为它在部分浏览器/场景下不可靠，
 * 而 Origin 在所有现代浏览器发跨站请求时都会带上。
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin')
  // 没有 Origin 头：同源导航的表单提交可能不带，也可能被浏览器策略省掉。
  // 这里不放行无 Origin 的写请求 —— 后台的所有写操作都由 fetch 发起，
  // 一定会带 Origin。放行会让「无 Origin 即放行」成为绕过点。
  if (!origin) return false
  try {
    return new URL(origin).origin === new URL(request.url).origin
  } catch {
    return false
  }
}

export async function readJson<T = unknown>(request: Request): Promise<T | null> {
  try {
    const text = await request.text()
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

/** 取字符串参数，带长度上限。防止把超长字符串塞进 SQL 参数 */
export function str(value: unknown, max = 200): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

/**
 * 取正整数参数。
 *
 * **null / undefined / 空串一律走兜底值，而不是当成 0。**
 *
 * 这一条是被测试逼出来的：`Number(null)` 是 0，`Number(undefined)` 是 NaN。
 * 如果不显式处理，URL 里没写 `?limit=` 时会得到 0，
 * 再被下游 `Math.max(0, 1)` 夹成 1 —— 于是审计日志、反馈列表、待办列表
 * 全部只返回 1 条，而接口本身返回 200，看起来完全正常。
 * 这种「静默少数据」的 bug 比报错难查得多。
 */
export function intParam(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback
  if (typeof value === 'boolean') return fallback
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.trunc(n)
}

export interface RequestMetaLite {
  ip: string
  userAgent: string
}

/**
 * 从请求里取 IP 与 UA。
 *
 * CF-Connecting-IP 是 Cloudflare 自己加的，可信度高于 X-Forwarded-For
 * （后者可被客户端伪造）。本地开发没有这个头，回退到 XFF 再回退到 'unknown'。
 */
export function requestMeta(request: Request): RequestMetaLite {
  return {
    ip:
      request.headers.get('CF-Connecting-IP') ??
      request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
      'unknown',
    userAgent: request.headers.get('User-Agent') ?? '',
  }
}

/**
 * 算内容快照的 ETag。
 *
 * 用于 `GET /api/content/published`：公开内容没有变化时返回 304，
 * 每次构建同步就能省掉一次几百 KB 的传输。
 */
export function weakEtag(text: string): string {
  // FNV-1a 32 位：够用（这里只用于避免重复传输，不是安全用途）。
  // 不用 crypto.subtle 是因为这个接口每次构建都会被调，异步哈希的收益不抵复杂度。
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return `W/"${text.length.toString(16)}-${h.toString(16)}"`
}
