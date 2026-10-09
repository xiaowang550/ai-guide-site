import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { eduBriefings } from '@/data/edu-briefings'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/score'

export const metadata: Metadata = {
  title: '定期简报：这一期变了什么',
  description:
    '面向教师与学校管理者的短简报：本期工具与用法发生了什么变化、对我们意味着什么、建议采取什么动作。内容维护是固定动作，不是可选项。',
  alternates: { canonical: '/edu/briefings' },
}

const KIND_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
  工具变更: 'secondary',
  能力变更: 'success',
  政策与规范: 'default',
  风险提示: 'danger',
  方法更新: 'warning',
}

const AUDIENCE_LABEL = { teachers: '教师', schools: '学校管理者', both: '通用' } as const

export default function BriefingsPage() {
  return (
    <>
      <PageHeader
        title="定期简报"
        description="内容会不会过时，不能依赖个人自觉，必须变成部门的固定动作。每期只写四件事：变了什么、意味着什么、我们改了什么、建议你做什么。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: '定期简报' },
        ]}
      />

      <div className="container py-8">
        <div className="space-y-4">
          {eduBriefings.map((b) => (
            <Link
              key={b.id}
              href={`/edu/briefings/${b.id}`}
              className="group block border-b border-hairline pb-5 transition-colors hover:border-primary/50"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{b.issue}</Badge>
                <Badge variant="outline">{AUDIENCE_LABEL[b.audience]}</Badge>
                <time dateTime={b.date} className="text-xs text-muted-foreground">
                  {formatDate(b.date)}
                </time>
              </div>
              <h2 className="mt-3 text-base font-semibold leading-snug">{b.summary}</h2>
              <ul className="mt-3 space-y-1.5">
                {b.changes.slice(0, 3).map((c) => (
                  <li key={c.title} className="flex flex-wrap items-baseline gap-2 text-sm">
                    <Badge variant={KIND_VARIANT[c.kind] ?? 'secondary'} className="shrink-0">
                      {c.kind}
                    </Badge>
                    <span className="text-foreground/85">{c.title}</span>
                  </li>
                ))}
              </ul>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                查看完整简报（{b.actions.length} 项建议动作）
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-8 border-y border-hairline py-5 text-xs leading-6 text-muted-foreground">
          简报与主站的
          <Link href="/updates" className="mx-1 text-primary underline underline-offset-4">
            更新雷达
          </Link>
           分工不同：更新雷达记录全站数据变更的技术日志，简报只写「对学校意味着什么」与「建议你做什么」。
          如果某份课程或教案包在简报中被点名，我们会同步更新它的版本号与适用时间。
        </p>
      </div>
    </>
  )
}