import type { CaseStudy } from '@/data/types'

/**
 * 案例的最小投影。
 *
 * 为什么需要：决策器结果页要显示「用这个工具的实际做法」，
 * 直接 import { cases } 会把 20 个完整 CaseStudy 拖进客户端包 ——
 * 每条含 600 字以上的提示词原文，实测让 /find 的 JS 从 58.5 kB 涨到 99.7 kB。
 *
 * 做法与 lib/tool-list-item.ts 相同：只给列表真正用得到的字段，
 * 长文本（完整提示词、踩坑、耗时）留在案例详情页按需加载。
 *
 * 这不是提前优化，是发现回归后的修复 —— 记录在案，避免以后又被改回去。
 */
export interface CaseListItem {
  id: string
  title: string
  industry: string
  role: string
  summary: string
  /** 用了哪些工具，供决策器按工具关联案例 */
  tools: string[]
}

export function toCaseListItems(cases: CaseStudy[]): CaseListItem[] {
  return cases.map((c) => ({
    id: c.id,
    title: c.title,
    industry: c.industry,
    role: c.role,
    summary: c.summary ?? '',
    tools: c.tools,
  }))
}
