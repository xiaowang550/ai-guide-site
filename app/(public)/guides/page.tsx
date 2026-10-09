import Link from 'next/link'
import type { Metadata } from 'next'
import { guides, tools } from '@/data'
import { GuideExplorer } from '@/components/guide-explorer'
import { PageHeader } from '@/components/page-header'
import { latestUpdatedAt } from '@/lib/score'
import { UpdatedBadge } from '@/components/updated-badge'
import { lessonSummaries } from '@/data/lesson-summaries'
import { QuickPractice } from '@/components/learning/quick-practice'
import { WorkflowVisual } from '@/components/learning/workflow-visual'
import { ModuleSection } from '@/components/module-visibility'

export const metadata: Metadata = {
  title: '教程：AI 怎么用',
  description:
    '两类教程分开写：通用方法课讲怎么把话说清楚，场景实操课照着做完就能交活。含可复制提示词、预期输出与出错处理。',
  alternates: { canonical: '/guides' },
}

export default function GuidesPage() {
  return (
    <>
      <PageHeader
        title="教程：AI 怎么用"
        description="选一个任务，跟着步骤做出结果。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '教程' }]}
        meta={<UpdatedBadge date={latestUpdatedAt(tools)} prefix="内容更新于" />}
      />
      <div className="container py-8">
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <ModuleSection id="beginner">
            <Link href="/start/" className="rounded-2xl border bg-accent/60 p-6">
              <p className="eyebrow">从零开始 · 进度自动保留</p>
              <h2 className="mt-3 text-xl">零基础一对一</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                对话 → 作图 → 看图 → 语音，小芽带你逐步练习。
              </p>
              <span className="mt-4 inline-block text-sm text-primary">开始或继续学习 →</span>
            </Link>
          </ModuleSection>
          <Link href="/learn/access/" className="rounded-2xl border bg-card p-6">
            <p className="eyebrow">使用前先排除障碍</p>
            <h2 className="mt-3 text-xl">海外工具打不开？</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              排查地区、账号和网络限制，找到可用的替代工具。
            </p>
            <span className="mt-4 inline-block text-sm text-primary">查看使用帮助 →</span>
          </Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 重播需要完整初始化首次体验，不能复用已经关闭的路由状态。 */}
        <a href="/?tour=1" className="mb-8 inline-flex min-h-11 items-center text-sm text-primary">
          重新体验新手动手指引 →
        </a>
        <div className="learning-start">
          <div>
            <p className="eyebrow">不用先读完所有教程</p>
            <h2 className="mt-3 text-2xl">先完成一个小任务。</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              准备材料 → 说清要求 → 核对结果。
            </p>
            <a href="#quick-practice" className="home-button mt-5">
              开始一个练习 →
            </a>
          </div>
          <WorkflowVisual />
        </div>
        <Link
          href="/learn/advanced"
          className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-primary/[0.045] p-5"
        >
          <span>
            <strong className="text-sm">想把 AI 用成工作流？</strong>
            <span className="mt-2 block text-xs text-muted-foreground">
              选模型、搭流程、检查结果。
            </span>
          </span>
          <span className="section-link">查看进阶路线 →</span>
        </Link>
        <QuickPractice />
        <GuideExplorer
          guides={guides.map((g) => ({
            id: g.id,
            title: lessonSummaries[g.id]?.title ?? g.title,
            type: g.type,
            level: g.level,
            durationMin: g.durationMin,
            tools: g.tools,
            outcome: lessonSummaries[g.id]?.outcome ?? g.outcome,
            summary: lessonSummaries[g.id]?.outcome ?? g.summary,
          }))}
          tools={tools.map((t) => ({ id: t.id, name: t.name, logo: t.logo }))}
        />
      </div>
    </>
  )
}
