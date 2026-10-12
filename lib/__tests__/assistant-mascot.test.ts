import { describe, expect, it } from 'vitest'
import { mascotState, MASCOT_STATES } from '../assistant-mascot'
import { existsSync } from 'node:fs'
describe('XiaoYa contextual appearances', () => {
  it('prioritizes pending work and problems over idle and greetings', () => {
    expect(mascotState({ busy: true, error: true, greeting: true })).toBe('working')
    expect(mascotState({ busy: true, searching: true })).toBe('flying')
    expect(mascotState({ error: true, success: true, resting: true })).toBe('confused')
    expect(mascotState({ reading: true, resting: true })).toBe('resting')
  })
  it('maps user actions to distinct supplied poses', () => {
    expect(mascotState({})).toBe('resting')
    for (const [context, state] of [
      [{ greeting: true }, 'welcome'],
      [{ dragging: true }, 'flying'],
      [{ reading: true }, 'reading'],
      [{ hint: true }, 'guiding'],
      [{ success: true }, 'success'],
      [{ resting: true }, 'resting'],
    ] as const)
      expect(mascotState(context)).toBe(state)
    expect(new Set(Object.values(MASCOT_STATES).map((s) => s.image)).size).toBe(8)
    for (const s of Object.values(MASCOT_STATES)) expect(existsSync('public' + s.image)).toBe(true)
  })
})
