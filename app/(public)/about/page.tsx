import { ScrollSidebar } from '@/components/scroll-sidebar'
import { BenchmarkMethod } from '@/components/benchmark-method'
import type { Metadata } from 'next'
import Link from 'next/link'
import { CircleHelp, Mail, Scale } from 'lucide-react'
import { CAPABILITY_META, OVERALL_WEIGHTS, STALE_DAYS, latestUpdatedAt } from '@/lib/score'
import { siteConfig } from '@/lib/site'
import { scenarios, tools } from '@/data'
import { ToolLogo } from '@/components/tool-logo'
import { PageHeader, Section } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ErrataFormWithParam } from '@/components/errata-params'
import { FeedbackStatsPanel } from '@/components/feedback-stats'

export const metadata: Metadata = {
  title: '关于与评分方法',
  description: '第三方实测的原始来源与版本、14 维编辑能力参考、场景匹配方法、数据更新与勘误入口。',
  alternates: { canonical: '/about' },
}

const SCORE_RUBRIC = [
  { score: '10 分', meaning: '编辑认为重点适用，需要在真实任务中核验' },
  { score: '8 分', meaning: '明显强于平均水平，有明确优势场景' },
  { score: '6 分', meaning: '编辑认为可用于基础任务，仍需核验结果' },
  { score: '4 分', meaning: '能力弱或经常出错，需要人工兜底' },
  { score: '2 分', meaning: '基本不具备该能力' },
  { score: '0 分', meaning: '完全不提供该能力' },
]

const FAQ = [
  {
    q: '分数是谁打的？会不会有主观成分？',
    a: '是编辑打分，一定有主观成分，所以我们把打分依据和权重全部公开：任何 ≥4 分或 ≤2 分的维度都必须写明依据（官方基准测试 / 能力边界判断 / 社区共识）。可以通过反馈入口提出质疑，复核后修订对应资料。',
  },
  {
    q: '为什么不做自建评测？',
    a: '本站目前没有统一维护的实测环境，因此采用能核查方法与版本的第三方原榜快照。闭源模型可以通过 API 测试；但模型、推理档位、提示词与执行环境都会影响结果，不能把不同条件的成绩混成产品总分。',
  },
  {
    q: '为什么综合分不等于「最好的工具」？',
    a: '原来的 14 维加权总分会混合不相关的功能，已从工具卡撤下。现在按同榜的指定模型实测比较；没有可比测试的应用不强行赋分。场景决策器仍使用编辑参考做任务匹配，匹配分不是实测能力分。',
  },
  {
    q: '为什么不收录一些小众工具？',
    a: '收录标准是：中文用户能在 30 分钟内上手、有一个清晰的官网或文档、能力边界说得清。做不到这三条的，即使很强也先不收 —— 否则站点会变成没人维护的工具大全。',
  },
  {
    q: '为什么不做一个能直接对话的 AI？',
    a: '本站的定位是「帮你选工具、教你方法」，不是「替代工具」。我们做的是决策和教学：让你去用对工具，而不是让你留在我们这儿。',
  },
  {
    q: '价格数据准吗？',
    a: '价格会变，所以我们只给大致的量级并附官方链接。任何价格都以厂商官网为准。数据超过 90 天没复核的页面会显示「可能已过时」。',
  },
]

export default function AboutPage() {
  const updated = latestUpdatedAt(tools)

  return (
    <>
      <PageHeader
        title="关于本站：我们怎么打分，为什么你该信我们"
        description="一个工具推荐站最容易做的事是把所有工具都夸一遍。我们选择反过来：把弱项、避坑、数据来源摊开写。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '关于' }]}
        meta={<Badge variant="outline">全站数据更新于 {updated.slice(0, 10)}</Badge>}
      />

      <div className="container py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <div className="min-w-0 space-y-12">
            <BenchmarkMethod />
            <Section title="三条产品原则">
              <ol className="space-y-3">
                {[
                  {
                    t: '可决策',
                    d: '任何一页都要能回答「所以我现在该用哪个工具」。只介绍知识不给结论的页面，我们不做。',
                  },
                  {
                    t: '有时效',
                    d: `所有数据都带更新时间与来源链接，页面显式展示「数据更新于 X 年 X 月」，超过 ${STALE_DAYS} 天未复核会标黄提醒。`,
                  },
                  {
                    t: '不吹不黑',
                    d: '每个工具必须写「强项」「弱项」「别用它做」。这一栏是本站唯一的信任来源，也是我们花时间最多的地方。',
                  },
                ].map((p, i) => (
                  <li key={p.t} className="border-t border-hairline pt-4">
                    <p className="font-semibold">
                      {i + 1}. {p.t}
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{p.d}</p>
                  </li>
                ))}
              </ol>
            </Section>

            {/* 评分方法 */}
            <section id="scoring">
              <h2 className="flex items-center gap-2 text-xl">
                <Scale className="h-5 w-5 text-primary" aria-hidden />
                我们怎么打分
              </h2>
              <p className="mt-2 text-sm leading-7 text-foreground/85">
                全站统一 14 个能力维度，每个维度以 0–10 分展示。每个 ≥8 分或 ≤4
                分的维度都必须写「打分依据」， 写不出来的分数我们不给。
              </p>

              <h3 className="mt-6 text-base">分数含义</h3>
              <div className="mt-3 overflow-x-auto rounded-xl border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">
                        分数
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">
                        含义
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCORE_RUBRIC.map((r) => (
                      <tr key={r.score} className="border-t">
                        <th scope="row" className="w-20 px-4 py-2 text-left font-semibold">
                          {r.score}
                        </th>
                        <td className="px-4 py-2 text-foreground/85">{r.meaning}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 className="mt-6 text-base">历史编辑覆盖权重（已撤下公开总分）</h3>
              <div className="mt-3 overflow-x-auto rounded-xl border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">
                        维度
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-left font-medium">
                        说明
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">
                        历史覆盖权重
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {CAPABILITY_META.map((c) => (
                      <tr key={c.key} className="border-t">
                        <th scope="row" className="px-4 py-2 text-left font-medium">
                          {c.label}
                        </th>
                        <td className="px-4 py-2 text-muted-foreground">{c.description}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-muted-foreground">
                          {OVERALL_WEIGHTS[c.key]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                旧算法按维度加权平均，容易让缺少不相关功能的工具显得分数低。
                这里保留历史口径用于核对；工具卡已改为公开实测，不再用这个覆盖分代表模型质量。
              </p>

              <h3 className="mt-6 text-base">打分依据从哪来</h3>
              <ul className="mt-2 space-y-2 text-sm leading-6 text-foreground/85">
                <li>
                  · <strong>官方基准测试</strong>
                  ：厂商公开的评测结果。我们会注明是哪个测试集，因为不同测试集的难度差异很大。
                </li>
                <li>
                  · <strong>能力边界判断</strong>：这个能力在什么条件下会失效 —— 上下文超了会怎样、
                  长文档的中段会不会丢、代码能不能真的跑起来。这类判断来自产品文档与使用边界的梳理。
                </li>
                <li>
                  · <strong>社区共识</strong>
                  ：开发者社区里反复出现的评价。我们会标注「社区反馈」，不把它包装成客观测试。
                </li>
              </ul>
              <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 text-sm leading-6">
                本站目前<strong className="font-medium">不做自建评测</strong>
                ，采用可核查版本与方法的第三方原榜。 闭源模型也可以通过 API
                测试，但模型版本、推理档位、提示词和执行环境会影响结果。 这里的 14 维分档是
                <strong className="font-medium">编辑判断</strong>，公开实测在上方单独说明。
                你可以逐条质疑，有问题的依据会重新复核。
              </p>
              <p className="mt-3 text-xs leading-6 text-muted-foreground">
                我们不会编造没核实过的分数与价格。不确定的地方标{' '}
                <code className="rounded bg-muted px-1">TODO: verify</code>，
                并在页面上如实写出「可能已过时」。
              </p>
            </section>

            {/* 决策器算法 */}
            <section id="algorithm">
              <h2 className="text-xl">场景决策器怎么算</h2>
              <p className="mt-2 text-sm leading-7 text-foreground/85">
                决策器不是大模型，是一个纯规则引擎，跑在你自己的浏览器里：
              </p>
              <ol className="mt-3 space-y-2.5 text-sm leading-7 text-foreground/85">
                <li>
                  1. 取场景的权重表（例如「读长文档」：长文理解 0.35、联网研究 0.25、逻辑推理
                  0.20……）， 归一化到总和为 1。
                </li>
                <li>
                  2. 每个工具在这个场景下的基础分 = Σ(该维度得分 / 10 × 权重) × 10，结果落在 0–10
                  分之间。
                </li>
                <li>
                  3. 硬性条件直接剔除工具：「必须免费」「大陆可直连」不满足的出局；场景的硬门槛维度
                  （如图像生成场景要求 imageGen ≥ 3）不满足的出局。
                </li>
                <li>4. 其余条件加减分，单项调整幅度上限 ±1.2 分，避免某个条件把排序完全带偏。</li>
                <li>
                  5. 排序取前三：首选 +
                  两个备选；结果里同时给出命中的维度、加分与扣分原因，保证可解释。
                </li>
              </ol>
              <p className="mt-3 text-sm text-muted-foreground">
                权重表在{' '}
                <Link href="/find" className="text-primary underline underline-offset-4">
                  决策器页面底部
                </Link>{' '}
                公开。如果你觉得某个场景的权重不合理，欢迎提勘误。 当前共 {scenarios.length}{' '}
                个场景规则。
              </p>
            </section>

            {/* 局限 */}
            <section id="limits">
              <h2 className="text-xl">已知局限，先说清楚</h2>
              <ul className="mt-3 space-y-2.5 text-sm leading-7 text-foreground/85">
                <li>
                  · <strong>数据不是实时的</strong>
                  。本站是人工维护的静态站，更新频率跟着我们的复核节奏走，
                  最多可能滞后一两个月。所有页面都标注更新时间。
                </li>
                <li>
                  · <strong>评分是主观的</strong>
                  。我们的判断基于官方公开资料、能力边界梳理与社区公开反馈，
                  是编辑判断而不是测量结果。遇到重要选型，请以你自己的验证为准。
                </li>
                <li>
                  · <strong>收录是有选择的</strong>。{tools.length} 个工具是筛选后的结果，
                  不是「市面上所有 AI 工具」。
                </li>
                <li>
                  · <strong>资讯来自官方来源</strong>。学习内容支持静态浏览，AI
                  资讯由服务端定期同步。工具资料与评分需人工复核，
                  最近同步时间与资料复核日期分别显示。
                </li>
                <li>
                  · <strong>案例结果是编辑整理</strong>
                  ，不同团队的实际情况会差很多，案例页里的数字请当作参考量级。
                </li>
              </ul>
            </section>

            {/* 勘误 */}
            <section id="errata">
              <h2 className="text-xl">勘误入口</h2>
              <p className="mt-2 text-sm leading-7 text-foreground/85">
                发现数据过时、评分不合理、链接失效？提交页面地址、问题和来源，管理员会在后台复核。
                AI 官方的新动态可以在{' '}
                <Link href="/updates" className="text-primary underline underline-offset-4">
                  AI 实时资讯
                </Link>{' '}
                查看。
              </p>
              <div className="mt-4 border-b border-hairline pb-5">
                <p className="text-sm font-semibold">提交勘误时，请包含这三项</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  <li>1. 页面 URL（例如 /tools/xxx）</li>
                  <li>2. 哪一条信息不对，以及你看到的最新信息（附来源链接更好）</li>
                  <li>3. 你是什么时候发现的（用于判断我们漏更了多久）</li>
                </ul>
                <FeedbackStatsPanel className="mt-6" />
                <ErrataFormWithParam />
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={`mailto:${siteConfig.feedbackEmail}?subject=${encodeURIComponent('勘误反馈')}`}
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      发邮件提交勘误
                    </a>
                  </Button>
                  <span className="self-center text-xs text-muted-foreground">
                    邮箱地址为占位示例，站点正式上线前需替换
                  </span>
                </div>
              </div>
            </section>

            {/* FAQ */}
            <section id="faq">
              <h2 className="flex items-center gap-2 text-xl">
                <CircleHelp className="h-5 w-5 text-primary" aria-hidden />
                常见问题
              </h2>
              <dl className="mt-4 space-y-4">
                {FAQ.map((f) => (
                  <div key={f.q} className="border-b border-hairline pb-5">
                    <dt className="font-semibold">{f.q}</dt>
                    <dd className="mt-2 text-sm leading-7 text-muted-foreground">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          </div>

          {/* 侧栏 */}
          <ScrollSidebar className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <nav className="border-b border-hairline pb-5 text-sm">
              <h2 className="text-sm font-semibold">本页目录</h2>
              <ul className="mt-3 space-y-2 text-muted-foreground">
                <li>
                  <a href="#scoring" className="hover:text-primary">
                    我们怎么打分
                  </a>
                </li>
                <li>
                  <a href="#algorithm" className="hover:text-primary">
                    决策器怎么算
                  </a>
                </li>
                <li>
                  <a href="#limits" className="hover:text-primary">
                    已知局限
                  </a>
                </li>
                <li>
                  <a href="#errata" className="hover:text-primary">
                    勘误入口
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-primary">
                    常见问题
                  </a>
                </li>
              </ul>
            </nav>

            <div className="border-b border-hairline pb-5 text-sm">
              <h2 className="text-sm font-semibold">收录的工具</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {tools.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tools/${t.id}`}
                      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-accent"
                    >
                      <ToolLogo
                        src={t.logo}
                        alt=""
                        size={18}
                        className="border-0 bg-transparent p-0"
                      />
                      <span className="truncate">{t.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <p className="rounded-xl border bg-muted/40 p-5 text-xs leading-6 text-muted-foreground">
              {siteConfig.name} 是独立编辑的第三方指南站，不隶属于任何 AI 厂商，
              与厂商无赞助或返佣关系。所有商标归各自权利人所有。
            </p>
          </ScrollSidebar>
        </div>
      </div>
    </>
  )
}
