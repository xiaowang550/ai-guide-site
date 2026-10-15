import { PageRegions, RegionSlot } from '@/components/page-regions'
import '@/app/styles/reference-hero.css'
import '@/app/styles/reference-knowledge.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  ListOrdered,
  Box,
  MessageSquare,
  FileText,
  ScanEye,
  Image,
  Workflow,
  Database,
  Layers,
} from 'lucide-react'
import { concepts, glossary } from '@/data'
import { DIFFICULTY_LABELS } from '@/lib/site'
import { glossaryForConcept } from '@/lib/glossary'
import { PageHeader, Section } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { ExplorationAside } from '@/components/exploration-aside'

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
      <RegionSlot moduleId="knowledge" id="header">
        <PageHeader
          illustrated
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
      </RegionSlot>
      <PageRegions
        moduleId="knowledge"
        sections={[
          {
            id: 'content',
            content: (
              <>
                <div className="discovery-layout container py-8">
                  <div className="min-w-0">
                    {/* 入门路线 */}
                    <section className="starter-panel mb-8">
                      <h2 className="flex items-center gap-2 text-lg">
                        <BookOpen className="h-5 w-5 text-primary" aria-hidden />
                        零基础，从这 8 篇开始
                      </h2>
                      <p className="mt-1.5 text-sm text-muted-foreground">
                        先认识概念，再练一次提问。
                      </p>
                      <ol className="starter-grid">
                        {starter.map((c, i) => {
                          if (!c) return null
                          const Icon = [
                            Box,
                            MessageSquare,
                            FileText,
                            Layers,
                            ScanEye,
                            Image,
                            Workflow,
                            Database,
                          ][i]
                          const questions = [
                            'AI 的“大脑”怎样工作？',
                            '如何和 AI 高效对话？',
                            'AI 读懂文字的基本单位',
                            'AI 能记住多长的内容？',
                            '为什么 AI 会说错？',
                            '让 AI 看图、听声音',
                            '如何一步步解决问题？',
                            '让回答参考外部资料',
                          ]
                          return (
                            <li key={c.id}>
                              <Link href={`/learn/${c.id}`}>
                                <Icon size={25} />
                                <strong className="text-sm">{c.term}</strong>
                                <p>{questions[i]}</p>
                                <ArrowRight size={18} className="starter-arrow" />
                              </Link>
                            </li>
                          )
                        })}
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
                      <Section
                        key={category}
                        title={category}
                        description={`${items.length} 个概念`}
                      >
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
                  <ExplorationAside />
                </div>
              </>
            ),
          },
        ]}
      />
    </>
  )
}
