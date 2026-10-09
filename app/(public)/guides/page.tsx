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
        description="选一件今天要做的事，照着步骤完成，再把方法带回自己的工作。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '教程' }]}
        meta={<UpdatedBadge date={latestUpdatedAt(tools)} prefix="内容更新于" />}
      />
      <div className="container py-8">
        <div className="learning-start">
          <div>
            <p className="eyebrow">不用先读完所有教程</p>
            <h2 className="mt-3 text-2xl">先完成一个小任务。</h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              准备材料，说清要求，核对结果。
              <br />
              这套方法，写周报、做汇报、读资料都能用。
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
              从模型选型到 Agent 验收，按顺序做六个进阶练习。
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
