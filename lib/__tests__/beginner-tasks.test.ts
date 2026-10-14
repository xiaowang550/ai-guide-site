import { describe, expect, it } from 'vitest'
import { beginnerDraft, beginnerEvidence, beginnerExample, beginnerPrompt } from '../beginner-tasks'
import { rookieCoreDone, rookieProgress, nextRookieStage } from '../onboarding-state'

describe('新手任务与基础练习进度', () => {
  it('损坏的本地材料回到可操作的默认值，并限制存储内容长度', () => {
    expect(beginnerDraft(null)).toMatchObject({ task: 'message', format: 'short' })
    expect(
      beginnerDraft({
        task: 'unknown',
        material: 'a'.repeat(2000),
        recipient: 'x'.repeat(100),
        format: 'unknown',
      }),
    ).toMatchObject({ task: 'message', format: 'short' })
    expect(beginnerDraft({ material: 'a'.repeat(2000) }).material.length).toBe(1200)
    expect(beginnerEvidence({ output: '假的结果', kind: 'unknown' })).toBeNull()
    expect(beginnerEvidence({ output: '', kind: 'ai' })).toBeNull()
  })
  it('发给模型的是使用者的材料、对象和格式，而非泛泛地询问 AI 有什么用', () => {
    const prompt = beginnerPrompt(
      beginnerDraft({
        task: 'todo',
        material: '周二 14:00 到图书馆。带书。',
        recipient: '同学',
        format: 'list',
      }),
    )
    expect(prompt).toContain('给同学看')
    expect(prompt).toContain('周二 14:00 到图书馆。带书。')
    expect(prompt).toContain('逐条列出')
    expect(prompt).toContain('不增加时间、地点、联系人或任务')
  })
  it('教学示例保留被修改的原始事实，不复用旧材料的时间地点', () => {
    const draft = beginnerDraft({ task: 'todo', material: '周二14:00到图书馆。带两本书。' })
    const output = beginnerExample(draft)
    expect(output).toContain('1. 周二14:00到图书馆')
    expect(output).toContain('2. 带两本书')
    expect(output).not.toContain('会议室')
    expect(output).not.toContain('周五')
  })
  it('基础练习可独立完成，旧六步进度仍保留，选学内容不制造已完成记录', () => {
    expect(nextRookieStage(0)).toBe(1)
    expect(nextRookieStage(1)).toBe(5)
    expect(nextRookieStage(2)).toBe(3)
    expect(rookieCoreDone([0, 1, 5])).toBe(true)
    expect(rookieCoreDone([0, 1, 2, 3, 4])).toBe(false)
    expect(rookieProgress({ stage: 3, done: [0, 1, 2] })).toEqual({ stage: 3, done: [0, 1, 2] })
  })
})
