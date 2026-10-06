import { describe, expect, it } from 'vitest'
import { CAPABILITY_KEYS, computeEvidenceCoverage } from '../score'
import { tools } from '@/data/tools'
import type { CapabilityKey, CapabilityScore } from '@/data/types'

function caps(partial: Partial<Record<CapabilityKey, { score: number; basis?: string }>>) {
  return Object.fromEntries(
    CAPABILITY_KEYS.map((k) => [k, { score: 0, basis: '', ...(partial[k] ?? {}) }])
  ) as Record<CapabilityKey, CapabilityScore>
}

describe('computeEvidenceCoverage（依据覆盖度）', () => {
  it('全部有依据时覆盖率为 1', () => {
    const c = computeEvidenceCoverage(
      caps(Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, { score: 4, basis: '官方说明' }])))
    )
    expect(c.covered).toBe(14)
    expect(c.total).toBe(14)
    expect(c.ratio).toBe(1)
    expect(c.missing).toEqual([])
  })

  it('basis 为空字符串或空白也算缺失', () => {
    const c = computeEvidenceCoverage(caps({ writing: { score: 5, basis: '' }, coding: { score: 3, basis: '   ' } }))
    expect(c.covered).toBe(0)
    expect(c.missing).toHaveLength(14)
  })

  it('高分但没依据要单独标出来（读者无法核对，风险最高）', () => {
    const c = computeEvidenceCoverage(
      caps({ writing: { score: 5 }, coding: { score: 4 }, math: { score: 2 } })
    )
    expect(c.thinButHigh.sort()).toEqual(['coding', 'writing'])
    // 低分缺依据不算风险项
    expect(c.thinButHigh).not.toContain('math')
  })

  it('覆盖率与缺失清单自洽', () => {
    const c = computeEvidenceCoverage(
      caps({ writing: { score: 4, basis: 'a' }, coding: { score: 4, basis: 'b' } })
    )
    expect(c.covered + c.missing.length).toBe(c.total)
    expect(c.ratio).toBeCloseTo(2 / 14, 2)
  })

  it('空维度表不崩', () => {
    const c = computeEvidenceCoverage({} as Record<CapabilityKey, CapabilityScore>)
    expect(c.total).toBe(0)
    expect(c.ratio).toBe(0)
  })
})

describe('全部工具的证据完整性（可信度是本站核心承诺）', () => {
  it('每个工具都必须写 evidence（评分方法说明）', () => {
    const missing = tools.filter((t) => !t.evidence || t.evidence.trim().length < 20)
    expect(
      missing.map((t) => t.id),
      '这些工具没有说明评分怎么来的'
    ).toEqual([])
  })

  it('evidence 必须如实说明"没有自建评测"，不能暗示我们做过本地实测', () => {
    for (const t of tools) {
      expect(t.evidence, `${t.id} 缺少方法说明`).toContain('不做自建评测')
    }
  })

  it('evidence 里不得出现"实测"这类我们没做过的事', () => {
    for (const t of tools) {
      expect(t.evidence, `${t.id} 的 evidence 出现了"实测"`).not.toContain('实测')
      for (const [key, cap] of Object.entries(t.capabilities)) {
        expect(cap.basis ?? '', `${t.id}.${key} 的 basis 出现了"实测"`).not.toContain('实测')
      }
    }
  })

  it('每个工具至少有 10 个维度写明了依据（依据不能只是摆设）', () => {
    const thin = tools
      .map((t) => ({ id: t.id, cov: computeEvidenceCoverage(t.capabilities) }))
      .filter((x) => x.cov.covered < 10)
    expect(thin.map((x) => `${x.id}(${x.cov.covered})`)).toEqual([])
  })

  it('每个工具都有来源链接，且以 https 开头', () => {
    for (const t of tools) {
      expect(t.sources.length, `${t.id} 缺来源`).toBeGreaterThanOrEqual(1)
      for (const s of t.sources) {
        expect(s.url, `${t.id} 的来源不是 https`).toMatch(/^https:\/\//)
      }
    }
  })
})
