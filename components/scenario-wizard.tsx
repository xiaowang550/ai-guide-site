'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Minus,
  Sparkles,
} from 'lucide-react'
import type {
  CapabilityKey,
  PromptTemplate,
  RequirementFlags,
  ScenarioRule,
  Tool,
} from '@/data/types'
import { FLAG_LABELS, recommend, type ToolExplanation } from '@/lib/recommend'
import { capabilityLabel } from '@/lib/score'
import { promptTemplates } from '@/data/prompts'
import { scenarios } from '@/data/scenarios'
import { tools } from '@/data/tools'
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
  privacySensitive: '数据不能上传云端',
  chinaDirect: '中国大陆不借助工具即可访问',
  needDeliverableFile: '要能直接导出 Word/PPT/Excel',
  noLearningCurve: '网页打开就能用，不想折腾配置',
}

const FLAG_ORDER: FlagKey[] = [
  'chineseFirst',
  'mustBeFree',
  'lowBudget',
  'chinaDirect',
  'needDeliverableFile',
  'privacySensitive',
  'noLearningCurve',
]

export function ScenarioWizard() {
  const [scenarioId, setScenarioId] = useState<string>('')
  const [flags, setFlags] = useState<RequirementFlags>({})
  const [step, setStep] = useState(0)
  const [hydrated, setHydrated] = useState(false)

  // URL 同步：结果可分享（/find?s=write&cn=1&free=1）
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const s = p.get('s')
    if (s && scenarios.some((x) => x.id === s)) {
      setScenarioId(s)
      setStep(2)
    }
    const f: RequirementFlags = {}
    if (p.get('cn') === '1') f.chinaDirect = true
    if (p.get('free') === '1') f.mustBeFree = true
    if (p.get('zh') === '1') f.chineseFirst = true
    if (p.get('privacy') === '1') f.privacySensitive = true
    if (p.get('file') === '1') f.needDeliverableFile = true
    if (p.get('cheap') === '1') f.lowBudget = true
    if (p.get('easy') === '1') f.noLearningCurve = true
    setFlags(f)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const p = new URLSearchParams()
    if (scenarioId) p.set('s', scenarioId)
    if (flags.chinaDirect) p.set('cn', '1')
    if (flags.mustBeFree) p.set('free', '1')
    if (flags.chineseFirst) p.set('zh', '1')
    if (flags.privacySensitive) p.set('privacy', '1')
    if (flags.needDeliverableFile) p.set('file', '1')
    if (flags.lowBudget) p.set('cheap', '1')
    if (flags.noLearningCurve) p.set('easy', '1')
    const qs = p.toString()
    window.history.replaceState(null, '', qs ? `/find?${qs}` : '/find')
  }, [scenarioId, flags, hydrated])

  const scenario = useMemo(
    () => scenarios.find((s) => s.id === scenarioId) ?? null,
    [scenarioId]
  )

  const recommendation = useMemo(
    () => (scenario ? recommend(scenario, flags, tools, { promptTemplates }) : null),
    [scenario, flags]
  )

  const stepLabels = ['你要做什么', '补充条件', '推荐结果']

  return (
    <div>
      {/* 步骤条 */}
      <ol className="mb-6 flex flex-wrap items-center gap-2 text-sm" aria-label="决策流程">
        {stepLabels.map((label, i) => (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (i === 0 || (i === 1 && scenarioId)) setStep(i)
              }}
              disabled={i > 0 && !scenarioId}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors',
                step === i && 'border-primary bg-primary/10 font-medium text-primary',
                step !== i && 'text-muted-foreground hover:text-foreground',
                i > 0 && !scenarioId && 'opacity-40'
              )}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]">
                {i + 1}
              </span>
              {label}
            </button>
            {i < stepLabels.length - 1 ? <span className="text-muted-foreground">→</span> : null}
          </li>
        ))}
      </ol>

      {step === 0 ? (
        <StepOne
          scenarios={scenarios}
          onSelect={(id) => {
            setScenarioId(id)
            setStep(1)
          }}
        />
      ) : null}

      {step === 1 && scenario ? (
        <StepTwo
          flags={flags}
          onChange={setFlags}
          onBack={() => setStep(0)}
          onSubmit={() => setStep(2)}
          onReset={() => {
            setFlags({})
            setStep(2)
          }}
        />
      ) : null}

      {step === 2 && scenario && recommendation ? (
        <StepThree
          rule={scenario}
          recommendation={recommendation}
          onBack={() => setStep(1)}
          onChangeScenario={() => {
            setScenarioId('')
            setFlags({})
            setStep(0)
          }}
        />
      ) : null}

      {step === 2 && !scenario ? (
        <p className="text-sm text-muted-foreground">请先选择一个任务类型。</p>
      ) : null}
    </div>
  )
}

function StepOne({
  scenarios,
  onSelect,
}: {
  scenarios: ScenarioRule[]
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">你现在想用 AI 做什么？</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        选一个最接近的。下面的推荐结果由「场景权重 × 工具能力分」计算得出，不调用任何大模型 API。
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scenarios.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            className="group flex items-start gap-3 border-t border-hairline pt-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/30"
          >
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{s.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                {s.description}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function StepTwo({
  flags,
  onChange,
  onBack,
  onSubmit,
  onReset,
}: {
  flags: RequirementFlags
  onChange: (f: RequirementFlags) => void
  onBack: () => void
  onSubmit: () => void
  onReset: () => void
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold">补充条件（可多选，也可跳过）</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        条件会直接影响排序：勾「必须免费 / 大陆可直连」会直接排除不符合的工具，其余条件为加减分。
      </p>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {FLAG_ORDER.map((key) => {
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
                <span className="mt-0.5 block text-xs text-muted-foreground">{FLAG_HINTS[key]}</span>
              </span>
            </label>
          )
        })}
      </div>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={onSubmit}>看推荐结果</Button>
        <Button variant="outline" onClick={onReset}>
          不加条件，直接看
        </Button>
        <Button variant="ghost" onClick={onBack}>
          上一步
        </Button>
      </div>
    </div>
  )
}

function StepThree({
  rule,
  recommendation,
  onBack,
  onChangeScenario,
}: {
  rule: ScenarioRule
  recommendation: ReturnType<typeof recommend>
  onBack: () => void
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

  return (
    <div className="space-y-8">
      {/* 首选 */}
      <section>
        <SectionLabel icon={<Sparkles className="h-4 w-4" aria-hidden />}>首选</SectionLabel>
        <RecommendationCard explanation={primary} rank={1} rule={rule} highlight />
      </section>

      {/* 备选 */}
      {alternates.length > 0 ? (
        <section>
          <SectionLabel icon={<Minus className="h-4 w-4" aria-hidden />}>备选与取舍</SectionLabel>
          <div className="grid gap-4 md:grid-cols-2">
            {alternates.map((alt, i) => (
              <RecommendationCard key={alt.tool.id} explanation={alt} rank={i + 2} rule={rule} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 组合工作流 */}
      {workflow.length > 0 ? (
        <section>
          <SectionLabel>组合工作流（单个工具搞不定时）</SectionLabel>
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
                  <ToolLogo src={step.tool.logo} alt="" size={22} className="border-0 bg-transparent p-0" />
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
          <SectionLabel icon={<AlertTriangle className="h-4 w-4" aria-hidden />}>这个场景下最容易犯的错</SectionLabel>
          <ul className="space-y-2">
            {pitfalls.map((p) => (
              <li key={p} className="flex gap-2 border-l-2 border-amber-500/50 bg-amber-500/5 p-3 text-sm leading-6">
                <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-amber-600 dark:bg-amber-400" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2 border-t pt-5">
        <Button variant="outline" onClick={onBack}>
          调整条件
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

      <p className="text-[11px] leading-5 text-muted-foreground">
        推荐结果由本地规则引擎计算：把场景权重归一化后与工具的 14 维能力分加权，再按你勾选的条件加减分。
        同样的输入永远得到同样的结果，方便你自己验证和反驳。
      </p>
    </div>
  )
}

function SectionLabel({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
      {icon}
      {children}
    </h2>
  )
}

function RecommendationCard({
  explanation,
  rank,
  rule,
  highlight,
}: {
  explanation: ToolExplanation
  rank: number
  rule: ScenarioRule
  highlight?: boolean
}) {
  const tool = explanation.tool
  const topMatched = explanation.matched.filter((m) => m.weight > 0).slice(0, 5)

  return (
    <article
      className={cn(
        'media-card spotlight',
        // 首选不用填充色，改用高亮描边 —— 避免"推荐位 = 一块彩色"的廉价感
        highlight && 'border-primary/45 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]'
      )}
    >
      {/* 封面：工具 logo + 推荐序号（序号即名次，一眼看出首选） */}
      <CoverArt
        id={`${tool.id}-${rule.id}`}
        eyebrow={`${rule.label} · 适配分 ${explanation.score}`}
        index={rank}
        tools={[{ id: tool.id, name: tool.name, logo: tool.logo }]}
      />
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="flex flex-wrap items-baseline gap-2 text-[15px] font-semibold">
              <Link href={`/tools/${tool.id}`} className="hover:text-primary">
                {tool.name}
              </Link>
              <span className="text-xs font-normal text-muted-foreground">{tool.vendor}</span>
            </h3>
            <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{tool.tagline}</p>
          </div>
          <span className="shrink-0 text-right">
            <span className="block text-[11px] text-muted-foreground">场景适配分</span>
            <ScoreBadge score={explanation.score} showMax label="场景适配分" />
          </span>
        </div>

      {/* 为什么是它 */}
      <div className="mt-4 border-t border-hairline pt-4">
        <p className="eyebrow">为什么是它</p>
        <ul className="mt-2 space-y-1.5">
          {explanation.reasons.map((r) => (
            <li key={r} className="flex gap-2 text-sm leading-6 text-foreground/85">
              <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-score-4" aria-hidden />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* 命中的能力维度 */}
      <div className="mt-4">
        <p className="eyebrow">命中的能力维度（按场景权重）</p>
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {topMatched.map((m) => (
            <li
              key={m.key}
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground"
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
            <p key={f} className="flex gap-2 text-xs leading-5 text-emerald-700 dark:text-emerald-300">
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
        <span className="ml-auto text-[11px] text-muted-foreground">
          场景「{rule.label}」适配分 {explanation.score}/5
        </span>
      </div>
      </div>
    </article>
  )
}

/** 供页面说明用的权重表（静态渲染，避免把权重藏成黑盒） */
export function ScenarioWeightTable({ rules }: { rules: ScenarioRule[] }) {
  const keys = Array.from(
    new Set(rules.flatMap((r) => Object.keys(r.weights)))
  ) as CapabilityKey[]
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">各场景的能力维度权重表</caption>
        <thead className="bg-muted/60">
          <tr>
            <th scope="col" className="px-3 py-2 text-left font-medium">
              场景
            </th>
            {keys.map((k) => (
              <th key={k} scope="col" className="px-3 py-2 text-left font-medium">
                {capabilityLabel(k)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} className="border-t">
              <th scope="row" className="px-3 py-2 text-left font-normal">
                {r.label}
              </th>
              {keys.map((k) => (
                <td key={k} className="px-3 py-2 tabular-nums text-muted-foreground">
                  {r.weights[k] ? r.weights[k]!.toFixed(2) : '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export type { PromptTemplate }