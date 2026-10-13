import Link from 'next/link'
import { ArrowRight, ChevronDown, ListFilter, Scale, Target } from 'lucide-react'
import type { CapabilityKey, ScenarioRule } from '@/data/types'
import { CAPABILITY_META, capabilityLabel } from '@/lib/score'
import { normalizeWeights } from '@/lib/recommend'
import { variantsOf } from '@/lib/scenario-variants'
import { Icon } from '@/components/ui/icon'

export function ScenarioWeightGuide({ rules }: { rules: ScenarioRule[] }) {
  const entries = (rule: ScenarioRule) =>
    Object.entries(normalizeWeights(rule.weights)).sort((a, b) => b[1] - a[1]) as [
      CapabilityKey,
      number,
    ][]
  const percent = (weight: number) => `${Number((weight * 100).toFixed(1))}%`
  const example = rules.find((rule) => rule.id === 'write') ?? rules[0]
  return (
    <div id="recommendation-basis" className="scroll-mt-24 space-y-5" data-scenario-weight-guide>
      <style>
        {
          '[data-weight-task]>summary::-webkit-details-marker{display:none}[data-weight-task][open]>summary>.weight-chevron{transform:rotate(180deg)}'
        }
      </style>
      <div className="rounded-2xl border bg-card p-5 sm:p-6">
        <p className="text-base font-semibold">
          这是按任务选工具的规则，适用于该任务下的所有候选工具。
        </p>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          “场景”就是你要完成的任务；“占比”表示推荐时有多看重这项能力。比例越高，这项能力对排序的影响越大。
          工具自身的能力表现，请到工具对比或工具详情查看。
        </p>
        <ol className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Target,
              title: '1. 选你要做的任务',
              text: '写文章、读文档、做图……任务不同，重点能力也不同。',
            },
            {
              icon: Scale,
              title: '2. 按重点能力比较工具',
              text: '同一个任务下，每个候选工具都使用同一组能力占比。',
            },
            {
              icon: ListFilter,
              title: '3. 结合你的使用条件',
              text: '再考虑免费、直连、隐私等条件，给出首选和备选。',
            },
          ].map(({ icon: Mark, title, text }) => (
            <li key={title} className="rounded-xl bg-accent/40 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Mark size={17} className="shrink-0 text-primary" aria-hidden />
                {title}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
            </li>
          ))}
        </ol>
        {example && (
          <p className="mt-5 rounded-xl border border-primary/20 bg-accent/30 px-4 py-3 text-sm leading-7">
            <strong>例如“{example.label}”： </strong>
            {entries(example)
              .slice(0, 3)
              .map(([key, weight]) => `${capabilityLabel(key)}占 ${percent(weight)}`)
              .join('，')}
            。 因此推荐时会更看重文字表达；切换到“做图”，重点就会转向图像生成。
          </p>
        )}
      </div>
      <div>
        <h3 className="text-base font-semibold">选一个任务，看看推荐时重点比较什么</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          点击任务展开全部占比。选择更具体的任务后，推荐侧重点还会相应调整。
        </p>
        <div className="mt-4 grid items-start gap-3 lg:grid-cols-2">
          {rules.map((rule, index) => (
            <details
              key={rule.id}
              open={index === 0}
              className="rounded-2xl border bg-card"
              data-weight-task={rule.id}
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                  <Icon name={rule.icon} className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block whitespace-nowrap text-sm font-semibold">
                    任务：{rule.label}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-x-1 text-xs leading-5 text-muted-foreground">
                    <span className="whitespace-nowrap">重点看：</span>
                    {entries(rule)
                      .slice(0, 3)
                      .map(([key], item) => (
                        <span key={key} className="whitespace-nowrap">
                          {capabilityLabel(key)}
                          {item < 2 ? '、' : ''}
                        </span>
                      ))}
                  </span>
                </span>
                <ChevronDown
                  size={18}
                  className="weight-chevron shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </summary>
              <div className="border-t px-4 pb-4 pt-3">
                <p className="mb-3 text-xs leading-6 text-muted-foreground">{rule.description}</p>
                <ul className="space-y-2.5">
                  {entries(rule).map(([key, weight]) => (
                    <li key={key} className="flex items-center gap-3 text-sm">
                      <span className="w-20 shrink-0 whitespace-nowrap">
                        {capabilityLabel(key)}
                      </span>
                      <span
                        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full bg-primary/70"
                          style={{ width: `${weight * 100}%` }}
                        />
                      </span>
                      <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-primary">
                        {percent(weight)}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  其余能力不参与此任务的基础排序；选择细分任务后，规则可能调整。
                </p>
              </div>
            </details>
          ))}
        </div>
      </div>
      <details className="rounded-2xl border bg-card p-4 sm:p-5" data-weight-matrix>
        <summary className="cursor-pointer text-sm font-semibold">
          查看完整的“任务 × 能力”占比表
        </summary>
        <p className="mb-3 mt-2 text-xs leading-6 text-muted-foreground">
          每行是一种任务，每列是一项能力。百分比是该项能力在基础推荐计算中的占比；“不参与”表示这一任务不使用该能力计算基础排序。可左右滑动查看全部列。
        </p>
        <div
          className="overflow-x-auto rounded-xl border"
          tabIndex={0}
          role="region"
          aria-label="任务与能力占比表，可左右滚动"
        >
          <table className="w-full border-collapse text-sm" style={{ minWidth: '110rem' }}>
            <caption className="sr-only">所有候选工具共用的任务推荐侧重点</caption>
            <thead>
              <tr className="border-b bg-muted/40">
                <th
                  scope="col"
                  className="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-3 text-left font-semibold"
                >
                  你要完成的任务
                </th>
                {CAPABILITY_META.map(({ key, label }) => (
                  <th
                    key={key}
                    scope="col"
                    className="whitespace-nowrap px-3 py-3 text-right font-medium"
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => {
                const weights = normalizeWeights(rule.weights)
                return (
                  <tr key={rule.id} className="border-b last:border-0">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-3 text-left font-medium"
                    >
                      {rule.label}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {variantsOf(rule).length > 0 && `${variantsOf(rule).length} 种具体任务`}
                      </span>
                    </th>
                    {CAPABILITY_META.map(({ key }) => (
                      <td
                        key={key}
                        className={`whitespace-nowrap px-3 py-3 text-right tabular-nums ${weights[key] ? 'font-medium text-primary' : 'text-muted-foreground'}`}
                      >
                        {weights[key] ? percent(weights[key]) : '不参与'}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </details>
      <p className="text-xs leading-6 text-muted-foreground">
        占比来自本站的任务推荐规则，展示保留一位小数；计算使用原始比例。这不是厂商评分或模型排行榜。发现侧重点不合理，可以
        <Link
          href="/feedback?from=%2Ffind"
          className="ml-1 inline-flex items-center gap-1 text-primary underline underline-offset-4"
        >
          反馈建议
          <ArrowRight size={12} aria-hidden />
        </Link>
        。
      </p>
    </div>
  )
}
