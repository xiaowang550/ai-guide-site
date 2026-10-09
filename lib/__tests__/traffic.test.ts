import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeTestEnv, login, request } from './helpers/admin-test-env'
import { calendarDay, collect } from '@/lib/admin/analytics'
import { trafficReport } from '@/lib/admin/traffic'

afterEach(() => vi.restoreAllMocks())

describe('管理员流量统计', () => {
  it('日期边界使用北京时间，包括 UTC 的前一天', () => {
    expect(calendarDay(Date.parse('2026-10-07T16:01:00Z'))).toBe('2026-10-08')
    expect(calendarDay(Date.parse('2026-10-07T15:59:00Z'))).toBe('2026-10-07')
  })

  it('未登录读不到浏览数据，非法时间范围被拒绝', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    expect((await request(env, 'GET', '/api/admin/analytics')).status).toBe(401)
    await login(env)
    expect((await request(env, 'GET', '/api/admin/analytics?period=garbage')).status).toBe(400)
  })

  it('非所有者即使已登录也不能读取管理数据', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    await login(env)
    await env.db.run("UPDATE admins SET role = 'editor'")
    expect((await request(env, 'GET', '/api/admin/analytics')).status).toBe(403)
    expect((await request(env, 'GET', '/api/admin/content')).status).toBe(403)
  })

  it('页面浏览写入日统计和分钟统计，操作事件不增加浏览量', async () => {
    const env = await makeTestEnv()
    await collect({ path: '/tools/', ip: '127.0.0.1', siteSalt: 'test' }, env.db)
    await collect(
      { events: [{ name: 'search_use', path: '/tools' }], ip: '127.0.0.1', siteSalt: 'test' },
      env.db,
    )
    const report = await trafficReport(env.db)
    expect(report.todayViews).toBe(1)
    expect(report.last5Minutes).toBe(1)
    expect(report.lastHour).toBe(1)
    expect(report.topEvents[0].count).toBe(1)
  })

  it('排除后台路径，并清理过期分钟记录而保留历史日统计', async () => {
    const env = await makeTestEnv()
    await env.db.run('INSERT INTO page_view_minutes VALUES (?, ?, ?)', ['2020-01-01T00:00', '/', 5])
    await collect({ path: '/', ip: '127.0.0.1', siteSalt: 'test' }, env.db)
    await collect({ path: '/admin/', ip: '127.0.0.1', siteSalt: 'test' }, env.db)
    const report = await trafficReport(env.db)
    expect(report.allTimeViews).toBe(1)
    expect(
      await env.db.first('SELECT * FROM page_view_minutes WHERE minute = ?', ['2020-01-01T00:00']),
    ).toBeNull()
  })

  it('近五分钟与近一小时分别计算，没有数据的分钟补零', async () => {
    const env = await makeTestEnv()
    const now = Date.now()
    vi.spyOn(Date, 'now').mockReturnValue(now)
    for (const [ago, count] of [
      [2, 3],
      [20, 7],
      [61, 20],
    ]) {
      await env.db.run('INSERT INTO page_view_minutes VALUES (?, ?, ?)', [
        new Date(now - ago * 60000).toISOString().slice(0, 16),
        '/',
        count,
      ])
    }
    const report = await trafficReport(env.db)
    expect(report.last5Minutes).toBe(3)
    expect(report.lastHour).toBe(10)
    expect(report.realtime).toHaveLength(60)
  })

  it('日趋势补齐日期，月趋势按真实日历月份汇总', async () => {
    const env = await makeTestEnv()
    vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-08T02:00:00Z'))
    for (const [day, count] of [
      ['2026-10-08', 3],
      ['2026-10-06', 2],
      ['2026-09-20', 7],
      ['2026-05-01', 4],
      ['2026-04-30', 100],
    ] as const) {
      await env.db.run('INSERT INTO page_views VALUES (?, ?, ?)', [day, '/', count])
    }
    const days = await trafficReport(env.db, '7d')
    expect(days.series).toHaveLength(7)
    expect(days.totalViews).toBe(5)
    expect(days.series.at(-1)?.label).toBe('2026-10-08')
    const months = await trafficReport(env.db, '6m')
    expect(months.series).toHaveLength(6)
    expect(months.series[0]).toEqual({ label: '2026-05', count: 4 })
    expect(months.series.at(-1)).toEqual({ label: '2026-10', count: 5 })
    expect(months.totalViews).toBe(16)
    expect(months.allTimeViews).toBe(116)
    expect((await trafficReport(env.db, '12m')).series).toHaveLength(12)
  })
})
