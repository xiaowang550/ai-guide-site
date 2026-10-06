import type { CapabilityKey, CapabilityScore, Score, Tool } from '@/data/types'

/**
 * 能力维度元数据：顺序 = 全站展示顺序（雷达图轴顺序、筛选器顺序一致）
 */
export const CAPABILITY_META: {
  key: CapabilityKey
  label: string
  short: string
  description: string
}[] = [
  { key: 'writing', label: '写作表达', short: '写作', description: '文案、改写、润色、多语言' },
  { key: 'longform', label: '长文理解', short: '长文', description: '长文档 / 多文件阅读与总结' },
  { key: 'reasoning', label: '逻辑推理', short: '推理', description: '复杂问题拆解、分析' },
  { key: 'math', label: '数理计算', short: '数理', description: '数学、物理、公式推导' },
  { key: 'coding', label: '编程开发', short: '编程', description: '写码、调试、重构' },
  { key: 'research', label: '联网研究', short: '研究', description: '检索、溯源、带引用的调研' },
  { key: 'agent', label: '任务自动化', short: 'Agent', description: '多步执行、工具调用、流程编排' },
  { key: 'data', label: '数据分析', short: '数据', description: '表格处理、图表、SQL' },
  { key: 'office', label: '办公产出', short: '办公', description: 'Word / PPT / Excel 直接交付' },
  { key: 'imageGen', label: '图像生成', short: '生图', description: '文生图、改图' },
  { key: 'vision', label: '图像理解', short: '识图', description: '识图、OCR、截图理解' },
  { key: 'video', label: '视频生成', short: '视频', description: '文生视频、图生视频、剪辑' },
  { key: 'voice', label: '语音音乐', short: '语音', description: 'TTS、语音克隆、音乐生成' },
  { key: 'realtime', label: '实时交互', short: '实时', description: '低延迟语音对话、同传' },
]

export const CAPABILITY_KEYS = CAPABILITY_META.map((c) => c.key) as CapabilityKey[]

const META_MAP = new Map(CAPABILITY_META.map((c) => [c.key, c]))

export function capabilityLabel(key: CapabilityKey): string {
  return META_MAP.get(key)?.label ?? key
}

export function capabilityShort(key: CapabilityKey): string {
  return META_MAP.get(key)?.short ?? key
}

export function capabilityDescription(key: CapabilityKey): string {
  return META_MAP.get(key)?.description ?? ''
}

/**
 * 综合分权重（等权为基线，写作/推理/编程略微加权）。
 * 修改权重会影响所有工具的 overallScore，属于破坏性变更，需同步更新单测。
 */
export const OVERALL_WEIGHTS: Record<CapabilityKey, number> = {
  writing: 1.2,
  longform: 1,
  reasoning: 1.2,
  math: 0.8,
  coding: 1.2,
  research: 0.9,
  agent: 0.9,
  data: 0.9,
  office: 0.9,
  imageGen: 0.6,
  vision: 0.6,
  video: 0.5,
  voice: 0.5,
  realtime: 0.5,
}

export const MAX_SCORE = 5

/** 纯函数：加权综合分（0-5，保留 2 位小数） */
export function computeOverallScore(
  capabilities: Record<CapabilityKey, CapabilityScore>,
  weights: Record<CapabilityKey, number> = OVERALL_WEIGHTS
): number {
  let weighted = 0
  let totalWeight = 0
  for (const key of CAPABILITY_KEYS) {
    const w = weights[key] ?? 1
    const s = capabilities[key]?.score ?? 0
    weighted += s * w
    totalWeight += w
  }
  if (totalWeight === 0) return 0
  return round2(weighted / totalWeight)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export interface CapabilityEntry {
  key: CapabilityKey
  label: string
  score: Score
  basis?: string
}

/** 把 capabilities 对象转成按维度顺序排列的数组 */
export function capabilityEntries(
  capabilities: Record<CapabilityKey, CapabilityScore>
): CapabilityEntry[] {
  return CAPABILITY_META.map((meta) => {
    const cap = capabilities[meta.key]
    return {
      key: meta.key,
      label: meta.label,
      score: cap?.score ?? 0,
      basis: cap?.basis,
    }
  })
}

/** 分数降序的维度列表（用于「最强的地方」） */
export function rankedCapabilities(
  capabilities: Record<CapabilityKey, CapabilityScore>,
  minScore?: Score
): CapabilityEntry[] {
  return capabilityEntries(capabilities)
    .filter((e) => (minScore === undefined ? true : e.score >= minScore))
    .sort((a, b) => b.score - a.score)
}

/** 分数升序的维度列表（用于「短板」） */
export function weakestCapabilities(
  capabilities: Record<CapabilityKey, CapabilityScore>,
  maxScore: Score = 2
): CapabilityEntry[] {
  return capabilityEntries(capabilities)
    .filter((e) => e.score <= maxScore)
    .sort((a, b) => a.score - b.score)
}

/** 0-5 → 语义色阶 */
export type ScoreTone = 'weak' | 'fair' | 'good' | 'strong' | 'top'

export function scoreTone(score: number): ScoreTone {
  if (score >= 4.5) return 'top'
  if (score >= 3.5) return 'strong'
  if (score >= 2.5) return 'good'
  if (score >= 1.5) return 'fair'
  return 'weak'
}

/** 0-5 → CSS 变量色（与 globals.css 中的 --score-N 对应） */
export function scoreColorVar(score: number): string {
  const s = Math.max(0, Math.min(5, Math.round(score)))
  return `hsl(var(--score-${s}))`
}

export function scoreBarWidth(score: number): string {
  return `${Math.max(0, Math.min(100, (score / MAX_SCORE) * 100))}%`
}

// ---------- 数据新鲜度 ----------

export const STALE_DAYS = 90

export function daysSince(isoDate: string, now: Date = new Date()): number {
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return Number.POSITIVE_INFINITY
  return Math.floor((now.getTime() - then) / 86_400_000)
}

export function isStale(isoDate: string, now: Date = new Date()): boolean {
  return daysSince(isoDate, now) > STALE_DAYS
}

export function formatDate(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`
}

export function formatDateShort(isoDate: string): string {
  const d = new Date(isoDate)
  if (Number.isNaN(d.getTime())) return isoDate
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** 全站数据最后更新时间（取所有工具/概念/教程中的最大值） */
export function latestUpdatedAt(tools: Tool[]): string {
  if (tools.length === 0) return new Date().toISOString()
  return tools.reduce((max, t) => (t.updatedAt > max ? t.updatedAt : max), tools[0].updatedAt)
}

/**
 * 依据覆盖度：有多少个维度的分数写了「为什么」。
 *
 * 这是给读者一个可量化的可信度信号 —— 分数高不等于有依据，
 * 但「14 个维度里有几个说得出理由」是可以核对的。
 * 纯函数，不依赖具体工具。
 */
export interface EvidenceCoverage {
  covered: number
  total: number
  ratio: number
  /** 缺依据的维度 key */
  missing: string[]
  /** 依据最薄的维度（分数高但没写理由，需要警惕） */
  thinButHigh: string[]
}

export function computeEvidenceCoverage(
  capabilities: Record<CapabilityKey, CapabilityScore>
): EvidenceCoverage {
  const keys = Object.keys(capabilities) as CapabilityKey[]
  const missing: string[] = []
  const thinButHigh: string[] = []
  let covered = 0

  for (const key of keys) {
    const cap = capabilities[key]
    const hasBasis = typeof cap?.basis === 'string' && cap.basis.trim().length > 0
    if (hasBasis) covered += 1
    else {
      missing.push(key)
      // 4-5 分却没写理由：读者无法核对，是最需要警惕的情况
      if ((cap?.score ?? 0) >= 4) thinButHigh.push(key)
    }
  }

  const total = keys.length
  return {
    covered,
    total,
    ratio: total === 0 ? 0 : round2(covered / total),
    missing,
    thinButHigh,
  }
}
