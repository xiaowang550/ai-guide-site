/**
 * 反馈：公开端提交 + 后台受理。
 *
 * 与 GitHub Issues 通道并存而不是替换：Issues 方式适合「愿意去 GitHub 提 issue 的人」，
 * 表单方式适合「只想说一句的普通访客」。两条通道都得留着。
 */
import type { Db } from '../db/types.ts'
import { toInt, toText } from '../db/types.ts'
import { maskIp, nowIso } from './auth.ts'
import { sha256Base64Url } from './crypto.ts'

export const FEEDBACK_KINDS = ['errata', 'correction', 'question', 'suggestion'] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  errata: '内容有误',
  correction: '数据要改',
  question: '想问一个问题',
  suggestion: '建议',
}

export const FEEDBACK_STATUSES = ['new', 'triaged', 'resolved', 'dismissed'] as const
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  new: '待处理',
  triaged: '处理中',
  resolved: '已解决',
  dismissed: '已忽略',
}

/** 提交频率：同一 IP 掩码每分钟最多 3 条 */
export const FEEDBACK_MAX_PER_MINUTE = 3

export interface SubmitResult {
  ok: boolean
  id?: string
  error?: string
}

/**
 * 通用限流。返回 true 表示「超限了，应当拒绝」。
 *
 * 用 UPSERT 而不是「先查再写」：并发下两个请求可能同时查到 count=0 然后都写入，
 * 结果限流失效。UPSERT 在数据库内部完成读-改-写，是原子的。
 */
export async function isRateLimited(
  db: Db,
  purpose: string,
  ipPrefix: string,
  siteSalt: string,
  limitPerMinute: number
): Promise<boolean> {
  const key = await sha256Base64Url(`${siteSalt}|${purpose}|${ipPrefix}`)
  const windowStart = Math.floor(Date.now() / 60000)
  await db.run(
    `INSERT INTO rate_limits (key, purpose, window_start, count) VALUES (?, ?, ?, 1)
     ON CONFLICT(key) DO UPDATE SET count = count + 1
     WHERE window_start = ?`,
    [key, purpose, windowStart, windowStart]
  )
  const row = await db.first<{ count: number }>(
    'SELECT count FROM rate_limits WHERE key = ? AND window_start = ?',
    [key, windowStart]
  )
  return toInt(row?.count) > limitPerMinute
}

/** 清理一小时前的限流桶 */
export async function pruneRateLimits(db: Db): Promise<number> {
  const cutoff = Math.floor(Date.now() / 60000) - 60
  const res = await db.run('DELETE FROM rate_limits WHERE window_start < ?', [cutoff])
  return res.changes
}

function newId(): string {
  return crypto.randomUUID()
}

/** 联系方式只接受看起来像邮箱的值，且长度受限 */
function sanitizeContact(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  if (!v) return null
  if (v.length > 120) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null
}

/** 页面地址只保留站内路径，去掉一切可能的外部内容 */
function sanitizePageUrl(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  if (!v || v.length > 300) return null
  try {
    const u = new URL(v, 'https://placeholder.invalid')
    if (u.origin !== 'https://placeholder.invalid') return null
    return `${u.pathname}${u.search}`.slice(0, 300)
  } catch {
    return null
  }
}

export async function submitFeedback(
  db: Db,
  params: {
    kind?: string
    message: unknown
    contact?: unknown
    pageUrl?: unknown
    ip: string
    siteSalt: string
  }
): Promise<SubmitResult> {
  const message = typeof params.message === 'string' ? params.message.trim() : ''
  if (message.length < 5) return { ok: false, error: '内容太短了，至少 5 个字。' }
  if (message.length > 2000) return { ok: false, error: '内容太长了，控制在 2000 字以内。' }

  const kind = (FEEDBACK_KINDS as readonly string[]).includes(String(params.kind))
    ? (params.kind as FeedbackKind)
    : 'errata'

  const ipPrefix = maskIp(params.ip)
  if (await isRateLimited(db, 'feedback', ipPrefix, params.siteSalt, FEEDBACK_MAX_PER_MINUTE)) {
    return { ok: false, error: '提交太频繁了，请一分钟后再试。' }
  }

  const id = newId()
  const now = nowIso()
  await db.run(
    `INSERT INTO feedback (id, kind, page_url, contact, message, status, source, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'new', 'public', ?, ?)`,
    [
      id,
      kind,
      sanitizePageUrl(params.pageUrl),
      sanitizeContact(params.contact),
      message,
      now,
      now,
    ]
  )
  return { ok: true, id }
}

export interface FeedbackRow {
  id: string
  kind: string
  page_url: string | null
  contact: string | null
  message: string
  status: string
  handled_by: string | null
  handled_note: string | null
  source: string
  created_at: string
  updated_at: string
}

export async function listFeedback(
  db: Db,
  opts: { status?: string; limit?: number } = {}
): Promise<FeedbackRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 500)
  const sql = opts.status
    ? 'SELECT * FROM feedback WHERE status = ? ORDER BY created_at DESC LIMIT ?'
    : 'SELECT * FROM feedback ORDER BY created_at DESC LIMIT ?'
  const params = opts.status ? [opts.status, limit] : [limit]
  return db.all<FeedbackRow>(sql, params)
}

export async function getFeedback(db: Db, id: string): Promise<FeedbackRow | null> {
  return db.first<FeedbackRow>('SELECT * FROM feedback WHERE id = ?', [id])
}

export async function updateFeedback(
  db: Db,
  params: {
    id: string
    status?: string
    note?: string
    actor: string
  }
): Promise<{ ok: boolean; error?: string }> {
  const existing = await getFeedback(db, params.id)
  if (!existing) return { ok: false, error: '反馈不存在' }

  const status = (FEEDBACK_STATUSES as readonly string[]).includes(String(params.status))
    ? (params.status as FeedbackStatus)
    : (existing.status as FeedbackStatus)

  const note = typeof params.note === 'string' ? params.note.slice(0, 1000) : existing.handled_note

  await db.batch([
    {
      sql: 'UPDATE feedback SET status = ?, handled_note = ?, handled_by = ?, updated_at = ? WHERE id = ?',
      params: [status, note, params.actor, nowIso(), params.id],
    },
    {
      sql: 'INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      params: [
        nowIso(),
        params.actor,
        'feedback.update',
        params.id,
        JSON.stringify({ from: existing.status, to: status }),
      ],
    },
  ])
  return { ok: true }
}

export interface FeedbackCounts {
  total: number
  new: number
  triaged: number
  resolved: number
  dismissed: number
}

/**
 * 各状态计数。
 *
 * 用一次 GROUP BY 而不是四次 COUNT —— 仪表盘上这个查询和其他查询同时跑，
 * 四次往返在 D1 上是实打实的延迟。
 */
export async function feedbackCounts(db: Db): Promise<FeedbackCounts> {
  const rows = await db.all<{ status: string; n: number }>(
    'SELECT status, COUNT(*) AS n FROM feedback GROUP BY status'
  )
  const counts: FeedbackCounts = { total: 0, new: 0, triaged: 0, resolved: 0, dismissed: 0 }
  for (const r of rows) {
    const n = toInt(r.n)
    counts.total += n
    const s = toText(r.status)
    if (s in counts) counts[s as FeedbackStatus] = n
  }
  return counts
}
