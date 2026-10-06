import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowRight,
  CircleCheck,
  Clock,
  ListChecks,
  Target,
  TriangleAlert,
  Wrench,
} from 'lucide-react'
import { guidesById, getTools, tools } from '@/data'
import { DIFFICULTY_LABELS } from '@/lib/site'
import { formatDate } from '@/lib/score'
import { PromptBlock } from '@/components/prompt-block'
import { ToolLogo } from '@/components/tool-logo'
import { UpdatedBadge } from '@/components/updated-badge'
import { PrintButton } from '@/components/print-button'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function generateStaticParams() {
  return Object.keys(guidesById).map((id) => ({ slug: id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const guide = guidesById[slug]
  if (!guide) return { title: '教程不存在' }
  return {
    title: guide.title,
    description: guide.summary ?? guide.outcome,
    alternates: { canonical: `/guides/${guide.id}` },
  }
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = guidesById[slug]
  if (!guide) notFound()

  const relatedTools = getTools(guide.tools)
  const next = guide.nextGuides.map((id) => guidesById[id]).filter(Boolean)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: guide.title,
    description: guide.summary ?? guide.outcome,
    totalTime: `PT${guide.durationMin}M`,
    step: guide.steps.map((s) => ({ '@type': 'HowToStep', name: s.title, text: s.doWhat })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '教程', href: '/guides' },
          { label: guide.title },
        ]}
        title={guide.title}
        description={guide.summary ?? guide.outcome}
        meta={
          <>
            <Badge variant={guide.type === 'method' ? 'secondary' : 'default'}>
              {guide.type === 'method' ? '通用方法课' : '场景实操课'}
            </Badge>
            <Badge
              variant={
                guide.level === 'beginner' ? 'success' : guide.level === 'intermediate' ? 'secondary' : 'outline'
              }
            >
              {DIFFICULTY_LABELS[guide.level]}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden />
              预计 {guide.durationMin} 分钟
            </span>
            <UpdatedBadge date={guide.updatedAt} prefix="内容更新于" />
          </>
        }
      />

      
      {/* 打印：纸面上只保留内容，导航与按钮不输出 */}
      <div className="container print:hidden">
        <div className="flex justify-end pb-2">
          <PrintButton />
        </div>
      </div>
<div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            {/* 前置要求 + 目标 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-b border-hairline pb-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <ListChecks className="h-4 w-4" aria-hidden />
                  前置要求
                </h2>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  {guide.prerequisites.map((p) => (
                    <li key={p}>· {p}</li>
                  ))}
                </ul>
              </div>
              <div className="border-l-2 border-primary/40 bg-accent/40 p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Target className="h-4 w-4" aria-hidden />
                  做完你会得到什么
                </h2>
                <p className="mt-3 text-sm leading-6 text-foreground/85">{guide.outcome}</p>
              </div>
            </div>

            {/* 分步骤 */}
            <section className="mt-8">
              <h2 className="text-xl">分步骤操作</h2>
              <ol className="mt-4 space-y-4">
                {guide.steps.map((step, i) => (
                  <li key={step.title} className="border-b border-hairline pb-5">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold">{step.title}</h3>
                        <dl className="mt-3 space-y-2.5 text-sm">
                          <Row label="做什么" value={step.doWhat} />
                          <Row label="在哪做" value={step.where} />
                          {step.input ? <Row label="输入什么" value={step.input} mono /> : null}
                          {step.expectedOutput ? (
                            <Row label="预期输出" value={step.expectedOutput} />
                          ) : null}
                          {step.troubleshooting ? (
                            <div className="border-l-2 border-amber-500/50 bg-amber-500/5 p-3">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                                出错怎么办
                              </p>
                              <p className="mt-1.5 text-sm leading-6 text-foreground/85">
                                {step.troubleshooting}
                              </p>
                            </div>
                          ) : null}
                        </dl>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* 可复制提示词 */}
            {guide.promptTemplates.length > 0 ? (
              <section className="mt-8">
                <h2 className="text-xl">可复制的提示词</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  填好变量再复制。变量说明写在每个输入框下面。
                </p>
                <div className="mt-4 space-y-4">
                  {guide.promptTemplates.map((t) => (
                    <PromptBlock key={t.id} template={t} tools={relatedTools} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* 相关工具 */}
            {relatedTools.length > 0 ? (
              <section className="mt-8">
                <h2 className="flex items-center gap-2 text-xl">
                  <Wrench className="h-5 w-5 text-muted-foreground" aria-hidden />
                  本教程用到的工具
                </h2>
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {relatedTools.map((t) => (
                    <li key={t.id} className="border-t border-hairline pt-4">
                      <div className="flex items-start gap-3">
                        <ToolLogo src={t.logo} alt={`${t.name} 标志`} size={34} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                            {t.name}
                          </Link>
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t.tagline}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {/* 下一步 */}
            {next.length > 0 ? (
              <section className="mt-8 border-t pt-8">
                <h2 className="text-xl">下一步学什么</h2>
                <ul className="mt-4 space-y-2">
                  {next.map((g) => (
                    <li key={g.id}>
                      <Link
                        href={`/guides/${g.id}`}
                        className="group flex items-start gap-3 border-t border-hairline pt-4 transition-colors hover:border-primary/40 hover:bg-accent/30"
                      >
                        <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{g.title}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {g.durationMin} 分钟 · {DIFFICULTY_LABELS[g.level]}
                          </span>
                        </span>
                        <ArrowRight className="mt-1 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="mt-8 text-xs text-muted-foreground">
              本教程更新于 {formatDate(guide.updatedAt)}。提示词在不同模型上的表现会有差异，
              遇到跑偏先检查「背景」和「约束」两段有没有写清楚。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/guides">← 返回教程列表</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/find">不确定用什么工具？</Link>
              </Button>
            </div>
          </article>

          {/* 侧栏 */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start print:hidden">
            <div className="border-b border-hairline pb-5">
              <h2 className="text-sm font-semibold">本页速览</h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">类型</dt>
                  <dd>{guide.type === 'method' ? '通用方法课' : '场景实操课'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">难度</dt>
                  <dd>{DIFFICULTY_LABELS[guide.level]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">耗时</dt>
                  <dd>{guide.durationMin} 分钟</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">步骤数</dt>
                  <dd>{guide.steps.length} 步</dd>
                </div>
              </dl>
            </div>

            <div className="border-b border-hairline pb-5">
              <h2 className="text-sm font-semibold">涉及的工具能力</h2>
              <ul className="mt-3 space-y-2">
                {relatedTools.map((t) => (
                  <li key={t.id} className="text-sm">
                    <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                      {t.name}
                    </Link>
                    <span className="block text-xs text-muted-foreground">
                      综合分 {t.overallScore}/5 · 幻觉风险{' '}
                      {t.hallucinationRisk === 'low' ? '低' : t.hallucinationRisk === 'medium' ? '中' : '高'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {tools.length > 0 ? (
              <p className="rounded-xl border bg-muted/40 p-5 text-xs leading-6 text-muted-foreground">
                提示：不同模型对同一段提示词的响应差别很大。
                同一件事换个工具再做一遍，往往比反复纠缠一句提示词更省时间。
              </p>
            ) : null}
          </aside>
        </div>
      </div>
    </>
  )
}

function Row({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="w-20 shrink-0 text-xs font-medium text-muted-foreground sm:pt-0.5">{label}</dt>
      <dd
        className={
          mono
            ? 'min-w-0 flex-1 whitespace-pre-wrap rounded-md bg-muted/60 p-2 font-mono text-[13px] leading-6'
            : 'min-w-0 flex-1 leading-6 text-foreground/85'
        }
      >
        {value}
      </dd>
    </div>
  )
}