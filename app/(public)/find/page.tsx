import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldQuestion } from 'lucide-react'
import { scenarios, cases } from '@/data'
import { toCaseListItems } from '@/lib/case-list-item'
import { ScenarioWizard } from '@/components/scenario-wizard'
import { ScenarioWeightGuide } from '@/components/scenario-weight-guide'
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
                <strong className="font-semibold">先选任务，再帮你选工具。</strong>
                我们从工具库中找出符合你条件的工具，按任务所需的能力比较，再给出推荐理由。
                写文章更看重写作，读长文档更看重理解；免费、直连、隐私等条件也会影响结果。
                <a
                  href="#recommendation-basis"
                  className="ml-1 text-primary underline underline-offset-4"
                >
                  查看各任务的推荐依据
                </a>
                。
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
          title="推荐工具时，我们重点看什么？"
          description="按你要完成的任务，公开说明推荐侧重点。换一个任务，适合的工具也可能不同。"
        >
          <ScenarioWeightGuide rules={scenarios} />
        </Section>
      </div>
    </>
  )
}
