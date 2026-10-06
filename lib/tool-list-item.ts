import type { CapabilityKey, Score, Tool, ToolCategory } from '@/data/types'

/**
 * 工具列表用的**最小数据集**。
 *
 * 背景：工具库页面把完整的 `Tool[]` 作为 props 传给客户端组件
 * `ToolExplorer`（为了做客户端筛选）。但完整对象里最重的部分 ——
 * 强项、弱项、「别用它做什么」、评分依据、来源链接 ——
 * 卡片与表格**一个字都不渲染**，筛选也用不到。
 *
 * 这些长文本本来就已经在服务端渲染进 HTML 了，再序列化一份进 RSC payload
 * 等于同一份内容传两遍。22 个工具累积起来就是首屏 HTML 多出十几 KB，
 * 而所有页面都要为它付流量。
 *
 * 所以这里定义一个投影：只保留「筛选要用」+「卡片要显示」的字段，
 * 其中 capabilities 只保留分数（`basis` 依据文本留给详情页）。
 *
 * 这也是 README「两条必须守住的规则」第 2 条的实际应用。
 */
export interface ToolListItem {
  id: string
  name: string
  nameEn: string
  vendor: string
  tagline: string
  logo: string
  categories: ToolCategory[]
  tags: string[]
  platforms: Tool['platforms']
  chinaAccessible: boolean
  chineseQuality: number
  hallucinationRisk: Tool['hallucinationRisk']
  overallScore: number
  updatedAt: string
  /** 只保留 'free' / 'open-source' 的判断依据与表格里显示的一列 */
  pricing: {
    model: Tool['pricing']['model']
    paidFrom?: string
  }
  /** 14 个维度的**分数**，不含 basis 文本 */
  scores: Record<CapabilityKey, Score>
}

/** 从完整 Tool 投影出列表用的最小数据集 */
export function toListItem(tool: Tool): ToolListItem {
  const scores = {} as Record<CapabilityKey, Score>
  for (const key of Object.keys(tool.capabilities) as CapabilityKey[]) {
    scores[key] = tool.capabilities[key]?.score ?? 0
  }
  return {
    id: tool.id,
    name: tool.name,
    nameEn: tool.nameEn,
    vendor: tool.vendor,
    tagline: tool.tagline,
    logo: tool.logo,
    categories: tool.categories,
    tags: tool.tags,
    platforms: tool.platforms,
    chinaAccessible: tool.chinaAccessible,
    chineseQuality: tool.chineseQuality,
    hallucinationRisk: tool.hallucinationRisk,
    overallScore: tool.overallScore,
    updatedAt: tool.updatedAt,
    pricing: {
      model: tool.pricing.model,
      ...(tool.pricing.paidFrom ? { paidFrom: tool.pricing.paidFrom } : {}),
    },
    scores,
  }
}

export function toListItems(tools: Tool[]): ToolListItem[] {
  return tools.map(toListItem)
}

/**
 * 把分数映射还原成 `CapabilityScore` 形状，
 * 好让 `rankedCapabilities` / `weakestCapabilities` 这类既有纯函数直接复用。
 *
 * 刻意**不填basis**：这些函数只用 score，不需要依据文本。
 */
export function scoresToCapabilityMap(
  scores: Record<CapabilityKey, Score>
): Record<CapabilityKey, { score: Score }> {
  const out = {} as Record<CapabilityKey, { score: Score }>
  for (const key of Object.keys(scores) as CapabilityKey[]) {
    out[key] = { score: scores[key] }
  }
  return out
}

/**
 * 排序所需的最小结构。
 *
 * `scores` 与 `capabilities` 二选一即可 —— 完整的 Tool 只有后者，
 * 列表投影只有前者。用联合可选字段让两者都能传给同一个排序函数。
 */
export interface SortableTool {
  overallScore: number
  updatedAt: string
  chineseQuality: number
  scores?: Record<CapabilityKey, Score>
  capabilities?: Tool['capabilities']
}