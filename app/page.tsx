import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  Compass,
  School,
  Target,
  Wrench,
} from 'lucide-react'
import { cases, concepts, guides, paths, tools, updates } from '@/data'
import { computeEduMetrics } from '@/lib/edu'
import { CAPABILITY_META, formatDate, latestUpdatedAt } from '@/lib/score'
import { PRIMARY_ENTRY } from '@/lib/entries'
import { Button } from '@/components/ui/button'
import { ToolCard } from '@/components/tool-card'
import { toListItems } from '@/lib/tool-list-item'
import { Section } from '@/components/page-header'

export const metadata: Metadata = {
  title: '首页',
  description:
    '中文优先的 AI 入门与实战指南：14 维能力地图 + 场景决策器，帮你回答「AI 是什么、怎么用、该用哪个」。每个工具都写清楚强项、弱项和别用它做的场景。',
  alternates: { canonical: '/' },
}

const threeQuestions = [
  {
    icon: BookOpen,
    title: 'AI 是什么',
    desc: '概念不是黑话堆砌：每个词都有生活比喻、具体例子和常见误解。',
    href: '/learn',
    cta: '进知识库',
  },
  {
    icon: Wrench,
    title: 'AI 怎么用',
    desc: '方法课讲通用技巧，场景课照着做完就能交活，提示词可直接复制。',
    href: '/guides',
    cta: '看教程',
  },
  {
    icon: Target,
    title: '哪个更强、该用哪个',
    desc: '不罗列工具，而是把能力量化成 14 维评分，按场景给出首选与备选。',
    href: '/tools',
    cta: '开工具库',
  },
]

export default function HomePage() {
  const updated = latestUpdatedAt(tools)
  const metrics = computeEduMetrics()
  const featured = tools.filter((t) => t.featured).slice(0, 6)
  const fallbackFeatured = featured.length > 0 ? featured : [...tools].sort((a, b) => b.overallScore - a.overallScore).slice(0, 6)
  const latestUpdates = updates.slice(0, 5)
  // 首页只展示 6 张卡，同样只传投影：22 个工具的强项/弱项/依据/来源
  // 这些长文本卡片一个字都不用，不该进首屏
  const featuredItems = toListItems(fallbackFeatured)

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        {/* 极淡氛围光：只在 hero 一处使用，不铺满全站 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.55] dark:opacity-90"
          style={{
            background:
              'radial-gradient(60rem 26rem at 18% -8%, hsl(var(--primary) / 0.16), transparent 60%), radial-gradient(46rem 22rem at 92% 4%, hsl(var(--highlight) / 0.10), transparent 62%)',
          }}
        />
        <div className="container py-16 sm:py-24">
          <div className="max-w-3xl">
            <p className="eyebrow">中文优先 · 不吹不黑 · 数据带更新时间</p>
            <h1 className="display mt-5">
              别再收藏第 50 个 AI 工具了。
              <span className="text-primary">先搞清楚你该用哪一个。</span>
            </h1>
            <p className="lede measure mt-7 text-muted-foreground">
              把 {tools.length} 个 AI 工具的能力量化成 14 个维度，再用一个纯规则决策器回答你的问题 ——
              该用哪个、为什么、怎么问。评分都有依据，弱项和「别用它做」也都写着。
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-3">
              <Button asChild size="lg" className="rounded-full">
                <Link href="/find">
                  <Compass className="h-4 w-4" aria-hidden />
                  帮我选一个工具
                </Link>
              </Button>
              <Link
                href="/learn"
                className="link-animate inline-flex items-center gap-1 text-[15px] font-medium"
              >
                我是零基础，先学概念
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-12 text-[11px] text-muted-foreground">
              数据最后更新于 {updated.slice(0, 10)} · 收录 {tools.length} 个工具 /{' '}
              {concepts.length} 个概念 / {guides.length} 篇教程 / {cases.length} 个案例
            </p>
          </div>
        </div>
      </section>

      <div className="container">
        {/* 三个问题：用带序号的分隔列表，替代"三张功能卡" */}
        <Section
          eyebrow="先解决三个问题"
          title="任何 AI 问题都能归到这三类"
          description="先判断你在哪一类，再往下走。每一类都对应一个明确答案，不做模糊推荐。"
        >
          <ol className="grid gap-x-10 md:grid-cols-3">
            {threeQuestions.map((q, i) => (
              <li key={q.href}>
                <Link
                  href={q.href}
                  className="numbered-item reveal group block"
                  style={{ ['--d' as string]: `${i * 70}ms` }}
                >
                  <span className="text-[13px] font-medium tabular-nums text-muted-foreground">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>
                    <span className="block text-base font-semibold group-hover:text-primary">
                      {q.title}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                      {q.desc}
                    </span>
                    <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary">
                      {q.cta}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </Section>

        {/* 场景决策器：反相深色区块，打破单色长页（借鉴 Cobalt Hour / NOX Grid 的分块手法） */}
        <section className="band my-4 overflow-hidden rounded-2xl">
          <div className="grid gap-8 p-6 md:grid-cols-[1.1fr_1fr] md:p-10">
            <div>
              <p className="band-kicker">本站第二个差异化功能</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
                不知道工具名字？说出你要干什么就行
              </h2>
              <p className="measure mt-4 text-sm leading-7 text-muted-foreground">
                决策器不调用任何大模型 API，纯粹用「场景权重 × 工具能力分」算出来：
                结果可复现、可离线、每条结论都能解释。你会拿到首选、两个备选、
                需要时的组合工作流、一条可复制的提示词，以及这个场景下最容易犯的错。
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {PRIMARY_ENTRY.map((entry) => (
                  <li key={entry.href} className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-medium">{entry.label}</span>
                    <span className="text-muted-foreground">—— {entry.desc}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-7 rounded-full">
                <Link href="/find">
                  打开场景决策器
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="band-card self-start">
              <p className="band-kicker">14 个能力维度</p>
              <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-[13px]">
                {CAPABILITY_META.map((c) => (
                  <li key={c.key} className="flex items-start gap-1.5">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-40" aria-hidden />
                    <span>
                      <span className="font-medium">{c.label}</span>
                      <span className="block text-[11px] leading-4 text-muted-foreground">
                        {c.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 热门工具速览 */}
        <Section
          title="热门工具速览"
          description="按综合分排序的精选工具。点进去能看到 14 维雷达图、强项、弱项、别用它做什么。"
          action={
            <Link href="/tools" className="text-sm font-medium text-primary hover:underline">
              查看全部 {tools.length} 个工具 →
            </Link>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featuredItems.map((tool, i) => (
              <ToolCard key={tool.id} tool={tool} index={i} />
            ))}
          </div>
        </Section>

        {/* 学习路径 */}
        <Section
          title="不知道从哪开始？按路径学"
          description="三条路线，进度自动存在本地浏览器，不需要注册登录。"
          action={
            <Link href="/paths" className="text-sm font-medium text-primary hover:underline">
              全部路径 →
            </Link>
          }
        >
          <div className="grid gap-4 md:grid-cols-3">
            {paths.map((p, i) => (
              <Link
                key={p.id}
                href={`/paths/${p.id}`}
                className="spotlight reveal border-b border-hairline pb-5 transition-colors hover:border-foreground/20"
                style={{ ['--d' as string]: `${i * 60}ms` }}
              >
                <h3 className="text-base font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-xs text-muted-foreground">{p.audience}</p>
                <p className="mt-3 text-sm leading-6 text-foreground/80">{p.summary}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  {p.phases.length} 个阶段 · 预计 {p.estHours} 小时
                </p>
              </Link>
            ))}
          </div>
        </Section>

        {/* 面向本地学校 */}
        <Section
          title="面向本地学校：我们还提供一套可落地的供给"
          description="教师与学生缺的不是概念介绍，而是「明天上课就能用」的材料。课程、教案包、使用规范与定期简报，学校拿到即可开课。"
        >
          <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="border-b border-hairline pb-6">
              <h3 className="flex items-center gap-2 text-lg">
                <School className="h-5 w-5 text-primary" aria-hidden />
                AI 教育服务
              </h3>
              <p className="mt-2 text-sm leading-7 text-foreground/85">
                面向本地学校的 AI 知识与技术供给方：把外部快速变化的技术能力，转化为师生当下就能用起来的内容。
                教师端四层阶梯（会用 → 提效 → 课堂 → 骨干），学生端三层阶梯（认知 → 应用 → 素养），
                每层都配套讲义、演示案例、实操任务与常见错误清单。
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { href: '/edu/programs', label: '课程体系', desc: `${metrics.programs} 门课程，按阶梯组织` },
                  { href: '/edu/toolkits', label: '课程与教案包', desc: `${metrics.toolkits} 套，按学段学科编排` },
                  { href: '/edu/policy', label: 'AI 使用规范生成器', desc: '选三个条件生成校级草案' },
                  { href: '/edu/briefings', label: '定期简报', desc: '变了什么、意味着什么' },
                ].map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="row-item block py-3 text-sm"
                    >
                      <span className="block font-medium">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{item.desc}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/edu"
                className="link-animate mt-5 inline-flex items-center gap-1 text-sm font-medium"
              >
                进入 AI 教育服务专区
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            <div className="rounded-xl border bg-muted/30 p-6 text-sm leading-7 text-foreground/85">
              <p className="font-semibold text-foreground">它和主站是什么关系？</p>
              <p className="mt-2">
                主站回答「哪个工具更强、怎么问才靠谱」，是方法与判断的依据；
                教育专区把这些方法转成按学段与学科编排的课程与材料，并按版本管理 ——
                每份材料都标注适用时间与替代关系，过时内容会在简报里说明并替换。
              </p>
              <p className="mt-3">
                内容维护是这个模块的固定动作：每学期至少一次全面复核，
                教师与学生的真实使用问题直接进入下一版的优先改进项。
              </p>
              <p className="mt-3 text-muted-foreground">
                试点学校 {metrics.schools} 所 · 覆盖教师 {metrics.teachersReached} 人次 ·
                近 90 天更新 {metrics.recentlyUpdated} 项
              </p>
            </div>
          </div>
        </Section>

        {/* 更新雷达：第二个反相区块 */}
        <section className="band overflow-hidden rounded-2xl">
          <div className="p-6 md:p-10">
            <p className="band-kicker">数据保鲜</p>
            <h2 className="mt-4 text-xl font-semibold sm:text-2xl">
              AI 领域每月都在变，我们把变更记下来
            </h2>
            <p className="measure mt-3 text-sm leading-7 text-muted-foreground">
              所有评分、价格、能力描述都带更新时间与来源链接；超过 90 天未复核的页面会标「可能已过时」。
            </p>
            <ul className="mt-6 border-y border-hairline divide-y divide-hairline">
              {latestUpdates.map((u) => (
                <li key={u.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
                  <time dateTime={u.date} className="w-28 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {formatDate(u.date)}
                  </time>
                  <span className="text-sm">{u.summary}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-5">
              <Link href="/updates" className="link-animate text-sm">
                查看全部变更记录
              </Link>
              <Link href="/about#scoring" className="link-animate text-sm">
                我们怎么打分
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}