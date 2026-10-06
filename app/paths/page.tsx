import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock, Users } from 'lucide-react'
import { paths } from '@/data'
import { PageHeader } from '@/components/page-header'
import { formatDate } from '@/lib/score'

export const metadata: Metadata = {
  title: '学习路径',
  description: '三条路线：零基础 7 天入门、职场提效 30 天、进阶创作者。按阶段学，每阶段都有可验收的「学完你能做什么」，进度存在本地浏览器。',
  alternates: { canonical: '/paths' },
}

export default function PathsPage() {
  return (
    <>
      <PageHeader
        title="学习路径"
        description="不知道按什么顺序学，就照着路径走。每条路径拆成阶段，每个阶段都有明确的验收标准 —— 不是「看完了」，而是「你能做到什么」。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '学习路径' }]}
      />
      <div className="container py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {paths.map((p, i) => (
            <Link
              key={p.id}
              href={`/paths/${p.id}`}
              className="spotlight reveal group flex flex-col border-b border-hairline pb-5 transition-colors hover:border-foreground/20"
              style={{ ['--d' as string]: `${i * 60}ms` }}
            >
              <h2 className="text-lg font-semibold">{p.title}</h2>
              <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="h-3 w-3" aria-hidden />
                {p.audience}
              </p>
              <p className="mt-3 flex-1 text-sm leading-6 text-foreground/80">{p.summary}</p>
              <p className="mt-4 inline-flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" aria-hidden />
                  {p.estHours} 小时
                </span>
                <span>{p.phases.length} 个阶段</span>
                <span>{p.phases.reduce((s, ph) => s + ph.items.length, 0)} 个条目</span>
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                开始这条路径
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
              <p className="mt-2 text-[11px] text-muted-foreground">更新于 {formatDate(p.updatedAt)}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}