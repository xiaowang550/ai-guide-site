import { describe, expect, it } from 'vitest'
import { CAPABILITY_KEYS } from '../score'
import { tools } from '@/data/tools'
import { concepts } from '@/data/concepts'
import { glossary } from '@/data/glossary'
import { guides } from '@/data/guides'
import { promptTemplates } from '@/data/prompts'
import { scenarios } from '@/data/scenarios'
import { cases } from '@/data/cases'
import { paths } from '@/data/paths'
import { updates } from '@/data/updates'
import type { Tool } from '@/data/types'

const TOOL_IDS = new Set(tools.map((t) => t.id))
const CONCEPT_IDS = new Set(concepts.map((c) => c.id))
const GUIDE_IDS = new Set(guides.map((g) => g.id))
const CASE_IDS = new Set(cases.map((c) => c.id))
const TEMPLATE_IDS = new Set(promptTemplates.map((p) => p.id))
const ICONS = new Set([
  'pen',
  'file-text',
  'presentation',
  'code',
  'search',
  'image',
  'video',
  'bar-chart',
  'workflow',
  'graduation-cap',
])
const VALID_ROUTE_PREFIXES = ['/learn/', '/guides/', '/tools/', '/cases/', '/paths/', '/find', '/compare', '/learn/glossary']

function isIsoDate(v: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(v)
}

function noEmptyStrings(value: unknown, path = ''): string[] {
  const problems: string[] = []
  if (typeof value === 'string') {
    if (value.trim() === '') problems.push(path)
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => problems.push(...noEmptyStrings(v, `${path}[${i}]`)))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) problems.push(...noEmptyStrings(v, `${path}.${k}`))
  }
  return problems
}

describe('工具数据规范（文档第七节）', () => {
  it('工具数量在预期规模内且 id 唯一', () => {
    expect(tools.length).toBeGreaterThanOrEqual(10)
    expect(TOOL_IDS.size).toBe(tools.length)
  })

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s 的 14 维评分完整',
    (_id, tool: Tool) => {
      expect(Object.keys(tool.capabilities).sort()).toEqual([...CAPABILITY_KEYS].sort())
    }
  )

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s 强项与弱项数量对等且不少于 3 条',
    (_id, tool: Tool) => {
      expect(tool.strengths.length).toBeGreaterThanOrEqual(3)
      expect(tool.weaknesses.length).toBeGreaterThanOrEqual(3)
      // 对等：两者数量差不超过 2，避免只写优点
      expect(Math.abs(tool.strengths.length - tool.weaknesses.length)).toBeLessThanOrEqual(2)
    }
  )

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s 的「别用它做」恰好 3 条，最适合 3 条',
    (_id, tool: Tool) => {
      expect(tool.avoidFor).toHaveLength(3)
      expect(tool.bestFor).toHaveLength(3)
    }
  )

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s 有 updatedAt 与至少 1 条 sources',
    (_id, tool: Tool) => {
      expect(isIsoDate(tool.updatedAt)).toBe(true)
      expect(tool.sources.length).toBeGreaterThanOrEqual(1)
      for (const s of tool.sources) {
        expect(s.label.length).toBeGreaterThan(0)
        expect(s.url).toMatch(/^https?:\/\//)
      }
    }
  )

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s 的高低分维度都写了打分依据',
    (_id, tool: Tool) => {
      for (const key of CAPABILITY_KEYS) {
        const cap = tool.capabilities[key]
        if (cap.score >= 4 || cap.score <= 2) {
          expect(cap.basis, `${key} 缺少 basis`).toBeTruthy()
        }
      }
    }
  )

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s 的 alternatives 指向存在的工具且不含自己',
    (_id, tool: Tool) => {
      for (const alt of tool.alternatives) {
        expect(TOOL_IDS.has(alt), `未知替代品 ${alt}`).toBe(true)
        expect(alt).not.toBe(tool.id)
      }
    }
  )

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s 的 logo 走站内路径、overallScore 交由代码计算',
    (_id, tool: Tool) => {
      expect(tool.logo).toBe(`/logos/${tool.id}.svg`)
      expect(tool.overallScore).toBe(0)
    }
  )

  it.each(tools.map((t) => [t.id, t] as const))(
    '%s 没有任何空字符串字段',
    (_id, tool: Tool) => {
      const { overallScore, ...rest } = tool
      void overallScore
      expect(noEmptyStrings(rest)).toEqual([])
    }
  )

  it('价格模型与字段自洽', () => {
    for (const t of tools) {
      if (t.pricing.model === 'paid') {
        expect(t.pricing.paidFrom, `${t.id} 付费工具应有起步价`).toBeTruthy()
      }
      if (t.pricing.model === 'free' || t.pricing.model === 'open-source') {
        expect(t.pricing.paidFrom, `${t.id} 标为免费则不应有付费起步价`).toBeUndefined()
      }
    }
  })
})

describe('概念与术语表', () => {
  it('概念 id 唯一，related 无悬空引用、不自引用', () => {
    expect(new Set(concepts.map((c) => c.id)).size).toBe(concepts.length)
    for (const c of concepts) {
      expect(c.related.length, `${c.id} 至少 1 个关联概念`).toBeGreaterThan(0)
      for (const r of c.related) {
        expect(CONCEPT_IDS.has(r), `${c.id} -> ${r} 悬空`).toBe(true)
        expect(r).not.toBe(c.id)
      }
    }
  })

  it('概念六段式字段齐全且至少 3 条误解', () => {
    for (const c of concepts) {
      expect(c.definition.length).toBeGreaterThan(5)
      expect(c.whyItMatters.length).toBeGreaterThan(5)
      expect(c.analogy.length).toBeGreaterThan(5)
      expect(c.example.length).toBeGreaterThan(5)
      expect(c.misconceptions.length).toBeGreaterThanOrEqual(3)
      expect(isIsoDate(c.updatedAt)).toBe(true)
    }
  })

  it('术语表 id 唯一、conceptId 有效', () => {
    expect(new Set(glossary.map((g) => g.id)).size).toBe(glossary.length)
    for (const g of glossary) {
      expect(g.term.length).toBeGreaterThan(0)
      expect(g.termEn.length).toBeGreaterThan(0)
      expect(g.short.length).toBeGreaterThan(0)
      if (g.conceptId) expect(CONCEPT_IDS.has(g.conceptId), `${g.id} -> ${g.conceptId} 悬空`).toBe(true)
    }
  })

  it('覆盖文档要求的 16 个核心概念', () => {
    const required = [
      '大模型',
      '提示词',
      '上下文窗口',
      'Token',
      '温度',
      '幻觉',
      '检索增强生成',
      '微调',
      '多模态',
      'Agent',
      '模型上下文协议',
      '向量数据库',
      '思维链',
      '对齐',
      '开源',
      '闭源',
    ]
    const allTerms = concepts.map((c) => `${c.term} ${c.termEn ?? ''}`).join(' ')
    for (const term of required) {
      expect(allTerms, `缺少概念：${term}`).toContain(term)
    }
  })
})

describe('教程与提示词', () => {
  it('教程 id 唯一，两类都有，方法课与场景课分开', () => {
    expect(new Set(guides.map((g) => g.id)).size).toBe(guides.length)
    expect(guides.some((g) => g.type === 'method')).toBe(true)
    expect(guides.some((g) => g.type === 'scenario')).toBe(true)
  })

  it('教程结构完整：步骤 / 提示词 / 工具 / 下一步', () => {
    for (const g of guides) {
      expect(g.steps.length, `${g.id} 至少 3 个步骤`).toBeGreaterThanOrEqual(3)
      expect(g.outcome.length).toBeGreaterThan(5)
      expect(g.promptTemplates.length).toBeGreaterThanOrEqual(1)
      for (const step of g.steps) {
        expect(step.title.length).toBeGreaterThan(0)
        expect(step.doWhat.length).toBeGreaterThan(0)
        expect(step.where.length).toBeGreaterThan(0)
      }
      for (const t of g.tools) expect(TOOL_IDS.has(t), `${g.id} -> ${t} 未知工具`).toBe(true)
      for (const n of g.nextGuides) {
        expect(GUIDE_IDS.has(n), `${g.id} -> ${n} 未知教程`).toBe(true)
        expect(n).not.toBe(g.id)
      }
      expect(isIsoDate(g.updatedAt)).toBe(true)
    }
  })

  it('教程里的下一步不会形成自环', () => {
    for (const g of guides) {
      expect(g.nextGuides).not.toContain(g.id)
    }
  })

  it('提示词模板：变量与正文占位符完全一致', () => {
    for (const p of promptTemplates) {
      const placeholders = [...p.body.matchAll(/\{\{\s*([\w-]+)\s*\}\}/g)].map((m) => m[1])
      const declared = p.variables.map((v) => v.key)
      expect(new Set(placeholders), `${p.id} 正文占位符与 variables 不一致`).toEqual(new Set(declared))
      for (const v of p.variables) {
        expect(v.key).toMatch(/^[a-z][a-z0-9_]*$/)
        expect(v.label.length).toBeGreaterThan(0)
        expect(v.placeholder.length).toBeGreaterThan(0)
      }
      expect(p.body.length).toBeGreaterThan(60)
    }
  })

  it('提示词模板 id 唯一', () => {
    expect(new Set(promptTemplates.map((p) => p.id)).size).toBe(promptTemplates.length)
  })
})

describe('场景决策器数据', () => {
  it('10 个场景，id/图标/默认提示词齐全', () => {
    expect(scenarios.length).toBe(10)
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(10)
    for (const s of scenarios) {
      expect(ICONS.has(s.icon), `${s.id} 未知图标 ${s.icon}`).toBe(true)
      expect(TEMPLATE_IDS.has(s.defaultPromptTemplate), `${s.id} 未知模板`).toBe(true)
      expect(s.pitfalls.length).toBeGreaterThanOrEqual(1)
      expect(s.description.length).toBeGreaterThan(0)
    }
  })

  it('权重只覆盖合法维度且为正数', () => {
    for (const s of scenarios) {
      const entries = Object.entries(s.weights)
      expect(entries.length, `${s.id} 至少 3 个维度`).toBeGreaterThanOrEqual(3)
      for (const [key, weight] of entries) {
        expect(CAPABILITY_KEYS).toContain(key)
        expect(weight).toBeGreaterThan(0)
        expect(weight).toBeLessThanOrEqual(1)
      }
    }
  })

  it('硬门槛与工作流引用的维度合法', () => {
    for (const s of scenarios) {
      for (const req of s.requiredCapabilities ?? []) {
        expect(CAPABILITY_KEYS).toContain(req.key)
        expect(req.minRequiredScore ?? 3).toBeGreaterThan(0)
      }
      for (const step of s.workflow ?? []) {
        expect(CAPABILITY_KEYS).toContain(step.preferCapability)
        expect(step.step).toBeGreaterThan(0)
      }
    }
  })

  it('每个场景至少有一个候选工具能满足硬门槛', async () => {
    const { recommend } = await import('../recommend')
    for (const s of scenarios) {
      const r = recommend(s, {}, tools)
      expect(r.primary, `场景 ${s.id} 无可行推荐`).not.toBeNull()
    }
  })
})

describe('案例库 / 学习路径 / 更新雷达', () => {
  it('案例字段齐全，提示词原文足够具体', () => {
    expect(cases.length).toBeGreaterThanOrEqual(5)
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length)
    for (const c of cases) {
      expect(c.prompt.length, `${c.id} 提示词原文过短`).toBeGreaterThan(80)
      expect(c.pitfalls.length).toBeGreaterThanOrEqual(1)
      expect(c.tools.length).toBeGreaterThanOrEqual(1)
      for (const t of c.tools) expect(TOOL_IDS.has(t), `${c.id} -> ${t} 未知工具`).toBe(true)
      expect(isIsoDate(c.updatedAt)).toBe(true)
    }
  })

  it('学习路径：条目 href 全部指向站内真实路由', () => {
    expect(paths.length).toBeGreaterThanOrEqual(3)
    for (const p of paths) {
      expect(p.phases.length).toBeGreaterThanOrEqual(3)
      for (const phase of p.phases) {
        expect(phase.outcome.length).toBeGreaterThan(5)
        expect(phase.items.length).toBeGreaterThanOrEqual(3)
        for (const item of phase.items) {
          expect(
            VALID_ROUTE_PREFIXES.some((prefix) => item.href === prefix || item.href.startsWith(prefix)),
            `${p.id} -> ${item.href} 不是合法路由`
          ).toBe(true)
          const [base, slug] = item.href.split('/').filter(Boolean)
          if (base === 'tools' && slug) expect(TOOL_IDS.has(slug), `未知工具页 ${item.href}`).toBe(true)
          if (base === 'learn' && slug && slug !== 'glossary')
            expect(CONCEPT_IDS.has(slug), `未知概念页 ${item.href}`).toBe(true)
          if (base === 'guides' && slug) expect(GUIDE_IDS.has(slug), `未知教程页 ${item.href}`).toBe(true)
          if (base === 'cases' && slug) expect(CASE_IDS.has(slug), `未知案例页 ${item.href}`).toBe(true)
        }
      }
    }
  })

  it('更新雷达按日期倒序、类型合法、影响页面为站内路由', () => {
    expect(updates.length).toBeGreaterThan(0)
    const dates = updates.map((u) => u.date)
    expect([...dates].sort().reverse()).toEqual(dates)
    const types = new Set([
      'new-tool',
      'removed',
      'price-change',
      'capability-change',
      'new-concept',
      'new-guide',
      'data-fix',
    ])
    for (const u of updates) {
      expect(isIsoDate(u.date)).toBe(true)
      expect(types.has(u.type)).toBe(true)
      expect(u.summary.length).toBeGreaterThan(5)
      for (const href of u.affected) expect(href.startsWith('/'), `${u.id} 非法路由 ${href}`).toBe(true)
    }
  })
})