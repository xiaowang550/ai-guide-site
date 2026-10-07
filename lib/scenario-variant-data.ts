/**
 * 把子情境种子挂到场景上。
 *
 * 为什么单独一步：子情境有 30 条，权重又短（每条三五个数字），
 * 如果直接写进 data/scenarios.ts 的每个对象里，场景自身的权重表
 * 会被埋掉 —— 而那 14 维权重是决策器最该被逐条审阅的部分。
 * 分成两个文件之后：看权重读 scenarios.ts，看细化读 seeds。
 *
 * 挂载方式是**只补 variants 与 group**，不覆盖场景已有的任何字段。
 * 场景级数据仍是权威，子情境只是附加的细化层。
 */
import type { CapabilityKey, ScenarioRule, ScenarioVariant, Score } from '@/data/types'
import { VARIANT_SEEDS, type VariantSeed } from '@/data/scenario-variants-seed'
import { VARIANT_SEEDS_B } from '@/data/scenario-variants-seed-b'

const ALL_SEEDS: VariantSeed[] = [...VARIANT_SEEDS, ...VARIANT_SEEDS_B]

/** 分组归属：按场景 id 显式指定，不靠猜 */
const GROUPS: Record<string, ScenarioRule['group']> = {
  // 写作与内容
  write: 'writing',
  'read-long-doc': 'writing',
  research: 'writing',
  // 设计与多媒体
  'make-office': 'visual',
  image: 'visual',
  video: 'visual',
  // 技术与数据
  code: 'technical',
  automate: 'technical',
  data: 'technical',
  // 学习与教学
  learn: 'learning',
}

function toVariant(seed: VariantSeed): ScenarioVariant {
  return {
    id: seed.id,
    label: seed.label,
    hint: seed.hint,
    weights: seed.weights as Partial<Record<CapabilityKey, number>>,
    ...(seed.requiredCapabilities
      ? {
          requiredCapabilities: seed.requiredCapabilities.map((r) => ({
            key: r.key as CapabilityKey,
            minRequiredScore: (r.minRequiredScore ?? 3) as Score,
          })),
        }
      : {}),
    ...(seed.promptTemplateId ? { promptTemplateId: seed.promptTemplateId } : {}),
  }
}

/** 给场景补上 group 与 variants，返回新数组（不改原对象） */
export function attachVariants(rules: ScenarioRule[]): ScenarioRule[] {
  const byScenario = new Map<string, ScenarioVariant[]>()
  for (const seed of ALL_SEEDS) {
    const list = byScenario.get(seed.scenarioId) ?? []
    list.push(toVariant(seed))
    byScenario.set(seed.scenarioId, list)
  }

  return rules.map((rule) => {
    const variants = byScenario.get(rule.id)
    return {
      ...rule,
      group: GROUPS[rule.id] ?? rule.group,
      ...(variants && variants.length > 0 ? { variants } : {}),
    }
  })
}

/** 子情境总数，供页面与测试引用，避免各处硬编码数字 */
export const VARIANT_TOTAL = ALL_SEEDS.length
