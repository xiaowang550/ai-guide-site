import '@/app/styles/tool-signals.css'
import '@/app/styles/reference-hero.css'
import '@/app/styles/reference-tools.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Compass } from 'lucide-react'
import { tools } from '@/data'
import { ToolExplorer } from '@/components/tool-explorer'
import { toListItems } from '@/lib/tool-list-item'
import { PageHeader, Section } from '@/components/page-header'
import { UpdatedBadge } from '@/components/updated-badge'
import { CAPABILITY_META, latestUpdatedAt } from '@/lib/score'
import { siteConfig } from '@/lib/site'
import { ExplorationAside } from '@/components/exploration-aside'

export const metadata: Metadata = {
  title: '工具库',
  description:
    'AI 工具公开实测、具体模型版本、榜单来源与使用条件。按用途筛选，分别比较 AA 智能指数和 Arena 文本偏好。',
  alternates: { canonical: '/tools' },
}

export default function ToolsPage() {
  // 只把卡片与筛选真正用得到的字段交给客户端组件，
  // 强项/弱项/依据/来源这些长文本留给详情页，不进首屏
  const listItems = toListItems(tools)
  const updated = latestUpdatedAt(tools)

  return (
    <>
      <PageHeader
        illustrated
        title="工具库"
        description="按你要做的事选工具，再比较能力、费用和使用条件。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '工具库' }]}
        meta={<UpdatedBadge date={updated} prefix="数据更新于" />}
        aside={
          <>
            <h2>
              <Compass size={26} />
              打开场景决策器
            </h2>
            <p className="text-sm leading-7 text-muted-foreground">
              告诉我们你想做的事，找到合适的工具组合。
            </p>
            <Link className="home-button mt-5 w-full" href="/find">
              打开场景决策器 →
            </Link>
          </>
        }
      />

      <div className="container pt-6">
        <div className="benchmark-intro">
          <div>
            <h2 className="text-base font-semibold">实测有来源，选工具有依据</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              AA 看模型能力，Arena 看盲测偏好。保留原榜单位；应用与模型分别看，不再混成一个总分。
            </p>
          </div>
          <Link href="/about#benchmarks" className="text-sm text-primary underline">
            怎样读这些分数 ↗
          </Link>
        </div>
      </div>
      <div className="discovery-layout container py-6">
        <ToolExplorer tools={listItems} />
        <ExplorationAside tools />
      </div>

      <div className="container">
        <Section title="选工具前，记住这几点">
          <details className="mb-5 rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">查看 14 个能力维度</summary>
            <p className="mt-3 text-xs leading-7 text-muted-foreground">
              {CAPABILITY_META.map((c) => c.label).join(' / ')}
            </p>
          </details>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>· 每个工具附官方来源和复核日期；超过 90 天未复核会提示。</li>
            <li>
              · 本站不做自建评测；公开实测来自原榜快照；14 维能力参考属于编辑整理，依据见{' '}
              <Link href="/about" className="text-primary underline underline-offset-4">
                实测与参考的区别
              </Link>
              。
            </li>
            <li>
              · 价格和免费额度以
              <Link href="/compare" className="text-primary underline underline-offset-4">
                {' '}
                对比页{' '}
              </Link>
              中的官方链接为准。
            </li>
            <li>
              · 发现某条数据过时？请在{' '}
              <Link href="/about#errata" className="text-primary underline underline-offset-4">
                勘误入口
              </Link>{' '}
              反馈，也可查看{' '}
              <Link href="/updates" className="text-primary underline underline-offset-4">
                AI 实时资讯
              </Link>
              。
            </li>
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            当前收录 {tools.length} 个工具，站点：{siteConfig.name}
          </p>
        </Section>
      </div>
    </>
  )
}
