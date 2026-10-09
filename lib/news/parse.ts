import type { NewsCategory, NewsSource } from './types.ts'

export interface ParsedNews {
  title: string
  url: string
  publishedAt: string
  category: NewsCategory
  toolIds: string[]
}

export function plainText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (_, code: string) => {
      const number = code[0].toLowerCase() === 'x' ? parseInt(code.slice(1), 16) : Number(code)
      return number > 0 && number <= 0x10ffff ? String.fromCodePoint(number) : ''
    })
    .replace(
      /&(amp|quot|apos|lt|gt|nbsp);/g,
      (_, entity: string) =>
        ({ amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' })[entity] ?? '',
    )
    .replace(/\s+/g, ' ')
    .trim()
}
export function trustedUrl(value: string, source: NewsSource): string | null {
  try {
    if (!value.trim()) return null
    const url = new URL(plainText(value), source.url)
    if (
      url.protocol !== 'https:' ||
      !source.hosts.includes(url.hostname) ||
      url.username ||
      url.password
    )
      return null
    for (const key of [...url.searchParams.keys()])
      if (key.startsWith('utm_') || key === 'ref') url.searchParams.delete(key)
    if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
    return url.href
  } catch {
    return null
  }
}
export function newsCategory(title: string, source: NewsSource): NewsCategory {
  if (
    /^(?:Introducing\s+)?(?:gpt|claude|gemini|deepseek|qwen|kimi)[-\s]?(?:(?:v|k|haiku|sonnet|opus|image)[-\s]?)?\d/i.test(
      title,
    ) ||
    /(?:introducing|release|preview|launch|发布|推出).*(?:model|gpt|claude|gemini|deepseek|qwen|kimi)|(?:gpt|claude|gemini|deepseek|qwen)[-\s]+(?:\w+[-\s]+)?\d/i.test(
      title,
    )
  )
    return '模型发布'
  if (/pric|billing|subscription|quota|\bcost|额度|费用|价格/i.test(title)) return '使用变化'
  if (
    ['cursor', 'copilot', 'ollama'].includes(source.id) ||
    /codex|coding|sdk|开发|代码/i.test(title)
  )
    return '编程工具'
  if (/research|study|science|partner|enterprise|安全|研究/i.test(title)) return '研究与行业'
  return '功能更新'
}
function toolIds(title: string, source: NewsSource): string[] {
  if (source.id === 'google') return /notebooklm/i.test(title) ? ['notebooklm'] : ['gemini']
  if (source.id === 'openai')
    return /chatgpt|gpt-|voice|images|work|codex/i.test(title) ? ['chatgpt'] : []
  return source.toolIds
}
function validDate(raw: string, now: Date): string | null {
  const date = raw.replace(/(20\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/, '$1/$2/$3')
  const time = Date.parse(!/:|T\d/.test(date) ? `${date} UTC` : date)
  if (!Number.isFinite(time) || time > now.getTime() + 86400000 || time < Date.UTC(2020, 0, 1))
    return null
  return new Date(time).toISOString()
}
function xmlField(body: string, field: string): string {
  return body.match(new RegExp(`<${field}\\b[^>]*>([\\s\\S]*?)<\\/${field}>`, 'i'))?.[1] ?? ''
}
/** 只读取标题、时间和一手链接，不存储全文或执行远端代码。 */
export function parseNews(body: string, source: NewsSource, now = new Date()): ParsedNews[] {
  const maxBytes = source.format === 'qwen' ? 8_000_000 : 2_000_000
  if (body.length > maxBytes || /<!DOCTYPE[^>]*\[|<!ENTITY/i.test(body))
    throw new Error('来源内容超出限制或包含外部实体声明')
  const rows: { title: string; url: string; date: string }[] = []
  if (source.format === 'qwen') {
    const data: unknown = JSON.parse(body)
    if (!data || typeof data !== 'object') throw new Error('文章接口格式异常')
    const payload = (data as { data?: { articles?: unknown } }).data
    if (!Array.isArray(payload?.articles)) throw new Error('文章列表格式异常')
    for (const value of payload.articles) {
      if (!value || typeof value !== 'object') continue
      const row = value as { title?: string; path?: string; extra?: { date?: string } }
      if (typeof row.path !== 'string' || !/^[-\w.]+$/.test(row.path)) continue
      rows.push({
        title: row.title ?? '',
        url: `https://qwen.ai/blog?id=${encodeURIComponent(row.path)}`,
        date: row.extra?.date ?? '',
      })
    }
  } else if (source.format === 'github') {
    const entries: unknown = JSON.parse(body)
    if (!Array.isArray(entries)) throw new Error('版本接口格式异常')
    for (const entry of entries.slice(0, 30)) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      if (row.draft || row.prerelease) continue
      rows.push({
        title: `Ollama ${String(row.name || row.tag_name || '')}`,
        url: String(row.html_url || ''),
        date: String(row.published_at || ''),
      })
    }
  } else if (source.format === 'rss') {
    for (const match of body.matchAll(/<(?:item|entry)\b[^>]*>([\s\S]*?)<\/(?:item|entry)>/gi)) {
      const text = match[1]
      const link =
        xmlField(text, 'link') || text.match(/<link\b[^>]*href=["']([^"']+)["']/i)?.[1] || ''
      rows.push({
        title: xmlField(text, 'title'),
        url: link,
        date: plainText(
          xmlField(text, 'pubDate') ||
            xmlField(text, 'published') ||
            xmlField(text, 'updated') ||
            xmlField(text, 'dc:date'),
        ),
      })
      if (rows.length >= 60) break
    }
  } else {
    const allowed = new RegExp(source.linkPattern ?? '.')
    const dateByUrl = new Map<string, string>()
    if (source.id === 'kimi') {
      for (const card of body.split(/<div[^>]*class="[^"]*\bmenu-card\b[^"]*"/).slice(1)) {
        const url = card.match(/href=["']([^"']+)["']/)?.[1] ?? ''
        const title = card.match(/aria-label=["']([^"']+)["']/)?.[1] ?? ''
        const date = card.match(/20\d{2}-\d{2}-\d{2}/)?.[0] ?? ''
        if (allowed.test(url)) rows.push({ title, url, date })
      }
    }
    for (const match of body.matchAll(/<a\b([^>]+)>([\s\S]*?)<\/a>/gi)) {
      const url = match[1].match(/\bhref=["']([^"']+)["']/i)?.[1] ?? ''
      if (!allowed.test(url)) continue
      const text = plainText(match[2])
      const date =
        match[2].match(/datetime=["']([^"']+)["']/i)?.[1] ||
        text.match(
          /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+20\d{2}/i,
        )?.[0] ||
        text.match(/20\d{2}-\d{2}-\d{2}/)?.[0] ||
        text.match(/20\d{2}\s*年\s*\d{1,2}\s*月\s*\d{1,2}\s*日/)?.[0] ||
        ''
      if (date) dateByUrl.set(url, date)
      // Cursor 的日期与标题是两个链接，日期链接不能成为文章标题。
      if (source.id === 'cursor' && /<time\b/i.test(match[2]) && !/<h[1-6]\b/i.test(match[2]))
        continue
      const heading = match[2].match(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1]
      const title = heading
        ? plainText(heading)
        : text
            .replace(date, '')
            .replace(/^(?:News|Announcements|Features|Science|动态)\s*/, '')
            .trim()
      rows.push({
        title,
        url,
        date: date || (source.id === 'cursor' ? dateByUrl.get(url) : '') || '',
      })
    }
  }
  const unique = new Map<string, ParsedNews>()
  for (const row of rows) {
    const url = trustedUrl(row.url, source),
      publishedAt = validDate(row.date, now),
      title = plainText(row.title).slice(0, 230)
    if (!url || !publishedAt || title.length < 3) continue
    if (!unique.has(url))
      unique.set(url, {
        title,
        url,
        publishedAt,
        category: newsCategory(title, source),
        toolIds: toolIds(title, source),
      })
  }
  return [...unique.values()]
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 25)
}
