import type {
  CapabilityKey,
  ScenarioRule,
  ScenarioVariant,
} from '@/data/types'
import { scenarios } from '@/data/scenarios'

/**
 * 子情境的权重合并。
 *
 * 设计取舍：子情境**只写要改的维度**，其余沿用场景级。
 *
 * 另一种写法是每个子情境都给完整的 14 维权重表。问题是没法核对：
 * 面对一张表看不出「这个子情境究竟把什么调高了」，改错一个数字也没人发现。
 * 覆盖式的写法里，每个数字都是一次有意的调整，可以逐条审。
 *
 * 未列出的维度沿用场景级取值，所以即使子情境漏写了某个维度，
 * 排序也只是退回场景级结果，不会出现「某个维度权重为 0」的意外。
 */
export function mergeWeights(
  rule: ScenarioRule,
  variant: ScenarioVariant | null | undefined
): Partial<Record<CapabilityKey, number>> {
  if (!variant) return rule.weights
  return { ...rule.weights, ...variant.weights }
}

/** 硬性要求同样可以被子情境覆盖：子情境列了就用子情境的 */
export function mergeRequired(
  rule: ScenarioRule,
  variant: ScenarioVariant | null | undefined
) {
  return variant?.requiredCapabilities ?? rule.requiredCapabilities ?? []
}

/**
 * 把一个场景 + 子情境组装成可交给 recommend() 的临时规则。
 *
 * 用 `{ ...rule, ... }` 而不是改原对象：场景数据是模块级常量，
 * 被就地改过一次之后，后面任何人拿到的都是被污染的版本。
 */
export function resolveScenario(
  rule: ScenarioRule,
  variantId?: string
): { rule: ScenarioRule; variant: ScenarioVariant | null } {
  if (!variantId) return { rule, variant: null }
  const variant = rule.variants?.find((v) => v.id === variantId) ?? null
  if (!variant) return { rule, variant: null }
  return {
    rule: {
      ...rule,
      weights: mergeWeights(rule, variant),
      requiredCapabilities: mergeRequired(rule, variant),
      // 提示词与避坑也允许子情境覆盖：写代码和读旧代码该问的问题不一样
      defaultPromptTemplate: variant.promptTemplateId ?? rule.defaultPromptTemplate,
      pitfalls: variant.pitfalls ?? rule.pitfalls,
      workflow: variant.workflow ?? rule.workflow,
    },
    variant,
  }
}

/** 某个场景的子情境列表（可能为空） */
export function variantsOf(rule: ScenarioRule): ScenarioVariant[] {
  return rule.variants ?? []
}

/** 按 id 找场景，找不到返回 null */
export function findScenario(id: string): ScenarioRule | null {
  return scenarios.find((s) => s.id === id) ?? null
}
