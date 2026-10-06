import type { EduBriefing, EduFaq, EduProgram, EduSchool, EduToolkit } from '@/data/types'
import { eduPrograms } from '@/data/edu-programs'
import { eduToolkits } from '@/data/edu-toolkits'
import { eduSchools } from '@/data/edu-schools'
import { eduBriefings } from '@/data/edu-briefings'
import { eduFaq } from '@/data/edu-faq'

/**
 * AI 教育模块的**服务端**工具函数：指标统计、阶梯进度、数据检索。
 *
 * ⚠️ 本模块会 import 全部教育数据集（课程全文、教案包、试点学校、简报、FAQ），
 * 因此**只允许 server component 引用**。
 * 客户端组件（规范生成器、教案包列表、FAQ 列表等）请改用 `lib/edu-shared.ts` ——
 * 否则这些长文本会进入浏览器包，而且常常落到「多页共享」的 chunk 里，
 * 等于全站替这段用不到的数据付下载成本。
 *
 * 客户端安全的部分（常量、isCurrent、generatePolicy）都在 edu-shared.ts，
 * 这里再 re-export 一次，方便服务端代码统一从本模块引入。
 */
export * from './edu-shared'

/**
 * 供服务端页面与测试使用的数据再导出。
 * ⚠️ 会把教育数据集暴露给任何 import 本模块的地方 —— client 组件请用 edu-shared。
 */
export { eduPrograms, eduTiers } from '@/data/edu-programs'
export { eduToolkits } from '@/data/edu-toolkits'
export { eduSchools } from '@/data/edu-schools'
export { eduBriefings } from '@/data/edu-briefings'
export { eduFaq } from '@/data/edu-faq'
export { eduPolicyRules } from '@/data/edu-policy'

// ---------- 指标统计（对应方案「过程指标」） ----------

export interface EduMetrics {
  programs: number
  toolkits: number
  schools: number
  /** 覆盖教师人次（同一教师多门课会重复计，页面需注明口径） */
  teachersReached: number
  seedTeachers: number
  /** 已交付课时数 */
  lessons: number
  /** 处于试点验证阶段的学校数 */
  pilotSchools: number
  /** 内容更新频次：近 90 天内更新过的课程/教案包数量 */
  recentlyUpdated: number
  latestUpdate: string
  /**
   * 覆盖人数类指标里是否含示例数据。
   * 为 true 时页面必须显示「含示例数据」，否则演示数字会被当成真实成果。
   */
  includesSample: boolean
}

export function computeEduMetrics(options?: {
  programs?: EduProgram[]
  toolkits?: EduToolkit[]
  schools?: EduSchool[]
  briefings?: EduBriefing[]
  now?: Date
}): EduMetrics {
  const programs = options?.programs ?? eduPrograms
  const toolkits = options?.toolkits ?? eduToolkits
  const schools = options?.schools ?? eduSchools
  const briefings = options?.briefings ?? eduBriefings
  const now = options?.now ?? new Date()

  const ninetyDaysAgo = now.getTime() - 90 * 86_400_000
  const updatedRecently = [...programs, ...toolkits].filter(
    (item) => new Date(item.updatedAt).getTime() >= ninetyDaysAgo
  ).length

  // 简报用 date，其余内容用 updatedAt；统一成时间戳后取最大值
  const updates = [
    ...programs.map((p) => p.updatedAt),
    ...toolkits.map((t) => t.updatedAt),
    ...schools.map((s) => s.updatedAt),
    ...briefings.map((b) => b.date),
  ]
    .sort()
    .reverse()

  return {
    programs: programs.length,
    toolkits: toolkits.length,
    schools: schools.length,
    // 还有示例数据时，覆盖人数不能被当成真实覆盖
    includesSample: schools.some((s) => s.isSample),
    teachersReached: schools.reduce((sum, s) => sum + s.teachersReached, 0),
    seedTeachers: schools.reduce((sum, s) => sum + s.seedTeachers, 0),
    lessons:
      programs.reduce((sum, p) => sum + p.lessons, 0) +
      toolkits.reduce((sum, t) => sum + t.lessons, 0),
    pilotSchools: schools.filter((s) => s.phase === '试点验证').length,
    recentlyUpdated: updatedRecently,
    latestUpdate: updates[0] ?? '',
  }
}

/** 阶梯完成度：某校已上的课程在阶梯上的位置（看板显示进度） */
export function ladderProgressFor(
  school: EduSchool,
  tiers: readonly { id: string; order: number; audience: 'teacher' | 'student' }[]
): { reached: string[]; nextTier: string | null } {
  const teacherTiers = [...tiers]
    .filter((t) => t.audience === 'teacher')
    .sort((a, b) => a.order - b.order)
  const reached = teacherTiers.filter((t) =>
    school.deliveredPrograms.some((pid) => pid.startsWith(`${t.id.toLowerCase()}-`))
  )
  const reachedIds = new Set(reached.map((t) => t.id))
  const next = teacherTiers.find((t) => !reachedIds.has(t.id))
  return { reached: [...reachedIds], nextTier: next?.id ?? null }
}

// ---------- 检索工具 ----------

export function programByTier(tierId: string): EduProgram[] {
  return eduPrograms.filter((p) => p.tier === tierId)
}

export function toolkitsByProgram(programId: string): EduToolkit[] {
  return eduToolkits.filter((t) => t.programId === programId)
}

export function schoolsByPhase(phase: EduSchool['phase']): EduSchool[] {
  return eduSchools.filter((s) => s.phase === phase)
}

/** 取单个阶段的第一所学校（供页面做「下一步」等场景；找不到返回 undefined） */
export function schoolByPhase(phase: EduSchool['phase']): EduSchool | undefined {
  return eduSchools.find((s) => s.phase === phase)
}

export function faqByAudience(audience: EduFaq['audience']): EduFaq[] {
  return eduFaq.filter((f) => f.audience === audience)
}