import { TOOL_WATCH_SOURCES as tools } from './tool-sources.ts'
import type { Db } from '../db/types.ts'
import { plainText, trustedUrl } from './parse.ts'
import { readLimited } from './service.ts'
import type { NewsSource } from './types.ts'

const INTERVAL = 6 * 60 * 60 * 1000
const SCHEMA = `CREATE TABLE IF NOT EXISTS tool_source_watch (
 id TEXT PRIMARY KEY, url TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 attempted_at TEXT, succeeded_at TEXT, fingerprint TEXT, error TEXT
);
CREATE TABLE IF NOT EXISTS tool_watch_lock (id INTEGER PRIMARY KEY CHECK(id=1), token TEXT NOT NULL, until_ms INTEGER NOT NULL);`
export interface ToolSourceState {
  id: string
  name: string
  url: string
  status: string
  attemptedAt: string | null
  succeededAt: string | null
  error: string | null
}
function sourceFor(tool: (typeof tools)[number]): NewsSource {
  const url = tool.url
  return {
    id: tool.id,
    name: tool.name,
    url,
    format: 'html',
    toolIds: [tool.id],
    hosts: [
      ...new Set([
        new URL(url).hostname,
        new URL(url).hostname.startsWith('www.')
          ? new URL(url).hostname.slice(4)
          : 'www.' + new URL(url).hostname,
        ...(tool.id === 'chatgpt' ? ['chatgpt.com'] : []),
      ]),
    ],
  }
}
async function ensureWatch(db: Db) {
  try {
    const ready = await db.first<{ count: number }>(
      'SELECT COUNT(*) AS count FROM tool_source_watch',
    )
    if (ready?.count === tools.length) return
  } catch {
    /* 首次运行创建专用表。 */
  }
  await db.exec(SCHEMA)
  await db.batch(
    tools.map((tool) => ({
      sql: 'INSERT INTO tool_source_watch(id,url) VALUES (?,?) ON CONFLICT(id) DO UPDATE SET url=excluded.url',
      params: [tool.id, sourceFor(tool).url],
    })),
  )
}
export async function readToolSourceStates(db: Db): Promise<ToolSourceState[]> {
  await ensureWatch(db)
  const rows = await db.all<{
    id: string
    url: string
    status: string
    attempted_at: string | null
    succeeded_at: string | null
    error: string | null
  }>('SELECT * FROM tool_source_watch')
  return rows.map((row) => ({
    id: row.id,
    name: tools.find((tool) => tool.id === row.id)?.name ?? row.id,
    url: row.url,
    status: row.status,
    attemptedAt: row.attempted_at,
    succeededAt: row.succeeded_at,
    error: row.error,
  }))
}
/** 页面变化只创建复核待办，绝不自动推断新价格、能力或评分。 */
export async function checkToolSources(
  db: Db,
  options: { now?: Date; fetcher?: typeof fetch; force?: boolean; ids?: string[] } = {},
) {
  const now = options.now ?? new Date(),
    stamp = now.toISOString()
  await ensureWatch(db)
  const latest = await db.first<{ at: string | null }>(
    'SELECT MAX(attempted_at) AS at FROM tool_source_watch',
  )
  if (!options.force && latest?.at && now.getTime() - Date.parse(latest.at) < INTERVAL)
    return { skipped: true, changed: 0, succeeded: 0, failed: 0 }
  const token = crypto.randomUUID()
  await db.run('INSERT OR IGNORE INTO tool_watch_lock VALUES(1,?,0)', [token])
  if (
    !(
      await db.run('UPDATE tool_watch_lock SET token=?,until_ms=? WHERE id=1 AND until_ms<?', [
        token,
        now.getTime() + 180000,
        now.getTime(),
      ])
    ).changes
  )
    return { skipped: true, changed: 0, succeeded: 0, failed: 0 }
  let changed = 0,
    succeeded = 0,
    failed = 0
  const selected = tools.filter((tool) => !options.ids || options.ids.includes(tool.id))
  try {
    for (let offset = 0; offset < selected.length; offset += 4) {
      const results = await Promise.all(
        selected.slice(offset, offset + 4).map(async (tool) => {
          const source = sourceFor(tool),
            controller = new AbortController(),
            timer = setTimeout(() => controller.abort(), 12000)
          try {
            const fetcher = options.fetcher ?? fetch,
              init = {
                redirect: 'manual' as const,
                signal: controller.signal,
                headers: { 'User-Agent': 'AI-Guide-Site-Tool-Review/1.0' },
              }
            let url = source.url,
              response = await fetcher(url, init)
            for (
              let redirects = 0;
              response.status >= 300 && response.status < 400 && redirects < 3;
              redirects++
            ) {
              const location = response.headers.get('location')
              const next = location ? new URL(location, url).href : null
              if (!next || !trustedUrl(next, source))
                throw new Error('官方页面跳转地址不在允许范围内')
              url = next
              response = await fetcher(url, init)
            }
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const html = await readLimited(response)
            const title = plainText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
            if (
              /access denied|just a moment|verify you are human|sign in|log in|^403|^404/i.test(
                title,
              )
            )
              throw new Error('官方页面需要登录或验证，请人工核验')
            const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html
            const text = plainText(main.replace(/<(header|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi, ''))
            if (text.length < 120)
              throw new Error('页面需要交互或未提供可比较的公开正文，请人工核验')
            const bytes = await crypto.subtle.digest(
              'SHA-256',
              new TextEncoder().encode(text.slice(0, 100000)),
            )
            const fingerprint = [...new Uint8Array(bytes)]
              .map((value) => value.toString(16).padStart(2, '0'))
              .join('')
            return { tool, source, fingerprint, error: null }
          } catch (error) {
            return {
              tool,
              source,
              fingerprint: null,
              error: error instanceof Error ? error.message : '检查失败',
            }
          } finally {
            clearTimeout(timer)
          }
        }),
      )
      for (const result of results) {
        if (result.error) {
          failed++
          await db.run(
            "UPDATE tool_source_watch SET status='error',attempted_at=?,error=? WHERE id=?",
            [stamp, result.error, result.tool.id],
          )
          continue
        }
        succeeded++
        const previous = await db.first<{ fingerprint: string | null }>(
          'SELECT fingerprint FROM tool_source_watch WHERE id=?',
          [result.tool.id],
        )
        if (previous?.fingerprint && previous.fingerprint !== result.fingerprint) {
          changed++
          await db.run(
            "INSERT INTO review_tasks(id,item_id,kind,title,detail,severity,status,created_at,updated_at) VALUES(?,?,'manual',?,?,'normal','open',?,?) ON CONFLICT(id) DO UPDATE SET detail=excluded.detail,status='open',updated_at=excluded.updated_at,resolved_at=NULL,resolved_by=NULL",
            [
              `tool-source:${result.tool.id}`,
              `tool:${result.tool.id}`,
              `${result.tool.name} 官方页面发生变化`,
              `检测到公开正文变化，请核对价格、额度和功能。页面变化也可能来自布局调整，尚未判定为产品更新。\n${result.source.url}`,
              stamp,
              stamp,
            ],
          )
        }
        await db.run(
          "UPDATE tool_source_watch SET status='ok',attempted_at=?,succeeded_at=?,fingerprint=?,error=NULL WHERE id=?",
          [stamp, stamp, result.fingerprint, result.tool.id],
        )
      }
    }
    return { skipped: false, changed, succeeded, failed }
  } finally {
    await db.run('UPDATE tool_watch_lock SET until_ms=0 WHERE id=1 AND token=?', [token])
  }
}
