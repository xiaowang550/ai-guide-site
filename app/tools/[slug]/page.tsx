import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Info,
  Puzzle,
  Scale,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'
import type { Tool } from '@/data/types'
import { getTool, getTools, promptTemplates, tools } from '@/data'
import {
  CAPABILITY_META,
  capabilityLabel,
  formatDate,
  rankedCapabilities,
  weakestCapabilities,
} from '@/lib/score'
import {
  CATEGORY_LABELS,
  LATENCY_LABELS,
  PLATFORM_LABELS,
  PRICING_MODEL_LABELS,
  RISK_LABELS,
  STABILITY_LABELS,
} from '@/lib/site'
import { capabilityShort } from '@/lib/score'
import { ToolLogo } from '@/components/tool-logo'
import { ScoreBadge, ScoreDot } from '@/components/score-badge'
import { UpdatedBadge } from '@/components/updated-badge'
import { CapabilityRadar } from '@/components/capability-radar'
import { CapabilityBar } from '@/components/capability-bar'
import { ProsConsCard } from '@/components/pros-cons-card'
import { EvidenceCoverageBadge, EvidenceSection } from '@/components/evidence-section'
import { PromptBlock } from '@/components/prompt-block'
import { PageHeader, Section } from '@/components/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function generateStaticParams() {
  return tools.map((t) => ({ slug: t.id }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool) return { title: '工具不存在' }
  return {
    title: `${tool.name}（${tool.nameEn}）能力评测与弱点`,
    description: `${tool.tagline}。14 维能力评分（综合 ${tool.overallScore}/5）、强项、弱项、别用它做的场景、价格与上手三步，数据更新于 ${tool.updatedAt}。`,
    alternates: { canonical: `/tools/${tool.id}` },
    openGraph: { title: `${tool.name} 能力评测`, description: tool.tagline },
  }
}

export default async function ToolDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const tool = getTool(slug)
  if (!tool) notFound()

  const strong = rankedCapabilities(tool.capabilities, 4)
  const weak = weakestCapabilities(tool.capabilities, 2)
  const alternatives = getTools(tool.alternatives)
  const templates = pickTemplates(tool)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: tool.name,
    alternateName: tool.nameEn,
    applicationCategory: tool.categories.map((c) => CATEGORY_LABELS[c]).join(', '),
    description: tool.description,
    url: tool.officialUrl,
    operatingSystem: tool.platforms.map((p) => PLATFORM_LABELS[p]).join(', '),
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: tool.pricing.freeTier,
    },
    aggregateRating: undefined,
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 1. 头部 */}
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '工具库', href: '/tools' },
          { label: tool.name },
        ]}
        title={`${tool.name}（${tool.nameEn}）`}
        description={tool.tagline}
        meta={
          <>
            <Badge variant="secondary">{tool.vendor}</Badge>
            {tool.categories.map((c) => (
              <Badge key={c} variant="outline">
                {CATEGORY_LABELS[c]}
              </Badge>
            ))}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              {tool.chinaAccessible ? (
                <>
                  <Wifi className="h-3.5 w-3.5" aria-hidden />
                  中国大陆可直连
                </>
              ) : (
                <>
                  <WifiOff className="h-3.5 w-3.5" aria-hidden />
                  中国大陆通常需借助网络工具访问
                </>
              )}
            </span>
            <UpdatedBadge date={tool.updatedAt} />
            <EvidenceCoverageBadge tool={tool} />
          </>
        }
        actions={
          <>
            <a
              href={tool.officialUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="group/cta inline-flex"
            >
              <Button className="rounded-full transition-transform duration-200 group-hover/cta:translate-y-[-1px] active:translate-y-0">
                访问官网
                <ExternalLink
                  className="h-3.5 w-3.5 transition-transform duration-200 group-hover/cta:translate-x-0.5"
                  aria-hidden
                />
              </Button>
            </a>
            <Button asChild variant="outline">
              <Link href={`/compare?ids=${tool.alternatives.slice(0, 2).join(',')}`}>
                <Scale className="h-3.5 w-3.5" aria-hidden />
                和替代品对比
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/find">不确定该不该用它？</Link>
            </Button>
          </>
        }
      />

      <div className="container py-8">
        {/* 概览三栏 */}
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            {/* 2. 雷达图（桌面）/ 条形（移动端） */}
            <section aria-labelledby="radar-title">
              <h2 id="radar-title" className="text-xl">
                能力雷达图（14 维）
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                5 分 = 该领域当前第一梯队。分数来自官方文档与更新日志、公开的第三方基准，以及使用者反馈的综合判断，本站不做自建评测，也不是厂商宣传语。每个分数的依据见下方说明。
              </p>
              <div className="mt-4 hidden border-b border-hairline pb-5 md:block">
                <CapabilityRadar capabilities={tool.capabilities} />
              </div>
              {/* 移动端：雷达图在窄屏不可读，改横向评分条 */}
              <div className="mt-4 border-b border-hairline pb-5 md:hidden">
                {CAPABILITY_META.map((meta) => (
                  <CapabilityBar
                    key={meta.key}
                    capabilityKey={meta.key}
                    capability={tool.capabilities[meta.key]}
                  />
                ))}
              </div>
              <details className="mt-3 border-t border-hairline pt-4">
                <summary className="cursor-pointer text-sm font-medium">
                  展开全部维度分数与打分依据（文字版）
                </summary>
                <div className="mt-3 grid gap-x-8 sm:grid-cols-2">
                  {CAPABILITY_META.map((meta) => (
                    <CapabilityBar
                      key={meta.key}
                      capabilityKey={meta.key}
                      capability={tool.capabilities[meta.key]}
                      compact
                    />
                  ))}
                </div>
              </details>
            </section>

            {/* 3. 最强的地方 */}
            <section aria-labelledby="strong-title">
              <h2 id="strong-title" className="flex items-center gap-2 text-xl">
                <Sparkles className="h-5 w-5 text-score-4" aria-hidden />
                它最强的地方
              </h2>
              {strong.length > 0 ? (
                <>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    下面 {strong.length} 个维度拿到 4 分以上，这是它真正值得优先考虑的依据。
                  </p>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {strong.map((c) => (
                      <li key={c.key} className="border-t border-hairline pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{c.label}</span>
                          <ScoreBadge score={c.score} />
                        </div>
                        {c.basis ? (
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">依据：{c.basis}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  这个工具没有任何维度达到 4 分，属于「单项专用型」工具：只在特定场景下用，综合分参考意义不大。
                </p>
              )}

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <ListBox title="最适合这些场景" items={tool.bestFor} tone="positive" />
                <ListBox title="明确的短板与不适用场景" items={weak.map((w) => `${capabilityLabel(w.key)} 仅 ${w.score} 分`)} tone="negative" />
              </div>

              <div className="mt-5">
                <ProsConsCard
                  strengths={tool.strengths}
                  weaknesses={tool.weaknesses}
                  avoidFor={tool.avoidFor}
                />
              </div>
            </section>

            {/* 4. 价格与额度 */}
            <section aria-labelledby="price-title">
              <h2 id="price-title" className="text-xl">
                价格与额度
              </h2>
              <div className="mt-4 overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <caption className="sr-only">{tool.name} 价格与额度信息</caption>
                  <tbody>
                    <Row label="计费模式" value={PRICING_MODEL_LABELS[tool.pricing.model]} />
                    <Row label="免费额度" value={tool.pricing.freeTier} />
                    {tool.pricing.paidFrom ? (
                      <Row label="付费起步价" value={tool.pricing.paidFrom} />
                    ) : null}
                    {tool.pricing.note ? <Row label="备注" value={tool.pricing.note} /> : null}
                    <Row label="是否有 API" value={tool.hasApi ? '有' : '没有（只能用网页/App）'} />
                    <Row label="支持平台" value={tool.platforms.map((p) => PLATFORM_LABELS[p]).join('、')} />
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                价格随时可能调整，本页数据更新于 {formatDate(tool.updatedAt)}，请以官方页面为准。
              </p>
            </section>

            {/* 5. 上手三步 */}
            <section aria-labelledby="start-title">
              <h2 id="start-title" className="text-xl">
                上手三步
              </h2>
              <ol className="mt-4 space-y-3">
                <StepCard
                  step={1}
                  title="注册与准备"
                  body={`用 ${tool.pricing.freeTier} 就能开始，不需要先付费。${
                    tool.chinaAccessible
                      ? '注册时建议绑定手机号，登录更稳定。'
                      : '注意：在中国大陆通常需要可用的网络环境才能访问，注册前先确认这一点。'
                  }`}
                  href={tool.officialUrl}
                />
                <StepCard
                  step={2}
                  title="第一次别只发「你好」，直接给一个真实任务"
                  body="把下面的提示词模板复制过去，先跑一个你自己今天就要用的任务。第一次就用真实素材，比用「帮我写首诗」更能判断它合不合手。"
                />
                <StepCard
                  step={3}
                  title={`最可能踩的坑：${tool.weaknesses[0]}`}
                  body="遇到不对的输出，先补背景和约束，而不是只说「不对，重写」。详见坏提示词对照表。"
                  href="/guides/bad-prompt-fix"
                />
              </ol>
            </section>

            {/* 6. 可直接复制的提示词 */}
            {templates.length > 0 ? (
              <section aria-labelledby="prompt-title">
                <h2 id="prompt-title" className="text-xl">
                  用它可以直接复制的提示词
                </h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  模板来自站内教程与案例库，替换变量即可使用。
                </p>
                <div className="mt-4 space-y-4">
                  {templates.map((t) => (
                    <PromptBlock key={t.id} template={t} tools={[tool]} defaultToolId={tool.id} />
                  ))}
                </div>
              </section>
            ) : null}

            {/* 7. 替代品 */}
            <section aria-labelledby="alt-title">
              <h2 id="alt-title" className="text-xl">
                替代品对比入口
              </h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                没有哪个工具全场景通吃。选型前建议至少对比 2-4 个。
              </p>
              {alternatives.length > 0 ? (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {alternatives.map((alt) =>
                    alt ? (
                      <li key={alt.id} className="border-t border-hairline pt-4">
                        <div className="flex items-start gap-3">
                          <ToolLogo src={alt.logo} alt={`${alt.name} 标志`} size={34} />
                          <div className="min-w-0 flex-1">
                            <Link href={`/tools/${alt.id}`} className="font-medium hover:text-primary">
                              {alt.name}
                            </Link>
                            <p className="mt-0.5 text-xs text-muted-foreground">{alt.tagline}</p>
                          </div>
                          <ScoreBadge score={alt.overallScore} showMax />
                        </div>
                        <Link
                          href={`/compare?ids=${tool.id},${alt.id}`}
                          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          <Scale className="h-3 w-3" aria-hidden />
                          并排对比这两个
                          <ArrowRight className="h-3 w-3" aria-hidden />
                        </Link>
                      </li>
                    ) : null
                  )}
                </ul>
              ) : null}
              {alternatives.length > 1 ? (
                <Button asChild variant="outline" className="mt-4">
                  <Link href={`/compare?ids=${tool.alternatives.join(',')}`}>
                    <Scale className="h-3.5 w-3.5" aria-hidden />
                    一次对比全部替代品
                  </Link>
                </Button>
              ) : null}
            </section>

            {/* 8. 评分依据：把方法、逐条依据与来源摊开，供读者核对 */}
            <EvidenceSection tool={tool} />

            {/* 9. 数据来源与更新时间 */}
            <section aria-labelledby="source-title" className="border-t pt-8">
              <h2 id="source-title" className="flex items-center gap-2 text-xl">
                <Info className="h-5 w-5 text-muted-foreground" aria-hidden />
                数据来源与更新时间
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                本页数据更新于 {formatDate(tool.updatedAt)}。
                {tool.updatedAt
                  ? '如果你发现某条信息已经过时，请在 /about#errata 提交勘误。'
                  : ''}
              </p>
              <ul className="mt-3 space-y-2">
                {tool.sources.map((s) => (
                  <li key={s.url}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
                    >
                      {s.label}
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </li>
                ))}
                <a
              href={`/about?from=/tools/${tool.id}#errata`}
              className="block border-t border-hairline bg-card p-5 text-sm hover:border-foreground/20"
            >
              <span className="font-medium">报告这一页的数据有误</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                发现评分、依据、价格不对？点这里填，页面会自动带上门牌
              </span>
            </a>
            {tool.docsUrl ? (
                  <li>
                    <a
                      href={tool.docsUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 text-sm text-primary underline underline-offset-4"
                    >
                      官方文档
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </li>
                ) : null}
              </ul>
              <ul className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {tool.tags.map((t) => (
                  <li key={t}>
                    <Badge variant="secondary" className="font-normal">
                      {t}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* 侧栏速览 */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            <div className="border-b border-hairline pb-5">
              <div className="flex items-center gap-3">
                <ToolLogo src={tool.logo} alt={`${tool.name} 标志`} size={48} />
                <div>
                  <p className="text-sm font-semibold">{tool.name}</p>
                  <p className="text-xs text-muted-foreground">{tool.nameEn}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-foreground/80">{tool.description}</p>
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">综合分</span>
                <ScoreBadge score={tool.overallScore} showMax />
              </div>
            </div>

            <div className="border-b border-hairline pb-5 text-sm">
              <h2 className="mb-3 text-sm font-semibold">速览</h2>
              <dl className="space-y-2.5">
                <Fact label="中文能力">
                  <ScoreBadge score={tool.chineseQuality} />
                </Fact>
                <Fact label="幻觉风险">
                  <Badge
                    variant={
                      tool.hallucinationRisk === 'low'
                        ? 'success'
                        : tool.hallucinationRisk === 'medium'
                          ? 'warning'
                          : 'danger'
                    }
                  >
                    {RISK_LABELS[tool.hallucinationRisk]}
                  </Badge>
                </Fact>
                <Fact label="响应速度">{LATENCY_LABELS[tool.latency]}</Fact>
                <Fact label="稳定性">{STABILITY_LABELS[tool.stability]}</Fact>
                {tool.contextWindow ? <Fact label="上下文窗口">{tool.contextWindow}</Fact> : null}
                <Fact label="多模态">
                  {[
                    tool.multimodal.text && '文本',
                    tool.multimodal.image && '图片',
                    tool.multimodal.audio && '音频',
                    tool.multimodal.video && '视频',
                    tool.multimodal.file && '文件',
                  ]
                    .filter(Boolean)
                    .join(' / ') || '仅文本'}
                </Fact>
              </dl>
            </div>

            <div className="border-b border-hairline pb-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Puzzle className="h-4 w-4" aria-hidden />
                短板速览（≤2 分维度）
              </h2>
              {weak.length > 0 ? (
                <ul className="space-y-2">
                  {weak.map((w) => (
                    <li key={w.key} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2">
                        <ScoreDot score={w.score} />
                        {capabilityShort(w.key)}
                      </span>
                      <span className="tabular-nums text-xs text-muted-foreground">{w.score}/5</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">没有明显短板（≤2 分的维度）</p>
              )}
              <ul className="mt-4 space-y-2 border-t pt-3">
                {tool.avoidFor.map((a) => (
                  <li key={a} className="flex gap-2 text-xs leading-5 text-foreground/80">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-score-2" aria-hidden />
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            {tool.docsUrl ? (
              <a
                href={tool.docsUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="block border-t border-hairline pt-4 text-sm hover:bg-accent/40"
              >
                <span className="font-medium">查看官方文档</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  进阶用法、参数说明、限额规则
                </span>
              </a>
            ) : null}
          </aside>
        </div>

        {/* 9. 相关内容 */}
        <Section className="border-t pt-8">
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/tools">← 返回工具库</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/compare?ids=${tool.id}`}>加入对比页</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/find">用场景决策器验证一下</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            难度分级参考：入门 / 进阶 / 深入（本站教程体系用）。本页所有评分维度统一口径，
            与 <Link href="/about#scoring" className="text-primary underline underline-offset-4">评分方法</Link> 一致。
            相关概念可从 <Link href="/learn" className="text-primary underline underline-offset-4">知识库</Link> 入手。
          </p>
        </Section>
      </div>
    </>
  )
}

function pickTemplates(tool: Tool) {
  const names = [tool.name, tool.nameEn]
  const matched = promptTemplates.filter((t) =>
    names.some((n) => `${t.scenario} ${t.modelNotes ?? ''}`.includes(n))
  )
  return (matched.length > 0 ? matched : promptTemplates).slice(0, 3)
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t first:border-t-0">
      <th scope="row" className="w-32 bg-muted/30 px-4 py-2.5 text-left align-top font-medium">
        {label}
      </th>
      <td className="px-4 py-2.5">{value}</td>
    </tr>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  )
}

function ListBox({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'positive' | 'negative'
}) {
  return (
    <div className="border-b border-hairline pb-5">
      <h3
        className={`mb-3 text-sm font-semibold ${
          tone === 'positive' ? 'text-score-4' : 'text-score-1'
        }`}
      >
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-sm leading-6 text-foreground/85">
            <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StepCard({
  step,
  title,
  body,
  href,
}: {
  step: number
  title: string
  body: string
  href?: string
}) {
  const content = (
    <>
      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {step}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-foreground/80">{body}</span>
      </span>
    </>
  )
  const cls = 'flex w-full gap-3 border-t border-hairline pt-4 text-left'
  if (href?.startsWith('/')) {
    return (
      <li>
        <Link href={href} className={`${cls} transition-colors hover:border-primary/40`}>
          {content}
        </Link>
      </li>
    )
  }
  return <li className={cls}>{content}</li>
}