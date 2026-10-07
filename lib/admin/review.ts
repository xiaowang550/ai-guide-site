/**
 * 内容复核待办。
 *
 * 三类来源：
 *   · freshness  内容更新时间超过阈值 → 需要复核（自动生成，可重复计算覆盖）
 *   · evidence   高分/低分维度没写依据 → 与公开站承诺的「≥4 或 ≤2 必须写依据」对不上
 *   · manual     人工添加（例如「等厂商发新版本后回来改价格」）
 *
 * 自动生成的待办 **id 是确定性的**（`freshness:tool:kimi`），
 * 所以重新计算是 UPSERT 覆盖而不是不断新增。
 * 这点很重要：如果每次进后台都往列表里塞一批新待办，
 * 管理员改完 updatedAt 之后旧待办还挂着 —— 提醒你去看一个已经复核过的条目。
 */
import type { Db } from '../db/types.ts'
import { toText } from '../db/types.ts'
import { nowIso } from './auth.ts'
import { listItems, getPublishedData } from './content.ts'

/**
 * 新鲜度阈值。
 *
 * 与 `lib/freshness.ts` 的 FRESHNESS_THRESHOLDS.tool 保持一致。
 * 这里复制的理由与 lib/admin/capability-keys.ts 相同：
 * Workers 打包不保证解析 `@/` 别号，不能 import 那个模块。
 * `lib/__tests__/admin-schema.test.ts` 断言两份完全相等。
 */
export const TOOL_FRESHNESS = { fresh: 30, warn: 90, stale: 180 } as const

export type ReviewSeverity = 'low' | 'normal' | 'high'

export const REVIEW_SEVERITY_LABELS: Record<ReviewSeverity, string> = {
  high: '优先处理',
  normal: '正常',
  low: '有空再看',
}

export interface ReviewTask {
  id: string
  item_id: string | null
  kind: string
  title: string
  detail: string | null
  severity: string
  due_date: string | null
  status: string
  created_at: string
  updated_at: string
  resolved_at: string | null
  resolved_by: string | null
}

export interface RegenerateResult {
  created: number
  updated: number
  /** 复核后自动关闭的旧待办数 */
  closed: number
  scanned: number
}

function daysSince(iso: string, now: Date): number {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY
  return Math.floor((now.getTime() - t) / 86_400_000)
}

function plusDays(days: number, now: Date): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString().slice(0, 10)
}

/**
 * 重新计算自动待办。
 *
 * 步骤是「先算出应有的待办集合，再与库里现有的对账」：
 *   · 应有且库里有   → 更新（标题/严重度可能随时间变了）
 *   · 应有但库里没有 → 新建
 *   · 库里有但不该有 → 关闭（记 resolved_at，不删除 —— 历史要留）
 *
 * 为什么不直接 DELETE 再重建：待办有 id，管理员可能已经处理过一部分、
 * 也可能在详情里留了备注。全删重建会把这些一起丢掉。
 */
export async function regenerateAutoTasks(db: Db, now = new Date()): Promise<RegenerateResult> {
  const items = await listItems(db, 'tool')
  const wanted = new Map<string, { itemId: string; kind: string; title: string; detail: string; severity: ReviewSeverity; due: string }>()

  for (const item of items) {
    if (!item.published_version || !item.published_at) continue
    const age = daysSince(item.published_at, now)

    if (age > TOOL_FRESHNESS.fresh) {
      const overdueWarn = age > TOOL_FRESHNESS.warn
      wanted.set(`freshness:${item.id}`, {
        itemId: item.id,
        kind: 'freshness',
        title: `复核「${item.published_title ?? item.slug}」的资料（已 ${age} 天未更新）`,
        detail:
          `工具能力、价格、免费额度变化很快。公开站会在超过 ${TOOL_FRESHNESS.warn} 天后标「可能已过时」，` +
          `现在 ${age} 天。改完点发布，updatedAt 会自动更新。`,
        severity: age > TOOL_FRESHNESS.stale ? 'high' : overdueWarn ? 'normal' : 'low',
        due: plusDays(age > TOOL_FRESHNESS.stale ? 7 : 30, now),
      })
    }

    const data = await getPublishedData(db, item.id)
    if (data) {
      const gaps = countEvidenceGaps(data)
      if (gaps > 0) {
        wanted.set(`evidence:${item.id}`, {
          itemId: item.id,
          kind: 'evidence',
          title: `补写「${item.published_title ?? item.slug}」的评分依据（${gaps} 个维度缺依据）`,
          detail:
            `公开站承诺「≥4 分或 ≤2 分的维度都要写明依据」。当前有 ${gaps} 个高/低分维度只给了分数没给依据，` +
            `工具详情页会显示「依据写得薄」的提示。`,
          severity: gaps >= 5 ? 'high' : 'normal',
          due: plusDays(30, now),
        })
      }
    }
  }

  const existingAuto = await db.all<{ id: string; status: string }>(
    "SELECT id, status FROM review_tasks WHERE kind IN ('freshness', 'evidence')"
  )
  const existingMap = new Map(existingAuto.map((r) => [toText(r.id), toText(r.status)]))

  let created = 0
  let updated = 0
  let closed = 0
  const nowIsoStr = nowIso()

  for (const [id, w] of wanted) {
    if (existingMap.has(id)) {
      // 已关闭的自动待办不复活：管理员明确处理过，
      // 下次刷新不该又冒出来。要重新提醒得靠数据本身超期（那时 ID 仍在，但状态已 done）——
      // 所以这里只在 status='open' 时更新内容，否则跳过。
      if (existingMap.get(id) !== 'open') continue
      await db.run(
        `UPDATE review_tasks SET title = ?, detail = ?, severity = ?, due_date = ?, updated_at = ?
          WHERE id = ? AND status = 'open'`,
        [w.title, w.detail, w.severity, w.due, nowIsoStr, id]
      )
      updated++
    } else {
      await db.run(
        `INSERT INTO review_tasks (id, item_id, kind, title, detail, severity, due_date, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
        [id, w.itemId, w.kind, w.title, w.detail, w.severity, w.due, nowIsoStr, nowIsoStr]
      )
      created++
    }
  }

  for (const [id, status] of existingMap) {
    if (wanted.has(id) || status !== 'open') continue
    await db.run(
      `UPDATE review_tasks SET status = 'dismissed', resolved_at = ?, updated_at = ?,
              detail = COALESCE(detail, '') || '（复核后数据已更新，自动关闭）'
        WHERE id = ?`,
      [nowIsoStr, nowIsoStr, id]
    )
    closed++
  }

  return { created, updated, closed, scanned: items.length }
}

/**
 * 数「高/低分却没写依据」的维度数量。
 *
 * 阈值与公开站的规则一致：≥4 或 ≤2 分的维度必须有依据。
 * 3 分是「够用但没优势」，不强制写 —— 强求每条都写会让依据变成套话。
 */
export function countEvidenceGaps(data: Record<string, unknown>): number {
  const caps = data.capabilities
  if (!caps || typeof caps !== 'object' || Array.isArray(caps)) return 0
  let gaps = 0
  for (const [, raw] of Object.entries(caps as Record<string, unknown>)) {
    if (!raw || typeof raw !== 'object') continue
    const c = raw as { score?: unknown; basis?: unknown }
    const score = typeof c.score === 'number' ? c.score : null
    if (score === null) continue
    if (score >= 4 || score <= 2) {
      const basis = typeof c.basis === 'string' ? c.basis.trim() : ''
      if (basis === '') gaps++
    }
  }
  return gaps
}

export async function listTasks(
  db: Db,
  opts: { status?: string; limit?: number } = {}
): Promise<ReviewTask[]> {
  const limit = Math.min(Math.max(opts.limit ?? 200, 1), 500)
  const sql = opts.status
    ? 'SELECT * FROM review_tasks WHERE status = ? ORDER BY CASE severity WHEN ? THEN 0 WHEN ? THEN 1 ELSE 2 END, due_date IS NULL, due_date LIMIT ?'
    : "SELECT * FROM review_tasks WHERE status = 'open' ORDER BY CASE severity WHEN 'high' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END, due_date IS NULL, due_date LIMIT ?"
  const params = opts.status
    ? [opts.status, 'high', 'normal', limit]
    : [limit]
  return db.all<ReviewTask>(sql, params)
}

export async function createManualTask(
  db: Db,
  params: { title: string; detail?: string; itemId?: string; severity?: string; dueDate?: string; actor: string }
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const title = params.title?.trim()
  if (!title) return { ok: false, error: '标题不能为空' }
  const id = `manual:${crypto.randomUUID()}`
  // 先收窄再入参：三元里直接写 params.severity 时，TS 不会因为
  // 前面的 includes() 检查而把它收窄成 string（undefined 仍可能通过检查）
  const severity: string = ['low', 'normal', 'high'].includes(String(params.severity))
    ? String(params.severity)
    : 'normal'
  await db.run(
    `INSERT INTO review_tasks (id, item_id, kind, title, detail, severity, due_date, status, created_at, updated_at)
     VALUES (?, ?, 'manual', ?, ?, ?, ?, 'open', ?, ?)`,
    [
      id,
      params.itemId ?? null,
      title.slice(0, 200),
      params.detail?.slice(0, 1000) ?? null,
      severity,
      params.dueDate ?? null,
      nowIso(),
      nowIso(),
    ]
  )
  return { ok: true, id }
}

export async function resolveTask(
  db: Db,
  params: { id: string; status: 'done' | 'dismissed' | 'open'; actor: string; note?: string }
): Promise<{ ok: boolean; error?: string }> {
  const task = await db.first<{ id: string }>('SELECT id FROM review_tasks WHERE id = ?', [params.id])
  if (!task) return { ok: false, error: '待办不存在' }
  const open = params.status === 'open'
  await db.batch([
    {
      sql: `UPDATE review_tasks
               SET status = ?, updated_at = ?, resolved_at = ?, resolved_by = ?,
                   detail = CASE WHEN ? IS NULL THEN detail ELSE detail || ? END
             WHERE id = ?`,
      params: [
        params.status,
        nowIso(),
        open ? null : nowIso(),
        open ? null : params.actor,
        params.note ?? null,
        params.note ? `\n（${params.actor}）${params.note}` : null,
        params.id,
      ],
    },
    {
      sql: 'INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      params: [nowIso(), params.actor, 'review.resolve', params.id, JSON.stringify({ status: params.status })],
    },
  ])
  return { ok: true }
}

export interface ReviewSummary {
  open: number
  high: number
  overdue: number
  byKind: Record<string, number>
}

export async function reviewSummary(db: Db): Promise<ReviewSummary> {
  const rows = await db.all<{ kind: string; severity: string; due_date: string | null }>(
    "SELECT kind, severity, due_date FROM review_tasks WHERE status = 'open'"
  )
  const today = new Date().toISOString().slice(0, 10)
  const byKind: Record<string, number> = {}
  let high = 0
  let overdue = 0
  for (const r of rows) {
    const k = toText(r.kind)
    byKind[k] = (byKind[k] ?? 0) + 1
    if (toText(r.severity) === 'high') high++
    const due = r.due_date ? toText(r.due_date) : ''
    if (due && due < today) overdue++
  }
  return { open: rows.length, high, overdue, byKind }
}
