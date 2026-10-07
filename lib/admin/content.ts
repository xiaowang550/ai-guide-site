/**
 * 内容：草稿、版本、发布、回滚、历史、备份。
 *
 * 这个模块承载「编辑一条工具资料 → 预览 → 发布 → 公开站显示更新 → 能恢复上一版本」
 * 这条闭环的全部语义。三条不变量：
 *
 * 1) **发布是不可变的。** 每次发布往 content_versions 插一行新版本，从不原地改。
 *    「回滚上一版」= 把 content_items.published_version 指回旧版本号，
 *    而不是「反向编辑一遍」—— 后者在多次编辑后无法保证回到真正的历史状态，
 *    而且会把历史搞脏（回滚本身也变成一个新版本）。
 *
 * 2) **草稿与版本分开存。** 草稿是可反复覆盖的工作区，版本是不可变的历史。
 *    放一起的话历史列表会被「改了三次还没发布」的垃圾版本淹没。
 *
 * 3) **发布时刻由服务端写入。** `updatedAt` 注入为发布时间，管理员不能手填。
 *    公开站的「超过 90 天未复核标可能已过时」完全依赖这个字段 ——
 *    能手填就等于可以自己把过期内容标成新鲜的。
 */
import type { Db } from '../db/types.ts'
import { toInt, toText } from '../db/types.ts'
import { nowIso } from './auth.ts'
import { validateContent } from './validate.ts'
import type { ContentKind } from './capability-keys.ts'

export const CONTENT_PREFIX = 'tool:'

export function makeItemId(kind: ContentKind, slug: string): string {
  return `${kind}:${slug}`
}

export function parseItemId(itemId: string): { kind: string; slug: string } | null {
  const i = itemId.indexOf(':')
  if (i < 0) return null
  return { kind: itemId.slice(0, i), slug: itemId.slice(i + 1) }
}

/**
 * 派生字段：保存时丢弃，由公开站的 lib/score.ts 重算。
 *
 * 导出出来是因为迁移脚本要用同一套规则 ——
 * 两处各写一遍的话，将来新增派生字段只改了一处，
 * 就会出现「后台存了综合分、公开站又算一遍」的静默不一致。
 */
export function stripDerivedFields(data: Record<string, unknown>): Record<string, unknown> {
  // 用 copy + delete 而不是解构重命名：解构出的 `_ignored` 会被 lint 判为未使用，
  // 而这里的意图就是「明确地把这个键从副本里拿掉」。
  const copy = { ...data }
  delete copy.overallScore
  return copy
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

// ── 读取 ───────────────────────────────────────────────────────────────────

export interface ContentItemRow {
  id: string
  kind: string
  slug: string
  published_version: number | null
  published_title: string | null
  published_at: string | null
  edit_version: number
  updated_at: string
  /** 是否存在未发布草稿 */
  has_draft: number
  draft_updated_at: string | null
}

const ITEM_SELECT = `
  SELECT i.id, i.kind, i.slug, i.published_version, i.published_title, i.published_at,
         i.edit_version, i.updated_at,
         d.item_id IS NOT NULL AS has_draft,
         d.updated_at AS draft_updated_at
    FROM content_items i
    LEFT JOIN content_drafts d ON d.item_id = i.id
`

export async function listItems(db: Db, kind?: string): Promise<ContentItemRow[]> {
  const sql = kind
    ? `${ITEM_SELECT} WHERE i.kind = ? ORDER BY i.kind, i.slug`
    : `${ITEM_SELECT} ORDER BY i.kind, i.slug`
  const rows = kind ? await db.all<ContentItemRow>(sql, [kind]) : await db.all<ContentItemRow>(sql)
  return rows.map(normalizeItem)
}

function normalizeItem(r: ContentItemRow): ContentItemRow {
  return {
    ...r,
    published_version: r.published_version === null ? null : toInt(r.published_version),
    edit_version: toInt(r.edit_version),
    has_draft: toInt(r.has_draft),
  }
}

export async function getItem(db: Db, itemId: string): Promise<ContentItemRow | null> {
  const row = await db.first<ContentItemRow>(`${ITEM_SELECT} WHERE i.id = ?`, [itemId])
  return row ? normalizeItem(row) : null
}

export interface VersionRow {
  version: number
  change_note: string | null
  size_bytes: number
  actor: string | null
  created_at: string
  /** 该版本是不是当前对外发布的 */
  is_published: number
}

export async function listVersions(db: Db, itemId: string): Promise<VersionRow[]> {
  const rows = await db.all<VersionRow>(
    `SELECT v.version, v.change_note, v.size_bytes, v.actor, v.created_at,
            CASE WHEN v.version = i.published_version THEN 1 ELSE 0 END AS is_published
       FROM content_versions v
       JOIN content_items i ON i.id = v.item_id
      WHERE v.item_id = ?
      ORDER BY v.version DESC`,
    [itemId]
  )
  return rows.map((r) => ({
    ...r,
    version: toInt(r.version),
    size_bytes: toInt(r.size_bytes),
    is_published: toInt(r.is_published),
  }))
}

export async function getVersionData(
  db: Db,
  itemId: string,
  version: number
): Promise<Record<string, unknown> | null> {
  const row = await db.first<{ data: string }>(
    'SELECT data FROM content_versions WHERE item_id = ? AND version = ?',
    [itemId, version]
  )
  if (!row) return null
  try {
    return JSON.parse(toText(row.data)) as Record<string, unknown>
  } catch {
    // 库里存的不是合法 JSON：这是数据损坏，不是调用错误。
    // 返回 null 让上层报「该版本内容已损坏」，而不是把解析异常抛给调用方。
    return null
  }
}

export async function getPublishedData(
  db: Db,
  itemId: string
): Promise<Record<string, unknown> | null> {
  const item = await getItem(db, itemId)
  if (!item || item.published_version === null) return null
  return getVersionData(db, itemId, item.published_version)
}

export async function getDraft(
  db: Db,
  itemId: string
): Promise<{ data: Record<string, unknown>; base_version: number | null; note: string | null; updated_at: string } | null> {
  const row = await db.first<{
    data: string
    base_version: number | null
    note: string | null
    updated_at: string
  }>('SELECT data, base_version, note, updated_at FROM content_drafts WHERE item_id = ?', [
    itemId,
  ])
  if (!row) return null
  try {
    return {
      data: JSON.parse(toText(row.data)) as Record<string, unknown>,
      base_version: row.base_version === null ? null : toInt(row.base_version),
      note: row.note,
      updated_at: toText(row.updated_at),
    }
  } catch {
    return null
  }
}

// ── 写入：草稿 ─────────────────────────────────────────────────────────────

export interface SaveDraftResult {
  ok: boolean
  issues?: { field: string; message: string }[]
  /** 条目不存在时自动创建了 */
  created?: boolean
  error?: string
}

/**
 * 保存草稿。
 *
 * 保存草稿**不写版本历史** —— 草稿还没决定要发布成什么样，
 * 写进历史只会污染历史列表。
 *
 * `expectedEditVersion` 用于乐观锁：表单提交时带上打开时的值，
 * 不一致就拒绝，避免两个人同时编辑时后提交的把前一个的改动整份盖掉。
 */
export async function saveDraft(
  db: Db,
  params: {
    itemId: string
    kind: ContentKind
    slug: string
    data: unknown
    actor: string
    note?: string
    expectedEditVersion?: number
  }
): Promise<SaveDraftResult> {
  const parsed = parseItemId(params.itemId)
  if (!parsed || parsed.slug !== params.slug) {
    return { ok: false, error: '条目 id 与 slug 不一致' }
  }

  const validation = validateContent(params.kind, params.itemId, params.data)
  const blocking = validation.issues.filter((i) => !(i as { severity?: string }).severity)
  if (blocking.length > 0) {
    return { ok: false, issues: blocking }
  }

  const cleaned = stripDerivedFields(params.data as Record<string, unknown>)
  const serialized = JSON.stringify(cleaned)

  const existing = await getItem(db, params.itemId)
  const now = nowIso()

  if (!existing) {
    await db.batch([
      {
        sql: `INSERT INTO content_items (id, kind, slug, edit_version, created_at, updated_at)
              VALUES (?, ?, ?, 0, ?, ?)`,
        params: [params.itemId, params.kind, params.slug, now, now],
      },
      {
        sql: `INSERT INTO content_drafts (item_id, data, base_version, actor, note, created_at, updated_at)
              VALUES (?, ?, NULL, ?, ?, ?, ?)`,
        params: [params.itemId, serialized, params.actor, params.note ?? null, now, now],
      },
    ])
    return { ok: true, created: true }
  }

  if (
    params.expectedEditVersion !== undefined &&
    params.expectedEditVersion !== existing.edit_version
  ) {
    return {
      ok: false,
      error:
        '这条内容在你编辑期间被改过（可能是另一次发布或保存）。' +
        '请重新打开看最新内容，再决定要不要覆盖。',
    }
  }

  await db.run(
    `INSERT INTO content_drafts (item_id, data, base_version, actor, note, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(item_id) DO UPDATE SET
       data = excluded.data,
       base_version = excluded.base_version,
       actor = excluded.actor,
       note = excluded.note,
       updated_at = excluded.updated_at`,
    [
      params.itemId,
      serialized,
      existing.published_version,
      params.actor,
      params.note ?? null,
      now,
      now,
    ]
  )
  return { ok: true }
}

export async function deleteDraft(db: Db, itemId: string): Promise<boolean> {
  const res = await db.run('DELETE FROM content_drafts WHERE item_id = ?', [itemId])
  return res.changes > 0
}

// ── 写入：发布与回滚 ───────────────────────────────────────────────────────

export interface PublishResult {
  ok: boolean
  version?: number
  error?: string
  /** 与他人编辑冲突时为 true，调用方应返回 409 */
  conflict?: boolean
  issues?: { field: string; message: string }[]
}

/**
 * 发布草稿。
 *
 * 整个操作是原子的（D1 的 batch / 本地的 BEGIN-COMMIT）：
 * 插版本、改指针、删草稿、写审计日志必须一起成功或一起失败。
 * 中途失败会留下「指针指向一个不存在的版本」这种最坏状态 ——
 * 那种状态下构建时同步会拉到 null，公开站上的这条内容直接消失。
 *
 * 冲突检测：草稿记录了它是基于哪个已发布版本编辑的。
 * 如果期间有人发布了新版本，base_version 就对不上了，
 * 此时直接拒绝并让管理员重新查看 —— 静默覆盖会把别人的发布抹掉。
 */
export async function publishDraft(
  db: Db,
  params: { itemId: string; actor: string; changeNote: string }
): Promise<PublishResult> {
  const item = await getItem(db, params.itemId)
  if (!item) return { ok: false, error: '条目不存在' }

  const draft = await getDraft(db, params.itemId)
  if (!draft) return { ok: false, error: '没有待发布的草稿（可能已经发布过了）' }

  if (draft.base_version !== item.published_version) {
    return {
      ok: false,
      conflict: true,
      error:
        '发布冲突：这份草稿是基于旧版本编辑的，期间已有新的发布。' +
        '请重新打开查看最新内容，确认你的改动是否仍然适用。',
    }
  }

  // 发布前再校验一次：草稿可能是旧校验规则下存进去的
  const kind = item.kind as ContentKind
  const validation = validateContent(kind, params.itemId, draft.data)
  const blocking = validation.issues.filter((i) => !(i as { severity?: string }).severity)
  if (blocking.length > 0) {
    return { ok: false, issues: blocking }
  }

  // updatedAt 由服务端注入，管理员不能手填（见文件头说明）
  const withTimestamp: Record<string, unknown> = {
    ...stripDerivedFields(draft.data),
    updatedAt: nowIso(),
  }
  const serialized = JSON.stringify(withTimestamp)

  const maxRow = await db.first<{ v: number | null }>(
    'SELECT MAX(version) AS v FROM content_versions WHERE item_id = ?',
    [params.itemId]
  )
  const nextVersion = toInt(maxRow?.v, 0) + 1
  const title = String(withTimestamp.name ?? params.itemId)

  await db.batch([
    {
      sql: `INSERT INTO content_versions (item_id, version, data, change_note, size_bytes, actor, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      params: [
        params.itemId,
        nextVersion,
        serialized,
        params.changeNote || null,
        byteLength(serialized),
        params.actor,
        nowIso(),
      ],
    },
    {
      sql: `UPDATE content_items
               SET published_version = ?, published_title = ?, published_at = ?,
                   edit_version = edit_version + 1, updated_at = ?
             WHERE id = ?`,
      params: [nextVersion, title, nowIso(), nowIso(), params.itemId],
    },
    { sql: 'DELETE FROM content_drafts WHERE item_id = ?', params: [params.itemId] },
    {
      sql: 'INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      params: [
        nowIso(),
        params.actor,
        'publish',
        params.itemId,
        JSON.stringify({ version: nextVersion, note: params.changeNote || null }),
      ],
    },
  ])

  return { ok: true, version: nextVersion }
}

export interface RollbackResult {
  ok: boolean
  error?: string
  version?: number
}

/**
 * 回滚到指定版本。
 *
 * 只改 `published_version` 指针，**不新建版本、不删任何历史**。
 * 这样「回滚」本身不污染历史，之后再从同一个版本发布也不会产生歧义。
 * 回滚操作记进审计日志，所以后台看得到「谁在什么时候回滚到了哪一版」。
 */
export async function rollbackTo(
  db: Db,
  params: { itemId: string; version: number; actor: string; reason?: string }
): Promise<RollbackResult> {
  const item = await getItem(db, params.itemId)
  if (!item) return { ok: false, error: '条目不存在' }
  if (item.published_version === params.version) {
    return { ok: false, error: '当前已经是这个版本' }
  }
  const target = await db.first<{ version: number }>(
    'SELECT version FROM content_versions WHERE item_id = ? AND version = ?',
    [params.itemId, params.version]
  )
  if (!target) return { ok: false, error: `版本 ${params.version} 不存在` }

  const data = await getVersionData(db, params.itemId, params.version)
  const title = data ? String(data.name ?? params.itemId) : null

  await db.batch([
    {
      sql: `UPDATE content_items
               SET published_version = ?, published_title = ?, published_at = ?,
                   edit_version = edit_version + 1, updated_at = ?
             WHERE id = ?`,
      params: [params.version, title, nowIso(), nowIso(), params.itemId],
    },
    {
      sql: 'INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)',
      params: [
        nowIso(),
        params.actor,
        'rollback',
        params.itemId,
        JSON.stringify({
          from: item.published_version,
          to: params.version,
          reason: params.reason ?? null,
        }),
      ],
    },
  ])

  return { ok: true, version: params.version }
}

// ── 备份 ───────────────────────────────────────────────────────────────────

export interface BackupFile {
  format: 'ai-guide-content-backup'
  version: 1
  exportedAt: string
  items: {
    id: string
    kind: string
    slug: string
    publishedVersion: number | null
    versions: { version: number; data: unknown; changeNote: string | null; actor: string | null; createdAt: string }[]
  }[]
}

/**
 * 导出全部内容（当前条目 + 全部历史版本）。
 *
 * 用途有两个：真备份（导出来存起来），以及迁移到另一个站点。
 * 格式里带 `format` 与 `version` 字段 —— 没有版本号的备份文件，
 * 半年后没人敢确定能不能导入。
 */
export async function exportBackup(db: Db): Promise<BackupFile> {
  const itemRows = await db.all<{ id: string; kind: string; slug: string; published_version: number | null }>(
    'SELECT id, kind, slug, published_version FROM content_items ORDER BY kind, slug'
  )
  const items: BackupFile['items'] = []
  for (const it of itemRows) {
    const versions = await db.all<{
      version: number
      data: string
      change_note: string | null
      actor: string | null
      created_at: string
    }>(
      'SELECT version, data, change_note, actor, created_at FROM content_versions WHERE item_id = ? ORDER BY version',
      [it.id]
    )
    items.push({
      id: toText(it.id),
      kind: toText(it.kind),
      slug: toText(it.slug),
      publishedVersion: it.published_version === null ? null : toInt(it.published_version),
      versions: versions.map((v) => ({
        version: toInt(v.version),
        data: JSON.parse(toText(v.data)),
        changeNote: v.change_note,
        actor: v.actor,
        createdAt: toText(v.created_at),
      })),
    })
  }
  return {
    format: 'ai-guide-content-backup',
    version: 1,
    exportedAt: nowIso(),
    items,
  }
}

export interface ImportResult {
  ok: boolean
  error?: string
  items: number
  versions: number
  skipped: number
}

/**
 * 从备份导入。
 *
 * 策略是**幂等追加**而不是覆盖：已存在的 (item_id, version) 跳过。
 * 这样「把上周的备份再导一次」是安全操作，不会把这一周的内容抹掉。
 * 要真正覆盖得先删条目，那是另一个显式操作。
 */
export async function importBackup(
  db: Db,
  backup: unknown,
  actor: string
): Promise<ImportResult> {
  if (!backup || typeof backup !== 'object') return { ok: false, error: '备份文件不是对象', items: 0, versions: 0, skipped: 0 }
  const b = backup as Partial<BackupFile>
  if (b.format !== 'ai-guide-content-backup' || b.version !== 1 || !Array.isArray(b.items)) {
    return { ok: false, error: '不是本站的备份文件（缺少 format/version 标记）', items: 0, versions: 0, skipped: 0 }
  }

  let items = 0
  let versions = 0
  let skipped = 0

  for (const it of b.items) {
    if (!it || typeof it.id !== 'string' || !Array.isArray(it.versions)) {
      skipped++
      continue
    }
    const now = nowIso()
    await db.run(
      `INSERT INTO content_items (id, kind, slug, edit_version, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)
       ON CONFLICT(id) DO NOTHING`,
      [it.id, it.kind ?? 'tool', it.slug ?? '', now, now]
    )
    items++
    for (const v of it.versions) {
      const serialized = JSON.stringify(v.data ?? {})
      const res = await db.run(
        `INSERT INTO content_versions (item_id, version, data, change_note, size_bytes, actor, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(item_id, version) DO NOTHING`,
        [
          it.id,
          v.version,
          serialized,
          v.changeNote ?? null,
          byteLength(serialized),
          v.actor ?? actor,
          v.createdAt ?? now,
        ]
      )
      if (res.changes > 0) versions++
      else skipped++
    }
    if (it.publishedVersion !== null && it.publishedVersion !== undefined) {
      const data = await getVersionData(db, it.id, it.publishedVersion)
      await db.run(
        `UPDATE content_items
            SET published_version = ?, published_title = ?, published_at = ?
          WHERE id = ? AND published_version IS NULL`,
        [it.publishedVersion, data ? String(data.name ?? it.id) : null, now, it.id]
      )
    }
  }

  await db.run('INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)', [
    nowIso(),
    actor,
    'import',
    null,
    JSON.stringify({ items, versions, skipped }),
  ])

  return { ok: true, items, versions, skipped }
}

/**
 * 读取全部已发布内容，供构建时同步使用。
 *
 * 注意它**只读已发布版本**，草稿永远不会泄漏进公开站 ——
 * 这是「预览」与「发布」分离的实际意义。
 */
export async function readPublishedAll(
  db: Db
): Promise<{ itemId: string; kind: string; slug: string; version: number; data: Record<string, unknown> }[]> {
  const rows = await db.all<{ id: string; kind: string; slug: string; published_version: number }>(
    `SELECT id, kind, slug, published_version
       FROM content_items
      WHERE published_version IS NOT NULL
      ORDER BY kind, slug`
  )
  const out: Awaited<ReturnType<typeof readPublishedAll>> = []
  for (const r of rows) {
    const data = await getVersionData(db, toText(r.id), toInt(r.published_version))
    if (!data) {
      // 指针指向的版本不存在 = 数据损坏。跳过并继续，
      // 不能让一条坏数据导致整次构建失败（那会让整个站点发不出去）。
      continue
    }
    out.push({
      itemId: toText(r.id),
      kind: toText(r.kind),
      slug: toText(r.slug),
      version: toInt(r.published_version),
      data,
    })
  }
  return out
}
