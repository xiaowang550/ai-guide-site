'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Layers,
  Minus,
  Scale,
  Sparkles,
} from 'lucide-react'
import type {
  CapabilityKey,
  RequirementFlags,
  ScenarioRule,
  Tool,
} from '@/data/types'
import {
  ADJUST_CAP,
  FLAG_KIND,
  FLAG_LABELS,
  countLocalOnly,
  isLocalOnly,
  recommend,
  type ToolExplanation,
} from '@/lib/recommend'
import { capabilityLabel } from '@/lib/score'
import { promptTemplates } from '@/data/prompts'
import { scenarios } from '@/data/scenarios'
import { tools } from '@/data/tools'
import type { CaseListItem } from '@/lib/case-list-item'
import { SCENARIO_GROUPS } from '@/data/scenario-groups'
import { resolveScenario, variantsOf } from '@/lib/scenario-variants'
import { compareWithWinner } from '@/lib/tradeoff'
import { cn } from '@/lib/utils'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { ToolLogo } from '@/components/tool-logo'
import { ScoreBadge, ScoreDot } from '@/components/score-badge'
import { PromptBlock } from '@/components/prompt-block'
import { CoverArt } from '@/components/cover-art'

type FlagKey = keyof RequirementFlags

const FLAG_HINTS: Record<FlagKey, string> = {
  chineseFirst: '中文表达自然，少有翻译腔',
  mustBeFree: '不花任何钱（免费版或本地开源）',
  lowBudget: '有免费额度就够，付费越少越好',
  privacySensitive: '只保留可在自己电脑上部署的工具，数据完全不出本机',
  chinaDirect: '中国大陆不借助工具即可访问',
  needDeliverableFile: '要能直接导出 Word/PPT/Excel',
  noLearningCurve: '网页打开就能用，不想折腾配置',
  needWebAccess: '要查知识截止之后的东西（模型自己不知道）',
  longInput: '几万字文档、整个代码库这类长材料',
  teamUse: '多人共用，要账号、要能接进自己的流程',
}

/**
 * 条件显示顺序。
 *
 * 硬门槛排在前面，因为它们的杀伤力最大：勾上「必须免费」会直接剔除一批工具，
 * 用户应该先看到、也最容易预判后果。软条件只是加减分，顺序影响不大。
 */
const FLAG_ORDER: FlagKey[] = [
  'chinaDirect',
  'mustBeFree',
  'privacySensitive',
  'needWebAccess',
  'needDeliverableFile',
  'longInput',
  'chineseFirst',
  'lowBudget',
  'noLearningCurve',
  'teamUse',
]

/** URL 短参数名 */
const FLAG_PARAM: Record<FlagKey, string> = {
  chinaDirect: 'cn',
  mustBeFree: 'free',
  chineseFirst: 'zh',
  privacySensitive: 'privacy',
  needDeliverableFile: 'file',
  lowBudget: 'cheap',
  noLearningCurve: 'easy',
  needWebAccess: 'web',
  longInput: 'long',
  teamUse: 'team',
}

const PARAM_FLAG: Record<string, FlagKey> = Object.fromEntries(
  Object.entries(FLAG_PARAM).map(([k, v]) => [v, k as FlagKey])
)

export function ScenarioWizard({ caseItems }: { caseItems: CaseListItem[] }) {
  const [scenarioId, setScenarioId] = useState<string>('')
  const [variantId, setVariantId] = useState<string>('')
  const [flags, setFlags] = useState<RequirementFlags>({})
  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  // URL 同步：结果可分享（/find?s=code&v=fix-bug&cn=1&free=1）
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const s = p.get('s')
    const matched = s ? scenarios.find((x) => x.id === s) : null
    if (matched) {
      setScenarioId(matched.id)
      const v = p.get('v')
      if (v && variantsOf(matched).some((x) => x.id === v)) setVariantId(v)
      // 直接带场景进链接的，一律落到结果页
      setStep(3)
    }
    const f: RequirementFlags = {}
    for (const [param, key] of Object.entries(PARAM_FLAG)) {
      if (p.get(param) === '1') f[key] = true
    }
    setFlags(f)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const p = new URLSearchParams()
    if (scenarioId) p.set('s', scenarioId)
    if (variantId) p.set('v', variantId)
    for (const key of FLAG_ORDER) {
      if (flags[key]) p.set(FLAG_PARAM[key], '1')
    }
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `/find?${qs}` : '/find')
  }, [scenarioId, variantId, flags, hydrated])

  const scenario = useMemo(
    () => scenarios.find((s) => s.id === scenarioId) ?? null,
    [scenarioId]
  )

  /**
   * 子情境解析后的场景：权重与硬要求都按子情境覆盖过。
   * 引擎拿到的应该是这个合并结果，而不是场景本身 ——
   * 否则子情境只是界面上多一个选项，实际算出来的结果完全一样。
   */
  const resolved = useMemo(
    () => (scenario ? resolveScenario(scenario, variantId) : null),
    [scenario, variantId]
  )

  const recommendation = useMemo(
    () =>
      resolved
        ? recommend(resolved.rule, flags, tools, { promptTemplates })
        : null,
    [resolved, flags]
  )

  const stepLabels = ['你要做什么', '具体是哪种', '补充条件', '推荐结果']

  /** 场景没有子情境时第 2 步会自动跳过，不让用户卡在空页面上 */
  const hasVariants = Boolean(scenario && variantsOf(scenario).length > 0)

  /**
   * 步骤条始终显示 4 步。
   *
   * 原来按 hasVariants 过滤成 3 步，问题是用户一开始就看不到还有「选细分」这一步，
   * 等选完场景后步骤条突然多出一段，界面像是变了。用户提前知道有这一步、
   * 选任务时心里有数，比少显示一步更好。
   */
  const effectiveSteps = stepLabels

  function pickScenario(id: string) {
    setScenarioId(id)
    setVariantId('')
    const next = scenarios.find((s) => s.id === id)
    setStep(next && variantsOf(next).length > 0 ? 1 : 2)
  }

  function resetAll() {
    setScenarioId('')
    setVariantId('')
    setFlags({})
    setStep(0)
  }

  return (
    <div>
      {/* 步骤条 */}
      <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="决策流程">
        {effectiveSteps.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (i === 0) setStep(0)
                else if (i === 1 && scenarioId) setStep(1)
                else if (i === 2 && scenarioId) setStep(2)
                else if (i === 3 && scenarioId) setStep(3)
              }}
              disabled={
                (i > 0 && !scenarioId) ||
                (i === 2 && !scenarioId) ||
                (i === 3 && !scenarioId) ||
                (i === 1 && !hasVariants)
              }
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 transition-colors',
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                (i > 0 && !scenarioId) || (i === 1 && !hasVariants)
                  ? 'cursor-not-allowed opacity-40'
                  : ''
              )}
            >
              <span className="tabular-nums">{i + 1}</span>
              {label}
            </button>
            {i < effectiveSteps.length - 1 ? (
              <ArrowRight className="h-3 w-3 text-muted-foreground" aria-hidden />
            ) : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <StepOne
          scenarios={scenarios}
          onSelect={pickScenario}
          flags={flags}
          flagsByScenario={countHardFiltersByScenario}
        />
      ) : null}

      {step === 1 && scenario && hasVariants ? (
        <StepVariant
          rule={scenario}
          selected={variantId}
          onSelect={(id) => {
            setVariantId(id)
            setStep(2)
          }}
          onSkip={() => {
            setVariantId('')
            setStep(2)
          }}
          onBack={() => setStep(0)}
        />
      ) : null}

      {step === 2 && scenario && resolved ? (
        <StepTwo
          flags={flags}
          variantCount={variantsOf(scenario).length}
          onChange={setFlags}
          onBack={() => setStep(hasVariants ? 1 : 0)}
          onSubmit={() => setStep(3)}
          onReset={() => {
            setFlags({})
            setStep(3)
          }}
        />
      ) : null}

      {step === 3 && scenario && resolved && recommendation ? (
        <StepThree
          /* 决策器「走完四步看到结果」是最关键的使用信号：
             它说明这个功能真的解决了问题，而不只是被打开过。
             声明式埋点，不改动任何流程逻辑。 */
          data-track="wizard_complete"
          rule={resolved.rule}
          variantLabel={
            resolved.variant ? resolved.variant.label : null
          }
          recommendation={recommendation}
          caseItems={caseItems}
          onBack={() => setStep(2)}
          onChangeVariant={() => setStep(1)}
          onChangeScenario={resetAll}
        />
      ) : null}
    </div>
  )
}

/**
 * 算出每个场景在「当前已勾条件」下还剩几个候选。
 *
 * 用途：场景卡片上直接标出「按你已勾的条件，仅剩几个工具符合」。
 * 这是硬门槛最实际的后果 —— 用户要到第 4 步才发现「没有工具同时满足」，
 * 那时候已经白选了三次。提前标出来，他可以换个任务或者放开条件。
 */
function countHardFiltersByScenario(
  flags: RequirementFlags,
  rule: ScenarioRule,
  allTools: Tool[]
): number {
  let pool = allTools
  if (flags.chinaDirect) pool = pool.filter((t) => t.chinaAccessible)
  if (flags.privacySensitive) pool = pool.filter(isLocalOnly)
  if (flags.mustBeFree) {
    pool = pool.filter(
      (t) => t.pricing.model === 'free' || t.pricing.model === 'open-source'
    )
  }
  const required = rule.requiredCapabilities ?? []
  if (required.length === 0) return pool.length
  return pool.filter((t) =>
    required.every(
      (r) => (t.capabilities[r.key]?.score ?? 0) >= (r.minRequiredScore ?? 3)
    )
  ).length
}

/** ---------- 第 1 步：按分组选任务 ---------- */

function StepOne({
  scenarios,
  onSelect,
  flags,
  flagsByScenario,
}: {
  scenarios: ScenarioRule[]
  onSelect: (id: string) => void
  flags: RequirementFlags
  flagsByScenario: (
    flags: RequirementFlags,
    rule: ScenarioRule,
    tools: Tool[]
  ) => number
}) {
  const hasHardFlag = FLAG_ORDER.some((k) => FLAG_KIND[k] === 'hard' && flags[k])

  return (
    <div>
      <h2 className="text-lg font-semibold">你现在想用 AI 做什么？</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        先选一个大类任务。下面每个任务下面还有更细的子情境，选完再挑 —— 比如「写代码」
        用来读旧模块和用来写新功能，该看重的维度不一样。
      </p>

      <div className="mt-6 space-y-7">
        {SCENARIO_GROUPS.map((group) => {
          const items = scenarios.filter((s) => s.group === group.id)
          if (items.length === 0) return null
          return (
            <section key={group.id}>
              <div className="mb-3 flex items-baseline gap-3">
                <h3 className="text-sm font-semibold">{group.label}</h3>
                <p className="text-xs text-muted-foreground">{group.hint}</p>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((s) => {
                  const left = flagsByScenario(flags, s, tools)
                  const blocked = hasHardFlag && left === 0
                  const variantCount = variantsOf(s).length
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSelect(s.id)}
                      className={cn(
                        'group flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors',
                        blocked
                          ? 'border-dashed opacity-70 hover:opacity-100'
                          : 'hover:border-primary/50 hover:bg-accent/30'
                      )}
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon name={s.icon} className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline gap-2">
                          <span className="text-sm font-semibold">{s.label}</span>
                          {variantCount > 0 ? (
                            <span className="text-xs text-muted-foreground">
                              {variantCount} 种细分
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {s.description}
                        </span>
                        {hasHardFlag ? (
                          <span
                            className={cn(
                              'mt-1.5 inline-block rounded px-1.5 py-0.5 text-xs',
                              blocked
                                ? 'bg-danger/10 text-danger'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            按你已勾的条件，仅 {left} 个工具符合
                          </span>
                        ) : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

/** ---------- 第 2 步：选子情境 ---------- */

function StepVariant({
  rule,
  selected,
  onSelect,
  onSkip,
  onBack,
}: {
  rule: ScenarioRule
  selected: string
  onSelect: (id: string) => void
  onSkip: () => void
  onBack: () => void
}) {
  const variants = variantsOf(rule)

  return (
    <div>
      <h2 className="text-lg font-semibold">「{rule.label}」具体是哪种活儿？</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        同一个大类里，差别很实在：读旧模块要的是读得全，从零写要的是跑得起来。
        选一个更贴近的，推荐结果会明显不同。
      </p>

      <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {variants.map((v) => (
          <li key={v.id}>
            <button
              type="button"
              onClick={() => onSelect(v.id)}
              aria-pressed={selected === v.id}
              className={cn(
                'flex h-full w-full flex-col rounded-xl border p-3.5 text-left transition-colors',
                selected === v.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:border-primary/40 hover:bg-accent/30'
              )}
            >
              <span className="flex items-baseline gap-2">
                <span className="text-sm font-semibold">{v.label}</span>
              </span>
              <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
                {v.hint}
              </span>
              <WeightDelta rule={rule} weights={v.weights} />
            </button>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onSkip} variant={selected ? 'outline' : 'default'}>
          {selected ? '换个细分' : '不确定，用通用配置'}
        </Button>
        <Button variant="ghost" onClick={onBack}>
          上一步
        </Button>
      </div>
    </div>
  )
}

/**
 * 把「这条子情境改了哪些权重」直接写出来。
 *
 * 为什么必须显示而不是藏起来：子情境的唯一作用就是改权重。
 * 只给一句「推荐更准」的话，用户没法判断该选哪个，
 * 也无法自己复核 —— 本站承诺推荐可质疑，那么依据就得摊开。
 */
function WeightDelta({
  rule,
  weights,
}: {
  rule: ScenarioRule
  weights: Partial<Record<CapabilityKey, number>>
}) {
  const entries = Object.entries(weights) as [CapabilityKey, number][]
  const deltas = entries
    .map(([key, v]) => {
      const base = rule.weights[key] ?? 0
      return { key, label: capabilityLabel(key), delta: v - base, value: v }
    })
    .filter((d) => Math.abs(d.delta) >= 0.05)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  if (deltas.length === 0) return null

  return (
    <span className="mt-2.5 block border-t border-hairline pt-2">
      <span className="block text-xs text-muted-foreground">相比通用配置</span>
      <span className="mt-1 flex flex-wrap gap-1">
        {deltas.map((d) => (
          <span
            key={d.key}
            className={cn(
              'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs',
              d.delta > 0
                ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground'
            )}
            title={`权重 ${d.value}`}
          >
            {d.label}
            {d.delta > 0 ? '↑' : '↓'}
          </span>
        ))}
      </span>
    </span>
  )
}

/** ---------- 第 3 步：补充条件 ---------- */

function StepTwo({
  flags,
  variantCount,
  onChange,
  onBack,
  onSubmit,
  onReset,
}: {
  flags: RequirementFlags
  variantCount: number
  onChange: (f: RequirementFlags) => void
  onBack: () => void
  onSubmit: () => void
  onReset: () => void
}) {
  const hard = FLAG_ORDER.filter((k) => FLAG_KIND[k] === 'hard')
  const soft = FLAG_ORDER.filter((k) => FLAG_KIND[k] === 'soft')

  return (
    <div>
      <h2 className="text-lg font-semibold">补充条件（可多选，也可跳过）</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        条件分两类，影响完全不同：
        <strong className="font-medium text-foreground">硬门槛</strong>
        不满足就直接把工具剔掉，
        <strong className="font-medium text-foreground">加减分</strong>
        只影响排序、最多 ±{ADJUST_CAP} 分。
      </p>

      <ConditionGroup
        title="硬门槛（不满足会被直接剔除）"
        note={`勾上之后候选工具可能骤减。第 1 步的卡片上会实时显示每个任务还剩几个工具符合。
              提醒：「数据不能出本机」全站只有 ${countLocalOnly(tools)} 个工具满足 —— 可自己部署的工具本来就少，
              勾了基本等于放弃其他工具，这是事实而不是筛选出错。`}
        keys={hard}
        flags={flags}
        onChange={onChange}
      />

      <ConditionGroup
        title="加减分（只影响排序，不会剔除任何工具）"
        note="这些条件不会让候选变少，只让某些工具排得更前。"
        keys={soft}
        flags={flags}
        onChange={onChange}
      />

      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onSubmit}>看推荐结果</Button>
        <Button variant="outline" onClick={onReset}>
          不加条件，直接看
        </Button>
        <Button variant="ghost" onClick={onBack}>
          上一步
        </Button>
      </div>

      {variantCount > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          提示：还没挑细分任务的话，现在回去选会让结果更准。
        </p>
      ) : null}
    </div>
  )
}

function ConditionGroup({
  title,
  note,
  keys,
  flags,
  onChange,
}: {
  title: string
  note: string
  keys: FlagKey[]
  flags: RequirementFlags
  onChange: (f: RequirementFlags) => void
}) {
  return (
    <section className="mt-6">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {keys.map((key) => {
          const checked = Boolean(flags[key])
          return (
            <label
              key={key}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors',
                checked ? 'border-primary bg-primary/5' : 'hover:border-primary/40'
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange({ ...flags, [key]: e.target.checked || undefined })}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span>
                <span className="block text-sm font-medium">{FLAG_LABELS[key]}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {FLAG_HINTS[key]}
                </span>
              </span>
            </label>
          )
        })}
      </div>
    </section>
  )
}

/** ---------- 第 4 步：结果 ---------- */

function StepThree({
  rule,
  variantLabel,
  recommendation,
  caseItems,
  onBack,
  onChangeVariant,
  onChangeScenario,
}: {
  rule: ScenarioRule
  variantLabel: string | null
  recommendation: ReturnType<typeof recommend>
  caseItems: CaseListItem[]
  onBack: () => void
  onChangeVariant: () => void
  onChangeScenario: () => void
}) {
  const { primary, alternates, workflow, promptTemplate, pitfalls } = recommendation

  if (!primary) {
    return (
      <div className="border-y border-dashed border-border py-10 text-center">
        <p className="text-sm font-medium">当前条件下没有工具同时满足全部硬性要求</p>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          最可能的原因是同时勾选了互相冲突的条件（例如「必须免费」+「数据不能上传云端」+「要能出成品文件」）。
          建议放开其中一条。
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button variant="outline" onClick={onBack}>
            调整条件
          </Button>
          <Button onClick={onChangeScenario}>
            换个任务
          </Button>
        </div>
      </div>
    )
  }

  const recommendedToolIds = [primary.tool.id, ...alternates.map((a) => a.tool.id)]
  const templateTools = recommendedToolIds
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is Tool => Boolean(t))

  // 「这个工具在真实场景里怎么用」：按工具 id 关联案例库。
  // 这里不做更聪明的匹配 —— 案例只记了用了哪些工具，没记属于哪个场景，
  // 硬凑场景相关度会给出误导性的关联。界面上也照实写明是按工具关联。
  const relatedCases = caseItems
    .filter((c) => c.tools.includes(primary.tool.id))
    .slice(0, 3)

  return (
    <div className="space-y-8">
      {/* 结果口径：先说清「这是按什么算出来的」 */}
      <div className="rounded-xl border bg-muted/30 px-4 py-3">
        <p className="text-sm">
          <span className="font-medium">场景：{rule.label}</span>
          {variantLabel ? (
            <>
              <span className="text-muted-foreground"> · </span>
              <span className="text-muted-foreground">细分：{variantLabel}</span>
            </>
          ) : (
            <span className="text-muted-foreground">（未选细分，用通用配置）</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          适配分 = 场景权重归一化后 × 工具的 14 维能力分，再按你勾的条件加减分。
          同样的输入永远得到同样的结果，欢迎自己验证和反驳。
        </p>
      </div>

      {/* 首选 */}
      <section>
        <SectionLabel icon={<Sparkles className="h-4 w-4" aria-hidden />}>首选</SectionLabel>
        <RecommendationCard explanation={primary} rank={1} rule={rule} highlight />
      </section>

      {/* 备选：每个都说明「为什么不是它」 */}
      {alternates.length > 0 ? (
        <section>
          <SectionLabel icon={<Minus className="h-4 w-4" aria-hidden />}>
            备选，以及每个差在哪
          </SectionLabel>
          <div className="grid gap-4 md:grid-cols-2">
            {alternates.map((alt, i) => (
              <div key={alt.tool.id} className="space-y-2">
                <RecommendationCard
                  explanation={alt}
                  rank={i + 2}
                  rule={rule}
                  tradeoff={compareWithWinner(primary, alt)}
                />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* 组合工作流 */}
      {workflow.length > 0 ? (
        <section>
          <SectionLabel icon={<Layers className="h-4 w-4" aria-hidden />}>
            组合工作流（单个工具搞不定时）
          </SectionLabel>
          <ol className="space-y-3">
            {workflow.map((step) => (
              <li key={step.step} className="flex gap-3 border-t border-hairline pt-4">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {step.step}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{step.action}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    主力维度：{step.capabilityLabel}
                  </p>
                </div>
                <Link
                  href={`/tools/${step.tool.id}`}
                  className="flex shrink-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-xs hover:bg-accent"
                >
                  <ToolLogo
                    src={step.tool.logo}
                    alt=""
                    size={22}
                    className="border-0 bg-transparent p-0"
                  />
                  {step.tool.name}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {/* 现成提示词 */}
      {promptTemplate ? (
        <section>
          <SectionLabel>现成提示词（复制后替换变量即可）</SectionLabel>
          <PromptBlock
            template={promptTemplate}
            tools={templateTools}
            defaultToolId={primary.tool.id}
          />
        </section>
      ) : null}

      {/* 避坑 */}
      {pitfalls.length > 0 ? (
        <section>
          <SectionLabel icon={<AlertTriangle className="h-4 w-4" aria-hidden />}>
            这个场景下最容易犯的错
          </SectionLabel>
          <ul className="space-y-2">
            {pitfalls.map((p) => (
              <li
                key={p}
                className="flex gap-2 border-l-2 border-amber-500/50 bg-amber-500/5 p-3 text-sm leading-6"
              >
                <span
                  aria-hidden
                  className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-amber-600 dark:bg-amber-400"
                />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 真实案例：把抽象推荐落到具体做法上 */}
      {relatedCases.length > 0 ? (
        <section>
          <SectionLabel>用这个工具的实际做法</SectionLabel>
          <p className="mb-3 text-xs text-muted-foreground">
            下面是案例库里用到过「{primary.tool.name}」的场景，包含踩过的坑。
            案例按「用了这个工具」关联，不是按场景相似度推荐。
          </p>
          <ul className="grid gap-3 md:grid-cols-3">
            {relatedCases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/cases/${c.id}`}
                  className="block h-full rounded-xl border p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/30"
                >
                  <span className="block text-xs text-muted-foreground">
                    {c.industry} · {c.role}
                  </span>
                  <span className="mt-1 block text-sm font-medium leading-6">{c.title}</span>
                  <span className="mt-2 block text-xs leading-5 text-muted-foreground">
                    {c.summary}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button variant="outline" onClick={onBack}>
          调整条件
        </Button>
        <Button variant="ghost" onClick={onChangeVariant}>
          换个细分
        </Button>
        <Button variant="ghost" onClick={onChangeScenario}>
          换个任务
        </Button>
        <Link
          href={`/compare?ids=${recommendedToolIds.slice(0, 3).join(',')}`}
          className="inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition-colors hover:bg-accent"
        >
          把这几个放在一起对比
          <ArrowRight className="ml-1 h-3 w-3" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

function SectionLabel({
  children,
  icon,
}: {
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}
      {children}
    </h2>
  )
}

/** ---------- 工具推荐卡 ---------- */

function RecommendationCard({
  explanation,
  rank,
  rule,
  highlight,
  tradeoff,
}: {
  explanation: ToolExplanation
  rank: number
  rule: ScenarioRule
  highlight?: boolean
  tradeoff?: ReturnType<typeof compareWithWinner>
}) {
  const tool = explanation.tool
  const topMatched = explanation.matched.filter((m) => m.weight > 0).slice(0, 5)

  return (
    <article
      className={cn(
        'media-card spotlight h-full',
        // 首选不用填充色，改用高亮描边 —— 避免"推荐位 = 一块彩色"的廉价感
        highlight && 'border-primary/45 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]'
      )}
    >
      <CoverArt
        id={`${tool.id}-${rule.id}`}
        eyebrow={`${rule.label} · 适配分 ${explanation.score}`}
        index={rank}
        tools={[{ id: tool.id, name: tool.name, logo: tool.logo }]}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-baseline gap-2 text-base font-semibold">
              <Link href={`/tools/${tool.id}`} className="hover:text-primary">
                {tool.name}
              </Link>
              <span className="text-xs font-normal text-muted-foreground">{tool.vendor}</span>
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{tool.tagline}</p>
          </div>
          <span className="shrink-0 text-right">
            <span className="block text-xs text-muted-foreground">场景适配分</span>
            <ScoreBadge score={explanation.score} showMax label="场景适配分" />
          </span>
        </div>

        <div className="mt-4 border-t border-hairline pt-4">
          <p className="eyebrow">{highlight ? '为什么是它' : '它的强项'}</p>
          <ul className="mt-2 space-y-1.5">
            {explanation.reasons.map((r) => (
              <li key={r} className="flex gap-2 text-sm leading-6 text-foreground/85">
                <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-score-4" aria-hidden />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 为什么不是它 —— 只在备选上出现 */}
        {tradeoff ? <TradeoffBlock tradeoff={tradeoff} winnerName={null} /> : null}

        {/* 命中的能力维度 */}
        <div className="mt-4">
          <p className="eyebrow">命中的能力维度（按场景权重）</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {topMatched.map((m) => (
              <li
                key={m.key}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground"
                title={`权重 ${m.weight}，贡献 ${m.contribution} 分`}
              >
                <ScoreDot score={m.score} />
                <span>{m.label}</span>
                <span className="tabular-nums">{m.score}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 条件命中与扣分 */}
        {explanation.satisfiedFlags.length > 0 || explanation.violatedFlags.length > 0 ? (
          <div className="mt-4 space-y-1.5">
            {explanation.satisfiedFlags.map((f) => (
              <p
                key={f}
                className="flex gap-2 text-xs leading-5 text-emerald-700 dark:text-emerald-300"
              >
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {f}
              </p>
            ))}
            {explanation.violatedFlags.map((f) => (
              <p key={f} className="flex gap-2 text-xs leading-5 text-danger">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                {f}
              </p>
            ))}
          </div>
        ) : null}

        {/* 不适用 */}
        {explanation.missed.length > 0 ? (
          <div className="mt-3 rounded-lg bg-danger/5 p-3">
            <p className="text-xs font-semibold text-danger">硬性要求未满足</p>
            <ul className="mt-1 space-y-1 text-xs text-foreground/80">
              {explanation.missed.map((m) => (
                <li key={m.key}>{m.reason}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
          <a
            href={tool.officialUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            打开官网
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
          <Link
            href={`/tools/${tool.id}`}
            className="inline-flex h-8 items-center rounded-full border px-3.5 text-xs font-medium transition-colors hover:bg-accent"
          >
            能力详情
          </Link>
          <span className="ml-auto text-xs text-muted-foreground">
            适配分 {explanation.score}/5
          </span>
        </div>
      </div>
    </article>
  )
}

/**
 * 「为什么不是首选」。
 *
 * 这块是这次改动里最该被审的部分。原来结果页只讲「为什么是它」，
 * 备选看起来像凑数。用户真正想知道的是第二个到底差在哪、能不能就用它。
 * 所以把差距拆到维度上，并明确说「差分是这一项的差，不是整体差」。
 */
function TradeoffBlock({
  tradeoff,
  winnerName,
}: {
  tradeoff: ReturnType<typeof compareWithWinner>
  winnerName: string | null
}) {
  return (
    <div className="mt-4 rounded-lg border border-dashed p-3">
      <p className="eyebrow flex items-center gap-1.5">
        <Scale className="h-3.5 w-3.5" aria-hidden />
        为什么不是首选
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground/85">{tradeoff.verdict}</p>

      {tradeoff.gaps.length > 0 ? (
        <ul className="mt-2.5 space-y-1">
          {tradeoff.gaps.map((g) => (
            <li key={g.key} className="flex items-baseline gap-2 text-xs text-muted-foreground">
              <span className="w-20 shrink-0 text-foreground/80">{g.label}</span>
              <span className="tabular-nums">
                {g.theirs} → {g.winner}
              </span>
              <span className="tabular-nums text-danger">-{g.costPoints}</span>
              <span className="ml-auto shrink-0 text-xs">
                权重 {Math.round(g.weight * 100)}%
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {tradeoff.advantages.length > 0 ? (
        <p className="mt-2.5 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
          它在这些方面更强：
          {tradeoff.advantages
            .slice(0, 3)
            .map((a) => `${a.label} ${a.theirs}/5`)
            .join('、')}
          —— 这个场景不太吃这些维度，换个场景它可能反而更合适。
        </p>
      ) : null}

      {winnerName ? <span className="sr-only">{winnerName}</span> : null}
    </div>
  )
}

/** 供页面说明用的权重表（静态渲染，避免把权重藏成黑盒） */
export function ScenarioWeightTable({ rules }: { rules: ScenarioRule[] }) {
  const keys = Array.from(
    new Set(rules.flatMap((r) => Object.keys(r.weights)))
  ) as CapabilityKey[]
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[56rem] border-collapse text-sm">
        <caption className="sr-only">各场景的能力维度权重表</caption>
        <thead>
          <tr className="border-b bg-muted/40">
            <th scope="col" className="px-3 py-2 text-left font-medium">
              场景
            </th>
            {keys.map((k) => (
              <th key={k} scope="col" className="px-3 py-2 text-right font-medium">
                {capabilityLabel(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-medium">
                {r.label}
                {variantsOf(r).length > 0 ? (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    +{variantsOf(r).length} 细分
                  </span>
                ) : null}
              </th>
              {keys.map((k) => {
                const w = r.weights[k]
                return (
                  <td key={k} className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {typeof w === 'number' ? w.toFixed(2) : '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
