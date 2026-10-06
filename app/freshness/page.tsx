import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Clock, ShieldCheck } from 'lucide-react'
import { buildFreshnessReport, FRESHNESS_THRESHOLDS } from '@/lib/freshness'
import { PageHeader, Section } from '@/components/page-header'
import { UpdatedBadge } from '@/components/updated-badge'
import { Badge } from '@/components/ui/badge'
import { latestContentUpdate } from '@/lib/freshness'

export const metadata: Metadata = {
  title: '数据保鲜看板',
  description:
    '全站每一条数据的复核状态：按内容类型统计新鲜度、列出待复核清单与阈值说明。AI 领域变化快，这里把我们的维护状态公开。',
  alternates: { canonical: '/freshness' },
}

const KIND_LABEL: Record<string, string> = {
  tool: '工具能力与价格',
  guide: '教程与提示词模板',
  scenario: '决策器规则',
  edu: '课程与教案包',
  concept: '概念与术语',
  case: '案例',
}

const LEVEL_STYLE = {
  fresh: { label: '已复核', variant: 'success' as const, icon: CheckCircle2, class: 'text-score-4' },
  aging: { label: '待复核', variant: 'warning' as const, icon: Clock, class: 'text-amber-600 dark:text-amber-400' },
  stale: { label: '已超期', variant: 'danger' as const, icon: AlertTriangle, class: 'text-danger' },
}

export default function FreshnessPage() {
  const report = buildFreshnessReport()
  const latest = latestContentUpdate()
  const health = Math.round((report.totals.fresh / report.totals.total) * 100)

  return (
    <>
      <PageHeader
        title="数据保鲜看板"
        description="AI 领域每月都在变。这里公开全站每一条数据的复核状态：谁最近被改过、谁该被复核了、我们用什么阈值判断过期。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '数据保鲜看板' }]}
        meta={
          <>
            <Badge variant={health >= 80 ? 'success' : 'warning'}>整体新鲜度 {health}%</Badge>
            <span className="text-xs text-muted-foreground">
              全部内容最近更新 {latest.date}（{latest.daysAgo} 天前）
            </span>
          </>
        }
      />

      <div className="container py-8">
        <Section
          eyebrow="为什么公开这个"
          title="时效性是我们唯一不能含糊的事"
          description="页面上的每条评分、价格、能力描述都带更新时间与来源链接。但更有用的是：我们主动告诉你哪些内容已经旧了。"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="border-t border-hairline pt-4">
              <p className="text-sm font-semibold">每条数据都有 updatedAt</p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                工具详情页底部就写着「数据更新于 X 年 X 月」。超过 90 天会直接标「可能已过时」。
              </p>
            </div>
            <div className="border-t border-hairline pt-4">
              <p className="text-sm font-semibold">不同内容用不同阈值</p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                工具能力变化最快（30 天算新），概念定义变化很慢（180 天算新）。一刀切的过期标准是懒。
              </p>
            </div>
            <div className="border-t border-hairline pt-4">
              <p className="text-sm font-semibold">超期会挡住构建</p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                维护流程里有一条硬门禁：内容超过过期阈值时构建直接失败，逼着先更新再发布。
              </p>
            </div>
          </div>
        </Section>

        <Section title="各类内容的复核状态" description="点进去能直接看到那条内容。">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-hairline">
                  <th scope="col" className="px-3 py-2.5 text-left font-normal text-muted-foreground">
                    内容类型
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-normal text-muted-foreground">
                    条目数
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-normal text-muted-foreground">
                    已复核
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-normal text-muted-foreground">
                    待复核
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-right font-normal text-muted-foreground">
                    已超期
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left font-normal text-muted-foreground">
                    最旧的一条
                  </th>
                  <th scope="col" className="px-3 py-2.5 text-left font-normal text-muted-foreground">
                    阈值（天）
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(report.byKind).map(([kind, stat]) => {
                  const thresholds = FRESHNESS_THRESHOLDS[kind as keyof typeof FRESHNESS_THRESHOLDS]
                  const oldest = report.items.find((i) => i.id === stat.oldestId)
                  return (
                    <tr key={kind} className="border-t border-hairline">
                      <th scope="row" className="px-3 py-3 text-left font-medium">
                        {KIND_LABEL[kind] ?? kind}
                      </th>
                      <td className="px-3 py-3 text-right tabular-nums">{stat.total}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-score-4">{stat.fresh}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-amber-600 dark:text-amber-400">
                        {stat.aging}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-danger">{stat.stale}</td>
                      <td className="px-3 py-3">
                        {oldest ? (
                          <Link href={oldest.href} className="link-animate text-sm">
                            {oldest.title}
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {stat.oldestDays} 天前
                            </span>
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-xs tabular-nums text-muted-foreground">
                        {thresholds.fresh} / {thresholds.warn} / {thresholds.stale}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            阈值三段含义：新鲜上限 / 提醒线 / 判定超期。例如工具能力 30 / 90 / 180 天 —— 超过 30 天进入待复核，超过 180 天判定超期并挡住构建。
          </p>
        </Section>

        <Section
          eyebrow="待办"
          title={`${report.dueForReview.length} 条内容需要复核`}
          description="按过期严重程度排序。看到某条明显过时，直接去对应页面提交勘误更快。"
          action={
            <Link href="/about#errata" className="link-animate text-sm">
              提交勘误
            </Link>
          }
        >
          {report.dueForReview.length === 0 ? (
            <div className="border-y border-hairline py-10 text-center">
              <ShieldCheck className="mx-auto h-6 w-6 text-score-4" aria-hidden />
              <p className="mt-3 text-sm font-medium">全部内容都在有效期内</p>
              <p className="mt-1.5 text-sm text-muted-foreground">
                下一次复核会在内容接近阈值时出现在这里。
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-hairline border-y border-hairline">
              {report.dueForReview.slice(0, 24).map((item) => {
                const style = LEVEL_STYLE[item.level]
                const Icon = style.icon
                return (
                  <li key={`${item.kind}-${item.id}`} className="row-item py-3">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${style.class}`} aria-hidden />
                      <Link href={item.href} className="text-sm font-medium hover:text-primary">
                        {item.title}
                      </Link>
                      <Badge variant={style.variant}>{style.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {KIND_LABEL[item.kind] ?? item.kind} · 更新于 {item.updatedAt}
                      </span>
                      <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                        {item.ageDays} 天前
                        {item.daysToNextLevel > 0
                          ? `（${item.daysToNextLevel} 天后升级）`
                          : `（已超 ${Math.abs(item.daysToNextLevel)} 天）`}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {report.dueForReview.length > 24 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              仅显示前 24 条，共 {report.dueForReview.length} 条。
            </p>
          ) : null}
        </Section>

        <Section title="我们怎么维护" description="流程公开，比承诺「永远最新」更有用。">
          <ol className="space-y-3">
            {[
              {
                t: '每条数据都带来源',
                d: '工具的评分、价格、能力描述必须附官方链接或可核对的公开来源。没有依据的分数直接不写。',
              },
              {
                t: '按内容类型分级复核',
                d: '工具能力 30 天一轮，教程 45 天，概念 180 天。阈值不同是因为变化速度不同。',
              },
              {
                t: '内容版本化',
                d: '课程与教案包带 version / validFrom / validTo / supersededBy，过时内容会被标记并指向新版。',
              },
              {
                t: '定期简报',
                d: '每期说明「变了什么、对学校意味着什么、建议做什么」，而不是堆行业新闻。',
              },
              {
                t: '反馈进下一版',
                d: '教师与学生的真实使用问题优先进入下一版内容，而不是先做新功能。',
              },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-3 border-t border-hairline pt-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <span>
                  <span className="block text-sm font-medium">{s.t}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <UpdatedBadge date={latest.date} prefix="全站最近更新于" />
            <Link href="/updates" className="link-animate text-sm">
              查看变更日志
            </Link>
            <Link href="/edu/briefings" className="link-animate text-sm">
              定期简报
            </Link>
          </div>
        </Section>
      </div>
    </>
  )
}