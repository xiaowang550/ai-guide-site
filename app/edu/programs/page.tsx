import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, FileStack, MapPin } from 'lucide-react'
import { getTools } from '@/data'
import { eduPrograms, eduTiers } from '@/data/edu-programs'
import { eduToolkits } from '@/data/edu-toolkits'
import { CoverArt } from '@/components/cover-art'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Ladder } from '@/components/edu/ladder'
import { formatDate } from '@/lib/score'
import { isCurrent } from '@/lib/edu'

export const metadata: Metadata = {
  title: '课程体系：教师四层 + 学生三层',
  description:
    '教师端从「知道」到「会用」再到提效与课堂融合，学生端从认知到应用到素养。每一层配套讲义、演示案例、实操任务与常见错误清单。',
  alternates: { canonical: '/edu/programs' },
}

export default function ProgramsPage() {
  const teacherTiers = eduTiers.filter((t) => t.audience === 'teacher')
  const studentTiers = eduTiers.filter((t) => t.audience === 'student')

  return (
    <>
      <PageHeader
        title="课程体系"
        description="每一门课都以「当天能带走什么」为验收标准：讲义、演示案例、实操任务、常见错误清单缺一不可。课程与教案包分离，便于按需组合。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: '课程体系' },
        ]}
      />

      <div className="container py-8">
        <section className="mb-10">
          <h2 className="mb-1 text-xl">教师端四层阶梯</h2>
          <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            教师端的起点就是本地最常见的状态：知道，却没有用过。因此第一层不能跳过。
          </p>
          <Ladder tiers={eduTiers} programs={eduPrograms} audience="teacher" />
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {teacherTiers.map((t) => {
              const items = eduPrograms.filter((p) => p.tier === t.id)
              return (
                <li key={t.id} className="border-t border-hairline pt-4">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.goal}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    对应课程：{items.map((p) => `${p.title}（${p.lessons} 课时）`).join('、')}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-1 text-xl">学生端三层阶梯</h2>
          <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            先建立判断力，再谈使用；素养层不是附加内容，而是学生能否长期正确使用 AI 的前提。
          </p>
          <Ladder tiers={eduTiers} programs={eduPrograms} audience="student" />
          <ul className="mt-4 grid gap-3 md:grid-cols-3">
            {studentTiers.map((t) => {
              const items = eduPrograms.filter((p) => p.tier === t.id)
              return (
                <li key={t.id} className="border-t border-hairline pt-4">
                  <p className="text-sm font-semibold">{t.name}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.goal}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    对应课程：{items.map((p) => p.title).join('、')}
                  </p>
                </li>
              )
            })}
          </ul>
        </section>

        <section>
          <h2 className="mb-1 text-xl">全部课程</h2>
          <p className="mb-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            每门课标注版本与适用时间；已标注「已更新」的课程会给出替代它的新课程，避免各校拿到过期材料。
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {eduPrograms.map((p, i) => {
              const toolkits = eduToolkits.filter((t) => t.programId === p.id)
              const current = isCurrent(p.validFrom, p.validTo)
              return (
                <Link
                  key={p.id}
                  href={`/edu/programs/${p.id}`}
                  className="media-card spotlight reveal group"
                  style={{ ['--d' as string]: `${Math.min(i, 8) * 45}ms` }}
                >
                  <CoverArt
                    id={p.id}
                    eyebrow={`${p.stage} · ${p.subject}`}
                    index={i + 1}
                    centerLabel={p.tier}
                    tools={getTools(
                      p.relatedRefs.filter((r) => r.kind === 'tool').map((r) => r.id)
                    )}
                  />
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{p.format}</Badge>
                      <Badge variant="outline">{p.lessons} 课时</Badge>
                      {!current ? <Badge variant="danger">已更新，请查新版</Badge> : null}
                    </div>
                    <h3 className="mt-2.5 text-[15px] font-semibold leading-snug">{p.title}</h3>
                    <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-6 text-muted-foreground">
                      {p.outcome}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" aria-hidden />
                        {p.audience}
                      </span>
                      <span>{p.version}</span>
                      {toolkits.length > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <FileStack className="h-3 w-3" aria-hidden />
                          教案包 {toolkits.length} 套
                        </span>
                      ) : null}
                    </div>
                    <span className="mt-3 inline-flex items-center gap-1 border-t border-hairline pt-2.5 text-[11px] text-foreground/70 transition-colors group-hover:text-primary">
                      查看课程大纲
                      <ArrowRight
                        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                      <span className="ml-auto">复核于 {formatDate(p.updatedAt)}</span>
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      </div>
    </>
  )
}