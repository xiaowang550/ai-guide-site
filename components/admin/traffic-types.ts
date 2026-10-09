export type TrafficPeriod = 'today' | '7d' | '30d' | '90d' | '6m' | '12m'
export interface TrafficReport {
  period: TrafficPeriod
  granularity: 'day' | 'month'
  timezone: string
  updatedAt: string
  startDay: string
  endDay: string
  totalViews: number
  allTimeViews: number
  todayViews: number
  yesterdayViews: number
  previousViews: number
  changePercent: number | null
  last5Minutes: number
  lastHour: number
  realtime: { time: string; count: number }[]
  series: { label: string; count: number }[]
  topPages: { path: string; count: number }[]
  topEvents: { name: string; label: string; count: number }[]
  firstDay: string | null
}
