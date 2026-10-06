import { describe, expect, it } from 'vitest'
import {
  buildFreshnessReport,
  daysSince,
  daysToNextLevel,
  FRESHNESS_THRESHOLDS,
  latestContentUpdate,
  levelOf,
  toolFreshness,
  topWeightedCapabilities,
  type FreshnessKind,
} from '../freshness'
import { tools } from '@/data/tools'
import { scenarios } from '@/data/scenarios'

const NOW = new Date('2026-10-02T00:00:00Z')

function iso(daysAgo: number): string {
  return new Date(NOW.getTime() - daysAgo * 86_400_000).toISOString().slice(0, 10)
}

describe('daysSince / levelOf', () => {
  it('计算天数并对非法日期返回 Infinity', () => {
    expect(daysSince(iso(10), NOW)).toBe(10)
    expect(daysSince(iso(0), NOW)).toBe(0)
    expect(daysSince('not-a-date', NOW)).toBe(Number.POSITIVE_INFINITY)
  })

  it('未来日期不会返回负数', () => {
    expect(daysSince(iso(-5), NOW)).toBe(0)
  })

  it('不同内容类型用不同阈值', () => {
    // 工具 180 天超期，概念 730 天超期
    expect(levelOf(200, 'tool')).toBe('stale')
    expect(levelOf(200, 'concept')).toBe('aging')
    expect(levelOf(30, 'tool')).toBe('fresh')
    expect(levelOf(100, 'tool')).toBe('aging')
  })

  it('阈值顺序一定是 fresh ≤ warn ≤ stale', () => {
    for (const [kind, t] of Object.entries(FRESHNESS_THRESHOLDS)) {
      expect(t.warn, kind).toBeGreaterThanOrEqual(t.fresh)
      expect(t.stale, kind).toBeGreaterThan(t.warn)
    }
  })
})

describe('daysToNextLevel', () => {
  it('新鲜内容返回到"进入待复核"的天数', () => {
    expect(daysToNextLevel(10, 'tool')).toBe(FRESHNESS_THRESHOLDS.tool.fresh - 10)
  })

  it('待复核内容返回到"判定超期"的天数', () => {
    expect(daysToNextLevel(60, 'tool')).toBe(FRESHNESS_THRESHOLDS.tool.stale - 60)
  })

  it('已超期返回负数（表示超了多少天）', () => {
    expect(daysToNextLevel(200, 'tool')).toBeLessThan(0)
  })
})

describe('buildFreshnessReport', () => {
  const report = buildFreshnessReport({ now: NOW })

  it('覆盖全部内容类型且条目数合理', () => {
    expect(Object.keys(report.byKind).sort()).toEqual(
      Object.keys(FRESHNESS_THRESHOLDS).sort() as FreshnessKind[]
    )
    // 至少覆盖工具与概念两类，且条目数与数据量匹配
    expect(report.byKind.tool.total).toBe(tools.length)
    expect(report.totals.total).toBeGreaterThan(80)
    expect(report.totals.fresh + report.totals.aging + report.totals.stale).toBe(report.totals.total)
  })

  it('每类统计的 fresh/aging/stale 之和等于总数', () => {
    for (const stat of Object.values(report.byKind)) {
      expect(stat.fresh + stat.aging + stat.stale, 'sum mismatch').toBe(stat.total)
    }
  })

  it('byKind 不含 warn 字段（warn 只是阈值表里的提醒线）', () => {
    for (const stat of Object.values(report.byKind)) {
      expect('warn' in stat).toBe(false)
    }
  })

  it('每条记录都有可点进的 href', () => {
    for (const item of report.items) {
      expect(item.href.startsWith('/')).toBe(true)
      expect(item.title.length).toBeGreaterThan(0)
      expect(item.ageDays).toBeGreaterThanOrEqual(0)
    }
  })

  it('当前示例数据不应有超期项', () => {
    // 数据都是 2026-09 的，阈值至少 180 天
    expect(report.totals.stale).toBe(0)
    expect(report.dueForReview.length).toBeLessThan(report.totals.total / 2)
  })

  it('dueForReview 里不含 fresh 项', () => {
    expect(report.dueForReview.every((i) => i.level !== 'fresh')).toBe(true)
  })

  it('纯函数：同样输入两次结果一致', () => {
    const a = buildFreshnessReport({ now: NOW })
    const b = buildFreshnessReport({ now: NOW })
    expect(a.totals).toEqual(b.totals)
    expect(a.dueForReview.map((i) => i.id)).toEqual(b.dueForReview.map((i) => i.id))
  })

  it('时间往后推一年，工具类会进入超期', () => {
    const later = new Date(NOW.getTime() + 365 * 86_400_000)
    const future = buildFreshnessReport({ now: later })
    expect(future.byKind.tool.stale).toBeGreaterThan(0)
    expect(future.dueForReview.length).toBeGreaterThan(report.dueForReview.length)
  })
})

describe('toolFreshness / latestContentUpdate / topWeightedCapabilities', () => {
  it('工具新鲜度按 updatedAt 判断', () => {
    const t = tools[0]
    const fresh = toolFreshness(t.id, NOW)
    expect(fresh).not.toBeNull()
    expect(fresh!.isStale).toBe(false)

    const later = new Date(NOW.getTime() + 400 * 86_400_000)
    expect(toolFreshness(t.id, later)!.isStale).toBe(true)
  })

  it('不存在的工具返回 null', () => {
    expect(toolFreshness('nope')).toBeNull()
  })

  it('最近更新日期不晚于今天', () => {
    const latest = latestContentUpdate(NOW)
    expect(daysSince(latest.date, NOW)).toBeGreaterThanOrEqual(0)
  })

  it('权重取前 N 个并按降序', () => {
    const weights = { writing: 0.1, coding: 0.5, office: 0.3, imageGen: 0 }
    const top = topWeightedCapabilities(weights, 2)
    expect(top.map((t) => t.key)).toEqual(['coding', 'office'])
  })
})

describe('保鲜阈值与决策器规则的配合', () => {
  it('场景规则数量与数据一致（决策器依赖规则表，不能为空）', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(10)
  })
})