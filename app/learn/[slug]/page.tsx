import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowRight, HelpCircle, Lightbulb, Link2, Quote, TriangleAlert } from 'lucide-react'
import { concepts, conceptsById, glossary } from '@/data'
import { DIFFICULTY_LABELS } from '@/lib/site'
import { formatDate } from '@/lib/score'
import { glossaryForConcept } from '@/lib/glossary'
import { UpdatedBadge } from '@/components/updated-badge'
import { PrintButton } from '@/components/print-button'
import { PageHeader } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function generateStaticParams() {
  return concepts.map((c) => ({ slug: c.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const concept = conceptsById[slug]
  if (!concept) return { title: '概念不存在' }
  return {
    title: `${concept.term}${concept.termEn ? `（${concept.termEn}）` : ''}`,
    description: concept.definition,
    alternates: { canonical: `/learn/${concept.id}` },
  }
}

export default async function ConceptPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const concept = conceptsById[slug]
  if (!concept) notFound()

  const related = concept.related.map((id) => conceptsById[id]).filter(Boolean)
  const terms = glossaryForConcept(glossary, concept.id)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: concept.term,
    alternateName: concept.termEn,
    description: concept.definition,
    inDefinedTermSet: 'https://example.com/learn/glossary',
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '知识库', href: '/learn' },
          { label: concept.term },
        ]}
        title={concept.term}
        description={concept.termEn ? `${concept.termEn} · ${concept.category}` : concept.category}
        meta={
          <>
            <Badge variant={concept.difficulty === 'beginner' ? 'success' : 'secondary'}>
              {DIFFICULTY_LABELS[concept.difficulty]}
            </Badge>
            <Badge variant="outline">{concept.category}</Badge>
            <UpdatedBadge date={concept.updatedAt} />
          </>
        }
      />

      
      {/* 打印：纸面上只保留内容，导航与按钮不输出 */}
      <div className="container print:hidden">
        <div className="flex justify-end pb-2">
          <PrintButton />
        </div>
      </div>
<div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <article className="min-w-0">
            {/* 1 是什么 */}
            <Block icon={<Lightbulb className="h-4 w-4" aria-hidden />} title="它是什么">
              <p className="text-base leading-8 text-foreground">{concept.definition}</p>
            </Block>

            {/* 2 为什么重要 */}
            <Block icon={<HelpCircle className="h-4 w-4" aria-hidden />} title="为什么重要">
              <p className="leading-7">{concept.whyItMatters}</p>
            </Block>

            {/* 3 打个比方 */}
            <Block icon={<Quote className="h-4 w-4" aria-hidden />} title="打个比方">
              <p className="leading-7 text-foreground/90">{concept.analogy}</p>
            </Block>

            {/* 4 举个例子 */}
            <Block title="举个例子">
              <p className="leading-7">{concept.example}</p>
            </Block>

            {/* 5 常见误解 */}
            <Block icon={<TriangleAlert className="h-4 w-4" aria-hidden />} title="常见误解">
              <ul className="space-y-3">
                {concept.misconceptions.map((m) => (
                  <li key={m} className="border-l-2 border-amber-500/50 bg-amber-500/5 p-3.5">
                    <p className="text-sm leading-6 text-foreground/90">{m}</p>
                  </li>
                ))}
              </ul>
            </Block>

            {/* 6 延伸阅读 */}
            <Block icon={<Link2 className="h-4 w-4" aria-hidden />} title="延伸阅读（相关概念）">
              {related.length > 0 ? (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {related.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/learn/${r.id}`}
                        className="flex items-start gap-2 border-t border-hairline py-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent/30"
                      >
                        <span className="min-w-0">
                          <span className="block font-medium">{r.term}</span>
                          <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                            {r.definition}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">暂无关联概念。</p>
              )}
            </Block>

            <div className="mt-8 flex flex-wrap gap-2 border-t pt-6">
              <Button asChild variant="outline" size="sm">
                <Link href="/learn">← 返回知识库</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/learn/glossary">查看术语表</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/find">
                  用这个场景选个工具
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              本页内容更新于 {formatDate(concept.updatedAt)}。概念条目会随模型能力变化而修订。
            </p>
          </article>

          {/* 侧栏 */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start print:hidden">
            {terms.length > 0 ? (
              <div className="border-b border-hairline pb-5">
                <h2 className="text-sm font-semibold">本页相关术语</h2>
                <ul className="mt-3 space-y-2.5">
                  {terms.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/learn/glossary#${t.id}`}
                        className="block text-sm font-medium hover:text-primary"
                      >
                        {t.term}
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          {t.termEn}
                        </span>
                      </Link>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{t.short}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="border-b border-hairline pb-5 text-sm">
              <h2 className="text-sm font-semibold">学完这个概念，去做什么</h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/guides" className="text-primary hover:underline">
                    → 去做一篇实操教程
                  </Link>
                </li>
                <li>
                  <Link href="/tools" className="text-primary hover:underline">
                    → 看看哪些工具强在这个维度
                  </Link>
                </li>
                <li>
                  <Link href="/paths/zero-to-pro" className="text-primary hover:underline">
                    → 按顺序学完 7 天入门路径
                  </Link>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

function Block({
  title,
  children,
  icon,
}: {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
}) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="mb-3 flex items-center gap-2 text-lg">
        {icon}
        {title}
      </h2>
      <div className="text-[15px] leading-7 text-foreground/85">{children}</div>
    </section>
  )
}