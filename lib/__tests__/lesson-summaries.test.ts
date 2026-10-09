import { describe, expect, it } from 'vitest'
import { guides } from '@/data/guides'
import { lessonSummaries } from '@/data/lesson-summaries'

describe('短教程保留可执行步骤和验收', () => {
  it('每篇教程都有对应短版，没有遗漏操作步骤', () => {
    expect(Object.keys(lessonSummaries).sort()).toEqual(guides.map((g) => g.id).sort())
    for (const guide of guides)
      expect(lessonSummaries[guide.id].actions).toHaveLength(guide.steps.length)
  })
  it('短版保留具体产物与可核对标准', () => {
    for (const short of Object.values(lessonSummaries)) {
      expect(short.outcome).toMatch(/提示词|版本|清单|周报|摘要|大纲|表|报告|模板|讲稿/)
      expect(short.checks.length).toBeGreaterThanOrEqual(3)
      expect(short.actions.every((action) => action.trim().length > 0)).toBe(true)
    }
  })
  it('摘要核对和教学评分的关键边界不被精简掉', () => {
    expect(lessonSummaries['long-pdf-summary'].actions.join('')).toMatch(/抽查通过不代表/)
    expect(lessonSummaries['grading-with-ai'].actions.join('')).toMatch(/不让 AI 决定分数/)
    expect(lessonSummaries['reliable-output'].actions.join('')).toMatch(/自查仍需人工复核/)
  })
})
