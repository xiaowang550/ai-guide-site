import { describe, expect, it } from 'vitest'
import {
  ADJUST_CAP,
  baseScenarioScore,
  explainTool,
  filterByFlags,
  normalizeWeights,
  recommend,
  sortTools,
} from '../recommend'
import { tools } from '@/data/tools'
import { scenarios } from '@/data/scenarios'
import type { CapabilityKey, CapabilityScore, ScenarioRule, Tool } from '@/data/types'

function tool(partial: Partial<Tool> & { id: string }): Tool {
  const all = 3 as CapabilityScore['score']
  return {
    name: partial.id,
    nameEn: partial.id,
    vendor: 'v',
    logo: `/logos/${partial.id}.svg`,
    tagline: 't',
    description: 'd',
    categories: ['chat'],
    tags: [],
    capabilities: Object.fromEntries(
      (
        [
          'writing',
          'longform',
          'reasoning',
          'math',
          'coding',
          'research',
          'agent',
          'data',
          'office',
          'imageGen',
          'vision',
          'video',
          'voice',
          'realtime',
        ] as CapabilityKey[]
      ).map((k) => [k, { score: all }])
    ) as Record<CapabilityKey, CapabilityScore>,
    overallScore: 3,
    strengths: ['s1', 's2', 's3'],
    weaknesses: ['w1', 'w2', 'w3'],
    avoidFor: ['a1', 'a2', 'a3'],
    bestFor: ['b1', 'b2', 'b3'],
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

function withScores(id: string, values: Partial<Record<CapabilityKey, number>>, extra: Partial<Tool> = {}) {
  const t = tool({ id, ...extra })
  for (const [k, v] of Object.entries(values)) {
    t.capabilities[k as CapabilityKey] = { score: v as CapabilityScore['score'], basis: '测试' }
  }
  return t
}

describe('normalizeWeights', () => {
  it('归一化后总和为 1', () => {
    const w = normalizeWeights({ writing: 1, longform: 1, coding: 2 })
    const total = Object.values(w).reduce((s, v) => s + v, 0)
    expect(total).toBeCloseTo(1, 6)
  })

  it('忽略非正权重', () => {
    const w = normalizeWeights({ writing: 1, coding: 0, research: -3 })
    expect(Object.keys(w).sort()).toEqual(['writing'])
  })

  it('全为 0 时返回空对象而不是除零', () => {
    expect(normalizeWeights({ writing: 0 })).toEqual({})
  })

  it('归一化不改变相对比例', () => {
    const w = normalizeWeights({ writing: 2, coding: 1 })
    expect(w.coding / w.writing).toBeCloseTo(0.5, 6)
  })
})

describe('baseScenarioScore', () => {
  const rule: ScenarioRule = {
    id: 'test',
    label: '测试场景',
    icon: 'pen',
    description: 'd',
    weights: { writing: 1, coding: 1 },
    defaultPromptTemplate: 'p',
    pitfalls: [],
  }

  it('满分维度得 5 分', () => {
    expect(baseScenarioScore(withScores('a', { writing: 5, coding: 5 }), rule)).toBe(5)
  })

  it('零分维度得 0 分', () => {
    expect(baseScenarioScore(withScores('a', { writing: 0, coding: 0 }), rule)).toBe(0)
  })

  it('加权后落在 0-5', () => {
    const s = baseScenarioScore(withScores('a', { writing: 5, coding: 0 }), rule)
    expect(s).toBeCloseTo(2.5, 5)
  })
})

describe('filterByFlags（硬过滤）', () => {
  const cnTool = tool({ id: 'cn', chinaAccessible: true })
  const overseas = tool({ id: 'oversea', chinaAccessible: false })
  const paid = tool({ id: 'paid', pricing: { freeTier: 'f', model: 'paid', paidFrom: '$20/月' } })

  it('chinaDirect 剔除不可直连工具', () => {
    const out = filterByFlags([cnTool, overseas], { chinaDirect: true })
    expect(out.map((t) => t.id)).toEqual(['cn'])
  })

  it('mustBeFree 剔除付费工具，保留免费与开源', () => {
    const free = tool({ id: 'free', pricing: { freeTier: 'f', model: 'free' } })
    const oss = tool({ id: 'oss', pricing: { freeTier: 'f', model: 'open-source' } })
    const out = filterByFlags([free, oss, paid], { mustBeFree: true })
    expect(out.map((t) => t.id)).toEqual(['free', 'oss'])
  })

  it('无条件时全部保留', () => {
    expect(filterByFlags([cnTool, overseas, paid])).toHaveLength(3)
  })
})

describe('explainTool（可解释性）', () => {
  const rule: ScenarioRule = {
    id: 'test',
    label: '测试场景',
    icon: 'pen',
    description: 'd',
    weights: { writing: 1, office: 1 },
    requiredCapabilities: [{ key: 'office', minRequiredScore: 4 }],
    defaultPromptTemplate: 'p',
    pitfalls: [],
  }

  it('输出命中维度并按贡献排序', () => {
    const t = withScores('a', { writing: 5, office: 4 })
    const r = explainTool(t, rule)
    expect(r.matched[0].key).toBe('writing')
    expect(r.matched[0].weight).toBeCloseTo(0.5, 5)
    expect(r.matched[0].contribution).toBeCloseTo(2.5, 5)
  })

  it('硬性要求不满足时进入 missed 并给出理由', () => {
    const t = withScores('a', { writing: 5, office: 2 })
    const r = explainTool(t, rule)
    expect(r.missed).toHaveLength(1)
    expect(r.missed[0].key).toBe('office')
    expect(r.missed[0].label).toBe('办公产出')
    expect(r.missed[0].reason).toContain('办公产出')
  })

  it('chineseFirst 会拉开中文能力差异（高分工具得分更高）', () => {
    const good = withScores('good', { writing: 4, office: 4 }, { chineseQuality: 5 })
    const bad = withScores('bad', { writing: 4, office: 4 }, { chineseQuality: 1 })
    const a = explainTool(good, rule, { chineseFirst: true })
    const b = explainTool(bad, rule, { chineseFirst: true })
    expect(a.score).toBeGreaterThan(b.score)
    expect(a.satisfiedFlags.length).toBeGreaterThan(0)
    expect(b.violatedFlags.length).toBeGreaterThan(0)
  })

  it('privacySensitive 偏好可本地部署（open-source）的工具', () => {
    const oss = withScores('oss', { writing: 4, office: 4 }, { pricing: { freeTier: 'f', model: 'open-source' } })
    const cloud = withScores('cloud', { writing: 4, office: 4 }, { hasApi: true })
    const a = explainTool(oss, rule, { privacySensitive: true })
    const b = explainTool(cloud, rule, { privacySensitive: true })
    expect(a.score).toBeGreaterThan(b.score)
  })

  it('needDeliverableFile 偏好 office 得分高的工具', () => {
    const canDeliver = withScores('a', { writing: 3, office: 5 })
    const cannot = withScores('b', { writing: 5, office: 1 })
    expect(explainTool(canDeliver, rule, { needDeliverableFile: true }).score).toBeGreaterThan(
      explainTool(cannot, rule, { needDeliverableFile: true }).score
    )
  })

  it('noLearningCurve 惩罚没有网页版的工具', () => {
    const web = withScores('web', { writing: 4, office: 4 }, { platforms: ['web'], latency: 'fast' })
    const cli = withScores('cli', { writing: 4, office: 4 }, { platforms: ['cli'] })
    expect(explainTool(web, rule, { noLearningCurve: true }).score).toBeGreaterThan(
      explainTool(cli, rule, { noLearningCurve: true }).score
    )
  })

  it('任何条件都不会让分数越界，且调整幅度受限', () => {
    const t = withScores('a', { writing: 5, office: 5 }, { chineseQuality: 1 })
    const r = explainTool(t, rule, { chineseFirst: true, lowBudget: true, privacySensitive: true })
    expect(r.score).toBeLessThanOrEqual(5)
    expect(r.score).toBeGreaterThanOrEqual(0)
    expect(baseScenarioScore(t, rule) - r.score).toBeLessThanOrEqual(ADJUST_CAP + 1e-9)
  })

  it('每个结论都能给出中文可读理由', () => {
    const r = explainTool(withScores('a', { writing: 5, office: 5 }), rule)
    expect(r.reasons.length).toBeGreaterThan(0)
    r.reasons.forEach((reason) => expect(reason.length).toBeGreaterThan(0))
  })

  it('是纯函数：同输入同输出', () => {
    const t = withScores('a', { writing: 5, office: 4 })
    expect(explainTool(t, rule, { chineseFirst: true })).toEqual(explainTool(t, rule, { chineseFirst: true }))
  })
})

describe('recommend', () => {
  it('返回首选 + 备选，且首选分不低于备选', () => {
    const rule: ScenarioRule = {
      id: 'write',
      label: '写东西',
      icon: 'pen',
      description: 'd',
      weights: { writing: 1 },
      defaultPromptTemplate: 'p',
      pitfalls: ['x'],
    }
    const list = [
      withScores('a', { writing: 5 }),
      withScores('b', { writing: 4 }),
      withScores('c', { writing: 3 }),
      withScores('d', { writing: 2 }),
    ]
    const r = recommend(rule, {}, list, { alternateCount: 2 })
    expect(r.primary?.tool.id).toBe('a')
    expect(r.alternates.map((x) => x.tool.id)).toEqual(['b', 'c'])
    expect(r.alternates[0].score).toBeLessThanOrEqual(r.primary!.score)
    expect(r.pitfalls).toEqual(['x'])
    expect(r.engine).toBe('rules')
  })

  it('硬性门槛会淘汰候选：全部不满足时 primary 为 null', () => {
    const rule: ScenarioRule = {
      id: 'image',
      label: '做图',
      icon: 'image',
      description: 'd',
      weights: { imageGen: 1 },
      requiredCapabilities: [{ key: 'imageGen', minRequiredScore: 3 }],
      defaultPromptTemplate: 'p',
      pitfalls: [],
    }
    const list = [withScores('a', { imageGen: 1 }), withScores('b', { imageGen: 2 })]
    const r = recommend(rule, {}, list)
    expect(r.primary).toBeNull()
  })

  it('条件冲突导致无候选时 primary 为 null（而不是崩溃）', () => {
    const rule: ScenarioRule = {
      id: 'write',
      label: '写东西',
      icon: 'pen',
      description: 'd',
      weights: { writing: 1 },
      defaultPromptTemplate: 'p',
      pitfalls: [],
    }
    const list = [tool({ id: 'paid-only', pricing: { freeTier: 'f', model: 'paid' } })]
    expect(recommend(rule, { mustBeFree: true }, list).primary).toBeNull()
  })

  it('组合工作流会为每一步分配工具', () => {
    const rule: ScenarioRule = {
      id: 'research',
      label: '查资料',
      icon: 'search',
      description: 'd',
      weights: { research: 1, writing: 0.5 },
      defaultPromptTemplate: 'p',
      pitfalls: [],
      workflow: [
        { step: 1, action: '检索', preferCapability: 'research' },
        { step: 2, action: '成稿', preferCapability: 'writing' },
      ],
    }
    const list = [
      withScores('researcher', { research: 5, writing: 2 }),
      withScores('writer', { research: 2, writing: 5 }),
    ]
    const r = recommend(rule, {}, list, { withWorkflow: true })
    expect(r.workflow).toHaveLength(2)
    expect(r.workflow[0].capability).toBe('research')
    expect(r.workflow[0].tool.id).toBe('researcher')
    expect(r.workflow[1].capability).toBe('writing')
  })

  it('withWorkflow: false 时不生成工作流', () => {
    const rule: ScenarioRule = {
      id: 'r',
      label: 'r',
      icon: 'search',
      description: 'd',
      weights: { research: 1 },
      defaultPromptTemplate: 'p',
      pitfalls: [],
      workflow: [{ step: 1, action: 'a', preferCapability: 'research' }],
    }
    const r = recommend(rule, {}, [withScores('a', { research: 5 })], { withWorkflow: false })
    expect(r.workflow).toHaveLength(0)
  })

  it('能解析默认提示词模板', () => {
    const templates = [
      {
        id: 'tpl',
        title: 't',
        scenario: 's',
        body: 'b',
        variables: [],
      },
    ]
    const rule: ScenarioRule = {
      id: 'r',
      label: 'r',
      icon: 'search',
      description: 'd',
      weights: { research: 1 },
      defaultPromptTemplate: 'tpl',
      pitfalls: [],
    }
    expect(recommend(rule, {}, [withScores('a', { research: 5 })], { promptTemplates: templates }).promptTemplate?.id).toBe('tpl')
  })

  it('可复现：连续两次调用结果一致', () => {
    const rule: ScenarioRule = {
      id: 'r',
      label: 'r',
      icon: 'search',
      description: 'd',
      weights: { research: 1, writing: 1 },
      defaultPromptTemplate: 'p',
      pitfalls: [],
    }
    const list = [withScores('a', { research: 5, writing: 3 }), withScores('b', { research: 4, writing: 4 })]
    const flags = { chineseFirst: true, chinaDirect: true }
    const r1 = recommend(rule, flags, list)
    const r2 = recommend(rule, flags, list)
    expect(r1.primary?.tool.id).toBe(r2.primary?.tool.id)
    expect(r1.primary?.score).toBe(r2.primary?.score)
  })
})

describe('真实数据上的 5 个典型场景', () => {
  const rule = (id: string) => scenarios.find((s) => s.id === id)!

  it('write：结果非空且首选在写作维度 ≥3 分', () => {
    const r = recommend(rule('write'), {}, tools)
    expect(r.primary).not.toBeNull()
    expect(r.primary!.tool.capabilities.writing.score).toBeGreaterThanOrEqual(3)
  })

  it('read-long-doc：首选长文理解 ≥4 分', () => {
    const r = recommend(rule('read-long-doc'), {}, tools)
    expect(r.primary).not.toBeNull()
    expect(r.primary!.tool.capabilities.longform.score).toBeGreaterThanOrEqual(4)
  })

  it('code：首选编程 ≥4 分', () => {
    const r = recommend(rule('code'), {}, tools)
    expect(r.primary!.tool.capabilities.coding.score).toBeGreaterThanOrEqual(4)
  })

  it('image：首选图像生成 ≥3 分（场景硬门槛）', () => {
    const r = recommend(rule('image'), {}, tools)
    expect(r.primary!.tool.capabilities.imageGen.score).toBeGreaterThanOrEqual(3)
  })

  it('research + 大陆直连：所有结果都必须可直连', () => {
    const r = recommend(rule('research'), { chinaDirect: true }, tools)
    expect(r.primary).not.toBeNull()
    const all = [r.primary!, ...r.alternates]
    for (const item of all) {
      expect(item.tool.chinaAccessible).toBe(true)
    }
  })
})

describe('sortTools', () => {
  it('按综合分降序', () => {
    const list = [
      withScores('a', { writing: 1 }),
      withScores('b', { writing: 5 }),
    ]
    list[0].overallScore = 1
    list[1].overallScore = 5
    expect(sortTools(list, 'overall', 'desc').map((t) => t.id)).toEqual(['b', 'a'])
    expect(sortTools(list, 'overall', 'asc').map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('按更新时间排序', () => {
    const list = [
      withScores('a', {}, { updatedAt: '2026-01-01' }),
      withScores('b', {}, { updatedAt: '2026-09-01' }),
    ]
    expect(sortTools(list, 'updated', 'desc')[0].id).toBe('b')
  })

  it('按单项能力分排序', () => {
    const list = [withScores('a', { coding: 1 }), withScores('b', { coding: 5 })]
    expect(sortTools(list, 'coding', 'desc')[0].id).toBe('b')
  })

  it('不修改入参数组顺序', () => {
    const list = [withScores('a', { writing: 1 }), withScores('b', { writing: 5 })]
    const before = list.map((t) => t.id)
    sortTools(list, 'overall')
    expect(list.map((t) => t.id)).toEqual(before)
  })
})