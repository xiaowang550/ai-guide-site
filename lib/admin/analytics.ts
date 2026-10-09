/**
 * 访问统计与关键使用事件。
 *
 * ── 先说清楚这个模块**不做**什么（这是设计决定，不是能力不足）──
 *
 * 不统计独立访客（UV）。UV 必须靠某种跨请求可关联的标识来算 ——
 * Cookie、localStorage 标识、IP、浏览器指纹，四者都意味着把「谁」记进了库。
 * 本站对外承诺不做用户画像、不存个人信息，从统计口开后门是最典型的自相矛盾。
 *
 * 所以这里只答两个问题：
 *   · 哪些页面被看了多少次（page_views）
 *   · 用户在站上做了哪些关键动作（events）
 * 不答「谁来了几次」。后台仪表盘也不显示 UV 卡片，
 * 而不是显示一个「—」再写小字解释 —— 那会让一个不存在的能力看起来像 bug。
 *
 * 另外没有任何 IP / User-Agent / 指纹落库，限流用的也是哈希后的键。
 */
import type { Db } from '../db/types.ts'
import { toInt, toText } from '../db/types.ts'
import { maskIp, nowIso } from './auth.ts'
import { isRateLimited, pruneRateLimits } from './feedback.ts'

/**
 * 关键事件白名单。
 *
 * 必须是枚举而不是前端随意传字符串：写错的埋点名会在库里堆出一堆
 * 无法聚合的垃圾行，而且没人会发现。带了 label 与 description，
 * 是为了让后台的「事件」列表能直接说明每个名字代表什么用户行为，
 * 而不是让人去翻代码。
 */
export const EVENT_NAMES = [
  { name: 'wizard_start', label: '打开场景决策器', description: '进入 /find 并开始第一步选择' },
  { name: 'wizard_complete', label: '完成决策器流程', description: '走完四步看到了推荐结果' },
  { name: 'compare_use', label: '使用工具对比', description: '在 /compare 变更了对比组合' },
  { name: 'search_use', label: '使用站内搜索', description: '通过搜索框或 ⌘K 打开结果' },
  { name: 'prompt_copy', label: '复制提示词', description: '复制了提示词模板或案例里的提示词' },
  { name: 'assistant_open', label: '打开助手面板', description: '打开右下角的规则模式助手' },
  { name: 'feedback_submit', label: '提交反馈', description: '通过公开表单提交了一条反馈' },
  { name: 'tool_outbound', label: '点击工具官网', description: '从工具详情页跳到厂商官网' },
] as const

export type EventName = (typeof EVENT_NAMES)[number]['name']

const EVENT_NAME_SET = new Set<string>(EVENT_NAMES.map((e) => e.name))

export function isKnownEvent(name: unknown): name is EventName {
  return typeof name === 'string' && EVENT_NAME_SET.has(name)
}

/** 埋点请求频率上限：同一 IP 掩码每分钟 30 次。正常浏览远低于这个数 */
export const ANALYTICS_MAX_PER_MINUTE = 30

/** 单次请求最多接受多少条事件，防止一次提交几百条把库灌满 */
const MAX_EVENTS_PER_REQUEST = 10

/**
 * 路径归一化。
 *
 * 不归一化的话 `/tools/kimi/`、`/tools/kimi`、`/tools/kimi/?from=home`
 * 会变成三行数据，热门页面榜会被打散成碎片。统计要的是「这条路径有多少人在看」。
 */
export function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim()
  if (!v || v.length > 300) return null
  try {
    const u = new URL(v, 'https://placeholder.invalid')
    if (u.origin !== 'https://placeholder.invalid') return null
    // 去 query 与 hash，去掉重复斜杠，根路径保留为 '/'
    const path = u.pathname.replace(/\/{2,}/g, '/')
    const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path
    return (trimmed || '/').slice(0, 200)
  } catch {
    return null
  }
}

/** 只保留本站已知路由形状，避免把任意字符串塞进库 */
function isPlausiblePath(path: string): boolean {
  if (path === '/') return true
  return /^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/?$/i.test(path)
}

export function today(): string {
  return calendarDay(Date.now())
}

/** 统计的日期边界固定为北京时间，不依赖服务器或浏览器时区。 */
export function calendarDay(now: number): string {
  return new Date(now + 8 * 3600_000).toISOString().slice(0, 10)
}

export async function ensureRealtimeTable(db: Db): Promise<void> {
  await db.exec(`CREATE TABLE IF NOT EXISTS page_view_minutes (
    minute TEXT NOT NULL, path TEXT NOT NULL, count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (minute, path)
  )`)
}

export interface CollectResult {
  ok: boolean
  error?: string
  accepted: number
}

export interface CollectInput {
  /** 页面访问量。一次浏览上报一次，重复上报会累加 */
  path?: unknown
  events?: unknown
  ip: string
  siteSalt: string
}

/**
 * 接收一次埋点上报。
 *
 * 永远返回 200（除非限流）。埋点是「尽力而为」的性质：
 * 让浏览器因为统计失败而报错、影响正常浏览，是本末倒置。
 * 但限流超限时会明确告知，让调用方知道数据被丢了，
 * 而不是假装收到了 —— 悄悄丢数据比明确报错更难排查。
 */
export async function collect(input: CollectInput, db: Db): Promise<CollectResult> {
  const ipPrefix = maskIp(input.ip)
  if (await isRateLimited(db, 'analytics', ipPrefix, input.siteSalt, ANALYTICS_MAX_PER_MINUTE)) {
    return { ok: false, error: 'too many requests', accepted: 0 }
  }

  const day = today()
  let accepted = 0

  const path = normalizePath(input.path)
  if (path && isPlausiblePath(path) && !/^\/(admin|api)(\/|$)/.test(path)) {
    await ensureRealtimeTable(db)
    const minute = new Date().toISOString().slice(0, 16)
    await db.batch([
      { sql: `INSERT INTO page_views (day, path, count) VALUES (?, ?, 1)
        ON CONFLICT(day, path) DO UPDATE SET count = count + 1`, params: [day, path] },
      { sql: `INSERT INTO page_view_minutes (minute, path, count) VALUES (?, ?, 1)
        ON CONFLICT(minute, path) DO UPDATE SET count = count + 1`, params: [minute, path] },
      { sql: 'DELETE FROM page_view_minutes WHERE minute < ?', params: [new Date(Date.now() - 48 * 3600_000).toISOString().slice(0, 16)] },
    ])
    accepted++
  }

  const rawEvents = Array.isArray(input.events) ? input.events.slice(0, MAX_EVENTS_PER_REQUEST) : []
  for (const raw of rawEvents) {
    const name = (raw as { name?: unknown })?.name
    if (!isKnownEvent(name)) continue

    const rawPath = (raw as { path?: unknown })?.path
    // 路径没传：归到根路径，这是合理的默认值（全局事件）
    // 路径传了但非法（外部地址、含 query 之外的垃圾、超长）：
    //   **整条事件丢弃**，不能兜底成 '/'。
    //   兜底等于给了一个「可以把任意事件刷到首页统计上」的口子 ——
    //   一个写错埋点的客户端就能污染最热的那一行数据。
    const normalized = rawPath === undefined || rawPath === null ? '/' : normalizePath(rawPath)
    if (normalized === null) continue
    if (!isPlausiblePath(normalized) || /^\/(admin|api)(\/|$)/.test(normalized)) continue

    await db.run(
      `INSERT INTO events (day, name, path, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(day, name, path) DO UPDATE SET count = count + 1`,
      [day, name, normalized]
    )
    accepted++
  }

  if (accepted > 0) await pruneRateLimits(db)
  return { ok: true, accepted }
}

/** 把事件白名单同步进库（部署/初始化时调一次） */
export async function syncEventNames(db: Db): Promise<void> {
  for (const e of EVENT_NAMES) {
    await db.run(
      `INSERT INTO event_names (name, label, description) VALUES (?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET label = excluded.label, description = excluded.description`,
      [e.name, e.label, e.description]
    )
  }
}

/** 记录一个一次性事件 */
export async function recordMilestone(
  db: Db,
  name: string,
  payload?: unknown
): Promise<void> {
  await db.run(
    `INSERT INTO milestones (name, payload, created_at) VALUES (?, ?, ?)
     ON CONFLICT(name) DO NOTHING`,
    [name, payload === undefined ? null : JSON.stringify(payload), nowIso()]
  )
}

export async function getMilestone(db: Db, name: string): Promise<{ name: string; created_at: string } | null> {
  return db.first<{ name: string; created_at: string }>(
    'SELECT name, created_at FROM milestones WHERE name = ?',
    [name]
  )
}

// ── 仪表盘查询 ─────────────────────────────────────────────────────────────

export interface DailyPoint {
  day: string
  count: number
}

/** 补齐没有数据的日期，否则折线图会跳过空白日，看起来像流量断了 */
function fillDays(rows: { day: string; n: number }[], days: number): DailyPoint[] {
  const map = new Map(rows.map((r) => [toText(r.day), toInt(r.n)]))
  const out: DailyPoint[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = calendarDay(Date.now() - i * 86_400_000)
    out.push({ day: d, count: map.get(d) ?? 0 })
  }
  return out
}

export interface AnalyticsSummary {
  hasData: boolean
  /** 数据覆盖的天数。用于在仪表盘上说明「统计从哪天开始有」 */
  firstDay: string | null
  totalViews: number
  totalEvents: number
  viewsByDay: DailyPoint[]
  topPages: { path: string; count: number }[]
  topEvents: { name: string; label: string; count: number }[]
  /** 各事件名出现过的天数，用来看事件埋点是不是稳定在跑 */
  eventCoverage: { name: string; label: string; days: number; count: number }[]
}

export async function analyticsSummary(db: Db, days = 14): Promise<AnalyticsSummary> {
  const windowDays = Number.isFinite(days) ? Math.min(Math.max(Math.trunc(days), 1), 366) : 14

  const viewRows = await db.all<{ day: string; n: number }>(
    `SELECT day, SUM(count) AS n FROM page_views
      WHERE day >= ? GROUP BY day ORDER BY day`,
    [calendarDay(Date.now() - (windowDays - 1) * 86_400_000)]
  )
  const eventRows = await db.all<{ day: string; n: number }>(
    `SELECT day, SUM(count) AS n FROM events
      WHERE day >= ? GROUP BY day ORDER BY day`,
    [calendarDay(Date.now() - (windowDays - 1) * 86_400_000)]
  )
  const topPages = await db.all<{ path: string; n: number }>(
    `SELECT path, SUM(count) AS n FROM page_views
      WHERE day >= ? GROUP BY path ORDER BY n DESC LIMIT 15`,
    [calendarDay(Date.now() - (windowDays - 1) * 86_400_000)]
  )
  const eventAgg = await db.all<{ name: string; n: number; d: number }>(
    `SELECT name, SUM(count) AS n, COUNT(DISTINCT day) AS d FROM events
      WHERE day >= ? GROUP BY name ORDER BY n DESC`,
    [calendarDay(Date.now() - (windowDays - 1) * 86_400_000)]
  )
  const first = await db.first<{ d: string | null }>(
    `SELECT MIN(day) AS d FROM (SELECT MIN(day) AS day FROM page_views UNION ALL SELECT MIN(day) FROM events)`
  )

  // 显式标注 Map<string, string>：不加的话 TS 会从 EVENT_NAMES 推出
  // Map<EventName, string>，于是用库里的 string 去 get 就报错 ——
  // 而库里的 name 恰恰可能是本版白名单之外的历史值，不该在这里炸掉。
  const labelOf = new Map<string, string>(EVENT_NAMES.map((e) => [e.name, e.label]))
  const totalViews = viewRows.reduce((s, r) => s + toInt(r.n), 0)
  const totalEvents = eventRows.reduce((s, r) => s + toInt(r.n), 0)
  const firstDay = first?.d ? toText(first.d) : null

  return {
    hasData: totalViews > 0 || totalEvents > 0,
    firstDay,
    totalViews,
    totalEvents,
    viewsByDay: fillDays(viewRows, windowDays),
    topPages: topPages.map((r) => ({ path: toText(r.path), count: toInt(r.n) })),
    topEvents: eventAgg.map((r) => ({
      name: toText(r.name),
      label: labelOf.get(toText(r.name)) ?? toText(r.name),
      count: toInt(r.n),
    })),
    eventCoverage: eventAgg.map((r) => ({
      name: toText(r.name),
      label: labelOf.get(toText(r.name)) ?? toText(r.name),
      days: toInt(r.d),
      count: toInt(r.n),
    })),
  }
}
