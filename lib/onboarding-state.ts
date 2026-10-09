export const INTRO_KEY = 'ai-map:intro:v2'
export const INTRO_SESSION = 'ai-map:intro-seen:v2'
export const ROOKIE_KEY = 'ai-map:rookie:v1'
export function localDay(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function introDue(
  value: unknown,
  day: string,
  seen: boolean,
  legacyDone: boolean,
  force = false,
) {
  if (force) return true
  const state =
    value && typeof value === 'object'
      ? (value as { completed?: unknown; snoozeDay?: unknown })
      : {}
  return !seen && !legacyDone && state.completed !== true && state.snoozeDay !== day
}
export function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback
  } catch {
    return fallback
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}
export function finishIntro(today: boolean, completed: boolean) {
  const previous = readLocal<Record<string, unknown>>(INTRO_KEY, {})
  saveLocal(INTRO_KEY, {
    ...previous,
    ...(today ? { snoozeDay: localDay() } : {}),
    ...(completed ? { completed: true } : {}),
  })
  try {
    sessionStorage.setItem(INTRO_SESSION, localDay())
  } catch {}
  window.dispatchEvent(new Event('ai-map:intro-closed'))
}
export function rookieProgress(value: unknown, count = 6) {
  const state =
    value && typeof value === 'object' ? (value as { stage?: unknown; done?: unknown }) : {}
  return {
    stage:
      typeof state.stage === 'number' && Number.isInteger(state.stage)
        ? Math.max(0, Math.min(count - 1, state.stage))
        : 0,
    done: Array.isArray(state.done)
      ? [
          ...new Set(
            state.done.filter(
              (n): n is number =>
                typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < count,
            ),
          ),
        ]
      : [],
  }
}
