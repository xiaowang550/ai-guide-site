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
        <Section title="关于这份数据" description="评分怎么来的、能不能质疑，站内都写清楚了。">
          <details className="mb-5 rounded-xl border p-4">
            <summary className="cursor-pointer text-sm font-medium">查看 14 个能力维度</summary>
            <p className="mt-3 text-xs leading-7 text-muted-foreground">
              {CAPABILITY_META.map((c) => c.label).join(' / ')}
            </p>
          </details>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              · 每个工具都有 <strong className="text-foreground">updatedAt</strong>{' '}
              与至少一条官方来源链接， 数据超过 90 天未复核的卡片会显示「可能已过时」。
            </li>
            <li>
              · 分数 ≥4 或 ≤2 的维度都会写明依据（官方基准 / 公开反馈 / 社区共识）。
              本站不做自建评测，分数是编辑判断而非测量结果， 详见{' '}
              <Link href="/about" className="text-primary underline underline-offset-4">
                我们怎么打分
              </Link>
              。
            </li>
            <li>
              · 本站不与任何厂商有合作或返佣。价格与额度请以
              <Link href="/compare" className="text-primary underline underline-offset-4">
                {' '}
                对比页{' '}
              </Link>
              里的官方链接为准。
            </li>
            <li>
              · 发现某条数据过时？请在{' '}
              <Link href="/about#errata" className="text-primary underline underline-offset-4">
                勘误入口
              </Link>{' '}
              提交， 我们会更新并记入{' '}
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
