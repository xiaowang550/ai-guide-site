/** Public benchmark facts. Product IDs never imply the app uses the tested model. */
export type BenchmarkBoard = 'aa-intelligence' | 'arena-text' | 'arena-image' | 'arena-video'
export interface BenchmarkResult {
  board: BenchmarkBoard
  model: string
  value: number
  uncertainty?: number
  votes?: number
  preliminary?: boolean
  publishedAt?: string
}
export interface ToolBenchmark {
  checkedAt: string
  results: BenchmarkResult[]
  note: string
}
export const BENCHMARK_BOARDS: Record<
  BenchmarkBoard,
  { name: string; short: string; url: string; method: string }
> = {
  'aa-intelligence': {
    name: 'Artificial Analysis 智能指数',
    short: 'AA 智能指数',
    url: 'https://artificialanalysis.ai/leaderboards/models',
    method: 'v4.3.2 综合模型测试；原始指数，越高越好，不是满分 10 分。',
  },
  'arena-text': {
    name: 'Arena 文本偏好',
    short: 'Arena 文本',
    url: 'https://arena.ai/leaderboard/chat/text',
    method: '盲测用户偏好的相对评分；± 为榜单置信区间半宽，分数接近时不宜断言优劣。',
  },
  'arena-image': {
    name: 'Arena 文生图偏好',
    short: 'Arena 图像',
    url: 'https://arena.ai/leaderboard/image/text-to-image',
    method: '文生图盲测偏好；不能与文本或视频分数横向比较。',
  },
  'arena-video': {
    name: 'Arena 文生视频偏好',
    short: 'Arena 视频',
    url: 'https://arena.ai/leaderboard/video/text-to-video',
    method: '文生视频盲测偏好；不能与文本或图像分数横向比较。',
  },
}
export function benchmarkStale(checkedAt: string, now = Date.now()) {
  const age = now - Date.parse(checkedAt + 'T00:00:00Z')
  return !Number.isFinite(age) || age > 30 * 86400000 || age < -86400000
}
export function benchmarkValue(
  evidence: ToolBenchmark | undefined,
  board: BenchmarkBoard,
): number | null {
  if (!evidence || benchmarkStale(evidence.checkedAt)) return null
  const value = evidence.results.find((r) => r.board === board)?.value
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
export function compareBenchmarks(
  a: ToolBenchmark | undefined,
  b: ToolBenchmark | undefined,
  board: BenchmarkBoard,
  direction: 'asc' | 'desc',
) {
  const av = benchmarkValue(a, board),
    bv = benchmarkValue(b, board)
  // No measured value stays at the end in either direction; absence is never a zero.
  if (av === null) return bv === null ? 0 : 1
  if (bv === null) return -1
  return direction === 'asc' ? av - bv : bv - av
}
