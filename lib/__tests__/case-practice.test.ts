import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { cases } from '@/data/cases'
import { caseExercise } from '@/data/case-exercises'
import { caseScene } from '@/data/case-scenes'
import { CASE_TOPICS, caseMatchesTopic, type CasePreview } from '@/lib/case-filters'
describe('可动手复现的案例', () => {
  it('每个案例都有对应材料、验收要求和实际存在的配图', () => {
    for (const c of cases) {
      const exercise = caseExercise(c.id)
      expect(exercise.material.length, c.id).toBeGreaterThan(50)
      expect(exercise.checks.length, c.id).toBeGreaterThanOrEqual(3)
      expect(existsSync(`public/images/cases/${caseScene(c.id)}.webp`), c.id).toBe(true)
      if (exercise.source) {
        expect(new URL(exercise.source.url).protocol).toBe('https:')
        expect(exercise.source.note).toContain('参考')
      }
    }
  })
  it('常见任务分类包含多种案例，数量从内容推导', () => {
    const previews = cases.map((c) => ({
      ...c,
      summary: c.summary ?? c.scenario,
      tools: c.tools.map((id) => ({ id, name: id, logo: '' })),
      illustrative: c.kind === 'illustrative',
    })) as CasePreview[]
    for (const topic of CASE_TOPICS.filter((t) => t.id !== 'all'))
      expect(
        previews.filter((c) => caseMatchesTopic(c, topic.id)).length,
        topic.label,
      ).toBeGreaterThanOrEqual(4)
  })
})
