import { toTenPointScore } from '@/lib/display-score'
import Link from 'next/link'
import { BenchmarkTag } from '@/components/benchmark-evidence'
import { ExternalLink, FileSearch } from 'lucide-react'
import type { CompareTool as Tool } from '@/lib/compare-tool'
import {
  CAPABILITY_META,
  capabilityDescription,
  capabilityLabel,
  computeEvidenceCoverage,
} from '@/lib/score'
import {
  CATEGORY_LABELS,
  LATENCY_LABELS,
  PLATFORM_LABELS,
  RISK_LABELS,
  STABILITY_LABELS,
} from '@/lib/site'
import { ToolLogo } from '@/components/tool-logo'
import { ScoreBadge } from '@/components/score-badge'
import { CapabilityRating } from '@/components/capability-rating'
import { UpdatedBadge } from '@/components/updated-badge'

/** 横向对比表：首列固定，可横向滚动 */
export function CompareTable({ tools }: { tools: Tool[] }) {
  const best = (values: number[]) => Math.max(...values)

  return (
    <div className="space-y-10">
      <section>
        <h2 className="eyebrow mb-3">基础信息</h2>
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="工具对比表，可横向滚动查看全部列"
        >
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">{tools.map((t) => t.name).join('、')} 的逐项对比</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-28 bg-card px-3 py-3 text-left text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground"
                >
                  对比项
                </th>
                {tools.map((t) => (
                  <th
                    key={t.id}
                    scope="col"
                    className="min-w-[190px] px-3 py-3 text-left align-bottom"
                  >
                    <span className="flex items-center gap-2">
                      <ToolLogo src={t.logo} alt={`${t.name} 标志`} size={30} />
                      <span className="min-w-0">
                        <Link
                          href={`/tools/${t.id}`}
                          className="block font-semibold hover:text-primary"
                        >
                          {t.name}
                        </Link>
                        <span className="block text-xs font-normal text-muted-foreground">
                          {t.vendor}
                        </span>
                      </span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <Row
                label="一句话定位"
                tools={tools}
                render={(t) => <span className="text-muted-foreground">{t.tagline}</span>}
              />
              <Row
                label="公开实测"
                tools={tools}
                highlight
                render={(t) => <BenchmarkTag evidence={t.benchmark} />}
              />
              <Row
                label="分类"
                tools={tools}
                render={(t) => t.categories.map((c) => CATEGORY_LABELS[c]).join(' / ')}
              />
              <Row
                label="中文能力"
                tools={tools}
                render={(t) => <ScoreBadge score={t.chineseQuality} />}
                isBest={(t) => t.chineseQuality === best(tools.map((x) => x.chineseQuality))}
              />
              <Row
                label="大陆可直连"
                tools={tools}
                render={(t) => (
                  <span
                    className={
                      t.chinaAccessible ? 'text-emerald-700 dark:text-emerald-300' : 'text-score-1'
                    }
                  >
                    {t.chinaAccessible ? '是' : '否（需借助网络工具）'}
                  </span>
                )}
              />
              <Row label="免费额度" tools={tools} render={(t) => t.pricing.freeTier} />
              <Row
                label="付费起步价"
                tools={tools}
                render={(t) => t.pricing.paidFrom ?? '无需付费'}
              />
              <Row label="上下文窗口" tools={tools} render={(t) => t.contextWindow ?? '—'} />
              <Row
                label="多模态"
                tools={tools}
                render={(t) =>
                  [
                    t.multimodal.text && '文本',
                    t.multimodal.image && '图片',
                    t.multimodal.audio && '音频',
                    t.multimodal.video && '视频',
                    t.multimodal.file && '文件',
                  ]
                    .filter(Boolean)
                    .join(' / ')
                }
              />
              <Row
                label="幻觉风险"
                tools={tools}
                render={(t) => RISK_LABELS[t.hallucinationRisk]}
                isBest={(t) => riskRank(t.hallucinationRisk) === 0}
              />
              <Row label="响应速度" tools={tools} render={(t) => LATENCY_LABELS[t.latency]} />
              <Row label="稳定性" tools={tools} render={(t) => STABILITY_LABELS[t.stability]} />
              <Row
                label="支持平台"
                tools={tools}
                render={(t) => t.platforms.map((p) => PLATFORM_LABELS[p]).join('、')}
              />
              <Row label="有 API" tools={tools} render={(t) => (t.hasApi ? '有' : '无')} />
              <Row
                label="数据更新于"
                tools={tools}
                render={(t) => <UpdatedBadge date={t.updatedAt} />}
              />
              <Row
                label="最该避免的用法"
                tools={tools}
                render={(t) => <span className="text-score-1">{t.avoidFor[0]}</span>}
              />
              <Row
                label=""
                tools={tools}
                render={(t) => (
                  <a
                    href={t.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    官网
                    <ExternalLink className="h-3 w-3" aria-hidden />
                  </a>
                )}
              />
            </tbody>
          </table>
        </div>
      </section>

      {/* 14 维逐项对比 */}
      <section>
        <h2 className="text-lg font-semibold">14 项能力：各工具擅长什么？</h2>
        <p className="mb-4 mt-2 text-sm leading-6 text-muted-foreground">
          每行比较同一项能力。直接看能力等级和参考分；“本项较高”仅比较当前所选工具。
          这些是本站编辑能力参考，按 0–10 分档展示；最新模型的公开实测请看上方“公开实测”。
        </p>
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="14 个能力维度对比表，可横向滚动查看全部列"
        >
          <table className="w-full border-collapse text-sm" data-capability-comparison>
            <caption className="sr-only">14 个能力维度逐项对比</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 min-w-[140px] bg-card px-4 py-3 text-left text-sm font-medium"
                >
                  能力维度
                </th>
                {tools.map((t) => (
                  <th
                    key={t.id}
                    scope="col"
                    className="min-w-[190px] whitespace-nowrap px-4 py-3 text-center text-sm font-semibold"
                  >
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITY_META.map((meta) => {
                const values = tools.map((t) => t.capabilities[meta.key]?.score ?? 0)
                const top = Math.max(...values)
                const leaders = values.filter((value) => value === top).length
                return (
                  <tr key={meta.key} className="border-t border-hairline">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 min-w-[140px] max-w-xs bg-card px-3 py-3 text-left font-normal"
                      title={capabilityDescription(meta.key)}
                    >
                      <span className="whitespace-nowrap font-medium">{meta.label}</span>
                      <span className="mt-1 flex flex-wrap gap-x-1 text-xs text-muted-foreground">
                        {capabilityDescription(meta.key)
                          .split(/[、/]/)
                          .map((part) => (
                            <span key={part} className="whitespace-nowrap">
                              {part.trim()}
                            </span>
                          ))}
                      </span>
                    </th>
                    {tools.map((t) => {
                      const score = t.capabilities[meta.key]?.score ?? 0
                      const basis = t.capabilities[meta.key]?.basis
                      return (
                        <td key={t.id} className="px-3 py-3 align-top">
                          <CapabilityRating
                            score={t.capabilities[meta.key]?.score}
                            emphasis={
                              top > 0 && tools.length > 1 && score === top && leaders < tools.length
                                ? leaders > 1
                                  ? '并列本项较高'
                                  : '本项较高'
                                : undefined
                            }
                          />
                          <details className="mx-auto mt-1 max-w-xs text-left text-xs leading-6 text-muted-foreground">
                            <summary className="cursor-pointer py-1">查看能力依据</summary>
                            <p className="pb-2">
                              {basis?.trim() || '暂无文字依据，请先用自己的任务试用。'}
                            </p>
                          </details>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 逐维度依据：横向对比时最容易忽略「这个分数凭什么」，所以放在同一处展开 */}
      <section>
        <details className="border-y border-hairline">
          <summary className="flex cursor-pointer items-center gap-2 py-3 text-sm font-medium">
            <FileSearch className="h-4 w-4 text-primary" aria-hidden />
            汇总查看各工具的能力依据
          </summary>
          <div className="space-y-6 border-t border-hairline py-5">
            {tools.map((t) => {
              const cov = computeEvidenceCoverage(t.capabilities)
              return (
                <div key={t.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/tools/${t.id}`}
                      className="text-sm font-semibold hover:text-primary"
                    >
                      {t.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      依据覆盖 {cov.covered}/{cov.total}
                    </span>
                  </div>
                  <dl className="mt-2 divide-y divide-hairline border-t border-hairline">
                    {CAPABILITY_META.map((meta) => {
                      const cap = t.capabilities[meta.key]
                      const score = cap?.score ?? 0
                      return (
                        <div
                          key={meta.key}
                          className="grid gap-1 py-2 sm:grid-cols-[6rem_3rem_1fr] sm:gap-3"
                        >
                          <dt className="text-sm text-muted-foreground">
                            {capabilityLabel(meta.key)}
                          </dt>
                          <dd className="text-sm tabular-nums">{toTenPointScore(score)}/10</dd>
                          <dd className="text-xs leading-5 text-muted-foreground">
                            {cap?.basis?.trim() || '（未写依据）'}
                          </dd>
                        </div>
                      )
                    })}
                  </dl>
                </div>
              )
            })}
          </div>
        </details>
      </section>

      <p className="text-xs leading-6 text-muted-foreground">
        同档表示当前资料中的能力等级相同，不代表实际体验完全一致。参考分用于按任务比较，不能作为所有模型的统一实测排名；
        请结合能力依据、公开实测、费用和使用条件选择。
      </p>
    </div>
  )
}

function riskRank(risk: 'low' | 'medium' | 'high'): number {
  return { low: 0, medium: 1, high: 2 }[risk]
}

function Row<T>({
  label,
  tools,
  render,
  isBest,
  highlight,
}: {
  label: string
  tools: T[]
  render: (tool: T) => React.ReactNode
  /** 该行是否最优（用于加粗提示），由调用方按语义判断 */
  isBest?: (tool: T) => boolean
  highlight?: boolean
}) {
  return (
    <tr className={`border-t border-hairline ${highlight ? 'bg-accent/30' : ''}`}>
      <th
        scope="row"
        className="sticky left-0 z-10 w-28 bg-card px-3 py-3 align-top text-sm font-normal text-muted-foreground"
      >
        {label}
      </th>
      {tools.map((t, i) => (
        <td
          key={i}
          className={`px-3 py-3 align-top text-sm ${
            isBest?.(t) ? 'font-semibold text-foreground' : 'text-foreground/85'
          }`}
        >
          {render(t)}
        </td>
      ))}
    </tr>
  )
}
