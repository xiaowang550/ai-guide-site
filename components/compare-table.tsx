import Link from 'next/link'
import { ExternalLink, FileSearch } from 'lucide-react'
import type { Tool } from '@/data/types'
import {
  CAPABILITY_META,
  capabilityDescription,
  capabilityLabel,
  computeEvidenceCoverage,
} from '@/lib/score'
import { CATEGORY_LABELS, LATENCY_LABELS, PLATFORM_LABELS, RISK_LABELS, STABILITY_LABELS } from '@/lib/site'
import { ToolLogo } from '@/components/tool-logo'
import { ScoreBadge } from '@/components/score-badge'
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
          <caption className="sr-only">
            {tools.map((t) => t.name).join('、')} 的逐项对比
          </caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 w-28 bg-card px-3 py-3 text-left text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground"
              >
                对比项
              </th>
              {tools.map((t) => (
                <th key={t.id} scope="col" className="min-w-[190px] px-3 py-3 text-left align-bottom">
                  <span className="flex items-center gap-2">
                    <ToolLogo src={t.logo} alt={`${t.name} 标志`} size={30} />
                    <span className="min-w-0">
                      <Link href={`/tools/${t.id}`} className="block font-semibold hover:text-primary">
                        {t.name}
                      </Link>
                      <span className="block text-[11px] font-normal text-muted-foreground">
                        {t.vendor}
                      </span>
                    </span>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Row label="一句话定位" tools={tools} render={(t) => <span className="text-muted-foreground">{t.tagline}</span>} />
            <Row
              label="综合分"
              tools={tools}
              highlight
              render={(t) => <ScoreBadge score={t.overallScore} showMax />}
              isBest={(t) => t.overallScore === best(tools.map((x) => x.overallScore))}
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
                <span className={t.chinaAccessible ? 'text-emerald-700 dark:text-emerald-300' : 'text-score-1'}>
                  {t.chinaAccessible ? '是' : '否（需借助网络工具）'}
                </span>
              )}
            />
            <Row
              label="免费额度"
              tools={tools}
              render={(t) => t.pricing.freeTier}
            />
            <Row
              label="付费起步价"
              tools={tools}
              render={(t) => t.pricing.paidFrom ?? '无需付费'}
            />
            <Row
              label="上下文窗口"
              tools={tools}
              render={(t) => t.contextWindow ?? '—'}
            />
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
            <Row label="" tools={tools} render={(t) => (
              <a
                href={t.officialUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                官网
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            )} />
          </tbody>
        </table>
        </div>
      </section>

      {/* 14 维逐项对比 */}
      <section>
        <h2 className="eyebrow mb-3">14 个能力维度逐项对比</h2>
        <div
          className="overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="14 个能力维度对比表，可横向滚动查看全部列"
        >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">14 个能力维度逐项对比</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-card px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">
                能力维度
              </th>
              {tools.map((t) => (
                <th key={t.id} scope="col" className="px-4 py-2.5 text-center text-xs font-medium">
                  {t.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CAPABILITY_META.map((meta) => {
              const values = tools.map((t) => t.capabilities[meta.key]?.score ?? 0)
              const top = Math.max(...values)
              return (
                <tr key={meta.key} className="border-t border-hairline">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 w-28 bg-card px-3 py-2.5 text-left font-normal"
                    title={capabilityDescription(meta.key)}
                  >
                    <span className="font-medium">{meta.label}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {capabilityDescription(meta.key)}
                    </span>
                  </th>
                  {tools.map((t) => {
                    const score = t.capabilities[meta.key]?.score ?? 0
                    const basis = t.capabilities[meta.key]?.basis
                    return (
                      <td key={t.id} className="px-3 py-2.5 text-center">
                        <span
                          title={basis}
                          className={`inline-flex h-7 min-w-[3rem] items-center justify-center rounded-md text-xs font-semibold text-white ${
                            score === top && tools.length > 1 ? 'ring-2 ring-highlight ring-offset-1' : ''
                          }`}
                          style={{
                            backgroundColor: `hsl(var(--score-${score}))`,
                          }}
                        >
                          {score}
                        </span>
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
            这几个分数的依据分别是什么
          </summary>
          <div className="space-y-6 border-t border-hairline py-5">
            {tools.map((t) => {
              const cov = computeEvidenceCoverage(t.capabilities)
              return (
                <div key={t.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/tools/${t.id}`} className="text-sm font-semibold hover:text-primary">
                      {t.name}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">
                      依据覆盖 {cov.covered}/{cov.total}
                    </span>
                  </div>
                  <dl className="mt-2 divide-y divide-hairline border-t border-hairline">
                    {CAPABILITY_META.map((meta) => {
                      const cap = t.capabilities[meta.key]
                      const score = cap?.score ?? 0
                      const top = Math.max(...tools.map((x) => x.capabilities[meta.key]?.score ?? 0))
                      return (
                        <div key={meta.key} className="grid gap-1 py-2 sm:grid-cols-[6rem_3rem_1fr] sm:gap-3">
                          <dt className="text-[13px] text-muted-foreground">
                            {capabilityLabel(meta.key)}
                            {score === top && tools.length > 1 ? (
                              <span className="ml-1 text-[10px] text-highlight">最高</span>
                            ) : null}
                          </dt>
                          <dd className="text-[13px] tabular-nums">{score}/5</dd>
                          <dd className="text-[12px] leading-5 text-muted-foreground">
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
        表格中的高亮圈表示该行分数最高的工具（仅作提示，不代表总分更高）。
        本站不做自建评测，分数来自官方公开资料与社区公开反馈的交叉整理，
        <strong className="text-foreground">不构成购买建议</strong>；价格与额度以官网为准。
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
        className="sticky left-0 z-10 w-28 bg-card px-3 py-3 align-top text-[13px] font-normal text-muted-foreground"
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