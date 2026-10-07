import type { CapabilityKey } from '@/data/types'
import { capabilityLabel } from './score'
import type { ToolExplanation } from './recommend'

/**
 * 「为什么不是它」——备选工具相对首选差在哪。
 *
 * 为什么必须有这个：
 * 原来的结果页只说「为什么是它」。但用户真正的问题往往是
 * 「我看到的第二个为什么排在后面，差多少、我能不能就用它」。
 * 没有这个对比，备选看起来只是个凑数的列表。
 *
 * 口径说明：这里算的是**同一批维度上的分差**，不是重新评分。
 * 也就是说「图像理解 3/5 vs 5/5」说的是这个场景看得见的那个维度，
 * 不是说这个工具整体差 2 分。整体适配分差在另一处单独给出。
 */
export interface Tradeoff {
  /** 落后的维度 key */
  key: CapabilityKey
  label: string
  /** 该工具在这个维度的分数 */
  theirs: number
  /** 首选在这个维度的分数 */
  winner: number
  /** 分差 = winner - theirs */
  gap: number
  /** 这个维度在当前场景里占多少权重（0-1） */
  weight: number
  /** 折算到适配分上丢了多少分 */
  costPoints: number
}

export interface Comparison {
  /** 两者适配分之差 */
  scoreGap: number
  /** 备选落后的维度，按「折算丢分」从多到少排 */
  gaps: Tradeoff[]
  /**
   * 备选反而更强的地方：这个场景里备选分数更高、但权重更低的维度。
   * 空数组说明备选在场景关心的每个维度上都不如首选。
   */
  advantages: Tradeoff[]
  /**
   * 一句话结论。写法上刻意不用「更差」这种带情绪的词 ——
   * 备选在别的场景里可能就是更好的选择。
   */
  verdict: string
}

const GAP_MIN = 1
/** 只列出折算丢分至少这么多分的维度，否则「落后 0.1 分」也会被列出来 */
const GAP_COST_MIN = 0.08

export function compareWithWinner(
  winner: ToolExplanation,
  challenger: ToolExplanation
): Comparison {
  const scoreGap = Math.round((winner.score - challenger.score) * 100) / 100

  const byKey = new Map(winner.matched.map((m) => [m.key, m]))
  const gaps: Tradeoff[] = []
  const advantages: Tradeoff[] = []

  for (const c of challenger.matched) {
    const w = byKey.get(c.key)
    if (!w) continue
    const diff = w.score - c.score
    if (diff <= 0) {
      if (diff < 0) {
        advantages.push({
          key: c.key,
          label: capabilityLabel(c.key),
          theirs: c.score,
          winner: w.score,
          gap: diff,
          weight: c.weight,
          costPoints: 0,
        })
      }
      continue
    }
    if (diff < GAP_MIN) continue
    gaps.push({
      key: c.key,
      label: capabilityLabel(c.key),
      theirs: c.score,
      winner: w.score,
      gap: diff,
      weight: c.weight,
      // 与引擎同口径：score/5 * weight * 5 = score * weight
      costPoints: Math.round(diff * c.weight * 100) / 100,
    })
  }

  gaps.sort((a, b) => b.costPoints - a.costPoints)
  advantages.sort((a, b) => b.gap - a.gap)

  const worth = gaps.filter((g) => g.costPoints >= GAP_COST_MIN)

  return {
    scoreGap,
    gaps: worth,
    advantages: advantages.filter((a) => a.weight >= 0.1),
    verdict: buildVerdict(winner, challenger, scoreGap, worth, advantages),
  }
}

function buildVerdict(
  winner: ToolExplanation,
  challenger: ToolExplanation,
  scoreGap: number,
  gaps: Tradeoff[],
  advantages: Tradeoff[]
): string {
  if (scoreGap <= 0.05) {
    return `和${winner.tool.name}基本打平（差 ${Math.abs(scoreGap)} 分），按你更熟悉哪个来选`
  }

  const top = gaps.slice(0, 2)
  const gapText = top.length
    ? top.map((g) => `${g.label} ${g.theirs}/5 对 ${g.winner}/5`).join('、')
    : '没有明显短板'

  // 备选更强的维度里，挑权重最高的那一个来说 ——
  // 「它其实 X 更强」比「它到处都不行」有用得多。
  const adv = advantages.find((a) => a.weight >= 0.1)
  const advText = adv
    ? `它在${adv.label}上反而更强（${adv.theirs}/5），如果你的活儿主要吃这一项，选它更合适`
    : ''

  return `比${winner.tool.name}低 ${scoreGap} 分，差在${gapText}${advText ? `。${advText}` : ''}`
}
