import { PageRegions, RegionSlot } from '@/components/page-regions'
import '@/app/styles/reference-hero.css'
import '@/app/styles/reference-guides.css'
import '@/app/styles/reference-paths.css'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, BriefcaseBusiness, Feather, GraduationCap, Workflow } from 'lucide-react'
import { guides, paths, tools } from '@/data'
import { GuideExplorer } from '@/components/guide-explorer'
import { PageHeader } from '@/components/page-header'
import { LearningEntries } from '@/components/reference-art'
import { PathCard } from '@/components/path-card'
import { latestUpdatedAt } from '@/lib/score'
import { UpdatedBadge } from '@/components/updated-badge'
import { lessonSummaries } from '@/data/lesson-summaries'
import { QuickPractice } from '@/components/learning/quick-practice'
import { ModuleSection } from '@/components/module-visibility'
export const metadata: Metadata = {
  title: '教程：AI 怎么用',
  description: '从零基础到进阶，选一个任务，跟着步骤做出结果。',
  alternates: { canonical: '/guides' },
}
export default function GuidesPage() {
  return (
    <>
      <RegionSlot moduleId="guides" id="header">
        <PageHeader
          illustrated
          title="教程：从不会用，到会用、会判断、会产出"
          description="系统、实用、可操作。从基础认知到高阶应用，把 AI 用到学习和工作里。"
          meta={<UpdatedBadge date={latestUpdatedAt(tools)} prefix="内容更新于" />}
          aside={
            <>
              <h2>推荐学习入口</h2>
              <LearningEntries />
            </>
          }
        />
      </RegionSlot>
      <div className="container py-8">
        <PageRegions
          moduleId="guides"
          sections={[
            {
              id: 'entries',
              content: (
                <div className="topic-entries">
                  {[
                    {
                      href: '/start/',
                      title: '零基础入门',
                      text: '对话、作图、看图、语音，手把手练习',
                      icon: GraduationCap,
                    },
                    {
                      href: '/guides/prompt-basics',
                      title: '提示词方法',
                      text: '说清要求，获得更好的结果',
                      icon: Feather,
                    },
                    {
                      href: '/guides/long-pdf-summary',
                      title: '长文理解',
                      text: '读懂、整理和核对长文档',
                      icon: BookOpen,
                    },
                    {
                      href: '/paths/workplace-30d',
                      title: '办公提效',
                      text: '写作、表格、汇报与沟通',
                      icon: BriefcaseBusiness,
                    },
                    {
                      href: '/learn/advanced',
                      title: 'Agent 进阶',
                      text: '选模型、搭流程、检查结果',
                      icon: Workflow,
                    },
                  ].map(({ href, title, text, icon: Icon }) => (
                    <Link key={href} href={href}>
                      <Icon size={28} />
                      <span>
                        <strong>{title}</strong>
                        <small>{text}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              ),
            },
            {
              id: 'beginner',
              content: (
                <ModuleSection id="beginner">
                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
                    <span>
                      <strong>随时继续零基础一对一</strong>
                      <small className="mt-1 block text-sm text-muted-foreground">
                        小芽陪你练习，进度自动保留。
                      </small>
                    </span>
                    <Link className="home-button" href="/start/">
                      开始或继续学习 →
                    </Link>
                  </div>
                </ModuleSection>
              ),
            },
            {
              id: 'paths',
              content: (
                <section className="mb-8" aria-label="精选学习路径">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="text-2xl font-semibold">精选学习路径</h2>
                    <Link href="/paths" className="section-link">
                      查看全部路径 →
                    </Link>
                  </div>
                  <div className="path-grid">
                    {paths.map((path, index) => (
                      <PathCard key={path.id} path={path} index={index} compact />
                    ))}
                  </div>
                </section>
              ),
            },
            {
              id: 'help',
              content: (
                <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl bg-accent/40 px-5 py-3">
                  <Link href="/learn/access/" className="section-link">
                    海外工具打不开？查看使用帮助 →
                  </Link>
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- 完整初始化首次动手指引 */}
                  <a href="/?tour=1" className="section-link">
                    重新体验新手动手指引 →
                  </a>
                </div>
              ),
            },
            {
              id: 'practice',
              content: (
                <details className="mb-8 rounded-2xl border bg-card p-5">
                  <summary className="cursor-pointer font-semibold">
                    先试一次：比较不同提示词的效果
                  </summary>
                  <div className="mt-5">
                    <QuickPractice />
                  </div>
                </details>
              ),
            },
            {
              id: 'library',
              content: (
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
              ),
            },
          ]}
        />
      </div>
    </>
  )
}
