import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ArrowRight, Clock, FileStack, Target, Users } from 'lucide-react'
import { eduPrograms, eduProgramsById, eduTiers } from '@/data/edu-programs'
import { getTools, getGuide, getConcept } from '@/data'
import { eduToolkits } from '@/data/edu-toolkits'
import { isCurrent } from '@/lib/edu'
import { formatDate } from '@/lib/score'
import { ToolLogo } from '@/components/tool-logo'
import { PrintButton } from '@/components/print-button'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function generateStaticParams() {
  return eduPrograms.map((p) => ({ slug: p.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const program = eduProgramsById[slug]
  if (!program) return { title: '课程不存在' }
  return {
    title: `${program.title}（${program.tier} · ${program.format}）`,
    description: `${program.outcome}。${program.lessons} 课时，面向${program.audience}。`,
    alternates: { canonical: `/edu/programs/${program.id}` },
  }
}

export default async function ProgramDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const program = eduProgramsById[slug]
  if (!program) notFound()

  const tier = eduTiers.find((t) => t.id === program.tier)
  const toolkits = eduToolkits.filter((t) => t.programId === program.id)
  const related = program.relatedRefs.map((ref) => {
    if (ref.kind === 'guide') {
      const g = getGuide(ref.id)
      return g ? { href: `/guides/${g.id}`, label: g.title, kind: '站内教程' as const } : null
    }
    if (ref.kind === 'concept') {
      const c = getConcept(ref.id)
      return c ? { href: `/learn/${c.id}`, label: c.term, kind: '概念' as const } : null
    }
    const t = getTools([ref.id])[0]
    return t ? { href: `/tools/${t.id}`, label: t.name, kind: '工具' as const } : null
  })
  const relatedTools = getTools(program.relatedRefs.filter((r) => r.kind === 'tool').map((r) => r.id))
  const current = isCurrent(program.validFrom, program.validTo)
  const nextTier = eduTiers
    .filter((t) => t.audience === tier?.audience && t.order === (tier?.order ?? 0) + 1)[0]

  return (
    <>
      <PageHeader
        className="school-page-heading"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: '课程体系', href: '/edu/programs' },
          { label: program.title },
        ]}
        title={program.title}
        description={program.outcome}
        meta={
          <>
            <Badge variant="secondary">{program.tier}</Badge>
            <Badge variant="outline">{tier?.name ?? ''}</Badge>
            <Badge variant="outline">
              {program.stage} · {program.subject}
            </Badge>
            <Badge variant="outline">{program.format}</Badge>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden />
              {program.lessons} 课时
            </span>
            <span className="text-xs text-muted-foreground">
              {program.version} · 适用自 {program.validFrom}
              {program.validTo ? ` 至 ${program.validTo}` : '（现行版本）'}
            </span>
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
        {!current ? (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="text-sm leading-6">
              <p className="font-semibold">本课程版本已标记为更新，建议改用新版</p>
              <p className="mt-1 text-foreground/85">
                适用期至 {program.validTo}。
                {program.supersededBy ? (
                  <>
                    请改用
                    <Link
                      href={`/edu/programs/${program.supersededBy}`}
                      className="mx-1 text-primary underline underline-offset-4"
                    >
                      {eduProgramsById[program.supersededBy]?.title ?? program.supersededBy}
                    </Link>
                    或在
                    <Link href="/edu/support" className="mx-1 text-primary underline underline-offset-4">
                      答疑与反馈
                    </Link>
                    查看本期变更说明。
                  </>
                ) : (
                  <>
                    请查看
                    <Link href="/edu/support" className="mx-1 text-primary underline underline-offset-4">
                      答疑与反馈
                    </Link>
                    获取最新版本。
                  </>
                )}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            {/* 前置要求与验收 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="border-b border-hairline pb-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Users className="h-4 w-4" aria-hidden />
                  面向谁 · 前置要求
                </h2>
                <p className="mt-2 text-sm text-foreground/85">{program.audience}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {program.prerequisites.map((p) => (
                    <li key={p}>· {p}</li>
                  ))}
                </ul>
                {tier ? (
                  <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-[11px] leading-5 text-muted-foreground">
                    阶梯前置：{tier.requires}
                  </p>
                ) : null}
              </div>
              <div className="border-l-2 border-primary/40 bg-accent/40 p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-primary">
                  <Target className="h-4 w-4" aria-hidden />
                  学完的验收标准
                </h2>
                <p className="mt-2 text-sm leading-6 text-foreground/85">{program.assessment}</p>
              </div>
            </div>

            {/* 大纲 */}
            <section className="mt-8">
              <h2 className="text-xl">课程大纲</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                每一模块标注时长与课堂活动；活动是这节课能不能落地的关键。
              </p>
              <ol className="school-lesson-flow mt-5">
                {program.modules.map((m, i) => (
                  <li key={m.title} data-step={i+1}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-base font-semibold">{m.title}</h3>
                          <span className="text-xs text-muted-foreground">{m.minutes} 分钟</span>
                        </div>
                        <details className="school-details mt-3"><summary>展开教学要点</summary>
                          <ul className="space-y-2 text-sm leading-6 text-muted-foreground">{m.points.map(point=><li key={point}>{point}</li>)}</ul>
                        </details>
                        {m.activity ? (
                          <p className="mt-3 rounded-lg bg-accent/40 p-3 text-sm leading-6 text-foreground/85">
                            <span className="font-medium">课堂活动：</span>
                            {m.activity}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* 交付物 */}
            <section className="mt-8">
              <h2 className="text-xl">配套交付物</h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {program.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2 border-t border-hairline py-3 text-sm">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {d}
                  </li>
                ))}
              </ul>
            </section>

            {/* 常见错误清单 */}
            <details className="school-details mt-8"><summary>查看常见错误与课前检查</summary>
              <h2 className="flex items-center gap-2 text-xl">
                <AlertTriangle className="h-5 w-5 text-score-2" aria-hidden />
                常见错误清单
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                这些是课堂与自学中最常出现的问题，建议作为工作坊的检查项。
              </p>
              <ul className="mt-3 space-y-2">
                {program.commonMistakes.map((m) => (
                  <li
                    key={m}
                    className="border-l-2 border-amber-500/50 bg-amber-500/5 p-3.5 text-sm leading-6 text-foreground/85"
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </details>

            {/* 站内关联材料 */}
            {related.length > 0 || relatedTools.length > 0 ? (
              <section className="mt-8 border-t pt-8">
                <h2 className="text-xl">配套站内材料</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  概念、教程与工具详情都在主站，讲课时可直接引用，避免口径不一。
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {related.map((r) =>
                    r ? (
                      <li key={r.href}>
                        <Link
                          href={r.href}
                          className="flex items-center justify-between gap-3 border-t border-hairline py-3 text-sm hover:border-primary/40 hover:bg-accent/30"
                        >
                          <span className="min-w-0 truncate">{r.label}</span>
                          <span className="shrink-0 text-[11px] text-muted-foreground">{r.kind}</span>
                        </Link>
                      </li>
                    ) : null
                  )}
                  {toolkits.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/edu/toolkits/${t.id}`}
                        className="flex items-center justify-between gap-3 border-t border-hairline py-3 text-sm hover:border-primary/40 hover:bg-accent/30"
                      >
                        <span className="min-w-0 truncate">{t.title}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">教案包</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {relatedTools.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {relatedTools.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tools/${t.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs hover:border-primary/40"
                      >
                        <ToolLogo src={t.logo} alt="" size={16} className="border-0 bg-transparent p-0" />
                        {t.name}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-2 border-t pt-6">
              <Button asChild variant="outline" size="sm">
                <Link href="/edu/programs">← 返回课程体系</Link>
              </Button>
              {nextTier ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/edu/programs/${eduPrograms.find(p=>p.tier===nextTier.id)?.id ?? program.id}`}>
                    下一层：{nextTier.name}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </Button>
              ) : null}
              {toolkits.length > 0 ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/edu/toolkits?program=${program.id}`}>
                    <FileStack className="h-3.5 w-3.5" aria-hidden />
                    查看配套教案包
                  </Link>
                </Button>
              ) : null}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              本课程（{program.version}）复核于 {formatDate(program.updatedAt)}。
              内容版本化的目的是：每份材料都知道自己什么时候开始有效、被谁替代。
            </p>
          </article>

          {/* 侧栏 */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start print:hidden">
            <div className="border-b border-hairline pb-5 text-sm">
              <h2 className="text-sm font-semibold">本页速览</h2>
              <dl className="mt-3 space-y-2">
                <Row label="阶梯" value={`${program.tier} · ${tier?.name ?? ''}`} />
                <Row label="学段" value={program.stage} />
                <Row label="学科" value={program.subject} />
                <Row label="形式" value={program.format} />
                <Row label="课时" value={`${program.lessons} 课时`} />
                <Row label="模块" value={`${program.modules.length} 个`} />
                <Row label="版本" value={program.version} />
              </dl>
            </div>

            {toolkits.length > 0 ? (
              <div className="border-b border-hairline pb-5 text-sm">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <FileStack className="h-4 w-4" aria-hidden />
                  配套教案包
                </h2>
                <ul className="mt-3 space-y-2">
                  {toolkits.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/edu/toolkits/${t.id}`}
                        className="block border-t border-hairline py-3 hover:border-primary/40 hover:bg-accent/30"
                      >
                        <span className="block font-medium">{t.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t.stage} · {t.subject} · {t.lessons} 课时 · {t.version}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="rounded-xl border bg-muted/40 p-5 text-xs leading-6 text-muted-foreground">
              校本定制：需要按本校学段、学科或教研安排调整内容时，请通过
              <Link href="/edu/support" className="text-primary underline underline-offset-4">
                {' '}
                答疑与反馈
              </Link>{' '}
              说明，我们会提供可调整的部分，而不是替换成另一套课件。
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}