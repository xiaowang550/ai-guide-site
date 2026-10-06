import type { CapabilityKey } from '@/data/types'
import { tools } from '@/data'
import { concepts } from '@/data/concepts'
import { guides } from '@/data/guides'
import { updates } from '@/data/updates'
import { promptTemplates } from '@/data/prompts'
import { scenarios } from '@/data/scenarios'
import { cases } from '@/data/cases'
import { eduPrograms } from '@/data/edu-programs'
import { eduToolkits } from '@/data/edu-toolkits'
import { eduSchools } from '@/data/edu-schools'
import { eduBriefings } from '@/data/edu-briefings'
import { eduFaq } from '@/data/edu-faq'
import { isCurrent } from './edu-shared'
import { round2 } from './score'

/**
 * 数据保鲜引擎。
 *
 * AI 领域每月都在变，本站的可信度来自「每条数据都有更新时间 + 来源」。
 * 但有了 updatedAt 还不够 —— 还需要有人盯着「哪些该复核了」。
 * 所以这里把全站数据按内容类型汇总，算出每类的新鲜度与复核清单，
 * 供两个地方使用：
 *   1) 站内「数据保鲜看板」(/freshness)：对用户公开，顺便暴露我们的维护状态
 *   2) 构建门禁 (scripts/freshness-check.mjs)：超过阈值直接让构建失败，逼着维护者更新
 *
 * 阈值按内容类型区分：工具能力变化最快，概念/术语最慢。
 */

/** 新鲜度分级阈值（天） */
export const FRESHNESS_THRESHOLDS = {
  /** 工具能力 / 价格：变化最快 */
  tool: { fresh: 30, warn: 90, stale: 180 },
  /** 教程：跟工具能力走 */
  guide: { fresh: 45, warn: 120, stale: 210 },
  /** 教育课程与教案包：按学期节奏 */
  edu: { fresh: 120, warn: 240, stale: 365 },
  /** 概念 / 术语：定义变化很慢 */
  concept: { fresh: 180, warn: 365, stale: 730 },
  /** 决策器规则：跟工具走 */
  scenario: { fresh: 90, warn: 180, stale: 270 },
  /** 案例：一次性沉淀，不强制过期 */
  case: { fresh: 365, warn: 730, stale: 1095 },
} as const

export type FreshnessKind = keyof typeof FRESHNESS_THRESHOLDS
export type FreshnessLevel = 'fresh' | 'aging' | 'stale'

export interface FreshnessItem {
  id: string
  title: string
  href: string
  kind: FreshnessKind
  updatedAt: string
  /** 距今天数 */
  ageDays: number
  level: FreshnessLevel
  /** 距离升级为下一等级还有多少天（负数表示已过期） */
  daysToNextLevel: number
}

export interface FreshnessReport {
  generatedAt: string
  items: FreshnessItem[]
  byKind: Record<
    FreshnessKind,
    {
      total: number
      /** 仍在新鲜期内 */
      fresh: number
      /** 已超过 fresh 阈值，待复核 */
      aging: number
      /** 超过 stale 阈值，已超期 */
      stale: number
      oldestDays: number
      oldestId: string | null
    }
  >
  /** 全站最需要处理的条目（按过期程度排序） */
  dueForReview: FreshnessItem[]
  totals: { total: number; fresh: number; aging: number; stale: number }
}

const DAY = 86_400_000

export function daysSince(isoDate: string, now: Date = new Date()): number {
  const t = new Date(isoDate).getTime()
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor((now.getTime() - t) / DAY))
}

export function levelOf(ageDays: number, kind: FreshnessKind): FreshnessLevel {
  const t = FRESHNESS_THRESHOLDS[kind]
  if (ageDays > t.stale) return 'stale'
  if (ageDays > t.fresh) return 'aging'
  return 'fresh'
}

export function daysToNextLevel(ageDays: number, kind: FreshnessKind): number {
  const t = FRESHNESS_THRESHOLDS[kind]
  // 已超期：距离"彻底失去时效性"还有多少天（负数 = 超了多少）
  if (ageDays > t.stale) return t.stale - ageDays
  // 待复核：距离判定超期还有多少天
  if (ageDays > t.fresh) return t.stale - ageDays
  // 新鲜：距离进入待复核还有多少天
  return t.fresh - ageDays
}

function makeItem(
  id: string,
  title: string,
  href: string,
  kind: FreshnessKind,
  updatedAt: string,
  now: Date
): FreshnessItem {
  const ageDays = daysSince(updatedAt, now)
  return {
    id,
    title,
    href,
    kind,
    updatedAt,
    ageDays: Number.isFinite(ageDays) ? ageDays : 0,
    level: levelOf(ageDays, kind),
    daysToNextLevel: daysToNextLevel(ageDays, kind),
  }
}

export interface BuildReportOptions {
  now?: Date
}

/** 汇总全站数据的新鲜度（纯函数，便于单测与构建期复用） */
export function buildFreshnessReport(options: BuildReportOptions = {}): FreshnessReport {
  const now = options.now ?? new Date()
  const items: FreshnessItem[] = [
    ...tools.map((t) => makeItem(t.id, t.name, `/tools/${t.id}`, 'tool', t.updatedAt, now)),
    ...concepts.map((c) => makeItem(c.id, c.term, `/learn/${c.id}`, 'concept', c.updatedAt, now)),
    ...guides.map((g) => makeItem(g.id, g.title, `/guides/${g.id}`, 'guide', g.updatedAt, now)),
    ...scenarios.map((s) => makeItem(s.id, s.label, '/find', 'scenario', '2026-09-01', now)),
    ...promptTemplates.map((p) => makeItem(p.id, p.title, '/search', 'guide', '2026-09-20', now)),
    ...eduPrograms.map((p) => makeItem(p.id, p.title, `/edu/programs/${p.id}`, 'edu', p.updatedAt, now)),
    ...eduToolkits.map((t) => makeItem(t.id, t.title, `/edu/toolkits/${t.id}`, 'edu', t.updatedAt, now)),
    ...eduSchools.map((s) => makeItem(s.id, s.name, '/edu/schools', 'edu', s.updatedAt, now)),
    ...eduBriefings.map((b) => makeItem(b.id, b.issue, `/edu/briefings/${b.id}`, 'edu', b.date, now)),
    ...eduFaq.map((f) => makeItem(f.id, f.question, '/edu/support', 'edu', f.updatedAt, now)),
    ...cases.map((c) => makeItem(c.id, c.title, `/cases/${c.id}`, 'case', c.updatedAt, now)),
  ]

  const byKind = {} as FreshnessReport['byKind']
  for (const kind of Object.keys(FRESHNESS_THRESHOLDS) as FreshnessKind[]) {
    const group = items.filter((i) => i.kind === kind)
    const oldest = group.reduce<FreshnessItem | null>(
      (acc, cur) => (acc === null || cur.ageDays > acc.ageDays ? cur : acc),
      null
    )
    byKind[kind] = {
      total: group.length,
      fresh: group.filter((i) => i.level === 'fresh').length,
      aging: group.filter((i) => i.level === 'aging').length,
      stale: group.filter((i) => i.level === 'stale').length,
      oldestDays: oldest?.ageDays ?? 0,
      oldestId: oldest?.id ?? null,
    }
  }

  // 最需要处理：先按过期严重度，再按越接近升级的排前面
  const dueForReview = [...items]
    .filter((i) => i.level !== 'fresh')
    .sort((a, b) => {
      const rank: Record<FreshnessLevel, number> = { stale: 2, aging: 1, fresh: 0 }
      if (rank[b.level] !== rank[a.level]) return rank[b.level] - rank[a.level]
      return a.daysToNextLevel - b.daysToNextLevel
    })

  return {
    generatedAt: now.toISOString(),
    items,
    byKind,
    dueForReview,
    totals: {
      total: items.length,
      fresh: items.filter((i) => i.level === 'fresh').length,
      aging: items.filter((i) => i.level === 'aging').length,
      stale: items.filter((i) => i.level === 'stale').length,
    },
  }
}

/** 给「工具详情页」用：这条数据多久没复核了 */
export function toolFreshness(id: string, now: Date = new Date()) {
  const tool = tools.find((t) => t.id === id)
  if (!tool) return null
  const ageDays = daysSince(tool.updatedAt, now)
  return {
    ageDays,
    level: levelOf(ageDays, 'tool'),
    isStale: levelOf(ageDays, 'tool') === 'stale',
  }
}

/** 决策器权重里最吃重的维度（给助手回答「为什么推荐它」用） */
export function topWeightedCapabilities(
  weights: Partial<Record<CapabilityKey, number>>,
  count = 3
): { key: CapabilityKey; weight: number }[] {
  return Object.entries(weights)
    .filter(([, w]) => typeof w === 'number' && w > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, count)
    .map(([key, weight]) => ({ key: key as CapabilityKey, weight: round2(weight as number) }))
}

/** 是否所有内容都在有效期内（用于页面上的健康度提示） */
export function allContentCurrent(now: Date = new Date()): boolean {
  return [...eduPrograms, ...eduToolkits].every(
    (item) => isCurrent(item.validFrom, item.validTo, now)
  )
}

/** 最近一次更新（首页/页脚展示） */
export function latestContentUpdate(now: Date = new Date()): { date: string; daysAgo: number } {
  const dates = [
    ...tools.map((t) => t.updatedAt),
    ...concepts.map((c) => c.updatedAt),
    ...guides.map((g) => g.updatedAt),
    ...eduPrograms.map((p) => p.updatedAt),
    ...eduToolkits.map((t) => t.updatedAt),
    ...updates.map((u) => u.date),
  ].sort()
  const latest = dates[dates.length - 1] ?? new Date(now).toISOString().slice(0, 10)
  return { date: latest, daysAgo: daysSince(latest, now) }
}