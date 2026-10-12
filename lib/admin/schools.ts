import type { Db } from '../db/types.ts'
import { hashPassword, verifyPassword, generateSessionToken, hashSessionToken } from './crypto.ts'
import {
  nowIso,
  maskIp,
  parseCookies,
  SESSION_COOKIE,
  verifySession,
  isLoginLocked,
  recordLoginFailure,
  clearLoginFailures,
  SESSION_TTL_SECONDS,
} from './auth.ts'

export const SCHOOL_COOKIE = 'school_session'
export const SCHOOL_SCHEMA = `CREATE TABLE IF NOT EXISTS school_accounts (
 id TEXT PRIMARY KEY, school_name TEXT NOT NULL, username TEXT NOT NULL UNIQUE,
 password_hash TEXT NOT NULL, salt TEXT NOT NULL, iterations INTEGER NOT NULL,
 enabled INTEGER NOT NULL DEFAULT 1, version INTEGER NOT NULL DEFAULT 1,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, last_login_at TEXT);
CREATE TABLE IF NOT EXISTS school_sessions (
 token_hash TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES school_accounts(id) ON DELETE CASCADE,
 expires_at TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS school_session_account ON school_sessions(account_id);`
export interface SchoolAccount {
  id: string
  schoolName: string
  username: string
  enabled: boolean
  version: number
  createdAt: string
  updatedAt: string
  lastLoginAt: string | null
}
export interface SchoolIdentity {
  id: string
  schoolName: string
  username: string
  role: 'school' | 'owner'
}
type AccountRow = {
  id: string
  school_name: string
  username: string
  enabled: number
  version: number
  created_at: string
  updated_at: string
  last_login_at: string | null
}
export class SchoolInputError extends Error {}
export class SchoolConflictError extends Error {}
export async function ensureSchools(db: Db) {
  try {
    await db.first('SELECT id FROM school_accounts LIMIT 1')
    await db.first('SELECT token_hash FROM school_sessions LIMIT 1')
  } catch {
    await db.exec(SCHOOL_SCHEMA)
  }
}
const account = (r: AccountRow): SchoolAccount => ({
  id: r.id,
  schoolName: r.school_name,
  username: r.username,
  enabled: r.enabled === 1,
  version: r.version,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  lastLoginAt: r.last_login_at,
})
export async function listSchoolAccounts(db: Db) {
  await ensureSchools(db)
  return (
    await db.all<AccountRow>(
      'SELECT id,school_name,username,enabled,version,created_at,updated_at,last_login_at FROM school_accounts ORDER BY created_at DESC,id',
    )
  ).map(account)
}
/** Updates and session revocation are one transaction; passwords never enter audit records. */
export async function saveSchoolAccount(
  db: Db,
  id: string | null,
  input: unknown,
  actor: string,
  pepper?: string,
) {
  await ensureSchools(db)
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new SchoolInputError('请填写学校账号信息。')
  const b = input as Record<string, unknown>
  if (
    Object.keys(b).some(
      (k) => !['schoolName', 'username', 'password', 'enabled', 'version'].includes(k),
    )
  )
    throw new SchoolInputError('包含不支持的账号字段。')
  const old = id
    ? await db.first<AccountRow>(
        'SELECT id,school_name,username,enabled,version,created_at,updated_at,last_login_at FROM school_accounts WHERE id=?',
        [id],
      )
    : null
  if (id && !old) throw new SchoolInputError('学校账号不存在。')
  if (old && b.version !== old.version)
    throw new SchoolConflictError('账号已在其他页面修改，请刷新后重试。')
  const name = b.schoolName ?? old?.school_name,
    username = b.username ?? old?.username,
    enabled = b.enabled ?? (old ? old.enabled === 1 : true)
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 80)
    throw new SchoolInputError('学校名称需为 1–80 字。')
  if (typeof username !== 'string' || !/^[a-zA-Z0-9_-]{4,40}$/.test(username))
    throw new SchoolInputError('账号需为 4–40 位字母、数字、下划线或短横线。')
  if (typeof enabled !== 'boolean') throw new SchoolInputError('账号状态必须是开关值。')
  const password = b.password
  if (
    password !== undefined &&
    (typeof password !== 'string' || password.length < 10 || password.length > 128)
  )
    throw new SchoolInputError('密码需为 10–128 位。')
  if (!old && typeof password !== 'string') throw new SchoolInputError('创建账号时请设置密码。')
  if (
    await db.first('SELECT id FROM school_accounts WHERE username=? AND id!=?', [
      username,
      id ?? '',
    ])
  )
    throw new SchoolInputError('这个学校账号已存在，请换一个。')
  const rec = typeof password === 'string' ? await hashPassword(password, pepper) : null
  const nextId = id ?? crypto.randomUUID(),
    now = nowIso()
  const statements = old
    ? [
        {
          sql: `UPDATE school_accounts SET school_name=?,username=?,enabled=?,version=version+1,updated_at=?${rec ? ',password_hash=?,salt=?,iterations=?' : ''} WHERE id=? AND version=?`,
          params: [
            name.trim(),
            username,
            enabled ? 1 : 0,
            now,
            ...(rec ? [rec.hash, rec.salt, rec.iterations] : []),
            nextId,
            old.version,
          ],
        },
      ]
    : [
        {
          sql: 'INSERT INTO school_accounts(id,school_name,username,password_hash,salt,iterations,enabled,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',
          params: [
            nextId,
            name.trim(),
            username,
            rec!.hash,
            rec!.salt,
            rec!.iterations,
            enabled ? 1 : 0,
            now,
            now,
          ],
        },
      ]
  // The no-op CAS is checked again inside the transaction, before any revocation.
  if (old)
    statements.unshift({
      sql: `INSERT INTO school_accounts(id,school_name,username,password_hash,salt,iterations,created_at,updated_at) SELECT id,school_name,username,'','',1,'','' FROM school_accounts WHERE id=? AND version!=?`,
      params: [nextId, old.version],
    })
  if (old && (rec || !enabled))
    statements.push({ sql: 'DELETE FROM school_sessions WHERE account_id=?', params: [nextId] })
  statements.push({
    sql: 'INSERT INTO audit_log(at,actor,action,target,detail) VALUES(?,?,?,?,?)',
    params: [
      now,
      actor,
      old ? 'school-account-update' : 'school-account-create',
      nextId,
      JSON.stringify({ username, enabled, passwordReset: !!rec && !!old }),
    ],
  })
  try {
    await db.batch(statements)
  } catch (e) {
    if (/UNIQUE|constraint/i.test(String(e)))
      throw new SchoolConflictError('账号已被修改或名称已占用，请刷新后重试。')
    throw e
  }
  return account(
    (await db.first<AccountRow>(
      'SELECT id,school_name,username,enabled,version,created_at,updated_at,last_login_at FROM school_accounts WHERE id=?',
      [nextId],
    ))!,
  )
}
export function schoolCookie(token: string, secure: boolean, maxAge = SESSION_TTL_SECONDS) {
  return `${SCHOOL_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`
}
export async function loginSchool(
  db: Db,
  username: string,
  password: string,
  ip: string,
  siteSalt: string,
  pepper?: string,
) {
  await ensureSchools(db)
  const bucket = 'school:' + username,
    prefix = maskIp(ip),
    lock = await isLoginLocked(db, bucket, prefix, siteSalt)
  if (lock.locked) return { ok: false, error: '登录尝试过多，请 15 分钟后重试。', locked: true }
  const row = await db.first<
    AccountRow & { password_hash: string; salt: string; iterations: number }
  >('SELECT * FROM school_accounts WHERE username=?', [username])
  const valid = await verifyPassword(
    password,
    row ? { hash: row.password_hash, salt: row.salt, iterations: row.iterations } : null,
    pepper,
  )
  if (!valid || !row || row.enabled !== 1) {
    await recordLoginFailure(db, bucket, prefix, siteSalt)
    return { ok: false, error: '账号或密码不正确，或账号已停用。' }
  }
  const token = generateSessionToken(),
    now = nowIso(),
    hash = await hashSessionToken(token)
  // An account may be disabled while password verification is running. Never grant that session.
  await db.batch([
    { sql: 'DELETE FROM school_sessions WHERE expires_at<=?', params: [now] },
    {
      sql: 'INSERT INTO school_sessions(token_hash,account_id,expires_at,created_at) SELECT ?,id,?,? FROM school_accounts WHERE id=? AND enabled=1 AND version=?',
      params: [
        hash,
        new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString(),
        now,
        row.id,
        row.version,
      ],
    },
    {
      sql: 'UPDATE school_accounts SET last_login_at=? WHERE id=? AND enabled=1 AND version=?',
      params: [now, row.id, row.version],
    },
  ])
  if (!(await db.first('SELECT token_hash FROM school_sessions WHERE token_hash=?', [hash])))
    return { ok: false, error: '账号状态已变更，请重新登录。' }
  await clearLoginFailures(db, bucket, prefix, siteSalt)
  return {
    ok: true,
    token,
    identity: {
      id: row.id,
      schoolName: row.school_name,
      username: row.username,
      role: 'school' as const,
    },
  }
}
export async function schoolIdentity(db: Db, request: Request): Promise<SchoolIdentity | null> {
  const cookies = parseCookies(request.headers.get('cookie'))
  if (cookies[SCHOOL_COOKIE]) {
    await ensureSchools(db)
    const row = await db.first<{ id: string; school_name: string; username: string }>(
      'SELECT a.id,a.school_name,a.username FROM school_sessions s JOIN school_accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? AND a.enabled=1',
      [await hashSessionToken(cookies[SCHOOL_COOKIE]), nowIso()],
    )
    if (row)
      return { id: row.id, schoolName: row.school_name, username: row.username, role: 'school' }
  }
  const owner = await verifySession(db, cookies[SESSION_COOKIE] ?? null)
  return owner?.role === 'owner'
    ? { id: 'owner', schoolName: '管理员预览', username: owner.username, role: 'owner' }
    : null
}
export async function logoutSchool(db: Db, request: Request) {
  const token = parseCookies(request.headers.get('cookie'))[SCHOOL_COOKIE]
  if (token) {
    await ensureSchools(db)
    await db.run('DELETE FROM school_sessions WHERE token_hash=?', [await hashSessionToken(token)])
  }
}
export function normalizedSchoolPath(path: string) {
  try {
    path = decodeURIComponent(path)
  } catch {
    return ''
  }
  path = new URL(path.replace(/\\/g, '/'), 'https://school-path.invalid').pathname
  return path
    .replace(/\/+$/, '')
    .replace(/\.(?:txt|html)$/i, '')
    .toLowerCase()
}
export function schoolPath(path: string) {
  path = normalizedSchoolPath(path)
  return path === '/edu' || path.startsWith('/edu/')
}
export async function schoolPageAccess(db: Db, request: Request): Promise<Response | null> {
  const url = new URL(request.url)
  if (!schoolPath(url.pathname)) return null
  if (await schoolIdentity(db, request)) return null
  const next = url.pathname.replace(/\.(?:txt|html)$/, '') + url.search
  return new Response(null, {
    status: 303,
    headers: {
      location: '/school/login/?next=' + encodeURIComponent(next),
      'cache-control': 'private, no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
