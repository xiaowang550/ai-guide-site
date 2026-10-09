import { describe, expect, it } from 'vitest'
import { introDue, localDay, rookieProgress } from '../onboarding-state'
describe('首次教学的显示与进度', () => {
  it('新访客自动显示，本次已经看过则不重复', () => {
    expect(introDue({}, '2026-10-09', false, false)).toBe(true)
    expect(introDue({}, '2026-10-09', true, false)).toBe(false)
  })
  it('今天不再弹出只抑制本地当天，隔天失效', () => {
    expect(introDue({ snoozeDay: '2026-10-09' }, '2026-10-09', false, false)).toBe(false)
    expect(introDue({ snoozeDay: '2026-10-09' }, '2026-10-10', false, false)).toBe(true)
    expect(localDay(new Date(2026, 9, 9, 23, 59))).toBe('2026-10-09')
  })
  it('完成或老访客不会自动重复，手动体验可覆盖并不会删除偏好', () => {
    expect(introDue({ completed: true }, '2026-10-09', false, false)).toBe(false)
    expect(introDue({}, '2026-10-09', false, true)).toBe(false)
    expect(
      introDue({ completed: true, snoozeDay: '2026-10-09' }, '2026-10-09', true, true, true),
    ).toBe(true)
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
