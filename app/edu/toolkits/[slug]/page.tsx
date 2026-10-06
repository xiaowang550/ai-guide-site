import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AlertTriangle, ClipboardList, MessageCircleQuestion, Users } from 'lucide-react'
import { eduToolkitsById, eduToolkits } from '@/data/edu-toolkits'
import { eduProgramsById } from '@/data/edu-programs'
import { getTools } from '@/data'
import { isCurrent } from '@/lib/edu'
import { formatDate } from '@/lib/score'
import { ToolLogo } from '@/components/tool-logo'
import { CoverArt } from '@/components/cover-art'
import { CopyableText } from '@/components/copyable-text'
import { PrintButton } from '@/components/print-button'
import { WeeklyScheduleBuilder } from '@/components/edu/weekly-schedule'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function generateStaticParams() {
  return eduToolkits.map((t) => ({ slug: t.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const toolkit = eduToolkitsById[slug]
  if (!toolkit) return { title: '教案包不存在' }
  return {
    title: `${toolkit.title}（${toolkit.stage} · ${toolkit.subject}）`,
    description: `${toolkit.lessons} 课时完整教案，含课堂活动、讨论题、AI 使用规范要点与学生使用声明，可直接开课。`,
    alternates: { canonical: `/edu/toolkits/${toolkit.id}` },
  }
}

export default async function ToolkitDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const toolkit = eduToolkitsById[slug]
  if (!toolkit) notFound()

  const program = eduProgramsById[toolkit.programId]
  const tools = getTools(toolkit.toolIds)
  const current = isCurrent(toolkit.validFrom, toolkit.validTo)
  const others = eduToolkits.filter((t) => t.id !== toolkit.id && t.subject === toolkit.subject).slice(0, 3)

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: '课程与教案包', href: '/edu/toolkits' },
          { label: toolkit.title },
        ]}
        title={toolkit.title}
        description={`${toolkit.stage} · ${toolkit.subject} · ${toolkit.lessons} 课时。学校拿到即可开课、即可备课。`}
        meta={
          <>
            <Badge variant="secondary">{toolkit.subject}</Badge>
            <Badge variant="outline">{toolkit.stage}</Badge>
            <Badge variant="outline">{toolkit.version}</Badge>
            <span className="text-xs text-muted-foreground">
              适用自 {toolkit.validFrom}
              {toolkit.validTo ? ` 至 ${toolkit.validTo}` : '（现行版本）'}
            </span>
          </>
        }
      />

      <div className="container pt-8">
        <CoverArt
          id={toolkit.id}
          eyebrow={`${toolkit.stage} · ${toolkit.subject}`}
          tools={tools}
          height="sm"
          className="rounded-lg border"
        />
      </div>

      
      {/* 打印：纸面上只保留内容，导航与按钮不输出 */}
      <div className="container print:hidden">
        <div className="flex justify-end pb-2">
          <PrintButton />
        </div>
      </div>
<div className="container py-8">
        {!current ? (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm leading-6">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div>
              <p className="font-semibold">本教案包已标记更新</p>
              <p className="mt-1 text-foreground/85">
                适用期至 {toolkit.validTo}。
                {toolkit.supersededBy ? (
                  <>
                    新版：
                    <Link
                      href={`/edu/toolkits/${toolkit.supersededBy}`}
                      className="mx-1 text-primary underline underline-offset-4"
                    >
                      {eduToolkitsById[toolkit.supersededBy]?.title ?? toolkit.supersededBy}
                    </Link>
                  </>
                ) : (
                  '请查看定期简报获取最新版本。'
                )}
              </p>
            </div>
          </div>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            {/* 教案结构 */}
            <section className="mb-8">
              <h2 className="text-xl">教案结构</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                每一课时都写清目标、流程与学生产出，教师可直接照着上。
              </p>
              <div className="mt-4 space-y-4">
                {toolkit.lessonPlans.map((plan, i) => (
                  <div key={plan.title} className="border-b border-hairline pb-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="flex items-center gap-2 text-base font-semibold">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {i + 1}
                        </span>
                        {plan.title}
                      </h3>
                      <span className="text-xs text-muted-foreground">{plan.minutes} 分钟</span>
                    </div>
                    <p className="mt-2.5 text-sm leading-6 text-foreground/85">
                      <span className="font-medium">教学目标：</span>
                      {plan.goal}
                    </p>
                    <ol className="mt-3 space-y-2">
                      {plan.flow.map((step, si) => (
                        <li key={si} className="flex gap-2.5 text-sm leading-6 text-foreground/85">
                          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" aria-hidden />
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 rounded-lg bg-accent/40 p-3 text-sm leading-6 text-foreground/85">
                      <span className="font-medium">学生产出：</span>
                      {plan.studentOutput}
                    </p>
                    {plan.troubleshooting.length > 0 ? (
                      <div className="mt-3 border-l-2 border-amber-500/50 bg-amber-500/5 p-3">
                        <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                          课堂易卡点与处理
                        </p>
                        <ul className="mt-1.5 space-y-1 text-sm leading-6 text-foreground/85">
                          {plan.troubleshooting.map((t) => (
                            <li key={t}>· {t}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {/* 排课表：把教案课时对到学校真实作息上 */}
            <WeeklyScheduleBuilder
              lessons={toolkit.lessonPlans}
              toolkitTitle={toolkit.title}
            />

            {/* 活动设计 */}
            <section className="mb-8">
              <h2 className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-primary" aria-hidden />
                课堂活动设计
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {toolkit.activities.map((a) => (
                  <li key={a} className="flex items-start gap-2 border-t border-hairline py-3 text-sm leading-6">
                    <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {a}
                  </li>
                ))}
              </ul>
            </section>

            {/* 讨论题 */}
            <section className="mb-8">
              <h2 className="flex items-center gap-2 text-xl">
                <MessageCircleQuestion className="h-5 w-5 text-primary" aria-hidden />
                课堂讨论题
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                题目设计原则：能让学生说出判断依据，而不是表态。
              </p>
              <ol className="mt-3 space-y-2">
                {toolkit.discussionQuestions.map((q, i) => (
                  <li key={q} className="flex gap-2.5 border-t border-hairline py-3.5 text-sm leading-6">
                    <span className="font-semibold text-muted-foreground">{i + 1}.</span>
                    {q}
                  </li>
                ))}
              </ol>
            </section>

            {/* 规范要点 */}
            <section className="mb-8">
              <h2 className="text-xl">本教案必须遵守的 AI 使用规范</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                这些是硬性要求，不是建议。与校级规范冲突时，以校级规范为准。
              </p>
              <ul className="mt-3 space-y-2">
                {toolkit.policyNotes.map((p) => (
                  <li
                    key={p}
                    className="border-l-2 border-amber-500/50 bg-amber-500/5 p-3.5 text-sm leading-6 text-foreground/85"
                  >
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={`/edu/policy`}
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                需要按本校情况生成完整规范？
              </Link>
            </section>

            {/* 学生使用声明 */}
            <section className="mb-8">
              <h2 className="flex items-center gap-2 text-xl">
                <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
                学生 AI 使用声明（作业附）
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                声明不是惩罚手段，写的过程本身就是学习。可直接复制或打印。
              </p>
              <CopyableText text={toolkit.declarationTemplate} label="复制学生 AI 使用声明" />
            </section>

            <div className="flex flex-wrap gap-2 border-t pt-6">
              <Button asChild variant="outline" size="sm">
                <Link href="/edu/toolkits">← 返回教案包列表</Link>
              </Button>
              {program ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/edu/programs/${program.id}`}>查看配套课程大纲</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link href="/edu/policy">生成本校 AI 使用规范</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              本教案包（{toolkit.version}）复核于 {formatDate(toolkit.updatedAt)}。
            </p>
          </article>

          {/* 侧栏 */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start print:hidden">
            <div className="border-b border-hairline pb-5 text-sm">
              <h2 className="text-sm font-semibold">本页速览</h2>
              <dl className="mt-3 space-y-2">
                <Row label="学段" value={toolkit.stage} />
                <Row label="学科" value={toolkit.subject} />
                <Row label="课时" value={`${toolkit.lessons} 课时`} />
                <Row label="课时明细" value={`${toolkit.lessonPlans.length} 个课时`} />
                <Row label="活动" value={`${toolkit.activities.length} 项`} />
                <Row label="讨论题" value={`${toolkit.discussionQuestions.length} 个`} />
                <Row label="配套工具" value={`${tools.length} 个`} />
                <Row label="版本" value={toolkit.version} />
              </dl>
            </div>

            {tools.length > 0 ? (
              <div className="border-b border-hairline pb-5 text-sm">
                <h2 className="text-sm font-semibold">配套工具</h2>
                <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
                  均为中国大陆可直连的工具；点击查看能力与短板，避免课上打不开。
                </p>
                <ul className="mt-3 space-y-2.5">
                  {tools.map((t) => (
                    <li key={t.id} className="flex items-start gap-2">
                      <ToolLogo src={t.logo} alt={`${t.name} 标志`} size={24} />
                      <span className="min-w-0 flex-1">
                        <Link href={`/tools/${t.id}`} className="font-medium hover:text-primary">
                          {t.name}
                        </Link>
                        <span className="block text-[11px] text-muted-foreground">
                          {t.chinaAccessible ? '大陆可直连' : '大陆需借助网络工具'} · 综合{' '}
                          {t.overallScore.toFixed(1)}/5
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {others.length > 0 ? (
              <div className="border-b border-hairline pb-5 text-sm">
                <h2 className="text-sm font-semibold">同学科其他教案包</h2>
                <ul className="mt-3 space-y-2">
                  {others.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/edu/toolkits/${t.id}`}
                        className="block border-t border-hairline py-3 hover:border-primary/40 hover:bg-accent/30"
                      >
                        <span className="block font-medium">{t.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {t.stage} · {t.version}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
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