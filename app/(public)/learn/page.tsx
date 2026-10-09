import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen, ListOrdered } from 'lucide-react'
import { concepts, glossary } from '@/data'
import { DIFFICULTY_LABELS } from '@/lib/site'
import { glossaryForConcept } from '@/lib/glossary'
import { PageHeader, Section } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: '知识库：AI 是什么',
  description:
    '把 AI 黑话翻译成人话：大模型、提示词、Token、幻觉、RAG、微调、多模态、Agent、MCP、思维链……每个概念都有生活比喻、具体例子和常见误解。',
  alternates: { canonical: '/learn' },
}

/** 入门路线：完全不懂的人，20 分钟读完这 8 篇就够用 */
const STARTER_PATH = [
  'llm',
  'prompt',
  'token',
  'context-window',
  'hallucination',
  'multimodal',
  'chain-of-thought',
  'rag',
]

export default function LearnPage() {
  const byCategory = concepts.reduce<Record<string, typeof concepts>>((acc, c) => {
    ;(acc[c.category] ||= []).push(c)
    return acc
  }, {})

  const starter = STARTER_PATH.map((id) => concepts.find((c) => c.id === id)).filter(Boolean)

  return (
    <>
      <PageHeader
        title="知识库：AI 到底是什么"
        description="用日常例子读懂 AI，再动手练习。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '知识库' }]}
        actions={
          <Link
            href="/learn/glossary"
            className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium hover:bg-accent"
          >
            <ListOrdered className="h-3.5 w-3.5" aria-hidden />
            术语表（{glossary.length} 条）
          </Link>
        }
      />

      <div className="container py-8">
        {/* 入门路线 */}
        <section className="mb-10 border-b border-hairline pb-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden />
            零基础，从这 8 篇开始
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            先认识概念，再练一次提问。
          </p>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {starter.map((c, i) =>
              c ? (
                <li key={c.id}>
                  <Link
                    href={`/learn/${c.id}`}
                    className="flex items-start gap-3 border-t border-hairline py-3 transition-colors hover:border-primary/40 hover:bg-accent/30"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {c.term}
                        {c.termEn ? (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            {c.termEn}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {c.definition}
                      </span>
                    </span>
                  </Link>
                </li>
              ) : null,
            )}
          </ol>
          <Link
            href="/guides/prompt-basics"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            去练习：把提示词说清楚
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </section>
        <Link
          href="/learn/advanced"
          className="mb-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-primary/[0.045] p-6"
        >
          <div>
            <p className="text-xs font-medium text-primary">已经会基本提问？</p>
            <h2 className="mt-2 text-lg">继续学模型与 Agent 工作流</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              配合图解，练习选模型、搭流程和核对结果。
            </p>
          </div>
          <span className="section-link">进入进阶学习 →</span>
        </Link>

        {/* 概念分类导航 */}
        {Object.entries(byCategory).map(([category, items]) => (
          <Section key={category} title={category} description={`${items.length} 个概念`}>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((c, i) => {
                const terms = glossaryForConcept(glossary, c.id)
                return (
                  <Link
                    key={c.id}
                    href={`/learn/${c.id}`}
                    className="learning-card group"
                    style={{ ['--d' as string]: `${Math.min(i, 8) * 45}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold">
                        {c.term}
                        {c.termEn ? (
                          <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                            {c.termEn}
                          </span>
                        ) : null}
                      </h3>
                      <Badge
                        variant={
                          c.difficulty === 'beginner'
                            ? 'success'
                            : c.difficulty === 'intermediate'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {DIFFICULTY_LABELS[c.difficulty]}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm leading-6 text-foreground/80">
                      {c.definition}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {c.related.length} 个关联概念
                      {terms.length > 0 ? ` · 相关术语 ${terms.length} 条` : ''}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary">
                      读这一篇
                      <ArrowRight
                        className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </Link>
                )
              })}
            </div>
          </Section>
        ))}
      </div>
    </>
  )
}
