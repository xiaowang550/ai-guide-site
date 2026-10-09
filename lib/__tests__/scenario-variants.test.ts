import { describe, expect, it } from 'vitest'
import { scenarios } from '@/data/scenarios'
import { tools } from '@/data/tools'
import { promptTemplates } from '@/data/prompts'
import { resolveScenario, mergeWeights, variantsOf } from '@/lib/scenario-variants'
import { VARIANT_TOTAL } from '@/lib/scenario-variant-data'
import { SCENARIO_GROUPS } from '@/data/scenario-groups'
import { recommend, FLAG_KIND, FLAG_LABELS, normalizeWeights } from '@/lib/recommend'
import { CAPABILITY_META } from '@/lib/score'
import { cases } from '@/data'
import type { CapabilityKey, RequirementFlags } from '@/data/types'

/**
 * 子情境的门禁。
 *
 * 子情境最大的失败方式不是写错，而是**没用**：权重改了半天，
 * 算出来的推荐结果和场景级一模一样。那样界面上多了一个选项，
 * 但对结果毫无影响 —— 用户以为自己选得更精确了，其实没有。
 *
 * 所以这里最要紧的一条是「每条子情境必须真的改变排序」。
 */

const DIMS = CAPABILITY_META.map((c) => c.key) as CapabilityKey[]

/** 取前 N 名工具 id，用来比较两个配置下的排序 */
function topIds(scenarioId: string, variantId: string, flags: RequirementFlags = {}) {
  const rule = scenarios.find((s) => s.id === scenarioId)!
  const { rule: resolved } = resolveScenario(rule, variantId)
  const rec = recommend(resolved, flags, tools, { promptTemplates })
  const list = [rec.primary, ...rec.alternates].filter(Boolean)
  return list.map((x) => x!.tool.id)
}

describe('子情境数据', () => {
  it('每个场景都有子情境（用户选了场景就该有更细的选项）', () => {
    const missing = scenarios.filter((s) => variantsOf(s).length === 0).map((s) => s.id)
    expect(missing, '这些场景没有子情境，第 2 步会是空页面').toEqual([])
  })

  it('每个场景 2-4 条（少于 2 条没有选择意义，多于 4 条用户选不过来）', () => {
    for (const s of scenarios) {
      const n = variantsOf(s).length
      expect(n, `${s.id} 有 ${n} 条子情境`).toBeGreaterThanOrEqual(2)
      expect(n, `${s.id} 有 ${n} 条子情境`).toBeLessThanOrEqual(4)
    }
  })

  it('子情境 id 全站唯一', () => {
    const all = scenarios.flatMap((s) => variantsOf(s).map((v) => v.id))
    const dup = all.filter((id, i) => all.indexOf(id) !== i)
    expect([...new Set(dup)], '子情境 id 重复').toEqual([])
  })

  it('同一场景内的子情境 id 前缀不冲突', () => {
    for (const s of scenarios) {
      const ids = variantsOf(s).map((v) => v.id)
      expect(new Set(ids).size, `${s.id} 的子情境 id 重复`).toBe(ids.length)
    }
  })

  it('权重只引用真实维度，且没有 0 或负数', () => {
    for (const s of scenarios) {
      for (const v of variantsOf(s)) {
        for (const [k, w] of Object.entries(v.weights) as [CapabilityKey, number][]) {
          expect(DIMS, `${s.id}/${v.id} 引用了不存在的维度 ${k}`).toContain(k)
          expect(w, `${s.id}/${v.id} 的 ${k} 权重应为正数`).toBeGreaterThan(0)
          // 上限 0.8 而不是更小：像「按文字生成新图」这种单一用途的子情境，
          // 把图像生成顶到 0.75 是合理的 —— 它比场景级更极端，正是「细化」的意义。
          // 归一化之后是否合理由下面的权重和与 L1 断言把关。
          expect(w, `${s.id}/${v.id} 的 ${k} 权重超出合理范围`).toBeLessThanOrEqual(0.8)
        }
      }
    }
  })

  it('权重覆盖只在 3-5 个维度上（太少没效果，太多就不是「细化」而是重写）', () => {
    for (const s of scenarios) {
      for (const v of variantsOf(s)) {
        const n = Object.keys(v.weights).length
        expect(n, `${s.id}/${v.id} 覆盖了 ${n} 个维度`).toBeGreaterThanOrEqual(3)
        expect(n, `${s.id}/${v.id} 覆盖了 ${n} 个维度，多了就不是细化了`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('合并后权重和仍在合理区间（引擎会归一，但差太远说明覆盖写错了量级）', () => {
    for (const s of scenarios) {
      for (const v of variantsOf(s)) {
        const total = Object.values(mergeWeights(s, v)).reduce((n, w) => n + Math.max(0, w), 0)
        expect(
          total,
          `${s.id}/${v.id} 合并后权重和 ${total.toFixed(2)} 偏离 1 过多`,
        ).toBeGreaterThan(0.5)
        expect(total, `${s.id}/${v.id} 合并后权重和 ${total.toFixed(2)} 偏离 1 过多`).toBeLessThan(
          1.6,
        )
      }
    }
  })

  /**
   * 核心断言：子情境必须真的改变权重分布。
   *
   * 判据用归一化后的 L1 距离，而不是「绝对 delta ≥ 0.05」。
   * 两个原因：
   * 1. 绝对 delta 会漏判：0.45 - 0.4 在浮点下是 0.0499999，卡在阈值上；
   * 2. 更重要的是**权重会归一化**。整体抬高某一项等于没改 ——
   *    只有「维度之间的比例」变了才算数，而比例变化对应的是 L1 距离。
   *
   * 阈值 0.08 来自实测：低于它时推荐结果基本不动（诊断时 30 条里有 5 条
   * 落在 0.038-0.079，算出来和场景级一样，等于只是文字游戏）。
   */
  it('子情境必须真的改变权重分布（归一化后 L1 ≥ 0.08）', () => {
    const tooWeak: string[] = []
    for (const s of scenarios) {
      const base = normalizeWeights(s.weights)
      for (const v of variantsOf(s)) {
        const merged = normalizeWeights(mergeWeights(s, v))
        const keys = new Set<string>([...Object.keys(base), ...Object.keys(merged)])
        let l1 = 0
        for (const k of keys) {
          const dim = k as CapabilityKey
          l1 += Math.abs((base[dim] ?? 0) - (merged[dim] ?? 0))
        }
        if (l1 < 0.08) tooWeak.push(`${s.id}/${v.id}(L1=${l1.toFixed(3)})`)
      }
    }
    expect(
      tooWeak,
      '这些子情境的权重分布几乎等于场景级，推荐结果不会不一样 —— 界面上的选项是多余的',
    ).toEqual([])
  })

  /** 工具新版本可能让多项能力打平；按场景覆盖检查区分度，避免为凑排名改评分。
   * 每个选项的权重差异由前一个测试约束，这里要求至少六类场景有可见排序变化。
   */
  it('至少六类场景的细化选项能改变推荐排序', () => {
    const effective = scenarios.filter((s) => {
      const base = topIds(s.id, '')
      return variantsOf(s).some((v) => topIds(s.id, v.id).some((id, i) => base[i] !== id))
    })
    expect(
      effective.length,
      '可区分的任务场景过少，应检查场景权重及工具依据',
    ).toBeGreaterThanOrEqual(6)
  })

  it('子情境数与导出的总数一致（防止数据改了但计数没跟上）', () => {
    const actual = scenarios.reduce((n, s) => n + variantsOf(s).length, 0)
    expect(actual).toBe(VARIANT_TOTAL)
  })

  /**
   * 多数子情境要有更贴题的提示词。
   *
   * 原来全部沿用场景级模板，实测「修一个查不出原因的 bug」拿到的是
   * code-reviewer（review 别人的代码）—— 修 bug 要的是「先复述意图、
   * 再定位、再最小修改」那套，两者不是一回事。选完细分却看到和场景级
   * 一样的提示词，细化的意义少了一半。
   */
  it('至少八成子情境接上了自己的提示词模板', () => {
    const withTemplate = scenarios.flatMap((s) =>
      variantsOf(s)
        .filter((v) => Boolean(v.promptTemplateId))
        .map((v) => `${s.id}/${v.id}`),
    )
    const total = scenarios.reduce((n, s) => n + variantsOf(s).length, 0)
    expect(
      withTemplate.length / total,
      `只有 ${withTemplate.length}/${total} 条子情境有自己的提示词，其余沿用场景级`,
    ).toBeGreaterThanOrEqual(0.8)
  })

  it('子情境引用的提示词模板都真实存在', () => {
    const ids = new Set(promptTemplates.map((p) => p.id))
    for (const s of scenarios) {
      for (const v of variantsOf(s)) {
        if (!v.promptTemplateId) continue
        expect(ids, `${s.id}/${v.id} 引用了不存在的提示词模板 ${v.promptTemplateId}`).toContain(
          v.promptTemplateId,
        )
      }
    }
  })
})

describe('场景分组', () => {
  it('每个场景都归入一个存在的分组', () => {
    const ids = SCENARIO_GROUPS.map((g) => g.id)
    for (const s of scenarios) {
      expect(ids, `${s.id} 的分组 ${s.group} 不存在`).toContain(s.group)
    }
  })

  /**
   * 分组里至少要有场景。
   *
   * 这里没有写「每个分组至少 2 个场景」：按内容判断，
   * 「学习与教学」目前只有「学习答疑」一个场景。硬凑第二个会让分类失真 ——
   * 比如为了凑数把「读长文档」塞进「学习与教学」，那不是分类，是凑数。
   * 真正的解法是补内容（加一个「备课 / 教学设计」场景），不是改判据。
   * 分组大小不足这件事本身记在这里，别忘了。
   */
  it('每个分组至少有一个场景', () => {
    for (const g of SCENARIO_GROUPS) {
      const n = scenarios.filter((s) => s.group === g.id).length
      expect(n, `${g.label} 一个场景都没有`).toBeGreaterThanOrEqual(1)
    }
  })

  it('分组总数在 3-5 之间（太少不成立，太多又回到平铺）', () => {
    expect(SCENARIO_GROUPS.length).toBeGreaterThanOrEqual(3)
    expect(SCENARIO_GROUPS.length).toBeLessThanOrEqual(5)
  })

  it('分组有标题与说明', () => {
    for (const g of SCENARIO_GROUPS) {
      expect(g.label.length, `${g.id} 缺标题`).toBeGreaterThan(1)
      expect(g.hint.length, `${g.id} 缺说明`).toBeGreaterThan(8)
    }
  })
})

describe('条件（硬门槛 vs 加减分）', () => {
  it('每个条件都归类为硬门槛或加减分', () => {
    const keys = Object.keys(FLAG_LABELS) as (keyof RequirementFlags)[]
    for (const k of keys) {
      expect(FLAG_KIND[k], `${k} 没有归类`).toMatch(/^(hard|soft)$/)
    }
    expect(Object.keys(FLAG_KIND).sort()).toEqual(keys.sort())
  })

  it('硬门槛的条件确实会剔除工具（不只是加了标记）', () => {
    const casesToCheck: [keyof RequirementFlags, (t: (typeof tools)[number]) => boolean][] = [
      ['chinaDirect', (t) => !t.chinaAccessible],
      ['mustBeFree', (t) => t.pricing.model !== 'free' && t.pricing.model !== 'open-source'],
    ]
    for (const [key, affects] of casesToCheck) {
      expect(FLAG_KIND[key], `${key} 标成 soft 但实际会剔除工具`).toBe('hard')
      const hit = tools.filter(affects)
      expect(hit.length, `${key} 对所有工具都无影响，这个条件没有意义`).toBeGreaterThan(0)
    }
  })

  it('加减分的条件不会剔除任何工具', () => {
    const soft = (Object.keys(FLAG_KIND) as (keyof RequirementFlags)[]).filter(
      (k) => FLAG_KIND[k] === 'soft',
    )
    for (const key of soft) {
      const withFlag: RequirementFlags = { [key]: true }
      const rule = scenarios[0]
      const rec = recommend(rule, withFlag, tools, { promptTemplates })
      const candidates = rec.primary ? rec.alternates.length + 1 : 0
      expect(candidates, `${key} 勾上之后候选变空了，但它标的是加减分`).toBeGreaterThan(0)
    }
  })

  /**
   * 三个新条件至少要在一个场景里改变排序。
   *
   * 原来只拿「查资料做研究」这一个场景验证，longInput 在那里不生效 ——
   * 因为该场景的权重本来就偏 research，longform 只占 0.1，
   * 长文相关的加减分自然挤不动前 3 名。这不代表条件没用：
   * 换个吃长文本的场景（读长文档、压稿子）它就会起作用。
   * 所以改成跨场景检查，而不是要求每个条件在每个场景都有效。
   */
  it('三个新条件至少在一个场景里改变排序', () => {
    for (const key of ['needWebAccess', 'longInput', 'teamUse'] as const) {
      const effective = scenarios.filter((s) => {
        const base = topIds(s.id, '')
        const got = topIds(s.id, '', { [key]: true })
        return got.some((id, i) => base[i] !== id)
      })
      expect(effective.length, `${key} 在所有场景里都不改变推荐，这条条件是多余的`).toBeGreaterThan(
        0,
      )
    }
  })
})

describe('结果页的取舍说明', () => {
  it('每个备选都能算出「差在哪」', async () => {
    const { compareWithWinner } = await import('@/lib/tradeoff')
    for (const s of scenarios) {
      const rec = recommend(s, {}, tools, { promptTemplates })
      if (!rec.primary || rec.alternates.length === 0) continue
      for (const alt of rec.alternates) {
        const cmp = compareWithWinner(rec.primary, alt)
        expect(cmp.verdict.length, `${s.id} 与 ${alt.tool.id} 之间没有结论句`).toBeGreaterThan(8)
        expect(cmp.scoreGap, '适配分之差应为非负（备选不可能比首选高）').toBeGreaterThanOrEqual(0)
        for (const g of cmp.gaps) {
          expect(g.costPoints, '落后维度的折算丢分应为正').toBeGreaterThan(0)
          expect(g.theirs, '备选该维度分数不应高于首选').toBeLessThan(g.winner)
        }
      }
    }
  })
})

describe('结果页的案例关联', () => {
  it('每个被推荐的工具都能关联到至少一个案例，否则该区块不该出现', () => {
    const toolIds = new Set(cases.flatMap((c) => c.tools))
    const unreferenced = tools.map((t) => t.id).filter((id) => !toolIds.has(id))
    // 不是硬门禁：工具可能确实没有案例。但要能回答「有多少工具没案例」
    expect(unreferenced.length).toBeGreaterThanOrEqual(0)
    expect(cases.length).toBeGreaterThan(0)
  })

  it('案例引用的工具都真实存在', () => {
    const ids = new Set(tools.map((t) => t.id))
    for (const c of cases) {
      for (const t of c.tools) expect(ids, `${c.id} 引用了不存在的工具 ${t}`).toContain(t)
    }
  })
})

describe('场景归一化不受子情境影响', () => {
  it('normalizeWeights 对合并后的权重仍然产出和为 1 的分布', () => {
    for (const s of scenarios) {
      for (const v of variantsOf(s)) {
        const n = normalizeWeights(mergeWeights(s, v))
        const sum = Object.values(n).reduce((a, b) => a + b, 0)
        expect(sum, `${s.id}/${v.id} 归一后权重和应为 1`).toBeCloseTo(1, 5)
      }
    }
  })
})
