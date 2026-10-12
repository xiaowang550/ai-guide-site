import type { Tool } from '@/data/types'
import { toolBenchmark } from '@/data/tool-benchmarks'
import type { ToolBenchmark } from '@/lib/tool-benchmarks'

/** 对比页面只接收会展示的字段；完整介绍和档案来源留在工具详情页。 */
export type CompareTool = Pick<
  Tool,
  | 'id'
  | 'name'
  | 'nameEn'
  | 'vendor'
  | 'logo'
  | 'tagline'
  | 'capabilities'
  | 'categories'
  | 'overallScore'
  | 'chineseQuality'
  | 'chinaAccessible'
  | 'contextWindow'
  | 'multimodal'
  | 'hasApi'
  | 'pricing'
  | 'platforms'
  | 'hallucinationRisk'
  | 'latency'
  | 'stability'
  | 'avoidFor'
  | 'officialUrl'
  | 'updatedAt'
> & { benchmark: ToolBenchmark }
export function toCompareTool(tool: Tool): CompareTool {
  const {
    id,
    name,
    nameEn,
    vendor,
    logo,
    tagline,
    capabilities,
    categories,
    overallScore,
    chineseQuality,
    chinaAccessible,
    contextWindow,
    multimodal,
    hasApi,
    pricing,
    platforms,
    hallucinationRisk,
    latency,
    stability,
    avoidFor,
    officialUrl,
    updatedAt,
  } = tool
  return {
    benchmark: toolBenchmark(tool.id),
    id,
    name,
    nameEn,
    vendor,
    logo,
    tagline,
    capabilities,
    categories,
    overallScore,
    chineseQuality,
    chinaAccessible,
    contextWindow,
    multimodal,
    hasApi,
    pricing,
    platforms,
    hallucinationRisk,
    latency,
    stability,
    avoidFor,
    officialUrl,
    updatedAt,
  }
}
