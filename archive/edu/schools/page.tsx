import type { Metadata } from 'next'
import { AlertTriangle, Compass } from 'lucide-react'
import { eduSchools } from '@/data/edu-schools'
import { eduPrograms } from '@/data/edu-programs'
import { eduTiers } from '@/data/edu-programs'
import { computeEduMetrics } from '@/lib/edu'
import { ladderProgressFor } from '@/lib/edu'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { EduMetricsBar } from '@/components/edu/edu-metrics'
import { formatDate } from '@/lib/score'

export const metadata: Metadata = {
  title: '试点学校与区域推广',
  description:
    '先在少量学校把内容打磨到可复制，再扩大覆盖范围。查看各校推广阶段、已交付课程与教案包、种子教师规模与下一步动作。',
  alternates: { canonical: '/edu/schools' },
}

const PHASE_ORDER = ['试点验证', '成熟复制', '区域推广', '师资自传播'] as const

const PHASE_DESC: Record<string, string> = {
  试点验证: '内容正在打磨中，重点是验证课程与教案包是否真的能落地',
  成熟复制: '已验证可行，开始向同校其他年级或同学段复制',
  区域推广: '作为样板向区域内其他学校推广，输出可复制做法',
  师资自传播: '校内种子教师已能独立宣讲，对外培训依赖显著下降',
}

export default function SchoolsPage() {
  const metrics = computeEduMetrics()
  const teacherTiers = eduTiers.filter((t) => t.audience === 'teacher')

  return (
    <>
      <PageHeader
        title="试点学校与区域推广"
        description="范围扩张的速度取决于内容成熟度，而不是宣讲场次。这里公开每所学校的阶段、已交付内容与下一步动作。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: '试点与推广' },
        ]}
      />

      <div className="container py-8">
        {metrics.includesSample ? (
          <div className="mb-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="text-[13px] leading-6 text-foreground/85">
              <p className="font-semibold">本页目前是示例数据</p>
              <p className="mt-1">
                下面的学校名称、教师人数、交付内容均为演示用的虚构数据，只用于展示看板结构与指标口径，
                <strong className="text-foreground">不代表任何真实合作或覆盖成果</strong>。
                学校名称与教师人数属于机构真实信息，对外发布前需取得许可并替换为真实试点信息。
              </p>
            </div>
          </div>
        ) : null}

        <EduMetricsBar metrics={metrics} />

        <section className="mt-10">
          <h2 className="mb-1 text-xl">推广阶段说明</h2>
          <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            同一所学校可能同时处于多个阶段（比如骨干层培养完成后，效率层仍在铺开）。下表按当前主阶段归类。
          </p>
          <div className="grid gap-3 md:grid-cols-4">
            {PHASE_ORDER.map((phase, i) => (
              <div key={phase} className="border-t border-hairline pt-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <p className="text-sm font-semibold">{phase}</p>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{PHASE_DESC[phase]}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {eduSchools.filter((s) => s.phase === phase).length} 所在
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl">学校看板</h2>
          <div className="space-y-4">
            {eduSchools.map((school) => {
              const progress = ladderProgressFor(school, eduTiers)
              const programTitles = school.deliveredPrograms
                .map((id) => eduPrograms.find((p) => p.id === id)?.title ?? id)
              return (
                <article key={school.id} className="border-b border-hairline pb-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">{school.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {school.stage} · 种子教师 {school.seedTeachers} 人 · 覆盖教师{' '}
                        {school.teachersReached} 人次
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {school.isSample ? <Badge variant="outline">示例数据</Badge> : null}
                      <Badge variant={school.phase === '试点验证' ? 'warning' : 'success'}>
                        {school.phase}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-muted-foreground">教师端阶梯进度</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {teacherTiers.map((t) => {
                        const reached = progress.reached.includes(t.id)
                        return (
                          <span
                            key={t.id}
                            className={`rounded-md border px-2 py-1 text-[11px] ${
                              reached
                                ? 'border-primary/40 bg-primary/10 font-medium text-primary'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {t.id} {reached ? '已完成' : '未开始'}
                          </span>
                        )
                      })}
                    </div>
                    {progress.nextTier ? (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        下一层：{progress.nextTier}
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">教师端四层已完成</p>
                    )}
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">已交付课程</p>
                      <ul className="mt-1.5 space-y-1 text-sm">
                        {programTitles.map((t) => (
                          <li key={t} className="text-foreground/85">
                            · {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">校本化调整</p>
                      <p className="mt-1.5 text-sm leading-6 text-foreground/85">{school.customization}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg bg-muted/60 p-3 text-sm">
                    <span className="font-medium">下一步：</span>
                    {school.nextStep}
                  </div>

                  <p className="mt-3 text-[11px] text-muted-foreground">
                    已交付教案包 {school.deliveredToolkits.length} 套 · 更新于{' '}
                    {formatDate(school.updatedAt)}
                  </p>
                </article>
              )
            })}
          </div>
        </section>

        <section className="mt-10 border-y border-hairline py-5">
          <h2 className="flex items-center gap-2 text-lg">
            <Compass className="h-5 w-5 text-primary" aria-hidden />
            学校想加入试点？
          </h2>
          <p className="mt-2 text-sm leading-7 text-foreground/85">
            试点不是「先来先得」：我们会先了解学段、学科与现有教研安排，判断现有材料是否需要校本化，
            再确定从哪一层开始。内容不成熟的学校我们也会直说，而不是先接下来再赶工。
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            请通过
            <a
              href="/edu/support"
              className="mx-1 text-primary underline underline-offset-4"
            >
              答疑与反馈
            </a>
            提交学校基本情况（学段、人数、现有教研安排、希望优先解决的问题）。
          </p>
        </section>
      </div>
    </>
  )
}