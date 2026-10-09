import '@/app/styles/advanced.css'
import '@/app/styles/content-visuals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Cpu, Database, ShieldCheck, Wrench } from 'lucide-react'
import { PageHeader, Section } from '@/components/page-header'
import { AgentLab } from '@/components/learning/agent-lab'
import { advancedModels, advancedPath, advancedResources } from '@/data/advanced-learning'
import { advancedGuides } from '@/data/advanced-guides'
import { advancedConcepts } from '@/data/advanced-concepts'
import { moreCases } from '@/data/more-cases'

export const metadata: Metadata = {
  title: '模型与 Agent 进阶',
  description:
    '用任务选模型，把资料、工具和人工验收连接起来。六个练习、场景走读和 Dify、n8n、LangGraph 上手参考。',
  alternates: { canonical: '/learn/advanced' },
}
export default function AdvancedPage() {
  return (
    <>
      <PageHeader
        title="模型与 Agent 进阶"
        description="从一次好回答，到一条能检查、能复用的工作流程。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '知识库', href: '/learn' },
          { label: '进阶学习' },
        ]}
      />
      <div className="container py-8">
        <div className="advanced-intro">
          <div>
            <p className="eyebrow">会基本提问，就可以开始</p>
            <h2 className="mt-3 text-2xl leading-9">
              <span className="inline-block">让每一步都有输入、</span>
              <span className="inline-block">产出和检查。</span>
            </h2>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              先做小任务，再连接资料和工具。约 {advancedPath.estHours}{' '}
              小时，六次练习；每一节都有能带走的清单或模板。
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/guides/model-task-audit" className="home-button">
                从模型选型开始
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/paths/model-to-agent" className="home-button home-button-secondary">
                查看路线与保存进度
              </Link>
            </div>
          </div>
          <ol className="advanced-spine">
            {[
              { icon: Cpu, title: '模型', text: '能力匹配任务' },
              { icon: Database, title: '资料', text: '保留资料出处' },
              { icon: Wrench, title: '工具', text: '限制工具范围' },
              { icon: ShieldCheck, title: '验收', text: '人能检查接管' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <Icon className="h-7 w-7 shrink-0 text-primary" aria-hidden />
                <span>
                  <strong className="block font-medium">{title}</strong>
                  <span className="mt-1 block text-xs text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <Section
          title="按顺序完成六个小练习"
          description="先看图，再动手；不用一口气读完所有解释。"
        >
          <div className="advanced-lessons">
            {advancedGuides.map((guide, index) => (
              <Link href={`/guides/${guide.id}`} key={guide.id} className="advanced-lesson">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="text-primary">0{index + 1}</span>
                  <span>{guide.durationMin} 分钟</span>
                </div>
                <h3 className="mt-3 text-base leading-7">{guide.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{guide.summary}</p>
                <span className="section-link mt-4">做这个练习 →</span>
              </Link>
            ))}
          </div>
        </Section>
        <div id="agent-walkthrough" className="my-12">
          <AgentLab />
        </div>
        <Section
          title="模型怎么选，先从这些任务比较"
          description="这里给出比较方向。最新模型与开放范围在各工具档案和 AI 资讯中查看。"
        >
          <div className="grid gap-x-8 sm:grid-cols-2">
            {advancedModels.map((model) => (
              <div key={model.id} className="advanced-resource">
                <p className="text-xs text-primary">{model.task}</p>
                <h3 className="mt-2 text-lg">{model.label}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{model.check}</p>
                <div className="mt-4 flex flex-wrap gap-4">
                  <Link className="section-link" href={`/tools/${model.id}`}>
                    查看工具档案 →
                  </Link>
                  {'otherId' in model && (
                    <Link className="section-link" href={`/tools/${model.otherId}`}>
                      看另一个候选 →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>
        <Section
          title="选一种上手方式，不用同时学三套"
          description="Dify、n8n、LangGraph 是应用和流程工具，不是底层模型。先按已有基础和任务选择。"
        >
          <div className="advanced-resources">
            {advancedResources.map((resource) => (
              <article className="advanced-resource" key={resource.id}>
                <p className="text-xs text-primary">{resource.kind}</p>
                <h3 className="mt-2 text-xl">{resource.name}</h3>
                <p className="mt-3 text-sm leading-7">{resource.fit}</p>
                <div className="mt-4 rounded-xl bg-primary/[0.045] p-4">
                  <p className="text-xs font-medium text-primary">第一件事</p>
                  <p className="mt-2 text-sm leading-7">{resource.first}</p>
                </div>
                <details className="lesson-details mt-4">
                  <summary>开始前核对这些条件</summary>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {resource.boundary}
                  </p>
                </details>
                <a
                  className="section-link mt-4"
                  href={resource.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {resource.label} ↗
                </a>
                <Link className="section-link mt-3" href={`/tools/${resource.id}`}>
                  查看工具档案与限制 →
                </Link>
              </article>
            ))}
          </div>
        </Section>
        <Section
          title="把进阶方法放进日常工作"
          description="三个演示案例，先看流程图，再取提示词。"
        >
          <div className="grid gap-4 md:grid-cols-3">
            {moreCases.map((item) => (
              <Link
                href={`/cases/${item.id}`}
                key={item.id}
                className="rounded-2xl border bg-card p-6"
              >
                <p className="text-xs text-primary">{item.industry} · 演示案例</p>
                <h3 className="mt-3 text-base leading-7">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.summary}</p>
                <span className="section-link mt-5">查看流程与练习 →</span>
              </Link>
            ))}
          </div>
        </Section>
        <Section
          title="卡在哪个概念，查哪个"
          description="每个概念都有工作与教学场景图解，不需要先读一遍术语大全。"
        >
          <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {advancedConcepts.map((concept) => (
              <Link key={concept.id} href={`/learn/${concept.id}`} className="advanced-resource">
                <h3 className="text-sm font-medium">{concept.term}</h3>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{concept.definition}</p>
              </Link>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}
