import { SaveButton } from '@/components/learning/save-button'
import '@/app/styles/advanced.css'
import { AgentLab } from '@/components/learning/agent-lab'
import { LessonDiagram } from '@/components/learning/lesson-diagram'
import { guideVisuals } from '@/data/guide-visuals'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, CircleCheck, Clock, ListChecks, TriangleAlert, Wrench } from 'lucide-react'
import { guidesById, getTools } from '@/data'
import { DIFFICULTY_LABELS } from '@/lib/site'
import { formatDate } from '@/lib/score'
import { PromptBlock } from '@/components/prompt-block'
import { ToolLogo } from '@/components/tool-logo'
import { UpdatedBadge } from '@/components/updated-badge'
import { PrintButton } from '@/components/print-button'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { lessonSummaries } from '@/data/lesson-summaries'
import { PracticeCheck } from '@/components/learning/practice-check'
import { WorkflowVisual } from '@/components/learning/workflow-visual'
import { PromptMap } from '@/components/learning/prompt-map'

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
    title: lessonSummaries[guide.id]?.title ?? guide.title,
    description: lessonSummaries[guide.id]?.outcome ?? guide.summary ?? guide.outcome,
    alternates: { canonical: `/guides/${guide.id}` },
  }
}

export default async function GuideDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = guidesById[slug]
  if (!guide) notFound()

  const short = lessonSummaries[guide.id]
  const relatedTools = getTools(guide.tools)
  const next = guide.nextGuides.map((id) => guidesById[id]).filter(Boolean)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: short?.title ?? guide.title,
    description: lessonSummaries[guide.id]?.outcome ?? guide.summary ?? guide.outcome,
    totalTime: `PT${guide.durationMin}M`,
    step: guide.steps.map((s) => ({ '@type': 'HowToStep', name: s.title, text: s.doWhat })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '教程', href: '/guides' },
          { label: short?.title ?? guide.title },
        ]}
        title={short?.title ?? guide.title}
        description={short?.outcome ?? guide.summary ?? guide.outcome}
        meta={
          <>
            <Badge variant={guide.type === 'method' ? 'secondary' : 'default'}>
              {guide.type === 'method' ? '通用方法课' : '场景实操课'}
            </Badge>
            <Badge
              variant={
                guide.level === 'beginner'
                  ? 'success'
                  : guide.level === 'intermediate'
                    ? 'secondary'
                    : 'outline'
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
      <div className="content-toolbar container flex flex-wrap items-start justify-end gap-3 pt-4 print:hidden">
        <SaveButton
          kind="guide"
          href={`/guides/${guide.id}`}
          title={short?.title ?? guide.title}
          summary={short?.outcome ?? guide.summary ?? guide.outcome}
        />
        <PrintButton />
      </div>

      {/* 打印：纸面上只保留内容，导航与按钮不输出 */}

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card px-5 py-4">
              <h2 className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
                <ListChecks className="h-4 w-4" />
                先准备
              </h2>
              {guide.prerequisites.map((p) => (
                <span key={p} className="text-xs leading-6 text-muted-foreground">
                  {p}
                </span>
              ))}
            </div>

            <nav className="lesson-jumps" aria-label="教程快捷入口">
              <a href="#lesson-steps">照着做</a>
              <a href="#lesson-prompts">复制提示词</a>
              <a href="#practice-check">检查结果</a>
            </nav>
            {guideVisuals[guide.id] && <LessonDiagram visual={guideVisuals[guide.id]} />}
            {guide.id === 'agent-first-workflow' && (
              <div className="my-7">
                <AgentLab />
              </div>
            )}
            {guide.id === 'prompt-basics' && <PromptMap />}
            {guide.id === 'weekly-report' && (
              <div className="mt-7">
                <WorkflowVisual />
              </div>
            )}
            {/* 分步骤 */}
            <section id="lesson-steps" className="lesson-section">
              <h2 className="text-xl">照着做，完成这件事</h2>
              <ol className="mt-4 space-y-4">
                {guide.steps.map((step, i) => (
                  <li
                    key={step.title}
                    id={`lesson-step-${i + 1}`}
                    className="lesson-step scroll-mt-24"
                  >
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold">
                          {step.title.replace(/^第\s*\d+\s*步[：:]\s*/, '')}
                        </h3>
                        <dl className="mt-3 space-y-2.5 text-sm">
                          <Row label="现在做" value={short?.actions[i] ?? step.doWhat} />
                          <Row label="打开哪里" value={step.where} />
                          {step.input ? (
                            step.input.length > 100 ? (
                              <details className="lesson-details">
                                <summary>展开输入示例</summary>
                                <div className="mt-3">
                                  <Row label="输入示例" value={step.input} mono />
                                </div>
                              </details>
                            ) : (
                              <Row label="输入示例" value={step.input} mono />
                            )
                          ) : null}
                          {step.expectedOutput ? (
                            <Row label="完成标志" value={step.expectedOutput} />
                          ) : null}
                          {step.troubleshooting ? (
                            <div className="border-l-2 border-amber-500/50 bg-amber-500/5 p-3">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
                                出错怎么办
                              </p>
                              {step.troubleshooting.length > 85 ? (
                                <details className="mt-1.5 text-sm leading-6">
                                  <summary className="cursor-pointer">
                                    查看这个步骤的处理方法
                                  </summary>
                                  <p className="mt-2">{step.troubleshooting}</p>
                                </details>
                              ) : (
                                <p className="mt-1.5 text-sm leading-6 text-foreground/85">
                                  {step.troubleshooting}
                                </p>
                              )}
                            </div>
                          ) : null}
                        </dl>
                        {short && short.actions[i] !== step.doWhat && (
                          <details className="lesson-details">
                            <summary>展开说明与注意事项</summary>
                            <p className="mt-3 text-sm leading-7 text-muted-foreground">
                              {step.doWhat}
                            </p>
                          </details>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* 可复制提示词 */}
            {guide.promptTemplates.length > 0 ? (
              <section id="lesson-prompts" className="lesson-section">
                <h2 className="text-xl">直接用在你的任务里</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  填入你的信息，再复制到 AI 对话里。
                </p>
                <div className="mt-4 space-y-4">
                  {guide.promptTemplates.map((t) => (
                    <PromptBlock key={t.id} template={t} tools={relatedTools} />
                  ))}
                </div>
              </section>
            ) : null}

            {short && <PracticeCheck id={guide.id} checks={short.checks} />}
            <details className="lesson-details mt-7">
              <summary>练习验收与常见错误</summary>
              <p className="mt-4 text-sm leading-7">{guide.assessment}</p>
              <ul className="mt-4 space-y-2">
                {guide.commonMistakes.map((item) => (
                  <li className="text-sm leading-7 text-muted-foreground" key={item}>
                    {item}
                  </li>
                ))}
              </ul>
            </details>
            {guide.sources?.length ? (
              <details className="lesson-details mt-5">
                <summary>官方参考与继续阅读</summary>
                <ul className="mt-3 space-y-3">
                  {guide.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary underline underline-offset-4"
                      >
                        {source.label} ↗
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
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
                          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
                            {t.tagline}
                          </p>
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
                        <ArrowRight
                          className="mt-1 h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
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
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start print:hidden">
            <nav className="lesson-info-card" aria-label="本页学习导航">
              <h2 className="text-sm font-semibold">按步骤，慢慢来</h2>
              <ol className="mt-4 space-y-3">
                {guide.steps.map((step, i) => (
                  <li key={step.title}>
                    <a
                      href={`#lesson-step-${i + 1}`}
                      className="flex items-start gap-2.5 text-xs leading-6 text-muted-foreground hover:text-primary"
                    >
                      <span className="shrink-0 text-primary">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {step.title.replace(/^第\s*\d+\s*步[：:]\s*/, '')}
                    </a>
                  </li>
                ))}
              </ol>
              <div className="mt-5 border-t pt-4">
                <a href="#lesson-prompts" className="home-button w-full">
                  直接复制提示词
                </a>
                <a href="#practice-check" className="mt-3 block text-center text-xs text-primary">
                  检查我的产出 →
                </a>
              </div>
            </nav>
            <p className="px-3 text-xs leading-6 text-muted-foreground">
              先用自己的材料试一遍。遇到不确定的信息，回原始资料核对。
            </p>
          </aside>
        </div>
      </div>
    </>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
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
