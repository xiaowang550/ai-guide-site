import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldQuestion } from 'lucide-react'
import { scenarios, cases } from '@/data'
import { toCaseListItems } from '@/lib/case-list-item'
import { ScenarioWizard, ScenarioWeightTable } from '@/components/scenario-wizard'
import { PageHeader, Section } from '@/components/page-header'

export const metadata: Metadata = {
  title: '场景决策器',
  description:
    '不知道该用哪个 AI？选择你要做的任务和约束条件，立刻得到首选工具、两个备选、组合工作流、可复制提示词与避坑提醒。纯规则引擎，不调用任何大模型 API。',
  alternates: { canonical: '/find' },
}

export default function FindPage() {
  return (
    <>
      <PageHeader
        title="场景决策器"
        description="你不需要先知道工具叫什么。选一个任务、勾几个条件，就会得到「用哪个、为什么、怎么问」三件套。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '场景决策器' }]}
        actions={
          <Link
            href="/about#scoring"
            className="inline-flex h-8 items-center rounded-lg border px-3 text-xs font-medium hover:bg-accent"
          >
            它是怎么算的？
          </Link>
        }
      />

      <div className="container py-8">
        <div className="band mb-6 overflow-hidden rounded-2xl">
          <div className="flex gap-3 p-5 text-sm md:p-6">
            <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <div>
              <p className="band-kicker mb-2">先说清楚</p>
              <p className="measure-wide leading-6 text-foreground/90">
                <strong className="font-semibold">这不是一个 AI。</strong>
                它是一个纯规则引擎：把场景权重归一化，与工具的 14 维能力分加权相乘，再按你勾选的条件加减分。
                同样的输入永远得到同样的结果，所以你随时可以质疑它 —— 也应该质疑它。
                权重表在页面底部公开。
              </p>
            </div>
          </div>
        </div>

        {/*
          案例只传最小投影：完整 CaseStudy 每条带 600 字以上提示词原文，
          整个传进客户端会让 /find 的 JS 从 58.5 kB 涨到 99.7 kB。
          详见 lib/case-list-item.ts 的说明。
        */}
        <ScenarioWizard caseItems={toCaseListItems(cases)} />
      </div>

      <div className="container">
        <Section
          title="场景权重表（公开可查）"
          description="每个场景对 14 个维度的权重，引擎会先归一化再计算。如果你认为某个权重不合理，可以提勘误。"
        >
          <ScenarioWeightTable rules={scenarios} />
        </Section>
      </div>
    </>
  )
}