import { describe, expect, it } from 'vitest'
import { scenarios } from '@/data/scenarios'
import { CAPABILITY_META } from '@/lib/score'
import { normalizeWeights } from '@/lib/recommend'
import type { CapabilityKey } from '@/data/types'

/**
 * 决策器场景的门禁。
 *
 * 背景：体检时发现「读长文档」与「查资料做研究」的权重相似度高达 0.934 ——
 * 两者几乎是镜像（0.35/0.25 换了位置）。结果是决策器给这两个场景给出的
 * 建议几乎一样，用户会觉得「选哪个场景有区别吗」。
 *
 * 这类问题不会报错、不会崩，只会让功能白做，所以显式锁住。
 */

/** CAPABILITY_META 是数组（每项含 key/label），不是以维度名为键的对象 */
const DIMS = CAPABILITY_META.map((c) => c.key) as CapabilityKey[]

/** 权重归一后的余弦相似度 */
function similarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])] as CapabilityKey[]
  let dot = 0
  let na = 0
  let nb = 0
  for (const k of keys) {
    const x = a[k] ?? 0
    const y = b[k] ?? 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}

describe('决策器场景', () => {
  it('场景数量与结构完整', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(8)
    for (const s of scenarios) {
      expect(s.id, '缺 id').toBeTruthy()
      expect(s.label, `${s.id} 缺 label`).toBeTruthy()
      expect(s.description, `${s.id} 缺 description`).toBeTruthy()
      expect(s.weights, `${s.id} 缺 weights`).toBeTruthy()
    }
  })

  it('权重只引用真实存在的维度', () => {
    for (const s of scenarios) {
      for (const k of Object.keys(s.weights)) {
        expect(DIMS, `${s.id} 引用了不存在的维度 ${k}`).toContain(k)
      }
    }
  })

  it('权重值为正且不超过 1', () => {
    for (const s of scenarios) {
      for (const [k, v] of Object.entries(s.weights)) {
        expect(v, `${s.id}.${k} 权重应为正数`).toBeGreaterThan(0)
        expect(v, `${s.id}.${k} 权重不应超过 1`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('权重和不为 1 也可以（引擎会归一化），但不能差太远', () => {
    // lib/recommend.ts 的 normalizeWeights 按总和归一，所以权重和不等于 1 不影响排序。
    // 这里只守住「不会因为漏写某个维度」而让总和大偏差。
    for (const s of scenarios) {
      const total = Object.values(s.weights).reduce((n, v) => n + v, 0)
      expect(total, `${s.id} 权重和 ${total.toFixed(2)} 偏离 1 过多，可能漏写了维度`).toBeGreaterThan(0.5)
      expect(total, `${s.id} 权重和 ${total.toFixed(2)} 偏离 1 过多`).toBeLessThan(1.6)
    }
  })

  it('每个场景的权重能归一化成有效分布', () => {
    for (const s of scenarios) {
      const n = normalizeWeights(s.weights)
      const sum = Object.values(n).reduce((a, b) => a + b, 0)
      expect(sum, `${s.id} 归一后权重和应为 1`).toBeCloseTo(1, 5)
    }
  })

  /**
   * 核心断言：任意两个场景的相似度都要够低。
   *
   * 0.9 是实测得出的阈值 —— 原来那对是 0.934（几乎镜像），
   * 调整后降到 0.591，其余最高的也只有 0.803。
   */
  it('任意两个场景的权重不能高度相似（否则建议结果会雷同）', () => {
    const pairs: { a: string; b: string; sim: number }[] = []
    for (let i = 0; i < scenarios.length; i++) {
      for (let j = i + 1; j < scenarios.length; j++) {
        pairs.push({
          a: scenarios[i].label,
          b: scenarios[j].label,
          sim: similarity(scenarios[i].weights, scenarios[j].weights),
        })
      }
    }
    const tooSimilar = pairs.filter((p) => p.sim >= 0.9)
    expect(
      tooSimilar.map((p) => `${p.a} ↔ ${p.b} = ${p.sim.toFixed(3)}`),
      '这些场景的权重几乎一样，决策器给出的建议会基本相同'
    ).toEqual([])
  })

  it('每个场景都有默认提示词模板与易错提示', () => {
    for (const s of scenarios) {
      expect(s.defaultPromptTemplate, `${s.id} 缺 defaultPromptTemplate`).toBeTruthy()
      expect((s.pitfalls?.length ?? 0), `${s.id} 缺 pitfalls`).toBeGreaterThanOrEqual(2)
    }
  })

  it('场景 id 唯一、label 唯一', () => {
    const ids = scenarios.map((s) => s.id)
    expect(new Set(ids).size, '场景 id 重复').toBe(ids.length)
    const labels = scenarios.map((s) => s.label)
    expect(new Set(labels).size, '场景 label 重复，用户分不清').toBe(labels.length)
  })
})