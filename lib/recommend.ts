import type {
  CapabilityKey,
  PromptTemplate,
  RequirementFlags,
  ScenarioRule,
  Score,
  Tool,
} from '@/data/types'
import { capabilityLabel, round2 } from './score'
import type { SortableTool } from './tool-list-item'

/**
 * 场景决策器的推荐引擎。
 *
 * 设计约束（来自产品原则）：
 * 1. 纯函数、无外部依赖 —— 不调用任何大模型 API，结果可复现、可离线、可单测。
 * 2. 可解释 —— 每个结果都返回命中维度、扣分项、约束命中说明。
 * 3. 权重归一 —— 场景权重先归一化，再与 0-5 分能力加权，最后叠加约束加减分。
 */

/** 约束加减分的最大幅度，避免条件把排序完全带偏 */
export const ADJUST_CAP = 1.2

export interface MatchedCapability {
  key: CapabilityKey
  label: string
  score: Score
  /** 归一化后的权重 0-1 */
  weight: number
  /** 对最终分的贡献 = score/5 * weight * 5 */
  contribution: number
}

export interface MissedCapability {
  key: CapabilityKey
  label: string
  score: Score
  reason: string
}

export interface ToolExplanation {
  tool: Tool
  /** 场景适配分 0-5 */
  score: number
  matched: MatchedCapability[]
  missed: MissedCapability[]
  /** 命中的约束条件 */
  satisfiedFlags: string[]
  /** 被扣分的约束条件 */
  violatedFlags: string[]
  /** 中文可读理由 */
  reasons: string[]
}

export interface WorkflowStep {
  step: number
  action: string
  capability: CapabilityKey
  capabilityLabel: string
  tool: {
    id: string
    name: string
    logo: string
    officialUrl: string
  }
}

export interface Recommendation {
  scenario: ScenarioRule
  primary: ToolExplanation | null
  alternates: ToolExplanation[]
  workflow: WorkflowStep[]
  promptTemplate: PromptTemplate | null
  pitfalls: string[]
  flags: RequirementFlags
  /** 引擎标识：固定为 rules，表示结果来自纯规则而非模型 */
  engine: 'rules'
}

export const FLAG_LABELS: Record<keyof RequirementFlags, string> = {
  chineseFirst: '中文场景优先',
  mustBeFree: '必须免费',
  lowBudget: '低预算优先',
  privacySensitive: '数据不能出本机/不能上传云端',
  chinaDirect: '需要大陆直连',
  needDeliverableFile: '要能出成品文件',
  noLearningCurve: '不想学复杂工具',
}

/** 归一化场景权重：权重和为 1，缺失维度视为 0 */
export function normalizeWeights(
  weights: Partial<Record<CapabilityKey, number>>
): Record<CapabilityKey, number> {
  const entries = Object.entries(weights) as [CapabilityKey, number][]
  const positive = entries.filter(([, w]) => typeof w === 'number' && w > 0)
  const total = positive.reduce((sum, [, w]) => sum + w, 0)
  const result = {} as Record<CapabilityKey, number>
  if (total === 0) return result
  for (const [key, w] of positive) result[key] = w / total
  return result
}

/** 单个工具在场景下的基础适配分（0-5），不含任何约束加减分 */
export function baseScenarioScore(tool: Tool, rule: ScenarioRule): number {
  const w = normalizeWeights(rule.weights)
  let acc = 0
  for (const [key, weight] of Object.entries(w) as [CapabilityKey, number][]) {
    const s = tool.capabilities[key]?.score ?? 0
    acc += (s / 5) * weight * 5
  }
  return round2(acc)
}

function cap(value: number): number {
  return Math.max(-ADJUST_CAP, Math.min(ADJUST_CAP, value))
}

/**
 * 对单个工具打分，返回带解释的结果。
 * 约束处理：
 * - `chinaDirect` / `mustBeFree` 为硬过滤（在 `filterByFlags` 中执行）
 * - 其余条件为加减分（≤ ±1.2）
 */
export function explainTool(
  tool: Tool,
  rule: ScenarioRule,
  flags: RequirementFlags = {}
): ToolExplanation {
  const weights = normalizeWeights(rule.weights)

  const matched: MatchedCapability[] = (
    Object.entries(weights) as [CapabilityKey, number][]
  )
    .map(([key, weight]) => {
      const cap = tool.capabilities[key]
      const score = (cap?.score ?? 0) as Score
      return {
        key,
        label: capabilityLabel(key),
        score,
        weight: round2(weight),
        contribution: round2((score / 5) * weight * 5),
      }
    })
    .sort((a, b) => b.contribution - a.contribution)

  const missed: MissedCapability[] = (rule.requiredCapabilities ?? [])
    .filter((req) => (tool.capabilities[req.key]?.score ?? 0) < (req.minRequiredScore ?? 3))
    .map((req) => ({
      key: req.key,
      label: capabilityLabel(req.key),
      score: (tool.capabilities[req.key]?.score ?? 0) as Score,
      reason: `场景硬要求 ${capabilityLabel(req.key)} ≥ ${req.minRequiredScore ?? 3} 分，该工具只有 ${
        tool.capabilities[req.key]?.score ?? 0
      } 分`,
    }))

  const satisfiedFlags: string[] = []
  const violatedFlags: string[] = []
  const reasons: string[] = []
  let adjust = 0

  if (flags.chineseFirst) {
    const q = tool.chineseQuality
    const delta = cap((q - 3) * 0.12)
    adjust += delta
    if (delta >= 0) satisfiedFlags.push(`中文能力 ${q}/5，在「中文场景优先」下加分`)
    else violatedFlags.push(`中文能力仅 ${q}/5，「中文场景优先」下扣分`)
  }

  if (flags.lowBudget) {
    if (tool.pricing.model === 'free' || tool.pricing.model === 'open-source') {
      adjust += 0.2
      satisfiedFlags.push('有完全免费/可自部署路径，低预算加分')
    } else if (tool.pricing.paidFrom) {
      adjust -= 0.3
      violatedFlags.push(`需付费（${tool.pricing.paidFrom}），低预算扣分`)
    } else {
      adjust += 0.05
      satisfiedFlags.push('有免费额度，低预算小幅加分')
    }
  }

  if (flags.privacySensitive) {
    if (tool.pricing.model === 'open-source') {
      adjust += 0.6
      satisfiedFlags.push('可本地部署，数据不出本机，隐私条件强加分')
    } else if (tool.hasApi) {
      adjust -= 0.15
      violatedFlags.push('云端服务，数据需上传，隐私条件扣分')
    } else {
      adjust -= 0.3
      violatedFlags.push('纯网页服务且无 API 管控，数据需上传，隐私条件扣分')
    }
  }

  if (flags.needDeliverableFile) {
    const office = tool.capabilities.office?.score ?? 0
    if (office >= 4) {
      adjust += 0.3
      satisfiedFlags.push('能直接导出 Word/PPT/Excel 等成品文件')
    } else if (office <= 2) {
      adjust -= 0.3
      violatedFlags.push('只能给文本/Markdown，出不了成品文件')
    }
  }

  if (flags.noLearningCurve) {
    const hasWeb = tool.platforms.includes('web')
    if (hasWeb && tool.latency === 'fast') {
      adjust += 0.15
      satisfiedFlags.push('网页直接可用、响应快，上手成本低')
    } else if (!hasWeb) {
      adjust -= 0.4
      violatedFlags.push('没有网页版，需要装客户端/命令行，上手成本高')
    }
  }

  const score = round2(Math.max(0, Math.min(5, baseScenarioScore(tool, rule) + adjust)))

  const top = matched.filter((m) => m.weight > 0.05).slice(0, 3)
  if (top.length > 0) {
    reasons.push(
      `场景权重最高的三个维度：${top
        .map((m) => `${m.label} ${m.score}/5`)
        .join('、')}，合计贡献 ${round2(top.reduce((s, m) => s + m.contribution, 0))} 分`
    )
  }
  const strong = matched.filter((m) => m.score >= 4 && m.weight >= 0.1)
  if (strong.length > 0) {
    reasons.push(`强项命中：${strong.map((m) => m.label).join('、')} 均达 4 分以上`)
  }
  if (missed.length > 0) {
    reasons.push(`硬性要求未满足：${missed.map((m) => m.label).join('、')}`)
  }
  if (flags.privacySensitive && tool.pricing.model === 'open-source') {
    reasons.push('可本地运行，适合不能外传的数据')
  }
  if (flags.chinaDirect === undefined && !tool.chinaAccessible) {
    reasons.push('中国大陆需工具手段访问（未勾选直连要求，已保留在候选中）')
  }

  return {
    tool,
    score,
    matched,
    missed,
    satisfiedFlags,
    violatedFlags,
    reasons,
  }
}

/** 硬过滤：把不满足的条件的工具剔除 */
export function filterByFlags(tools: Tool[], flags: RequirementFlags = {}): Tool[] {
  return tools.filter((tool) => {
    if (flags.chinaDirect && !tool.chinaAccessible) return false
    if (flags.mustBeFree) {
      const free = tool.pricing.model === 'free' || tool.pricing.model === 'open-source'
      if (!free) return false
    }
    return true
  })
}

export interface RecommendOptions {
  /** 备选数量，默认 2 */
  alternateCount?: number
  /** 是否生成组合工作流，默认 true */
  withWorkflow?: boolean
  /** 传入 PromptTemplate 列表以解析场景默认提示词 */
  promptTemplates?: PromptTemplate[]
}

/**
 * 场景推荐主函数：输入 = 场景 + 条件 + 工具库，输出 = 可解释的推荐结果。
 * 不产生任何副作用，不读取环境变量。
 */
export function recommend(
  rule: ScenarioRule,
  flags: RequirementFlags,
  tools: Tool[],
  options: RecommendOptions = {}
): Recommendation {
  const alternateCount = options.alternateCount ?? 2
  const withWorkflow = options.withWorkflow ?? true

  const candidates = filterByFlags(tools, flags)
    .map((tool) => explainTool(tool, rule, flags))
    .filter((r) => r.missed.length === 0)
    .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))

  const [primary, ...rest] = candidates
  const alternates = rest.slice(0, alternateCount)

  const workflow =
    withWorkflow && rule.workflow
      ? buildWorkflow(rule, candidates, primary, alternates)
      : []

  const promptTemplate =
    options.promptTemplates?.find((p) => p.id === rule.defaultPromptTemplate) ?? null

  return {
    scenario: rule,
    primary: primary ?? null,
    alternates,
    workflow,
    promptTemplate,
    pitfalls: rule.pitfalls,
    flags,
    engine: 'rules',
  }
}

function buildWorkflow(
  rule: ScenarioRule,
  candidates: ToolExplanation[],
  primary: ToolExplanation | null,
  alternates: ToolExplanation[]
): WorkflowStep[] {
  if (!rule.workflow) return []
  const used = new Set<string>()
  const steps: WorkflowStep[] = []

  for (const step of rule.workflow) {
    const wantKey = step.preferCapability
    const pool = candidates.filter((c) => (c.tool.capabilities[wantKey]?.score ?? 0) >= 3)
    const ordered = [...pool].sort((a, b) => {
      const sa = a.tool.capabilities[wantKey]?.score ?? 0
      const sb = b.tool.capabilities[wantKey]?.score ?? 0
      if (sb !== sa) return sb - sa
      return b.score - a.score
    })
    let chosen = ordered.find((c) => !used.has(c.tool.id) && c.tool.id !== primary?.tool.id)
    if (!chosen) {
      chosen = ordered.find((c) => !used.has(c.tool.id)) ?? ordered[0]
    }
    const fallback = primary ?? alternates[0]
    const pick = chosen ?? fallback
    if (!pick) continue
    used.add(pick.tool.id)
    steps.push({
      step: step.step,
      action: step.action,
      capability: step.preferCapability,
      capabilityLabel: capabilityLabel(step.preferCapability),
      tool: {
        id: pick.tool.id,
        name: pick.tool.name,
        logo: pick.tool.logo,
        officialUrl: pick.tool.officialUrl,
      },
    })
  }
  return steps
}

/** 工具库排序用的纯函数：按指定 key 排序 */
/**
 * 排序只需要 4 个字段：总分、更新时间、中文质量、指定维度分数。
 * 因此签名放宽成结构化类型，ToolListItem 与 Tool 都能传进来 ——
 * 前者不含长文本，用在工具库列表页。
 */
export function sortTools<T extends SortableTool>(
  tools: T[],
  key: 'overall' | 'updated' | 'chinese' | CapabilityKey,
  dir: 'asc' | 'desc' = 'desc'
): T[] {
  const val = (t: T): number => {
    switch (key) {
      case 'overall':
        return t.overallScore
      case 'updated':
        return new Date(t.updatedAt).getTime()
      case 'chinese':
        return t.chineseQuality
      default:
        return t.scores?.[key] ?? t.capabilities?.[key]?.score ?? 0
    }
  }
  const sign = dir === 'asc' ? 1 : -1
  return [...tools].sort((a, b) => sign * (val(a) - val(b)))
}