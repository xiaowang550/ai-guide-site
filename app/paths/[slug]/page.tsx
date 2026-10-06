import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, Users } from 'lucide-react'
import { paths, pathsById } from '@/data'
import { PathProgress } from '@/components/path-progress'
import { PageHeader } from '@/components/page-header'
import { formatDate } from '@/lib/score'
import { UpdatedBadge } from '@/components/updated-badge'

export function generateStaticParams() {
  return paths.map((p) => ({ slug: p.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const path = pathsById[slug]
  if (!path) return { title: '学习路径不存在' }
  return {
    title: path.title,
    description: path.summary,
    alternates: { canonical: `/paths/${path.id}` },
  }
}

export default async function PathDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const path = pathsById[slug]
  if (!path) notFound()

  const others = paths.filter((p) => p.id !== path.id)

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '学习路径', href: '/paths' },
          { label: path.title },
        ]}
        title={path.title}
        description={path.summary}
        meta={
          <>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" aria-hidden />
              {path.audience}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" aria-hidden />
              预计 {path.estHours} 小时
            </span>
            <UpdatedBadge date={path.updatedAt} />
          </>
        }
      />

      <div className="container py-8">
        <PathProgress path={path} />

        <div className="mt-10 border-t pt-8">
          <h2 className="text-lg">其他路径</h2>
          <ul className="mt-3 space-y-2">
            {others.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/paths/${p.id}`}
                  className="flex items-baseline justify-between gap-3 border-t border-hairline py-3.5 text-sm hover:border-primary/40 hover:bg-accent/30"
                >
                  <span>
                    <span className="font-medium">{p.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">{p.audience}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{p.estHours} 小时</span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted-foreground">
            本路径更新于 {formatDate(path.updatedAt)}。路径里的条目全部指向站内已有的概念页、教程页与工具详情页，
            不会重复讲一遍内容。
          </p>
        </div>
      </div>
    </>
  )
}