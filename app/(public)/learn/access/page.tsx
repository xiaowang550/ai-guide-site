import { ScrollSidebar } from '@/components/scroll-sidebar'
import '@/app/styles/reference-hero.css'
import '@/app/styles/access.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  Cloud,
  Globe2,
  RefreshCw,
  ListChecks,
  SearchCheck,
  ShieldCheck,
  UserRound,
  Zap,
} from 'lucide-react'
import { tools } from '@/data'
import { ToolLogo } from '@/components/tool-logo'
import { PageHeader } from '@/components/page-header'
import { AccessDiagram } from '@/components/learning/access-diagram'
import { classifyAccess, OUT_OF_SCOPE, type AccessReason } from '@/lib/access'

export const metadata: Metadata = {
  title: '海外工具打不开：原因与应对',
  description: '看页面提示，核对地区、账号和服务状态，再按任务选择能用的替代工具。',
  alternates: { canonical: '/learn/access' },
}
const REASONS = [
  {
    key: 'unserved' as AccessReason,
    title: '官方未开放',
    icon: Globe2,
    text: '厂商暂未向所在地区提供服务。',
    advice: '核对官方支持地区，优先选择支持你的工具。',
  },
  {
    key: 'tos-restricted' as AccessReason,
    title: '地区与账号要求',
    icon: ShieldCheck,
    text: '服务条款或账号使用范围存在要求。',
    advice: '先读官方说明；学校、公司用户可联系管理员。',
  },
  {
    key: 'network-dependent' as AccessReason,
    title: '依赖在线服务',
    icon: Cloud,
    text: '需要连接厂商服务器才能完成任务。',
    advice: '查看服务状态与官方使用渠道，再考虑替代工具。',
  },
]
const SYMPTOMS = [
  {
    icon: Globe2,
    title: '提示“地区不支持”',
    text: '先查官方支持地区与开放范围。',
    href: '#access-reasons',
  },
  {
    icon: UserRound,
    title: '提示账号或权限异常',
    text: '核对登录状态、账号权限与使用条款。',
    href: '#access-steps',
  },
  {
    icon: Cloud,
    title: '一直转圈或连接超时',
    text: '先看服务状态；超时不等于地区限制。',
    href: '#access-steps',
  },
]
const STEPS = [
  { title: '看清提示', text: '记录提示原文：地区、账号、权限，还是超时？', icon: SearchCheck },
  { title: '核对官方说明', text: '查看工具档案里的官网、支持范围与服务状态。', icon: Globe2 },
  {
    title: '询问机构管理员',
    text: '学校或公司用户，确认统一账号与允许的使用渠道。',
    icon: UserRound,
  },
  {
    title: '换个工具完成任务',
    text: '按写作、文档、作图等任务选替代工具，先试一份小材料。',
    icon: Zap,
  },
]

export default function AccessPage() {
  const blocked = tools.filter((tool) => !tool.chinaAccessible)
  const direct = tools.filter((tool) => tool.chinaAccessible)
  const byId = new Map(tools.map((tool) => [tool.id, tool]))
  return (
    <>
      <PageHeader
        illustrated
        art={<AccessDiagram />}
        title="海外工具打不开？先这样排查"
        description="看提示、核对条件，再换一个能完成任务的工具。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '教程', href: '/guides' },
          { label: '海外工具打不开' },
        ]}
        meta={
          <>
            <span className="text-sm text-muted-foreground">
              本站收录 {blocked.length} 个需留意访问条件的工具
            </span>
            <Link href="/tools?cn=1" className="section-link">
              查看 {direct.length} 个标注可直连的工具 →
            </Link>
          </>
        }
      />
      <div className="access-layout container py-8">
        <div className="access-main">
          <section id="access-check" className="access-section">
            <h2>
              <SearchCheck size={24} />
              先看出现什么提示
            </h2>
            <p className="access-section-description">
              提示内容是线索，不要只凭“打不开”就判断原因。
            </p>
            <div className="access-symptoms">
              {SYMPTOMS.map(({ icon: Icon, ...item }) => (
                <Link href={item.href} key={item.title} className="access-symptom">
                  <span className="access-icon">
                    <Icon size={28} />
                  </span>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <span className="access-card-action">
                    看下一步
                    <ArrowRight size={17} />
                  </span>
                </Link>
              ))}
            </div>
          </section>
          <section id="access-steps" className="access-section">
            <h2>
              <ListChecks size={24} />
              按这个顺序处理
            </h2>
            <ol className="access-steps">
              {STEPS.map(({ icon: Icon, ...step }, index) => (
                <li key={step.title}>
                  <span className="access-step-number">{index + 1}</span>
                  <div>
                    <h3>
                      <Icon size={21} />
                      {step.title}
                    </h3>
                    <p>{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
          <section id="access-reasons" className="access-section">
            <h2>
              <Globe2 size={24} />
              工具档案中的三类访问条件
            </h2>
            <p className="access-section-description">
              以厂商当前说明为准。连接超时，也可能与服务中断或网络状态有关。
            </p>
            <div className="access-reasons">
              {REASONS.map(({ icon: Icon, ...reason }) => {
                const items = blocked.filter(
                  (tool) => (classifyAccess(tool) ?? 'network-dependent') === reason.key,
                )
                return (
                  <article className="access-reason" key={reason.key}>
                    <span className="access-icon">
                      <Icon size={28} />
                    </span>
                    <h3>{reason.title}</h3>
                    <p>{reason.text}</p>
                    <div className="access-reason-advice">
                      <strong>建议</strong>
                      <p>{reason.advice}</p>
                    </div>
                    <details>
                      <summary>查看这组工具（{items.length}）</summary>
                      <ul>
                        {items.map((tool) => (
                          <li key={tool.id}>
                            <Link href={`/tools/${tool.id}`}>
                              {tool.name}
                              <ArrowRight size={16} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </details>
                  </article>
                )
              })}
            </div>
          </section>
          <section id="access-alternatives" className="access-section">
            <h2>
              <RefreshCw size={24} aria-hidden />
              换个工具，继续完成任务
            </h2>
            <p className="access-section-description">
              保留你要完成的任务，换工具先小范围试用。访问说明与替代方案都可以展开查看。
            </p>
            <div className="access-tool-grid">
              {blocked.map((tool) => {
                const alternatives = (tool.access?.alternatives ?? [])
                  .map((id) => byId.get(id))
                  .filter((item) => item?.chinaAccessible)
                const reason = REASONS.find((item) => item.key === classifyAccess(tool))
                return (
                  <article className="access-tool" key={tool.id}>
                    <div className="access-tool-heading">
                      <ToolLogo src={tool.logo} alt="" size={36} />
                      <div>
                        <Link
                          href={`/tools/${tool.id}`}
                          className="font-semibold hover:text-primary"
                        >
                          {tool.name}
                        </Link>
                        <p>{reason?.title ?? '访问条件待确认'}</p>
                      </div>
                    </div>
                    {tool.access?.reality && (
                      <details className="access-tool-detail">
                        <summary>查看访问说明</summary>
                        <p>{tool.access.reality}</p>
                        <Link className="section-link mt-3" href={`/tools/${tool.id}`}>
                          看完整档案与官方来源 →
                        </Link>
                      </details>
                    )}
                    <p className="mt-4 text-xs text-muted-foreground">试试标注可直连的替代工具</p>
                    <div className="access-alternative-links">
                      {alternatives.map(
                        (item) =>
                          item && (
                            <Link key={item.id} href={`/tools/${item.id}`}>
                              <ToolLogo src={item.logo} alt="" size={20} />
                              {item.name}
                              <ArrowRight size={15} />
                            </Link>
                          ),
                      )}
                    </div>
                    {!alternatives.length && (
                      <Link className="section-link mt-3" href="/find">
                        按任务帮我选 →
                      </Link>
                    )}
                  </article>
                )
              })}
            </div>
            <p className="access-note">
              “可直连”不代表始终稳定。免费额度、开放地区与服务状态，以工具官方当前说明为准。
            </p>
          </section>
          <details className="access-boundary">
            <summary>本站提供哪些帮助？</summary>
            <p>提供排查顺序、访问说明和替代工具；不承诺任何工具始终可用。</p>
            <p>规避网络管理可能涉及法律风险；本站不推广相关厂商，也不做带货推荐。</p>
            <ul>
              {OUT_OF_SCOPE.map((item) => (
                <li key={item.topic}>不提供：{item.topic}</li>
              ))}
            </ul>
          </details>
        </div>
        <ScrollSidebar className="access-sidebar">
          <nav className="reference-panel" aria-label="本页排查目录">
            <h2>
              <ListChecks size={23} />
              本页怎么用
            </h2>
            {[
              ['#access-check', '看页面提示'],
              ['#access-steps', '按顺序排查'],
              ['#access-reasons', '了解访问条件'],
              ['#access-alternatives', '找替代工具'],
            ].map(([href, label], index) => (
              <a key={href} href={href} className="access-toc-link">
                <span>{index + 1}</span>
                {label}
                <ArrowRight size={17} />
              </a>
            ))}
          </nav>
          <section className="reference-panel">
            <h2>
              <Zap size={23} />
              先试这些工具
            </h2>
            <p className="text-sm leading-7 text-muted-foreground">
              按任务试用，能完成工作就不必卡在同一个工具上。
            </p>
            <ul className="access-direct-tools">
              {direct.slice(0, 4).map((tool) => (
                <li key={tool.id}>
                  <Link href={`/tools/${tool.id}`}>
                    <ToolLogo src={tool.logo} alt="" size={30} />
                    <span className="access-direct-tool-copy">
                      <strong>{tool.name}</strong>
                      <small>{tool.tagline}</small>
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                </li>
              ))}
            </ul>
            <Link className="home-button mt-4 w-full" href="/find">
              按任务帮我选 →
            </Link>
          </section>
          <div className="access-sidebar-help">
            <Link href="/feedback/?from=%2Flearn%2Faccess%2F">信息过时？问题反馈 →</Link>
            <Link href="/guides">回到教程继续学 →</Link>
          </div>
        </ScrollSidebar>
      </div>
    </>
  )
}
