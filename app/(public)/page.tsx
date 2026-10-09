import { moduleForPath } from '@/lib/site-modules'
import { ModuleSection } from '@/components/module-visibility'
import { HomeLayout } from '@/components/home-layout'
import { NewsBoard } from '@/components/news/news-board'
import { seedNewsItems } from '@/lib/news/seed-view'
import '@/app/styles/news.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Compass,
  Feather,
  Layers,
  School,
  Sparkles,
  Workflow,
} from 'lucide-react'
import { cases, concepts, guides, paths, tools } from '@/data'
import { computeEduMetrics } from '@/lib/edu'
import { formatDate, latestUpdatedAt } from '@/lib/score'
import { ToolCard } from '@/components/tool-card'
import { toListItems } from '@/lib/tool-list-item'
import { Section } from '@/components/page-header'

export const metadata: Metadata = {
  description: '用清晰的能力地图、实用教程和场景决策器，找到适合你的 AI 工具。',
  alternates: { canonical: '/' },
}

const startingPoints = [
  {
    icon: Compass,
    title: '找到合适的工具',
    description: '按任务推荐，快速找到合适的工具。',
    href: '/find',
    label: '帮我选工具',
    tone: 'sage',
  },
  {
    icon: BookOpen,
    title: '把方法学会',
    description: '跟着步骤，学会提问和核对。',
    href: '/learn',
    label: '开始学习',
    tone: 'sand',
  },
  {
    icon: Workflow,
    title: '看看别人怎么做',
    description: '参考案例，做出自己的成品。',
    href: '/cases',
    label: '浏览案例',
    tone: 'lavender',
  },
]
const tasks = [
  { title: '把零散想法写成一篇文章', icon: Feather, task: 'write', hint: '写作表达 · 提示词方法' },
  { title: '读懂一份长文档', icon: BookOpen, task: 'read-long-doc', hint: '长文理解 · 信息整理' },
  { title: '做一份清楚的汇报', icon: Layers, task: 'make-office', hint: '办公产出 · 内容组织' },
]

export default function HomePage() {
  const metrics = computeEduMetrics()
  const featured = tools.filter((t) => t.featured).slice(0, 6)
  const featuredItems = toListItems(featured.length ? featured : tools.slice(0, 6))
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
              <div className="container grid items-center gap-12 py-12 lg:grid-cols-[1.12fr_1fr] lg:gap-16 lg:py-20">
                <div>
                  <p className="hero-eyebrow">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    给好奇心，一个清晰的方向
                  </p>
                  <h1 className="mt-6 text-[2.65rem] font-semibold leading-[1.28] tracking-[-0.045em] sm:text-[3.5rem] xl:text-[3.8rem]">
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
              title="从这里，找到你的起点"
              description="选你现在最需要的一件事。"
              eyebrow="开始探索"
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
                      <span className="mt-7 inline-flex items-center gap-2 text-xs font-semibold">
                        {item.label}
                        <ArrowRight className="h-3.5 w-3.5" />
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
          id: 'school',
          content: (
            <ModuleSection id="school">
              <section className="school-banner">
                <div>
                  <p className="hero-eyebrow">
                    <School className="h-4 w-4" />
                    让好方法走进课堂
                  </p>
                  <h2 className="mt-4 text-2xl">给老师和学生，一套能用起来的材料。</h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
                    按学段和学科选课程、教案与使用规范。
                  </p>
                  <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>{metrics.programs} 门课程</span>
                    <span>{metrics.toolkits} 套教案包</span>
                  </div>
                </div>
                <Link href="/edu" className="home-button shrink-0">
                  进入教育专区
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </section>
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
                <NewsBoard initial={seedNewsItems().slice(0, 4)} compact />
              </Section>
            </ModuleSection>
          ),
        },
      ]}
    />
  )
}
