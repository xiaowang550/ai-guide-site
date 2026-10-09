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

export const metadata: Metadata = {
  title: '工具库',
  description:
    '按 14 个能力维度筛选和排序 AI 工具：分类、能力门槛、是否免费、大陆可直连、平台、幻觉风险。所有评分带依据，所有工具都写清楚弱项。',
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
        title="工具库"
        description="按你要做的事选工具，再比较能力、费用和使用条件。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '工具库' }]}
        meta={<UpdatedBadge date={updated} prefix="数据更新于" />}
      />

      <div className="container py-6">
        <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline px-5 py-4 pt-5 text-sm">
          <p className="font-medium">还没想好用哪个？</p>
          <Link
            href="/find"
            className="inline-flex items-center gap-1.5 rounded-lg bg-highlight px-3 py-1.5 text-xs font-semibold text-highlight-foreground hover:opacity-90"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden />
            打开场景决策器
          </Link>
        </div>

        <ToolExplorer tools={listItems} />
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
            <li>
              · 每个工具附官方来源和复核日期；超过 90 天未复核会提示。
            </li>
            <li>
              · 本站不做自建评测；评分属于编辑判断，依据见{' '}
              <Link href="/about" className="text-primary underline underline-offset-4">
                我们怎么打分
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
