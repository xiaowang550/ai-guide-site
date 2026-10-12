import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ToolListItem } from '@/lib/tool-list-item'
import { scoresToCapabilityMap } from '@/lib/tool-list-item'
import { CATEGORY_LABELS } from '@/lib/site'
import { capabilityShort, rankedCapabilities } from '@/lib/score'
import { cn } from '@/lib/utils'
import { ToolLogo } from '@/components/tool-logo'
import { ScoreBadge, ScoreValue } from '@/components/score-badge'
import { UpdatedBadge } from '@/components/updated-badge'
import { toTenPointScore } from '@/lib/display-score'
import type { ToolTrends } from '@/lib/tool-trends'
import { ToolHotBadge } from './tool-trends'

/** 紧凑工具卡：用途、关键能力与使用条件直接可见，评分依据放在详情。 */
export function ToolCard({
  tool,
  index = 0,
  trends,
}: {
  tool: ToolListItem
  index?: number
  trends?: ToolTrends
}) {
  // 列表投影里只有分数，没有 basis 文本；这里还原成既有纯函数可用的形状
  const top = rankedCapabilities(scoresToCapabilityMap(tool.scores), 4).slice(0, 3)
  const isFree = tool.pricing.model === 'free' || tool.pricing.model === 'open-source'

  return (
    <article
      className="media-card compact-tool-card reveal group"
      style={{ ['--d' as string]: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="compact-tool-title">
        <ToolLogo src={tool.logo} alt={`${tool.name} 标志`} size={48} />
        <div>
          <h3 className="flex items-baseline justify-between gap-3">
            <Link
              href={`/tools/${tool.id}`}
              className="text-base font-semibold leading-snug hover:text-primary"
            >
              {tool.name}
              <span className="absolute inset-0" aria-hidden />
            </Link>
            <ScoreBadge score={tool.overallScore} variant="star" label={tool.name} />
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{tool.vendor}</p>
          {trends && <ToolHotBadge id={tool.id} trends={trends} />}
        </div>
      </div>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-foreground/80">
        {tool.tagline}
      </p>

      <ul className="tool-strengths" aria-label="较强的能力，满分 10 分">
        {top.map((c) => (
          <li key={c.key}>
            <strong>{toTenPointScore(c.score).toFixed(1)}</strong>
            {capabilityShort(c.key)}
          </li>
        ))}
      </ul>

      <footer>
        <UpdatedBadge date={tool.updatedAt} prefix="更新于" showStale={false} />
        <span className="inline-flex items-center gap-1 text-foreground/70 transition-colors group-hover:text-primary">
          {tool.chinaAccessible ? '大陆可直连' : '大陆需借助网络工具'}
          <ArrowRight
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
        {isFree && <span className="text-primary">免费 / 开源</span>}
      </footer>
    </article>
  )
}

/** 紧凑表格：用于工具库「表格视图」与对比页 */
export function ToolTable({ tools, trends }: { tools: ToolListItem[]; trends?: ToolTrends }) {
  return (
    <div
      className="overflow-x-auto"
      tabIndex={0}
      role="region"
      aria-label="工具列表表格，可横向滚动查看全部列"
    >
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <caption className="sr-only">工具列表（紧凑表格视图）</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="py-2.5 pr-4 text-left font-medium text-muted-foreground">
              工具
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
              分类
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
              综合分 / 10
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
              中文 / 10
            </th>
            <th scope="col" className="px-4 py-2.5 text-left font-medium text-muted-foreground">
              大陆直连
            </th>
            <th scope="col" className="py-2.5 pl-4 text-left font-medium text-muted-foreground">
              价格
            </th>
          </tr>
        </thead>
        <tbody>
          {tools.map((tool, i) => (
            <tr
              key={tool.id}
              className={cn('hover:bg-accent/40', i > 0 && 'border-t border-hairline')}
            >
              <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                <Link
                  href={`/tools/${tool.id}`}
                  className="flex items-center gap-2 hover:text-primary"
                >
                  <ToolLogo
                    src={tool.logo}
                    alt=""
                    size={22}
                    className="border-0 bg-transparent p-0"
                  />
                  <span>
                    <span className="font-medium">{tool.name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{tool.vendor}</span>
                    {trends && <ToolHotBadge id={tool.id} trends={trends} />}
                  </span>
                </Link>
              </th>
              <td className="px-4 py-2.5 text-muted-foreground">
                {tool.categories.map((c) => CATEGORY_LABELS[c]).join(' / ')}
              </td>
              <td className="px-4 py-2.5 text-right">
                <ScoreValue score={tool.overallScore} />
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">
                {toTenPointScore(tool.chineseQuality).toFixed(1)}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {tool.chinaAccessible ? '是' : '否'}
              </td>
              <td className="py-2.5 pl-4 text-muted-foreground">
                {tool.pricing.paidFrom ?? '免费'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
