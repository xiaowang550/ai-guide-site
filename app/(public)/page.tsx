import '@/app/styles/reference-hero.css'
import '@/app/styles/reference-home.css'
import '@/app/styles/reference-tools.css'
import { moduleForPath } from '@/lib/site-modules'
import { ModuleSection } from '@/components/module-visibility'
import { HomeLayout } from '@/components/home-layout'
import { NewsPreview } from '@/components/news/news-preview'
import { seedNewsItems } from '@/lib/news/seed-view'
import '@/app/styles/news-preview.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Feather,
  Layers,
  Lightbulb,
  Sparkles,
} from 'lucide-react'
import { cases, concepts, guides, paths, tools } from '@/data'
import { formatDate, latestUpdatedAt } from '@/lib/score'
import { ToolCard } from '@/components/tool-card'
import { toListItems } from '@/lib/tool-list-item'
import { Section } from '@/components/page-header'
import { ReferenceArt } from '@/components/reference-art'

export const metadata: Metadata = {
  description: '用清晰的能力地图、实用教程和场景决策器，找到适合你的 AI 工具。',
  alternates: { canonical: '/' },
}

const startingPoints = [
  {
    icon: BookOpen,
    title: '系统教程',
    description: '从入门到进阶，带你掌握核心用法与最佳实践。',
    href: '/guides',
    label: '开始学习',
    tone: 'sage',
  },
  {
    icon: Lightbulb,
    title: '精选案例',
    description: '真实场景应用，看看别人如何用 AI 提升效率。',
    href: '/cases',
    label: '浏览案例',
    tone: 'sand',
  },
  {
    icon: Layers,
    title: '实用工具库',
    description: '收录优质 AI 工具，快速找到适合你的生产力助手。',
    href: '/tools',
    label: '探索工具',
    tone: 'lavender',
  },
]
const tasks = [
  { title: '把零散想法写成一篇文章', icon: Feather, task: 'write', hint: '写作表达 · 提示词方法' },
  { title: '读懂一份长文档', icon: BookOpen, task: 'read-long-doc', hint: '长文理解 · 信息整理' },
  { title: '做一份清楚的汇报', icon: Layers, task: 'make-office', hint: '办公产出 · 内容组织' },
]

export default function HomePage() {
  const featured = tools.filter((t) => t.featured).slice(0, 3)
  const featuredItems = toListItems(featured.length ? featured : tools.slice(0, 3))
  const updated = latestUpdatedAt(tools)
  const counts = [
    { value: tools.length, label: '个工具，清楚比较' },
    { value: concepts.length, label: '个概念，轻松理解' },
    { value: guides.length, label: '篇教程，边学边用' },
    { value: cases.length, label: '个案例，找到灵感' },
  ]

  return (
    <HomeLayout
      sections={[
        {
          id: 'hero',
          content: (
            <section className="home-hero">
              <div className="home-cover-grid container">
                <div className="home-cover-copy">
                  <p className="hero-eyebrow">
                    <span className="hero-eyebrow-line" />
                    给好奇心，一个清晰的方向
                  </p>
                  <h1 className="home-cover-title">
                    让 AI 成为
                    <br />
                    <span className="text-primary">你顺手的工具。</span>
                  </h1>
                  <p className="mt-6 max-w-lg text-base leading-8 text-muted-foreground">
                    找工具、学方法，把 AI 用到学习和工作里。
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <ModuleSection id="finder">
                      <Link className="home-button" href="/find">
                        找到适合我的工具
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </ModuleSection>
                    <ModuleSection id="guides">
                      <Link className="home-button home-button-secondary" href="/guides">
                        先看看使用方法
                        <BookOpen className="h-4 w-4" />
                      </Link>
                    </ModuleSection>
                  </div>
                  <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    {['评分有依据', '把强项与弱项说清楚', '无需注册，直接探索'].map((t) => (
                      <span key={t} className="flex items-center gap-1.5">
                        <Check className="h-3.5 w-3.5 text-primary" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <ReferenceArt home />
                <ModuleSection id="finder">
                  <div className="hero-workbench">
                    <div className="mb-7 flex items-center justify-between">
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <span className="hero-small-icon">
                          <Sparkles className="h-4 w-4" />
                        </span>
                        从一件小事开始
                      </span>
                      <span className="text-xs text-muted-foreground">YOUR NEXT STEP</span>
                    </div>
                    <p className="text-xl font-semibold tracking-tight">今天，你想完成什么？</p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      选一个今天要完成的任务。
                    </p>
                    <div className="mt-6 space-y-3">
                      {tasks.map(({ title, icon: Icon, hint, task }) => (
                        <Link key={task} href={`/find?s=${task}`} className="hero-task">
                          <span className="hero-task-icon">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{title}</span>
                            <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                          </span>
                          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                    <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-5 text-xs">
                      <span className="text-muted-foreground">规则推荐，每一步都能解释</span>
                      <Link href="/find" className="font-medium text-primary">
                        试试决策器 →
                      </Link>
                    </div>
                  </div>
                </ModuleSection>
              </div>
            </section>
          ),
        },
        {
          id: 'metrics',
          content: (
            <div className="home-metrics">
              <div className="hidden text-xs leading-6 text-muted-foreground sm:block">
                一份持续整理的
                <br />
                <span className="font-medium text-foreground">AI 使用指南</span>
              </div>
              {counts.map((m) => (
                <div key={m.label}>
                  <span className="text-2xl font-semibold tracking-tight">{m.value}</span>
                  <p className="mt-1.5 text-xs text-muted-foreground">{m.label}</p>
                </div>
              ))}
            </div>
          ),
        },
        {
          id: 'start',
          content: (
            <Section
              title="从这里，开启你的 AI 能力成长"
              description="精选资源与实用工具，帮你把 AI 用到真实的学习和工作场景中。"
              className="home-growth"
            >
              <div className="grid gap-4 md:grid-cols-3">
                {startingPoints.map(({ icon: Icon, ...item }) => (
                  <ModuleSection key={item.href} id={moduleForPath(item.href) ?? 'knowledge'}>
                    <Link href={item.href} className={`entry-card entry-${item.tone}`}>
                      <span className="entry-icon">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-6 text-lg">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-muted-foreground">
                        {item.description}
                      </p>
                      <span className="entry-card-arrow" aria-hidden="true">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </Link>
                  </ModuleSection>
                ))}
              </div>
            </Section>
          ),
        },
        {
          id: 'tools',
          content: (
            <ModuleSection id="tools">
              <Section
                title="值得先认识的工具"
                description="比较能力、限制和适用任务。"
                eyebrow="工具发现"
                action={
                  <Link href="/tools" className="section-link">
                    查看全部工具
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                }
              >
                <div className="grid gap-x-7 gap-y-9 sm:grid-cols-2 lg:grid-cols-3 2xl:gap-x-8 2xl:gap-y-10">
                  {featuredItems.map((tool, i) => (
                    <ToolCard key={tool.id} tool={tool} index={i} />
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  资料最后复核于 {formatDate(updated)} · 评分用于辅助选择，不做自建评测。
                </p>
              </Section>
            </ModuleSection>
          ),
        },
        {
          id: 'guides',
          content: (
            <ModuleSection id="guides">
              <Section
                title="慢慢学，也能走得很远"
                description="分阶段学习，进度自动保留在本机。"
                eyebrow="学习路径"
                action={
                  <Link href="/paths" className="section-link">
                    所有学习路径
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                }
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {paths.map((p, i) => (
                    <Link key={p.id} href={`/paths/${p.id}`} className="learning-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-primary">
                          PATH {String(i + 1).padStart(2, '0')}
                        </span>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <h3 className="mt-6 text-lg">{p.title}</h3>
                      <p className="mt-2 text-xs text-muted-foreground">{p.audience}</p>
                      <p className="mt-4 text-sm leading-7 text-muted-foreground">{p.summary}</p>
                      <div className="mt-7 border-t pt-4 text-xs text-muted-foreground">
                        {p.phases.length} 个阶段<span className="mx-2">·</span>约 {p.estHours} 小时
                      </div>
                    </Link>
                  ))}
                </div>
              </Section>
            </ModuleSection>
          ),
        },
        {
          id: 'news',
          content: (
            <ModuleSection id="news">
              <Section
                title="AI 实时资讯"
                description="新模型、新功能和工具变化，一眼掌握。"
                eyebrow="关注新消息"
                action={
                  <Link href="/updates" className="section-link">
                    查看 AI 实时资讯
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                }
              >
                <NewsPreview initial={seedNewsItems().slice(0, 4)} />
              </Section>
            </ModuleSection>
          ),
        },
      ]}
    />
  )
}
