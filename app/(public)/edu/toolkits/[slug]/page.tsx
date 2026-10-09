import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, Check, ClipboardList } from 'lucide-react'
import { eduToolkits, eduToolkitsById } from '@/data/edu-toolkits'
import { eduProgramsById } from '@/data/edu-programs'
import { CopyableText } from '@/components/copyable-text'
import { PrintButton } from '@/components/print-button'
import { WeeklyScheduleBuilder } from '@/components/edu/weekly-schedule'
import { PageHeader } from '@/components/page-header'

export function generateStaticParams() {
  return eduToolkits.map(({ id }) => ({ slug: id }))
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const toolkit = eduToolkitsById[slug]
  return toolkit
    ? {
        title: toolkit.title,
        description: toolkit.lessonPlans[0].goal,
        alternates: { canonical: `/edu/toolkits/${slug}` },
      }
    : { title: '教案包不存在' }
}
export default async function ToolkitDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const toolkit = eduToolkitsById[slug]
  if (!toolkit) notFound()
  const program = eduProgramsById[toolkit.programId]
  const teacher = toolkit.mode === '教师备课'
  const observation = toolkit.stage === '初中'
  return (
    <>
      <PageHeader
        className="school-page-heading"
        title={toolkit.title}
        description={`${toolkit.stage} · ${toolkit.subject} · ${toolkit.mode} · ${toolkit.lessons} 课时`}
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '学校服务', href: '/edu' },
          { label: '教案包', href: '/edu/toolkits' },
          { label: toolkit.title },
        ]}
      />
      <div className="container py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-primary/[0.06] p-6">
          <div className="max-w-3xl">
            <p className="text-xs font-medium text-primary">这节课要完成什么</p>
            <h2 className="mt-2 text-lg leading-8">{toolkit.lessonPlans[0].goal}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              带走：{toolkit.lessonPlans[0].studentOutput}
            </p>
          </div>
          <PrintButton />
        </div>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article className="min-w-0">
            <section id="flow">
              <h2 className="text-xl">照着走：课堂流程</h2>
              <p className="mb-5 mt-2 text-sm text-muted-foreground">
                先独立思考，再观察或使用，最后检查学习结果。
              </p>
              {toolkit.lessonPlans.map((plan) => (
                <div key={plan.title}>
                  <p className="mb-3 text-xs text-primary">{plan.minutes} 分钟</p>
                  <ol className="school-lesson-flow">
                    {plan.flow.map((step, index) => (
                      <li key={step} data-step={index + 1}>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <details className="school-details mt-5">
                    <summary>课堂卡住了，怎么处理</summary>
                    <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                      {plan.troubleshooting.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              ))}
            </section>
            <section id="worksheet" className="mt-8">
              <h2 className="mb-3 flex items-center gap-2 text-xl">
                <ClipboardList className="h-5 w-5 text-primary" aria-hidden />
                {teacher ? '可复制的教师工作单' : '可复制的学习单'}
              </h2>
              <CopyableText text={toolkit.worksheetTemplate} label="复制工作单" />
            </section>
            <details className="school-details mt-7">
              <summary>讨论题与活动设计</summary>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold">讨论题</h3>
                  <ol className="list-decimal space-y-3 pl-5 text-sm leading-6 text-muted-foreground">
                    {toolkit.discussionQuestions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold">活动设计</h3>
                  <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
                    {toolkit.activities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
            <details className="school-details mt-7">
              <summary>
                记录{observation ? '课堂观察' : teacher ? '教师使用与复核' : '学生使用过程'}
              </summary>
              <CopyableText text={toolkit.declarationTemplate} label="复制记录模板" />
            </details>
            <details className="school-details mt-7">
              <summary>按本校作息安排课时</summary>
              <WeeklyScheduleBuilder lessons={toolkit.lessonPlans} toolkitTitle={toolkit.title} />
            </details>
            <p className="mt-8 text-xs text-muted-foreground">
              {toolkit.version} · 内容整理于 {toolkit.updatedAt}。课前请按本校教材与学情复核。
            </p>
          </article>
          <aside className="space-y-7 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl bg-muted/50 p-5">
              <h2 className="text-base">课前准备</h2>
              <ul className="mt-4 space-y-3">
                {toolkit.materials.map((item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="text-base">使用边界</h2>
              <ul className="mt-3 space-y-3 text-xs leading-6 text-muted-foreground">
                {toolkit.policyNotes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link href="/edu/policy" className="section-link mt-4">
                生成本校规范
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </section>
            <nav
              aria-label="本教案操作入口"
              className="space-y-3 border-t border-hairline pt-5 text-sm"
            >
              <a href="#flow" className="block hover:text-primary">
                看课堂流程
              </a>
              <a href="#worksheet" className="block hover:text-primary">
                复制工作单
              </a>
              {program && (
                <Link className="block hover:text-primary" href={`/edu/programs/${program.id}`}>
                  看配套课程
                </Link>
              )}
              <Link
                className="block hover:text-primary"
                href={`/edu/toolkits?stage=${encodeURIComponent(toolkit.stage)}`}
              >
                返回这个学段的教案
              </Link>
            </nav>
          </aside>
        </div>
      </div>
    </>
  )
}
