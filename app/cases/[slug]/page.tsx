import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, Quote, Target, TriangleAlert, Wand2 } from 'lucide-react'
import { casesById, cases, getTools } from '@/data'
import { REUSABILITY_LABELS } from '@/lib/site'
import { formatDate } from '@/lib/score'
import { ToolLogo } from '@/components/tool-logo'
import { CoverArt } from '@/components/cover-art'
import { UpdatedBadge } from '@/components/updated-badge'
import { PrintButton } from '@/components/print-button'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'

export function generateStaticParams() {
  return cases.map((c) => ({ slug: c.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const c = casesById[slug]
  if (!c) return { title: '案例不存在' }
  return {
    title: c.title,
    description: c.summary ?? c.scenario,
    alternates: { canonical: `/cases/${c.id}` },
  }
}

export default async function CaseDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = casesById[slug]
  if (!c) notFound()

  const usedTools = getTools(c.tools)
  const others = cases.filter((x) => x.id !== c.id && (x.industry === c.industry || x.role === c.role)).slice(0, 3)

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '案例', href: '/cases' },
          { label: c.title },
        ]}
        title={c.title}
        description={c.scenario}
        meta={
          <>
            <Badge variant="secondary">{c.industry}</Badge>
            <Badge variant="outline">{c.role}</Badge>
            <Badge variant={c.reusability === 'high' ? 'success' : 'secondary'}>
              可复用程度 {REUSABILITY_LABELS[c.reusability]}
            </Badge>
            <UpdatedBadge date={c.updatedAt} />
          </>
        }
      />

      <div className="container pt-8">
        {/* 窄封面：与列表页媒体卡共用同一套封面视觉，保证列表↔详情连贯 */}
        <CoverArt
          id={c.id}
          eyebrow={`${c.industry} · ${c.role}`}
          tools={usedTools}
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
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0 space-y-8">
            <Section title="原来的做法与痛点" icon={<TriangleAlert className="h-4 w-4" aria-hidden />}>
              <p className="leading-7 text-foreground/85">{c.painPoint}</p>
            </Section>

            <Section title="实际用的提示词（原文）" icon={<Quote className="h-4 w-4" aria-hidden />}>
              <div className="rounded-xl border bg-muted/40 p-4">
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[13px] leading-6 text-foreground/90">
                  {c.prompt}
                </pre>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                这是这个案例最有价值的部分：注意它把「背景、约束、输出格式」写在了哪里。
              </p>
            </Section>

            <Section title="实际结果" icon={<Target className="h-4 w-4" aria-hidden />}>
              <p className="leading-7 text-foreground/85">{c.result}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                花费时间：{c.timeSpent}
              </p>
            </Section>

            <Section title="踩过的坑">
              <ul className="space-y-2.5">
                {c.pitfalls.map((p) => (
                  <li
                    key={p}
                    className="border-l-2 border-amber-500/50 bg-amber-500/5 p-3.5 text-sm leading-6 text-foreground/85"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </Section>

            <p className="text-xs text-muted-foreground">
              本案例更新于 {formatDate(c.updatedAt)}。结果数据来自实际使用，工具能力更新后表现可能变化。
            </p>
          </article>

          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start print:hidden">
            <div className="border-b border-hairline pb-5">
              <h2 className="text-sm font-semibold">用到的工具</h2>
              <ul className="mt-3 space-y-3">
                {usedTools.map((t) => (
                  <li key={t.id} className="flex items-start gap-2.5">
                    <ToolLogo src={t.logo} alt={`${t.name} 标志`} size={28} />
                    <span className="min-w-0 flex-1">
                      <Link href={`/tools/${t.id}`} className="text-sm font-medium hover:text-primary">
                        {t.name}
                      </Link>
                      <span className="block text-[11px] text-muted-foreground">
                        综合分 {t.overallScore}/5
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                href="/find"
                className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Wand2 className="h-3 w-3" aria-hidden />
                换个工具会怎样？用场景决策器
              </Link>
            </div>

            {others.length > 0 ? (
              <div className="border-b border-hairline pb-5">
                <h2 className="text-sm font-semibold">同行业 / 同岗位案例</h2>
                <ul className="mt-3 space-y-2">
                  {others.map((o) => (
                    <li key={o.id}>
                      <Link
                        href={`/cases/${o.id}`}
                        className="block border-t border-hairline py-3 text-sm hover:border-primary/40 hover:bg-accent/30"
                      >
                        <span className="block font-medium">{o.title}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {o.industry} · {o.role}
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

function Section({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-lg">
        {icon}
        {title}
      </h2>
      <div className="text-[15px] leading-7 text-foreground/85">{children}</div>
    </section>
  )
}