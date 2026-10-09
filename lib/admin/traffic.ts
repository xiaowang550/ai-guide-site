import type { Db } from '../db/types.ts'
import { toInt } from '../db/types.ts'
import { analyticsSummary, calendarDay, ensureRealtimeTable } from './analytics.ts'

export const TRAFFIC_PERIODS = ['today', '7d', '30d', '90d', '6m', '12m'] as const
export type TrafficPeriod = (typeof TRAFFIC_PERIODS)[number]

export async function trafficReport(db: Db, period: TrafficPeriod = '7d') {
  const now = Date.now()
  const day = calendarDay(now)
  const months = period === '6m' ? 6 : period === '12m' ? 12 : 0
  const firstMonth = new Date(`${day}T00:00:00Z`)
  firstMonth.setUTCDate(1)
  firstMonth.setUTCMonth(firstMonth.getUTCMonth() - Math.max(0, months - 1))
  const days = months
    ? Math.round((Date.parse(`${day}T00:00:00Z`) - firstMonth.getTime()) / 86400_000) + 1
    : period === 'today'
      ? 1
      : period === '30d'
        ? 30
        : period === '90d'
          ? 90
          : 7
  const startDay = calendarDay(now - (days - 1) * 86400_000)
  const summary = await analyticsSummary(db, days)
  await ensureRealtimeTable(db)
  const minuteRows = await db.all<{ minute: string; count: number }>(
    'SELECT minute, SUM(count) AS count FROM page_view_minutes WHERE minute >= ? AND minute <= ? GROUP BY minute ORDER BY minute',
    [
      new Date(now - 59 * 60_000).toISOString().slice(0, 16),
      new Date(now).toISOString().slice(0, 16),
    ],
  )
  const minutes = new Map(minuteRows.map((r) => [r.minute, toInt(r.count)]))
  const realtime = Array.from({ length: 60 }, (_, i) => {
    const time = new Date(now - (59 - i) * 60_000).toISOString().slice(0, 16)
    return { time, count: minutes.get(time) ?? 0 }
  })
  const [all, currentDay, previousDay, previousPeriod] = await Promise.all([
    db.first<{ count: number }>('SELECT SUM(count) AS count FROM page_views'),
    db.first<{ count: number }>('SELECT SUM(count) AS count FROM page_views WHERE day = ?', [day]),
    db.first<{ count: number }>('SELECT SUM(count) AS count FROM page_views WHERE day = ?', [
      calendarDay(now - 86400_000),
    ]),
    db.first<{ count: number }>(
      'SELECT SUM(count) AS count FROM page_views WHERE day >= ? AND day < ?',
      [calendarDay(now - (2 * days - 1) * 86400_000), startDay],
    ),
  ])
  let series = summary.viewsByDay.map((r) => ({ label: r.day, count: r.count }))
  if (months) {
    const buckets = new Map<string, number>()
    for (let i = 0; i < months; i++) {
      const date = new Date(firstMonth)
      date.setUTCMonth(date.getUTCMonth() + i)
      buckets.set(date.toISOString().slice(0, 7), 0)
    }
    for (const point of series) {
      const month = point.label.slice(0, 7)
      if (buckets.has(month)) buckets.set(month, buckets.get(month)! + point.count)
    }
    series = [...buckets].map(([label, count]) => ({ label, count }))
  }
  const previousViews = toInt(previousPeriod?.count)
  return {
    period,
    granularity: months ? 'month' : 'day',
    timezone: 'Asia/Shanghai',
    updatedAt: new Date(now).toISOString(),
    startDay,
    endDay: day,
    totalViews: summary.totalViews,
    allTimeViews: toInt(all?.count),
    todayViews: toInt(currentDay?.count),
    yesterdayViews: toInt(previousDay?.count),
    previousViews,
    changePercent: previousViews
      ? Math.round(((summary.totalViews - previousViews) / previousViews) * 100)
      : null,
    last5Minutes: realtime.slice(-5).reduce((sum, r) => sum + r.count, 0),
    lastHour: realtime.reduce((sum, r) => sum + r.count, 0),
    realtime,
    series,
    topPages: summary.topPages,
    topEvents: summary.topEvents,
    firstDay: summary.firstDay,
  }
}
