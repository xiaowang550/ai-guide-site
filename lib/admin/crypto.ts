/**
 * 密码与会话令牌的加密原语。
 *
 * 选型说明（每一条都是「为什么不用更常见的那个」）：
 *
 * · **PBKDF2-SHA256 而不是 bcrypt/scrypt/argon2**
 *   Cloudflare Workers 没有 Node 原生模块，argon2/bcrypt 都装不了。
 *   WebCrypto（`crypto.subtle`）原生支持 PBKDF2，且 Workers 与 Node 22 都有，
 *   于是本地测试与线上跑的是**同一份实现**——不会出现「本地能登、线上登不上」。
 *   Cloudflare 生产环境单次 PBKDF2 上限为 100000；线上再用独立 ADMIN_PEPPER 做 HMAC。
 *
 * · **不使用 Node 的 crypto 模块**
 *   同一个文件要能在 Workers 里跑。任何 `import ... from 'node:crypto'` 都会让
 *   Pages Function 编译失败，而这种失败在本地（Node 环境）完全看不出来。
 *
 * · **会话令牌只存哈希**
 *   会话表是最容易被读到的数据（D1 控制台、备份、误配置的分析导出）。
 *   存哈希后表泄露也无法直接冒用：Cookie 里是原文，表里是哈希，攻击者需要两者。
 */

const PBKDF2_ITERATIONS = 100_000
const SALT_BYTES = 16
const TOKEN_BYTES = 32

/** base64url 编码：不用 Buffer（Workers 里没有），btoa 两侧都有 */
export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, '+').replace(/_/g, '/')
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function randomBytes(n: number): Uint8Array {
  const out = new Uint8Array(n)
  crypto.getRandomValues(out)
  return out
}

async function sha256(data: Uint8Array | string): Promise<Uint8Array> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource)
  return new Uint8Array(digest)
}

export async function sha256Base64Url(data: Uint8Array | string): Promise<string> {
  return toBase64Url(await sha256(data))
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password) as BufferSource,
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    key,
    256,
  )
  return new Uint8Array(bits)
}

/**
 * 恒定时间比较。
 *
 * 为什么必须恒定时间：普通 `a === b` 会在第一个不同的字节就返回，
 * 攻击者可以通过测量响应时间逐字节猜出正确的哈希。
 * 这里无论是否相同都走完整个循环。
 *
 * 注意长度不等时**不能**提前返回（那本身也泄露长度），
 * 但也不能对不同长度做循环（会越界）—— 折中做法是按较长者循环，
 * 长度差记入 diff，长度本身不是秘密（哈希长度是固定的）。
 */
export function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0)
  }
  return diff === 0
}

export interface PasswordRecord {
  hash: string
  salt: string
  iterations: number
}

/** 密钥单独存 Cloudflare Secret；数据库只保留加密认证码，不含 pepper。 */
async function pepperHash(derived: Uint8Array, pepper: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, derived as BufferSource))
}

/** 为新密码生成一条可入库的记录 */
export async function hashPassword(password: string, pepper?: string): Promise<PasswordRecord> {
  const salt = randomBytes(SALT_BYTES)
  const dk = await pbkdf2(password, salt, PBKDF2_ITERATIONS)
  return {
    hash: pepper ? 'p1:' + toBase64Url(await pepperHash(dk, pepper)) : toBase64Url(dk),
    salt: toBase64Url(salt),
    iterations: PBKDF2_ITERATIONS,
  }
}

/**
 * 校验密码。
 *
 * **用户不存在时也要走一遍 PBKDF2**，否则「账号不存在」比「密码错误」快得多，
 * 攻击者可以据此枚举出有哪些有效账号。
 * 这里用一个固定的假盐做等量计算，耗时与真实验证一致。
 */
export async function verifyPassword(
  password: string,
  record: PasswordRecord | null,
  pepper?: string,
): Promise<boolean> {
  if (!record) {
    const dummySalt = new Uint8Array(SALT_BYTES)
    const dummy = await pbkdf2(password, dummySalt, PBKDF2_ITERATIONS)
    if (pepper) await pepperHash(dummy, pepper)
    return false
  }
  let salt: Uint8Array
  try {
    salt = fromBase64Url(record.salt)
  } catch {
    return false
  }
  let dk = await pbkdf2(password, salt, record.iterations)
  const peppered = record.hash.startsWith('p1:')
  if (peppered) {
    if (!pepper) return false
    dk = await pepperHash(dk, pepper)
  }
  let expected: Uint8Array
  try {
    expected = fromBase64Url(peppered ? record.hash.slice(3) : record.hash)
  } catch {
    return false
  }
  return timingSafeEqual(dk, expected)
}

/** 生成会话令牌（明文，只出现在 Cookie 里；库里存它的哈希） */
export function generateSessionToken(): string {
  return toBase64Url(randomBytes(TOKEN_BYTES))
}

/** 令牌哈希：入库用 */
export async function hashSessionToken(token: string): Promise<string> {
  return sha256Base64Url(token)
}

/**
 * 登录限流的键。
 *
 * 用 SHA-256 而不是直接拼字符串：即便有人能读到 login_attempts，
 * 也不该从中反推出「某个 IP 在尝试某个用户名」。
 * 加盐（站点部署标识）是为了避免彩虹表 —— 不过这里的输入空间很小，
 * 真正的价值是让表本身不成为用户地址库。
 */
export async function loginThrottleKey(
  username: string,
  ipPrefix: string,
  siteSalt: string,
): Promise<string> {
  return sha256Base64Url(`${siteSalt}|${username}|${ipPrefix}`)
}

export const PBKDF2_DEFAULT_ITERATIONS = PBKDF2_ITERATIONS
