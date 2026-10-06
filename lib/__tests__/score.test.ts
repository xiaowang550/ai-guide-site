import { describe, expect, it } from 'vitest'
import {
  CAPABILITY_META,
  CAPABILITY_KEYS,
  capabilityEntries,
  computeOverallScore,
  daysSince,
  formatDate,
  isStale,
  latestUpdatedAt,
  OVERALL_WEIGHTS,
  rankedCapabilities,
  round2,
  scoreTone,
  weakestCapabilities,
} from '../score'
import type { CapabilityKey, CapabilityScore, Tool } from '@/data/types'

function caps(
  value: Partial<Record<CapabilityKey, number>>,
  basis = '测试依据',
  base = 0
): Record<CapabilityKey, CapabilityScore> {
  return Object.fromEntries(
    CAPABILITY_KEYS.map((key) => [
      key,
      { score: (value[key] ?? base) as CapabilityScore['score'], basis },
    ])
  ) as Record<CapabilityKey, CapabilityScore>
}

/** 全维度满分 / 指定维度为 0 的快捷构造 */
function allOf(score: number, except: CapabilityKey[] = []): Record<CapabilityKey, CapabilityScore> {
  return Object.fromEntries(
    CAPABILITY_KEYS.map((key) => [
      key,
      { score: (except.includes(key) ? 0 : score) as CapabilityScore['score'], basis: '测试依据' },
    ])
  ) as Record<CapabilityKey, CapabilityScore>
}

function fakeTool(partial: Partial<Tool>): Tool {
  return {
    id: 'x',
    name: 'X',
    nameEn: 'X',
    vendor: 'X',
    logo: '/logos/x.svg',
    tagline: 't',
    description: 'd',
    categories: ['chat'],
    tags: [],
    capabilities: caps({}),
    overallScore: 0,
    strengths: [],
    weaknesses: [],
    avoidFor: [],
    bestFor: [],
    chineseQuality: 3,
    chinaAccessible: false,
    multimodal: { text: true, image: false, audio: false, video: false, file: false },
    hasApi: false,
    pricing: { freeTier: 'f', model: 'freemium' },
    platforms: ['web'],
    hallucinationRisk: 'medium',
    latency: 'medium',
    stability: 'high',
    alternatives: [],
    officialUrl: 'https://example.com',
    sources: [{ label: 's', url: 'https://example.com' }],
    updatedAt: '2026-09-01',
    ...partial,
  }
}

describe('CAPABILITY_META', () => {
  it('必须是 14 个维度且 key 唯一', () => {
    expect(CAPABILITY_META).toHaveLength(14)
    expect(new Set(CAPABILITY_KEYS).size).toBe(14)
  })

  it('每个维度都有中文名与说明（非空）', () => {
    for (const meta of CAPABILITY_META) {
      expect(meta.label.length).toBeGreaterThan(0)
      expect(meta.description.length).toBeGreaterThan(0)
    }
  })
})

describe('computeOverallScore', () => {
  it('全部 5 分时返回 5', () => {
    expect(computeOverallScore(allOf(5))).toBe(5)
    expect(computeOverallScore(allOf(0))).toBe(0)
    expect(computeOverallScore(allOf(3))).toBe(3)
  })

  it('全 0 分时返回 0', () => {
    expect(computeOverallScore(caps({}))).toBe(0)
  })

  it('是纯函数：同样输入永远同样输出', () => {
    const c = caps({ writing: 4, coding: 3 })
    expect(computeOverallScore(c)).toBe(computeOverallScore(c))
  })

  it('结果落在 0-5 之间且保留两位小数', () => {
    const score = computeOverallScore(caps({ writing: 5, coding: 1, research: 3 }))
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(5)
    expect(score).toBe(round2(score))
  })

  it('高权重维度得分更高时综合分更高（单调性）', () => {
    const a = computeOverallScore(caps({ writing: 1, video: 5 }))
    const b = computeOverallScore(caps({ writing: 5, video: 1 }))
    expect(b).toBeGreaterThan(a)
  })

  it('自定义权重会被正确使用（把某维度权重设为 0 即完全忽略它）', () => {
    const c = allOf(5, ['video'])
    expect(
      computeOverallScore(c, { ...OVERALL_WEIGHTS, video: 0 } as Record<CapabilityKey, number>)
    ).toBe(5)
    const half = computeOverallScore(c, { ...OVERALL_WEIGHTS, video: 0 } as Record<CapabilityKey, number>)
    expect(half).toBe(5)
    const lowered = computeOverallScore(
      c,
      { ...OVERALL_WEIGHTS, video: 100 } as Record<CapabilityKey, number>
    )
    expect(lowered).toBeLessThan(5)
  })

  it('缺失维度按 0 分处理而不是抛错', () => {
    const partial = { writing: { score: 5 } } as unknown as Record<CapabilityKey, CapabilityScore>
    expect(() => computeOverallScore(partial)).not.toThrow()
    expect(computeOverallScore(partial)).toBeLessThan(1)
  })
})

describe('capabilityEntries / ranked / weakest', () => {
  it('entries 覆盖 14 个维度并保持展示顺序', () => {
    const entries = capabilityEntries(caps({ coding: 5, writing: 1 }))
    expect(entries).toHaveLength(14)
    expect(entries[0].key).toBe('writing')
  })

  it('rankedCapabilities 按分数降序', () => {
    const ranked = rankedCapabilities(caps({ coding: 5, writing: 3, research: 1 }))
    expect(ranked[0].key).toBe('coding')
    expect(ranked[1].key).toBe('writing')
  })

  it('rankedCapabilities 支持最低分过滤', () => {
    const ranked = rankedCapabilities(caps({ coding: 5, writing: 3 }), 4)
    expect(ranked.map((r) => r.key)).toEqual(['coding'])
  })

  it('weakestCapabilities 默认返回 ≤2 分维度并升序', () => {
    const weak = weakestCapabilities(caps({ writing: 0, coding: 2, research: 5 }, '测试依据', 3))
    expect(weak.map((w) => w.score)).toEqual([0, 2])
    expect(weak.map((w) => w.key)).toEqual(['writing', 'coding'])
  })
})

describe('scoreTone', () => {
  it('分数映射到语义等级', () => {
    expect(scoreTone(0)).toBe('weak')
    expect(scoreTone(2)).toBe('fair')
    expect(scoreTone(3)).toBe('good')
    expect(scoreTone(4)).toBe('strong')
    expect(scoreTone(5)).toBe('top')
  })
})

describe('数据新鲜度', () => {
  const now = new Date('2026-10-01T00:00:00Z')

  it('daysSince 计算天数', () => {
    expect(daysSince('2026-09-01T00:00:00Z', now)).toBe(30)
  })

  it('超过 90 天判为可能过时', () => {
    expect(isStale('2026-09-01T00:00:00Z', now)).toBe(false)
    expect(isStale('2026-05-01T00:00:00Z', now)).toBe(true)
  })

  it('非法日期不抛错', () => {
    expect(() => daysSince('not-a-date', now)).not.toThrow()
    expect(daysSince('not-a-date', now)).toBe(Number.POSITIVE_INFINITY)
  })

  it('latestUpdatedAt 取全库最大值', () => {
    const tools = [
      fakeTool({ id: 'a', updatedAt: '2026-08-01' }),
      fakeTool({ id: 'b', updatedAt: '2026-09-20' }),
      fakeTool({ id: 'c', updatedAt: '2026-08-15' }),
    ]
    expect(latestUpdatedAt(tools)).toBe('2026-09-20')
  })

  it('空库兜底返回当天', () => {
    expect(latestUpdatedAt([])).toBeTruthy()
  })
})

describe('formatDate', () => {
  it('输出中文年月日', () => {
    expect(formatDate('2026-09-20')).toContain('2026')
    expect(formatDate('2026-09-20')).toContain('9')
  })
})