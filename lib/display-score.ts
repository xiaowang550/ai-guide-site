/** 前台十分制展示；编辑数据和选型权重保持原有五分制。 */
export function toTenPointScore(score: number): number {
  return Number.isFinite(score) ? Math.round(Math.max(0, Math.min(5, score)) * 20) / 10 : 0
}
