import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react'
import { tools } from '@/data'
import { ToolLogo } from '@/components/tool-logo'
import { PageHeader, Section } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'
import { ACCESS_REASON_LABELS, OUT_OF_SCOPE, classifyAccess, type AccessReason } from '@/lib/access'

export const metadata: Metadata = {
  title: '海外工具打不开：原因与应对',
  description:
    '区分「官方未开放」「服务条款限制」「依赖服务器可达」三类原因，说明打不开时该按什么顺序处理，以及本站为什么不提供绕过网络限制的教程。',
  alternates: { canonical: '/learn/access' },
}

/** 三类原因的性质与应对完全不同，分开讲才有用 */
const REASONS: {
  key: AccessReason
  what: string
  soWhat: string
  advice: string
}[] = [
  {
    key: 'unserved',
    what: '官方没有在你们所在地区提供服务。',
    soWhat: '这类不是「网络慢」或「被墙」，而是厂商根本没做这个市场。换个网络环境通常也不会变。',
    advice: '直接用替代方案。下面每个工具都列了本站已收录、且大陆可直连的同能力工具。',
  },
  {
    key: 'tos-restricted',
    what: '服务条款没把你们所在地区列入支持范围。',
    soWhat:
      '这一类风险最高：不但打不开，硬用还可能因为违反条款被限制甚至收回账号，账号里的历史内容一起没了。',
    advice: '优先换用替代方案。若确实需要用，请先读该工具的服务条款里关于地区与账号的条款。',
  },
  {
    key: 'network-dependent',
    what: '能力完全依赖厂商服务器，没有本地部署选项。',
    soWhat: '这一类在大陆网络下通常表现不稳定 —— 可能时好时坏，比干脆打不开更难判断问题出在哪。',
    advice: '先看有没有官方提供的其他使用渠道（比如国内企业版、区域版），没有就换用替代方案。',
  },
]

const STEPS = [
  {
    n: 1,
    title: '先确认是「打不开」还是「很慢」',
    body: '完全打不开、一直转圈、还是能打开但超时？前者更可能是地区限制，后者更可能是访问不稳定。这两者的应对不同，别混着处理。',
  },
  {
    n: 2,
    title: '先换工具，再考虑网络',
    body: '本站每个不可直连的工具都列了替代方案。如果替代工具能覆盖你要做的事，那这个问题就不需要解决 —— 换工具的成本远低于折腾网络。',
  },
  {
    n: 3,
    title: '问你的机构，而不是自己解决',
    body: '学校、公司通常有合规的网络接入方案或统一采购的账号，这类渠道比自己想办法稳定、也不会带来账号风险。先问信息中心或采购部门。',
  },
  {
    n: 4,
    title: '看厂商官方怎么说',
    body: '服务条款里的「支持地区」「账号使用」两节会写明哪些地区可用、违规会怎样。比任何第三方的说法都权威，也比任何承诺都准确。',
  },
]

export default function AccessPage() {
  const blocked = tools.filter((t) => !t.chinaAccessible)
  const byReason = new Map<AccessReason, typeof blocked>()
  for (const t of blocked) {
    const r = classifyAccess(t) ?? 'network-dependent'
    byReason.set(r, [...(byReason.get(r) ?? []), t])
  }
  const toolsById = new Map(tools.map((t) => [t.id, t]))

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '教程', href: '/guides' },
          { label: '海外工具打不开' },
        ]}
        title="海外工具打不开，到底是怎么回事"
        description="本站收录的工具里有相当一部分在中国大陆无法直连。这一页说清三类原因分别是什么，以及打不开时按什么顺序处理。"
        meta={
          <>
            <Badge variant="outline">{blocked.length} 个工具大陆不可直连</Badge>
            <Badge variant="outline">{tools.length - blocked.length} 个可直连</Badge>
          </>
        }
      />

      <div className="container py-8">
        <div className="max-w-3xl">
          {/* 开篇就把结论说了 */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
            <h2 className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              先说本站不提供什么
            </h2>
            <p className="mt-2 text-sm leading-7 text-foreground/85">
              本站<b className="text-foreground">不提供绕过网络限制的方法、工具或厂商推荐</b>，
              也不做这类内容的推广。两条原因：一是规避网络管理在中国境内有法律风险；
              二是本站承诺「不吹不黑」，给厂商写带货文案会直接砸掉这个承诺。
            </p>
            <ul className="mt-3 space-y-2">
              {OUT_OF_SCOPE.map((x) => (
                <li key={x.topic} className="flex gap-2 text-sm leading-6">
                  <AlertTriangle
                    className="mt-1 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                    aria-hidden
                  />
                  <span>
                    <span className="font-medium">不提供：{x.topic}</span>
                    <span className="block text-muted-foreground">{x.why}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm leading-7 text-foreground/85">
              <b className="text-foreground">能提供的是：</b>
              说清每个工具打不开的<b>具体原因</b>（因为三类原因的应对完全不同）， 并给出本站已收录、
              <b>大陆可直连</b>的同能力替代工具。
            </p>
          </div>

          {/* 三类原因 */}
          <h2 className="mt-10 text-xl">三类原因，性质完全不同</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            把它们混成一句「需要网络工具」是本站之前犯的错 —— 这句话等于没给读者任何下一步。
          </p>
          <div className="mt-4 space-y-3">
            {REASONS.map((r) => {
              const list = byReason.get(r.key) ?? []
              return (
                <div key={r.key} className="border-b border-hairline pb-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold">{ACCESS_REASON_LABELS[r.key]}</h3>
                    <span className="text-xs text-muted-foreground">本站收录 {list.length} 个</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-foreground/85">{r.what}</p>
                  <p className="mt-1.5 text-sm leading-6 text-foreground/85">
                    <span className="font-medium">意味着什么：</span>
                    {r.soWhat}
                  </p>
                  <p className="mt-1.5 text-sm leading-6 text-foreground/85">
                    <span className="font-medium">建议：</span>
                    {r.advice}
                  </p>
                  {list.length > 0 ? (
                    <ul className="mt-2.5 flex flex-wrap gap-1.5">
                      {list.map((t) => (
                        <li key={t.id}>
                          <Link
                            href={`/tools/${t.id}`}
                            className="inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors hover:border-primary/40 hover:bg-accent"
                          >
                            {t.name}
                            <ArrowRight className="h-3 w-3" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              )
            })}
          </div>

          {/* 处理顺序 */}
          <h2 className="mt-10 text-xl">打不开时按这个顺序处理</h2>
          <ol className="mt-4 space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {s.n}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{s.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-foreground/85">{s.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* 逐个工具的实际情况 */}
        <div className="mt-12 max-w-3xl">
          <h2 className="text-xl">逐个工具：实际情况与替代方案</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            替代方案全部是本站已收录、且大陆可直连的工具 —— 不会把读者从一扇关着的门推到另一扇。
          </p>

          <ul className="mt-5 space-y-4">
            {blocked.map((t) => {
              const reason = classifyAccess(t)
              const alts = (t.access?.alternatives ?? [])
                .map((id) => toolsById.get(id))
                .filter((x): x is NonNullable<typeof x> => Boolean(x))
              return (
                <li key={t.id} className="border-b border-hairline pb-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/tools/${t.id}`}
                      className="flex items-center gap-2 font-medium hover:text-primary"
                    >
                      <ToolLogo src={t.logo} alt={`${t.name} 标志`} size={22} />
                      {t.name}
                    </Link>
                    {reason ? (
                      <Badge variant="outline">{ACCESS_REASON_LABELS[reason]}</Badge>
                    ) : null}
                  </div>

                  {t.access?.reality ? (
                    <p className="mt-2 text-sm leading-6 text-foreground/85">{t.access.reality}</p>
                  ) : null}

                  {alts.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                        大陆可直连的替代方案
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {alts.map((a) => (
                          <li key={a.id}>
                            <Link
                              href={`/tools/${a.id}`}
                              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:border-primary/40 hover:bg-accent"
                            >
                              <ToolLogo src={a.logo} alt="" size={16} />
                              {a.name}
                              <ArrowRight className="h-3 w-3" aria-hidden />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </li>
              )
            })}
          </ul>

          <div className="mt-8 rounded-xl border bg-muted/30 p-5 text-sm leading-7">
            <p>
              <b className="text-foreground">一个必要的澄清：</b>
              「大陆可直连」不等于「一定稳定」。国产工具同样会限流、会有服务中断、
              也会在特定时段变慢。本站标的是「不需要额外网络条件即可使用」，
              不是「任何时候都保证可用」。真遇到问题，以工具官方的服务状态页为准。
            </p>
            <p className="mt-3">
              如果你觉得某个工具的可访问性标注已经过时，
              <Link href="/about#errata" className="mx-1 text-primary underline underline-offset-4">
                请提交勘误
              </Link>
              —— 这类信息变化快，靠大家互相校正比靠某一方更可靠。
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/tools"
              className="inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              <ArrowRight className="h-4 w-4" aria-hidden />
              回到工具库
            </Link>
            <Link
              href="/find"
              className="inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors hover:bg-accent"
            >
              用场景决策器换个工具
            </Link>
          </div>
        </div>
      </div>

      <div className="container">
        <Section
          eyebrow="相关"
          title="相关页面"
          description="看不太清的 AI 术语、或者想知道该用哪一类工具。"
        >
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { href: '/learn/glossary', label: '术语表', desc: '中英对照速查' },
              { href: '/find', label: '场景决策器', desc: '描述需求，直接告诉你该用哪个' },
              { href: '/compare', label: '工具对比', desc: '并排比较几个工具' },
              { href: '/freshness', label: '数据保鲜看板', desc: '这些标注上次是什么时候复核的' },
            ].map((x) => (
              <li key={x.href}>
                <Link
                  href={x.href}
                  className="block border-t border-hairline py-3 hover:border-primary/40 hover:bg-accent/30"
                >
                  <span className="block font-medium">{x.label}</span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">{x.desc}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      </div>
    </>
  )
}
