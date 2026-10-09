import { describe, expect, it } from 'vitest'
import { advancedGuides } from '@/data/advanced-guides'
import { advancedConcepts } from '@/data/advanced-concepts'
import { advancedPath, advancedResources } from '@/data/advanced-learning'
import { concepts, guides, searchDocs } from '@/data'
import { guideVisuals } from '@/data/guide-visuals'
import { walkthrough } from '@/lib/learning/agent-walkthrough'

describe('进阶学习内容的衔接', () => {
  it('所有练习都进入真实路由、搜索和顺序路径', () => {
    const guideIds = new Set(guides.map((guide) => guide.id))
    const conceptIds = new Set(concepts.map((concept) => concept.id))
    expect(guideIds.size).toBe(guides.length)
    expect(conceptIds.size).toBe(concepts.length)
    for (const id of Object.keys(guideVisuals)) expect(guideIds.has(id)).toBe(true)
    for (const guide of advancedGuides) {
      expect(guideIds.has(guide.id)).toBe(true)
      expect(searchDocs.some((doc) => doc.href === `/guides/${guide.id}`)).toBe(true)
      expect(
        advancedPath.phases.some((phase) =>
          phase.items.some((item) => item.href === `/guides/${guide.id}`),
        ),
      ).toBe(true)
      expect(guideVisuals[guide.id]?.steps.length).toBeGreaterThanOrEqual(3)
      for (const prompt of guide.promptTemplates) {
        const used = [...prompt.body.matchAll(/\{\{([\w-]+)\}\}/g)].map((match) => match[1])
        expect(new Set(used)).toEqual(new Set(prompt.variables.map((variable) => variable.key)))
      }
    }
    for (const concept of advancedConcepts) expect(concept.sources?.length).toBeGreaterThan(0)
    expect(advancedResources.map((resource) => resource.name)).toEqual(['Dify', 'n8n', 'LangGraph'])
  })
})

describe('Agent 场景走读的失败处理', () => {
  it('工作与学校场景具有不同材料与草稿，不混用负责人和地点', () => {
    expect(walkthrough('office', 'normal', 3).rows[0]).toEqual(['整理资料', '小林', '2026-10-16'])
    expect(walkthrough('school', 'normal', 3).rows[1][1]).toBe('图书室')
    expect(walkthrough('office', 'normal', 0).input).not.toBe(
      walkthrough('school', 'normal', 0).input,
    )
  })
  it('缺负责人或地点时保留未知值，在验收步骤暂停', () => {
    const office = walkthrough('office', 'missing', 4)
    const school = walkthrough('school', 'missing', 4)
    expect(office.rows[0][1]).toBe('待确认')
    expect(school.rows[1][1]).toBe('待确认')
    expect(office.stopped && school.stopped).toBe(true)
    expect(office.note).toMatch(/退回补充/)
  })
  it('工具没有返回结果时停止，不继续生成伪造成功的草稿', () => {
    const state = walkthrough('office', 'tool-failed', 2)
    expect(state.stopped).toBe(true)
    expect(state.canNext).toBe(false)
    expect(state.note).toMatch(/不声称已经读取/)
  })
  it('资料夹带指令不能获得新权限，原任务的草稿保持一致', () => {
    const normal = walkthrough('office', 'normal', 3)
    const injected = walkthrough('office', 'injected', 3)
    expect(injected.input).toMatch(/陌生地址/)
    expect(injected.rows).toEqual(normal.rows)
    expect(injected.status).toBe('额外动作已拒绝')
    expect(walkthrough('office', 'injected', 1).note).toMatch(/不获得发送权限/)
  })
})
