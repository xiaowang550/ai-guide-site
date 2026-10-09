import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, ClipboardList, ShieldCheck } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = {
  title: '学校服务：从一节课开始',
  description: '初中认识 AI，高中了解与使用，教师围绕备课、练习与评价开展日常教学。',
  alternates: { canonical: '/edu' },
}
const entries = [
  {
    href: '/edu/programs',
    title: '先确定怎么学',
    note: '按初中、高中或教师选择起步路线。',
    action: '看课程路线',
    icon: BookOpen,
  },
  {
    href: '/edu/toolkits',
    title: '准备一节能上的课',
    note: '材料清单、课堂流程与工作单，一起带走。',
    action: '选课程与教案包',
    icon: ClipboardList,
  },
  {
    href: '/edu/policy',
    title: '讲清使用边界',
    note: '用场景理解规则，生成规范与观察记录。',
    action: '整理 AI 使用规范',
    icon: ShieldCheck,
  },
]
export default function EduPage() {
  return (
    <>
      <PageHeader
        className="school-page-heading"
        title="从一节课开始，让 AI 变得可理解、可使用。"
        description="初中先认识，高中再实践；教师从正在发生的教学任务入手。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '学校服务' }]}
      />
      <div className="container py-8">
        <figure className="school-illustration">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/illustrations/school-paths-v1.webp"
            width={1440}
            height={480}
            alt="观察课堂演示、在教师指导下实践、准备日常教案"
          />
          <figcaption>初中：观察与判断　·　高中：辅助与核验　·　教师：备课与复核</figcaption>
        </figure>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {entries.map((entry, index) => (
            <Link href={entry.href} key={entry.href} className="school-kit-card">
              <span className="flex items-center gap-2 text-xs text-primary">
                <entry.icon className="h-5 w-5" aria-hidden />第 {index + 1} 步
              </span>
              <h2 className="mt-4 text-xl">{entry.title}</h2>
              <p className="mb-6 mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                {entry.note}
              </p>
              <span className="section-link">
                {entry.action}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-sm leading-6 text-muted-foreground">
          只有投屏或没有稳定网络，也能从纸面观察活动开始。
          <Link href="/edu/support" className="ml-2 text-primary underline underline-offset-4">
            遇到教学问题，提交反馈
          </Link>
        </p>
      </div>
    </>
  )
}
