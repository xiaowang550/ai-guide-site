import type { Db } from '../db/types.ts'
import { ensureNews } from './service.ts'
import { newsBriefEdits, newsTitleEdits } from '../../data/news-title-edits.ts'

export interface NewsTranslationInput {
  id: string
  title: string
  excerpt: string
}
export type NewsTranslator = (items: NewsTranslationInput[]) => Promise<unknown>
/** 只接受中文短文；链接、来源、日期、分类均由采集器保留，不交给模型生成。 */
export function acceptedTranslation(value: unknown, input: NewsTranslationInput) {
  if (!value || typeof value !== 'object') return null
  const row = value as Record<string, unknown>
  if (
    row.id !== input.id ||
    typeof row.title !== 'string' ||
    row.title.length > 100 ||
    !/[\u3400-\u9fff]/.test(row.title)
  )
    return null
  const summary =
    typeof row.summary === 'string' && input.excerpt.length >= 20 ? row.summary.trim() : ''
  if (summary.length > 160 || (summary && !/[\u3400-\u9fff]/.test(summary))) return null
  const output = row.title + summary
  if (/[<>]|https?:\/\/|系统提示|API.?Key|忽略.*指令/i.test(output)) return null
  const numbers = new Set((input.title + ' ' + input.excerpt).match(/\d+(?:\.\d+)*/g) ?? [])
  if ((output.match(/\d+(?:\.\d+)*/g) ?? []).some((n) => !numbers.has(n))) return null
  return { title: row.title.trim(), summary: summary || null }
}

/** 有锁、每日上限及失败冷却；访客只触发共享队列，不产生逐访客模型调用。 */
export async function localizeNews(db: Db, translate: NewsTranslator, now = new Date()) {
  await ensureNews(db, now)
  const stamp = now.toISOString(),
    token = crypto.randomUUID(),
    time = now.getTime()
  await db.run('INSERT OR IGNORE INTO news_language_lock VALUES(1,?,0)', [token])
  const lease = await db.run(
    'UPDATE news_language_lock SET token=?,until_ms=? WHERE id=1 AND until_ms<?',
    [token, time + 120000, time],
  )
  if (!lease.changes) return 0
  try {
    const rows = await db.all<{ id: string; source_title: string; excerpt: string; url: string }>(
      `SELECT n.id,n.source_title,COALESCE(l.excerpt,'') AS excerpt,n.url FROM news_items n LEFT JOIN news_localizations l ON n.id=l.id WHERE n.hidden=0 AND n.edited_at IS NULL AND n.manual_title IS NULL AND n.published_at>=? AND (l.title_zh IS NULL OR l.source_title<>n.source_title) AND (l.attempted_at IS NULL OR l.attempted_at<?) ORDER BY n.published_at DESC LIMIT 100`,
      [new Date(time - 120 * 86400000).toISOString(), new Date(time - 30 * 60000).toISOString()],
    )
    const selected = rows
      .filter(
        (row) =>
          !newsBriefEdits[row.url] &&
          !newsTitleEdits[row.url] &&
          !/[\u3400-\u9fff]/.test(row.source_title),
      )
      .slice(0, 6)
    if (!selected.length) return 0
    await db.exec(
      'CREATE TABLE IF NOT EXISTS news_language_budget(day TEXT PRIMARY KEY,count INTEGER NOT NULL)',
    )
    const budget = await db.run(
      'INSERT INTO news_language_budget VALUES(?,1) ON CONFLICT(day) DO UPDATE SET count=count+1 WHERE count<24',
      [stamp.slice(0, 10)],
    )
    if (!budget.changes) return 0
    await db.batch(
      selected.map((row) => ({
        sql: 'INSERT INTO news_localizations(id,source_title,excerpt,attempted_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET attempted_at=excluded.attempted_at',
        params: [row.id, row.source_title, row.excerpt, stamp],
      })),
    )
    const inputs = selected.map((row) => ({
      id: row.id,
      title: row.source_title,
      excerpt: row.excerpt,
    }))
    const output = await translate(inputs)
    if (!Array.isArray(output)) return 0
    let saved = 0
    for (const input of inputs) {
      const result = acceptedTranslation(
        output.find((r) => r && typeof r === 'object' && r.id === input.id),
        input,
      )
      if (!result) continue
      const update = await db.run(
        `UPDATE news_localizations SET title_zh=?,summary_zh=?,translated_at=? WHERE id=? AND source_title=? AND EXISTS(SELECT 1 FROM news_items n WHERE n.id=? AND n.source_title=? AND n.manual_title IS NULL AND n.edited_at IS NULL AND n.hidden=0)`,
        [result.title, result.summary, stamp, input.id, input.title, input.id, input.title],
      )
      saved += update.changes
    }
    return saved
  } catch {
    // 失败不替换既有内容，不输出上游错误正文或凭据。
    return 0
  }
}
