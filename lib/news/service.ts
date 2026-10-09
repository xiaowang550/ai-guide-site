import type { Db, DbRow } from '../db/types.ts'
import { toText, toInt } from '../db/types.ts'
import { newsSeed } from '../../data/news-seed.ts'
import { newsTitleEdits } from '../../data/news-title-edits.ts'
import { NEWS_SOURCES, NEWS_TOOL_NAMES } from './sources.ts'
import {
  NEWS_REFRESH_MS,
  type NewsFeed,
  type NewsItem,
  type NewsSource,
  type SourceState,
} from './types.ts'
import { NEWS_SCHEMA } from './schema.ts'
import { parseNews, trustedUrl, type ParsedNews } from './parse.ts'

export async function newsId(url: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url))
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 24)
}
export async function ensureNews(db: Db, now = new Date()): Promise<void> {
  try {
    const ready = await db.first('SELECT id FROM news_source_state WHERE id=?', [
      NEWS_SOURCES.at(-1)?.id ?? '',
    ])
    if (ready) return
  } catch {
    /* 首次运行时创建资讯专用表，不修改其他业务表。 */
  }
  await db.exec(NEWS_SCHEMA)
  const statements = []
  for (const seed of newsSeed) {
    const source = NEWS_SOURCES.find((item) => item.id === seed.sourceId)
    if (!source) continue
    const url = trustedUrl(seed.url, source)
    if (!url) continue
    statements.push({
      sql: 'INSERT OR IGNORE INTO news_items (id,url,source_id,source_title,published_at,fetched_at,category,tool_ids,manual_title,summary,takeaway,reviewed) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)',
      params: [
        await newsId(url),
        url,
        source.id,
        seed.title,
        seed.publishedAt,
        now.toISOString(),
        seed.category,
        JSON.stringify(seed.toolIds),
        seed.title,
        seed.summary,
        seed.takeaway,
      ],
    })
  }
  for (const source of NEWS_SOURCES)
    statements.push({
      sql: 'INSERT OR IGNORE INTO news_source_state (id,status) VALUES (?,?)',
      params: [source.id, 'pending'],
    })
  if (statements.length) await db.batch(statements)
}
function itemOf(row: DbRow): NewsItem {
  let toolIds: string[] = []
  try {
    const value: unknown = JSON.parse(toText(row.tool_ids))
    if (Array.isArray(value))
      toolIds = value.filter((item): item is string => typeof item === 'string')
  } catch {}
  return {
    id: toText(row.id),
    title: toText(row.manual_title) || toText(row.source_title),
    originalTitle: toText(row.source_title),
    summary: toText(row.summary) || null,
    takeaway: toText(row.takeaway) || null,
    category: toText(row.category) as NewsItem['category'],
    sourceId: toText(row.source_id),
    sourceName: NEWS_SOURCES.find((item) => item.id === row.source_id)?.name ?? '官方来源',
    url: toText(row.url),
    publishedAt: toText(row.published_at),
    fetchedAt: toText(row.fetched_at),
    toolIds,
    reviewed: toInt(row.reviewed) === 1,
    hidden: toInt(row.hidden) === 1,
  }
}
export async function readNews(
  db: Db,
  options: { tool?: string; limit?: number; includeHidden?: boolean; now?: Date } = {},
): Promise<NewsFeed> {
  await ensureNews(db, options.now)
  const [rows, states] = await Promise.all([
    db.all(
      `SELECT * FROM news_items ${options.includeHidden ? '' : 'WHERE hidden=0'} ORDER BY published_at DESC LIMIT 250`,
    ),
    db.all('SELECT * FROM news_source_state'),
  ])
  const sources: SourceState[] = NEWS_SOURCES.map((source) => {
    const state = states.find((row) => row.id === source.id)
    return {
      id: source.id,
      name: source.name,
      status: (toText(state?.status) || 'pending') as SourceState['status'],
      attemptedAt: toText(state?.attempted_at) || null,
      succeededAt: toText(state?.succeeded_at) || null,
      count: toInt(state?.item_count),
      ...(options.includeHidden ? { error: toText(state?.error) || null } : {}),
    }
  })
  const successful = sources
    .map((source) => source.succeededAt)
    .filter((value): value is string => !!value)
    .sort()
  const lastFetchedAt = successful.at(-1) ?? null
  const now = options.now ?? new Date()
  const stale = !lastFetchedAt || now.getTime() - Date.parse(lastFetchedAt) > NEWS_REFRESH_MS * 2
  const items = rows
    .map(itemOf)
    .filter((item) => !options.tool || item.toolIds.includes(options.tool))
    .filter(
      (item) =>
        options.includeHidden || Date.parse(item.publishedAt) >= now.getTime() - 120 * 86400000,
    )
    .slice(0, Math.min(100, Math.max(1, options.limit ?? 60)))
  if (!options.includeHidden)
    items.forEach((item) => {
      delete item.hidden
    })
  return { items, lastFetchedAt, stale, intervalMinutes: NEWS_REFRESH_MS / 60000, sources }
}
export async function newsRefreshDue(db: Db, now = new Date()): Promise<boolean> {
  const state = await db.first<{ at: string | null }>(
    'SELECT MAX(attempted_at) AS at FROM news_source_state',
  )
  return !state?.at || now.getTime() - Date.parse(state.at) >= NEWS_REFRESH_MS
}
export async function readLimited(response: Response, maxBytes = 2_000_000): Promise<string> {
  if (Number(response.headers.get('content-length') ?? 0) > maxBytes)
    throw new Error('来源响应过大')
  const reader = response.body?.getReader()
  if (!reader) throw new Error('来源响应为空')
  let length = 0
  const chunks: Uint8Array[] = []
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maxBytes) throw new Error('来源响应超出限制')
      chunks.push(value)
    }
  } finally {
    await reader.cancel().catch(() => {})
  }
  const result = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(result)
}
interface FetchResult {
  source: NewsSource
  items: ParsedNews[]
  status: 'ok' | 'error'
  unchanged?: boolean
  etag?: string | null
  modified?: string | null
  error?: string
}
export async function refreshNews(
  db: Db,
  options: { fetcher?: typeof fetch; now?: Date; force?: boolean; sources?: NewsSource[] } = {},
): Promise<{ skipped: boolean; added: number; succeeded: number; failed: number }> {
  const now = options.now ?? new Date(),
    stamp = now.toISOString()
  await ensureNews(db, now)
  if (!options.force && !(await newsRefreshDue(db, now)))
    return { skipped: true, added: 0, succeeded: 0, failed: 0 }
  const token = crypto.randomUUID()
  await db.run('INSERT OR IGNORE INTO news_refresh_lock (id,token,until_ms) VALUES (1,?,0)', [
    token,
  ])
  const lease = await db.run(
    'UPDATE news_refresh_lock SET token=?,until_ms=? WHERE id=1 AND until_ms<?',
    [token, now.getTime() + 180000, now.getTime()],
  )
  if (!lease.changes) return { skipped: true, added: 0, succeeded: 0, failed: 0 }
  let added = 0,
    succeeded = 0,
    failed = 0
  const reviews = new Map<string, ParsedNews>()
  try {
    const states = await db.all('SELECT * FROM news_source_state')
    const sources = options.sources ?? NEWS_SOURCES
    const results: FetchResult[] = []
    for (let offset = 0; offset < sources.length; offset += 4) {
      results.push(
        ...(await Promise.all(
          sources.slice(offset, offset + 4).map(async (source): Promise<FetchResult> => {
            const controller = new AbortController(),
              timer = setTimeout(() => controller.abort(), 12000)
            try {
              const state = states.find((item) => item.id === source.id)
              const headers: Record<string, string> = {
                Accept: 'application/rss+xml,application/xml,application/json,text/html',
                'User-Agent': 'AI-Guide-Site-News/1.0',
              }
              if (!options.force && state?.etag) headers['If-None-Match'] = toText(state.etag)
              if (!options.force && state?.modified)
                headers['If-Modified-Since'] = toText(state.modified)
              const fetcher = options.fetcher ?? fetch
              let requestUrl = source.url
              let response = await fetcher(requestUrl, {
                headers,
                signal: controller.signal,
                redirect: 'manual',
              })
              for (
                let step = 0;
                step < 3 &&
                response.status >= 300 &&
                response.status < 400 &&
                response.status !== 304;
                step++
              ) {
                const location = response.headers.get('location')
                const target = location ? new URL(location, requestUrl).href : null
                const next = target && trustedUrl(target, source) ? target : null
                if (!next) throw new Error('来源跳转到未允许的地址')
                requestUrl = next
                response = await fetcher(requestUrl, {
                  headers,
                  signal: controller.signal,
                  redirect: 'manual',
                })
              }
              if (response.status === 304)
                return { source, items: [], status: 'ok', unchanged: true }
              if (!response.ok) throw new Error(`HTTP ${response.status}`)
              const items = parseNews(
                await readLimited(response, source.format === 'qwen' ? 8_000_000 : 2_000_000),
                source,
                now,
              )
              if (!items.length) throw new Error('未读取到有标题、日期和官方链接的消息')
              return {
                source,
                items,
                status: 'ok',
                etag: response.headers.get('etag'),
                modified: response.headers.get('last-modified'),
              }
            } catch (error) {
              return {
                source,
                items: [],
                status: 'error',
                error: error instanceof Error ? error.message : '采集失败',
              }
            } finally {
              clearTimeout(timer)
            }
          }),
        )),
      )
    }
    for (const result of results) {
      if (result.status === 'error') {
        failed++
        await db.run(
          "UPDATE news_source_state SET status='error',attempted_at=?,error=? WHERE id=?",
          [stamp, result.error ?? '采集失败', result.source.id],
        )
        continue
      }
      succeeded++
      if (result.unchanged) {
        await db.run(
          "UPDATE news_source_state SET status='ok',attempted_at=?,succeeded_at=?,error=NULL WHERE id=?",
          [stamp, stamp, result.source.id],
        )
        continue
      }
      const known = new Set(
        (
          await db.all<{ url: string }>('SELECT url FROM news_items WHERE source_id=?', [
            result.source.id,
          ])
        ).map((item) => item.url),
      )
      for (const item of result.items) {
        const id = await newsId(item.url),
          isNew = !known.has(item.url)
        await db.run(
          'INSERT INTO news_items (id,url,source_id,source_title,published_at,fetched_at,category,tool_ids) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET source_title=excluded.source_title,published_at=excluded.published_at,fetched_at=excluded.fetched_at,category=excluded.category,tool_ids=excluded.tool_ids',
          [
            id,
            item.url,
            result.source.id,
            item.title,
            item.publishedAt,
            stamp,
            item.category,
            JSON.stringify(item.toolIds),
          ],
        )
        if (newsTitleEdits[item.url]) {
          await db.run(
            'UPDATE news_items SET manual_title=?,reviewed=1 WHERE id=? AND manual_title IS NULL',
            [newsTitleEdits[item.url], id],
          )
        }
        if (isNew) {
          added++
          if (
            now.getTime() - Date.parse(item.publishedAt) < 7 * 86400000 &&
            item.category !== '研究与行业'
          ) {
            for (const tool of item.toolIds) {
              const existing = reviews.get(tool)
              if (!existing || item.publishedAt > existing.publishedAt) reviews.set(tool, item)
            }
          }
        }
      }
      await db.run(
        "UPDATE news_source_state SET status='ok',attempted_at=?,succeeded_at=?,etag=?,modified=?,item_count=?,error=NULL WHERE id=?",
        [
          stamp,
          stamp,
          result.etag ?? null,
          result.modified ?? null,
          result.items.length,
          result.source.id,
        ],
      )
    }
    for (const [tool, item] of reviews) {
      await db.run(
        "INSERT INTO review_tasks (id,item_id,kind,title,detail,severity,status,created_at,updated_at) VALUES (?,?,'manual',?,?,'normal','open',?,?) ON CONFLICT(id) DO UPDATE SET detail=excluded.detail,status='open',updated_at=excluded.updated_at,resolved_at=NULL,resolved_by=NULL",
        [
          `news-review:${tool}`,
          `tool:${tool}`,
          `${NEWS_TOOL_NAMES[tool] ?? tool} 有官方更新，请复核工具档案`,
          `${item.title}\n官方发布：${item.publishedAt}\n来源：${item.url}`,
          stamp,
          stamp,
        ],
      )
    }
    await db.run(
      'DELETE FROM news_items WHERE id NOT IN (SELECT id FROM news_items ORDER BY published_at DESC LIMIT 300) AND reviewed=0',
    )
    return { skipped: false, added, succeeded, failed }
  } finally {
    await db.run('UPDATE news_refresh_lock SET until_ms=0 WHERE id=1 AND token=?', [token])
  }
}

export async function editNews(
  db: Db,
  id: string,
  input: { title?: string; summary?: string; takeaway?: string; hidden?: boolean },
): Promise<boolean> {
  const exists = await db.first('SELECT id FROM news_items WHERE id=?', [id])
  if (!exists) return false
  const setters: string[] = ['edited_at=?']
  const values: (string | number | null)[] = [new Date().toISOString()]
  if (input.title !== undefined) {
    setters.push('manual_title=?', 'reviewed=1')
    values.push(input.title.trim() || null)
  }
  if (input.summary !== undefined) {
    setters.push('summary=?')
    values.push(input.summary.trim() || null)
  }
  if (input.takeaway !== undefined) {
    setters.push('takeaway=?')
    values.push(input.takeaway.trim() || null)
  }
  if (input.hidden !== undefined) {
    setters.push('hidden=?')
    values.push(input.hidden ? 1 : 0)
  }
  await db.run(`UPDATE news_items SET ${setters.join(',')} WHERE id=?`, [...values, id])
  return true
}
