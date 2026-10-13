/** Readable labels for the existing editorial 0–5 capability bands. */
export const CAPABILITY_LEVELS = [
  '不支持',
  '不建议',
  '能力有限',
  '基本可用',
  '较强',
  '强项',
] as const

export function capabilityRating(score: number | undefined) {
  if (score === undefined || !Number.isFinite(score)) return null
  const value = Math.max(0, Math.min(5, score))
  return { value, label: CAPABILITY_LEVELS[Math.round(value)], display: (value * 2).toFixed(1) }
}
