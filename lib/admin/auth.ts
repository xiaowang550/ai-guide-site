/**
 * 认证与会话：登录、登出、会话校验、登录限流。
 *
 * 本模块是「所有管理接口在服务端验证权限」这条要求的实现处。
 * 设计上刻意遵守两条规则：
 *
 * 1) **任何接口都不信任客户端传来的身份信息。**
 *    没有「前端传个 role=admin 就行」这条路，也没有把用户信息放在
 *    localStorage 里靠前端判断的方案。后台 UI 只是静态壳，
 *    未登录时连数据都拿不到 —— 这样即使有人直接访问后台 URL，
 *    也只能看到一个空壳和一堆 401。
 *
 * 2) **会话令牌只在服务端校验哈希。**
 *    Cookie 里是令牌明文，库里是 SHA-256。校验时先哈希再查库。
 */
import type { Db } from '../db/types.ts'
import { toInt, toText } from '../db/types.ts'
import {
  generateSessionToken,
  hashPassword,
  hashSessionToken,
  loginThrottleKey,
  verifyPassword,
  type PasswordRecord,
} from './crypto.ts'

export const SESSION_COOKIE = 'admin_session'

/** 会话有效期。12 小时：够覆盖一个工作日，不必每天重新登录 */
export const SESSION_TTL_SECONDS = 12 * 60 * 60

/** 登录限流：15 分钟内同一账号+IP 前缀失败 5 次就锁 */
export const LOGIN_MAX_FAILURES = 5
export const LOGIN_LOCK_SECONDS = 15 * 60

export type AdminRole = 'owner' | 'editor'

export interface AdminIdentity {
  username: string
  role: AdminRole
}

export interface RequestMeta {
  ip: string
  userAgent: string
}

/**
 * IP 掩码：IPv4 取 /24，IPv6 取 /48。
 *
 * 为什么存掩码而不是原值：
 * 站点对外承诺不做用户画像、不存个人信息。登录审计确实需要
 * 「这条会话是不是来自某个网段」这个级别的信息，但不需要精确到个人。
 * /24 对 IPv4 来说最多覆盖 256 个地址，已经足够区分正常用户与撞库，
 * 又无法定位到具体某台机器。
 *
 * 处理不了的输入（代理头格式异常等）一律返回 'unknown'，
 * 不因为解析失败就把原始字符串写进库。
 */
export function maskIp(ip: string): string {
  if (!ip) return 'unknown'
  const v4 = ip.split('.')
  // 必须校验取值范围：只检查「四位数字」的话 999.999.999.999 会被当成合法 IPv4，
  // 然后原样写进库。既不是有效地址，也不该被当作地址处理。
  if (v4.length === 4 && v4.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255)) {
    return `${v4[0]}.${v4[1]}.${v4[2]}.0/24`
  }
  if (ip.includes(':')) {
    const groups = ip.split(':').filter(Boolean)
    const keep = groups.slice(0, 3).join(':')
    return keep ? `${keep}::/48` : 'unknown'
  }
  return 'unknown'
}

export function nowIso(): string {
  return new Date().toISOString()
}

// ── Cookie ─────────────────────────────────────────────────────────────────

/**
 * 解析 Cookie 头。
 * 手写而不用任何库：这个站是纯静态站，admin 相关的依赖越少越好，
 * 而且这里只需要读一个键。
 */
export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const eq = part.indexOf('=')
    if (eq < 0) continue
    const k = part.slice(0, eq).trim()
    const v = part.slice(eq + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}

export interface CookieOptions {
  /** 只有 localhost/127.0.0.1 允许不带 Secure，否则一律带 */
  secure: boolean
  maxAge?: number
}

/**
 * 序列化会话 Cookie。
 *
 * `HttpOnly` 是必须的：否则任何 XSS 都能 `document.cookie` 读到令牌并冒用会话。
 * `SameSite=Strict` 挡住 CSRF —— 跨站请求不会带上这个 Cookie，
 * 攻击者即使诱导管理员点击也无法发起带会话的写操作。
 *
 * 关于 localhost 不带 Secure：浏览器的 Secure Cookie 在 http://localhost 上
 * 不会被发送，本地开发会直接登不上。但这个豁免**只对 localhost 开放**，
 * 否则任何 http 部署都会静默降级成明文传 Cookie。
 */
export function buildSessionCookie(token: string, opts: CookieOptions): string {
  const isLoopback = opts.secure === false
  const parts = [
    `${SESSION_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${opts.maxAge ?? SESSION_TTL_SECONDS}`,
  ]
  if (!isLoopback) parts.push('Secure')
  return parts.join('; ')
}

export function buildClearCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`
}

// ── 会话 ───────────────────────────────────────────────────────────────────

export async function createSession(
  db: Db,
  username: string,
  meta: RequestMeta
): Promise<string> {
  const token = generateSessionToken()
  const tokenHash = await hashSessionToken(token)
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString()
  await db.run(
    `INSERT INTO sessions (token_hash, username, expires_at, created_at, user_agent, ip_prefix)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      tokenHash,
      username,
      expiresAt,
      nowIso(),
      meta.userAgent.slice(0, 200),
      maskIp(meta.ip),
    ]
  )
  await db.run('UPDATE admins SET last_login_at = ? WHERE username = ?', [nowIso(), username])
  return token
}

/**
 * 校验会话令牌。
 *
 * 查库时**同时**比对 expires_at，而不是查出来再在 JS 里判断 ——
 * 这样过期会话不会占用连接，也避免时区/格式问题。
 * 条件里带上 username 是为了顺带取出角色，不用再查一次 admins 表。
 */
export async function verifySession(db: Db, token: string | null): Promise<AdminIdentity | null> {
  if (!token) return null
  const tokenHash = await hashSessionToken(token)
  const row = await db.first<{ username: string; role: string }>(
    `SELECT s.username AS username, a.role AS role
       FROM sessions s
       JOIN admins a ON a.username = s.username
      WHERE s.token_hash = ? AND s.expires_at > ?`,
    [tokenHash, nowIso()]
  )
  if (!row) return null
  return { username: toText(row.username), role: toText(row.role) as AdminRole }
}

export async function destroySession(db: Db, token: string | null): Promise<void> {
  if (!token) return
  await db.run('DELETE FROM sessions WHERE token_hash = ?', [await hashSessionToken(token)])
}

/** 清理过期会话。登录时顺手做一次，省掉定时任务 */
export async function pruneExpiredSessions(db: Db): Promise<number> {
  const res = await db.run('DELETE FROM sessions WHERE expires_at <= ?', [nowIso()])
  return res.changes
}

// ── 登录限流 ───────────────────────────────────────────────────────────────

interface AttemptRow {
  count: number
  locked_until: string | null
}

/**
 * 检查是否被锁。
 *
 * 限流键含 IP 掩码，所以换 IP 可以绕过 —— 这是有意的取舍：
 * 本站没有可信的反滥用基础设施（不想为了后台多上一套风控），
 * 锁住「同一账号短时间大量失败」能挡住最常见的撞库，
 * 但挡不住有耐心的分布式尝试。这条限制在后台登录页上写明。
 */
export async function isLoginLocked(
  db: Db,
  username: string,
  ipPrefix: string,
  siteSalt: string
): Promise<{ locked: boolean; until: string | null; remaining: number }> {
  const key = await loginThrottleKey(username, ipPrefix, siteSalt)
  const row = await db.first<AttemptRow>(
    'SELECT count, locked_until FROM login_attempts WHERE key = ?',
    [key]
  )
  if (!row) return { locked: false, until: null, remaining: LOGIN_MAX_FAILURES }
  const lockedUntil = toText(row.locked_until) || null
  if (lockedUntil && lockedUntil > nowIso()) {
    return { locked: true, until: lockedUntil, remaining: 0 }
  }
  const count = toInt(row.count)
  return {
    locked: false,
    until: null,
    remaining: Math.max(0, LOGIN_MAX_FAILURES - count),
  }
}

/** 记一次失败；达到阈值就锁 */
export async function recordLoginFailure(
  db: Db,
  username: string,
  ipPrefix: string,
  siteSalt: string
): Promise<{ remaining: number; lockedUntil: string | null }> {
  const key = await loginThrottleKey(username, ipPrefix, siteSalt)
  const windowStart = Math.floor(Date.now() / 60000)
  const lockedUntil =
    new Date(Date.now() + LOGIN_LOCK_SECONDS * 1000).toISOString()

  await db.run(
    `INSERT INTO login_attempts (key, username, window_start, count, locked_until)
     VALUES (?, ?, ?, 1, NULL)
     ON CONFLICT(key) DO UPDATE SET
       count = count + 1,
       locked_until = CASE WHEN count + 1 >= ? THEN ? ELSE locked_until END`,
    [key, username, windowStart, LOGIN_MAX_FAILURES, lockedUntil]
  )

  const row = await db.first<AttemptRow>(
    'SELECT count, locked_until FROM login_attempts WHERE key = ?',
    [key]
  )
  const count = toInt(row?.count)
  const until = toText(row?.locked_until) || null
  return {
    remaining: Math.max(0, LOGIN_MAX_FAILURES - count),
    lockedUntil: until && until > nowIso() ? until : null,
  }
}

export async function clearLoginFailures(
  db: Db,
  username: string,
  ipPrefix: string,
  siteSalt: string
): Promise<void> {
  const key = await loginThrottleKey(username, ipPrefix, siteSalt)
  await db.run('DELETE FROM login_attempts WHERE key = ?', [key])
}

/** 清理一小时前的限流计数桶，避免表无限增长 */
export async function pruneLoginAttempts(db: Db): Promise<number> {
  const cutoff = Math.floor(Date.now() / 60000) - 60
  const res = await db.run('DELETE FROM login_attempts WHERE window_start < ?', [cutoff])
  return res.changes
}

// ── 登录 ───────────────────────────────────────────────────────────────────

export interface LoginResult {
  ok: boolean
  token?: string
  identity?: AdminIdentity
  error?: string
  remaining?: number
  lockedUntil?: string | null
}

async function loadAdmin(db: Db, username: string) {
  return db.first<{
    username: string
    password_hash: string
    salt: string
    iterations: number
    role: string
  }>(
    'SELECT username, password_hash, salt, iterations, role FROM admins WHERE username = ?',
    [username]
  )
}

/**
 * 执行登录。
 *
 * 失败时**不区分「用户名不存在」和「密码错误」**，统一返回同一句话。
 * 区分等于开一个用户名枚举接口。
 *
 * 成功时顺带做两件维护：清理过期会话、清理旧限流桶。
 * 没有定时任务可用的环境（Workers）里，把维护挂在低频操作上是常见做法。
 */
export async function login(
  db: Db,
  username: string,
  password: string,
  meta: RequestMeta,
  siteSalt: string
): Promise<LoginResult> {
  const ipPrefix = maskIp(meta.ip)

  const lock = await isLoginLocked(db, username, ipPrefix, siteSalt)
  if (lock.locked) {
    return {
      ok: false,
      error: `登录失败次数过多，请在 ${lock.until} 之后再试。`,
      lockedUntil: lock.until,
    }
  }

  const admin = await loadAdmin(db, username)
  const record: PasswordRecord | null = admin
    ? {
        hash: toText(admin.password_hash),
        salt: toText(admin.salt),
        iterations: toInt(admin.iterations, 210000),
      }
    : null

  const valid = await verifyPassword(password, record)
  if (!valid || !admin) {
    const failure = await recordLoginFailure(db, username, ipPrefix, siteSalt)
    await pruneExpiredSessions(db)
    return {
      ok: false,
      error: failure.lockedUntil
        ? `用户名或密码不正确。已连续失败 ${LOGIN_MAX_FAILURES} 次，暂时锁定至 ${failure.lockedUntil}。`
        : '用户名或密码不正确。',
      remaining: failure.remaining,
      lockedUntil: failure.lockedUntil,
    }
  }

  await clearLoginFailures(db, username, ipPrefix, siteSalt)
  await pruneExpiredSessions(db)
  await pruneLoginAttempts(db)

  const token = await createSession(db, username, meta)
  return {
    ok: true,
    token,
    identity: { username, role: toText(admin.role) as AdminRole },
  }
}

/**
 * 改密码：要求先验证旧密码。
 *
 * 改完后**保留当前会话、踢掉该账号的其他所有会话**。
 * 不这么做的话，攻击者用旧密码建立的会话会一直有效到自然过期（最多 12 小时），
 * 用户以为「我已经改密码了」其实对方还能进后台。
 */
export async function changePassword(
  db: Db,
  username: string,
  oldPassword: string,
  newPassword: string,
  currentToken: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = await loadAdmin(db, username)
  if (!admin) return { ok: false, error: '账号不存在' }
  const ok = await verifyPassword(oldPassword, {
    hash: toText(admin.password_hash),
    salt: toText(admin.salt),
    iterations: toInt(admin.iterations, 210000),
  })
  if (!ok) return { ok: false, error: '当前密码不正确' }
  if (newPassword.length < 8) {
    return { ok: false, error: '新密码至少 8 位' }
  }
  const rec = await hashPassword(newPassword)
  await db.run(
    'UPDATE admins SET password_hash = ?, salt = ?, iterations = ? WHERE username = ?',
    [rec.hash, rec.salt, rec.iterations, username]
  )
  await db.run('DELETE FROM sessions WHERE username = ? AND token_hash != ?', [
    username,
    await hashSessionToken(currentToken),
  ])
  return { ok: true }
}
