import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, PenLine } from 'lucide-react'
import { eduBriefingsById, eduBriefings } from '@/data/edu-briefings'
import { formatDate } from '@/lib/score'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function generateStaticParams() {
  return eduBriefings.map((b) => ({ slug: b.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const b = eduBriefingsById[slug]
  if (!b) return { title: '简报不存在' }
  return {
    title: `${b.issue}：${b.summary}`,
    description: `${b.changes.length} 项变更说明、对学校的影响与建议动作。`,
    alternates: { canonical: `/edu/briefings/${b.id}` },
  }
}

const KIND_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
  工具变更: 'secondary',
  能力变更: 'success',
  政策与规范: 'default',
  风险提示: 'danger',
  方法更新: 'warning',
}

const PRIORITY_LABEL = { high: '优先', medium: '建议', low: '可选' } as const
const OWNER_LABEL = {
  教研组: '教研组',
  班主任: '班主任',
  任课教师: '任课教师',
  学校管理者: '学校管理者',
  'AI 教育部门': 'AI 教育部门',
} as const

export default async function BriefingDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const briefing = eduBriefingsById[slug]
  if (!briefing) notFound()

  const currentIndex = eduBriefings.findIndex((b) => b.id === briefing.id)
  const newer = currentIndex > 0 ? eduBriefings[currentIndex - 1] : null
  const older = currentIndex < eduBriefings.length - 1 ? eduBriefings[currentIndex + 1] : null

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: '定期简报', href: '/edu/briefings' },
          { label: briefing.issue },
        ]}
        title={briefing.issue}
        description={briefing.summary}
        meta={
          <>
            <Badge variant="secondary">
              {briefing.audience === 'both' ? '教师与学校通用' : briefing.audience === 'teachers' ? '面向教师' : '面向学校管理者'}
            </Badge>
            <time dateTime={briefing.date} className="text-xs text-muted-foreground">
              {formatDate(briefing.date)}
            </time>
          </>
        }
      />

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            {/* 变了什么 */}
            <section>
              <h2 className="text-xl">本期变了什么</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                每条都写清「变化本身」与「我们建议怎么应对」，不复述行业新闻。
              </p>
              <div className="mt-4 space-y-3">
                {briefing.changes.map((c) => (
                  <div key={c.title} className="border-b border-hairline pb-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={KIND_VARIANT[c.kind] ?? 'secondary'}>{c.kind}</Badge>
                      <h3 className="text-base font-semibold">{c.title}</h3>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-foreground/85">{c.detail}</p>
                    <p className="mt-2.5 rounded-lg bg-accent/40 p-3 text-sm leading-6">
                      <span className="font-medium">建议动作：</span>
                      {c.action}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 意味着什么 */}
            <section className="mt-8">
              <h2 className="text-xl">对学校意味着什么</h2>
              <ul className="mt-3 space-y-2">
                {briefing.implications.map((im) => (
                  <li
                    key={im}
                    className="flex gap-2 border-l-2 border-primary/30 bg-accent/30 p-3.5 text-sm leading-6 text-foreground/90"
                  >
                    <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                    {im}
                  </li>
                ))}
              </ul>
            </section>

            {/* 建议动作 */}
            <section className="mt-8">
              <h2 className="text-xl">建议采取的动作</h2>
              <div className="mt-3 overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">
                        动作
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">
                        责任方
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">
                        优先级
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {briefing.actions.map((a) => (
                      <tr key={a.title} className="border-t">
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium">{a.title}</p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{a.detail}</p>
                        </td>
                        <td className="px-4 py-3 align-top text-muted-foreground">
                          {OWNER_LABEL[a.owner]}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <Badge
                            variant={
                              a.priority === 'high'
                                ? 'danger'
                                : a.priority === 'medium'
                                  ? 'warning'
                                  : 'outline'
                            }
                          >
                            {PRIORITY_LABEL[a.priority]}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {briefing.editorNote ? (
              <section className="mt-8 flex gap-3 rounded-xl border bg-muted/40 p-4">
                <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <div>
                  <p className="text-sm font-semibold">编辑手记</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{briefing.editorNote}</p>
                </div>
              </section>
            ) : null}

            {briefing.affectedRefs.length > 0 ? (
              <section className="mt-8 border-t pt-6">
                <h2 className="text-base">本期涉及的站内内容</h2>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {briefing.affectedRefs.map((href) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs hover:border-primary/40 hover:bg-accent/30"
                      >
                        {href}
                        <ArrowRight className="h-3 w-3" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <nav className="mt-8 flex flex-wrap gap-2 border-t pt-6" aria-label="简报翻页">
              {newer ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/edu/briefings/${newer.id}`}>← 更近一期：{newer.issue}</Link>
                </Button>
              ) : null}
              {older ? (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/edu/briefings/${older.id}`}>更早一期：{older.issue}</Link>
                </Button>
              ) : null}
              <Button asChild variant="ghost" size="sm">
                <Link href="/edu/briefings">全部简报</Link>
              </Button>
            </nav>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="border-b border-hairline pb-5 text-sm">
              <h2 className="text-sm font-semibold">本期速览</h2>
              <dl className="mt-3 space-y-2">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">期号</dt>
                  <dd>{briefing.issue}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">变更条目</dt>
                  <dd>{briefing.changes.length} 条</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">建议动作</dt>
                  <dd>{briefing.actions.length} 项</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">发布时间</dt>
                  <dd>{briefing.date}</dd>
                </div>
              </dl>
            </div>

            <div className="border-b border-hairline pb-5 text-xs leading-6 text-muted-foreground">
              简报不是产品公告。写不出「对学校意味着什么」的变更，我们就不写进简报 ——
              只留在
              <Link href="/updates" className="mx-1 text-primary underline underline-offset-4">
                更新雷达
              </Link>
               的技术日志里。
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}