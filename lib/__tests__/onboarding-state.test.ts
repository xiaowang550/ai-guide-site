import { describe, expect, it } from 'vitest'
import { INTRO_KEY, introDue, localDay, rookieProgress } from '../onboarding-state'

describe('新手指引的显示与进度', () => {
  it('新版不沿用旧版的永久完成标记，每次打开只有当天免打扰可抑制', () => {
    expect(INTRO_KEY).not.toBe('ai-map:intro:v2')
    expect(introDue({}, '2026-10-09')).toBe(true)
    expect(introDue({ completed: true }, '2026-10-09')).toBe(true)
    expect(introDue(null, '2026-10-09')).toBe(true)
  })
  it('今天不再弹出只抑制本地当天，隔天失效', () => {
    expect(introDue({ snoozeDay: '2026-10-09' }, '2026-10-09')).toBe(false)
    expect(introDue({ snoozeDay: '2026-10-09' }, '2026-10-10')).toBe(true)
    expect(localDay(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09')
  })
  it('从教程主动重新体验可覆盖当天免打扰', () => {
    expect(introDue({ snoozeDay: '2026-10-09' }, '2026-10-09', true)).toBe(true)
  })
  it('损坏的进度不会丢失学习入口或制造已完成的步骤', () => {
    expect(rookieProgress({ stage: 999, done: [0, 0, -1, 1, 50, '2'] })).toEqual({
      stage: 5,
      done: [0, 1],
    })
    expect(rookieProgress(null)).toEqual({ stage: 0, done: [] })
    expect(rookieProgress({ stage: NaN, done: {} })).toEqual({ stage: 0, done: [] })
  })
})
