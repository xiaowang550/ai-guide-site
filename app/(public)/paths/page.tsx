import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Clock, Users } from 'lucide-react'
import { paths } from '@/data'
import { PageHeader } from '@/components/page-header'
import { formatDate } from '@/lib/score'

export const metadata: Metadata = {
  title: '学习路径',
  description:
    '四条路线：零基础入门、职场实践、模型与 Agent 进阶、开发者进阶。按阶段学，每阶段都有可验收的「学完你能做什么」，进度存在本地浏览器。',
  alternates: { canonical: '/paths' },
}

export default function PathsPage() {
  return (
    <>
      <PageHeader
        title="学习路径"
        description="选择适合自己起点的路线。每个阶段都有可完成的练习，进度保存在当前浏览器。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '学习路径' }]}
      />
      <div className="container py-8">
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
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
                <ArrowRight
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </span>
              <p className="mt-2 text-xs text-muted-foreground">
                更新于 {formatDate(p.updatedAt)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
