import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Tool } from '@/data/types'
import { CATEGORY_LABELS } from '@/lib/site'
import { capabilityShort, rankedCapabilities } from '@/lib/score'
import { cn } from '@/lib/utils'
import { ToolLogo } from '@/components/tool-logo'
import { ScoreBadge, ScoreDot, ScoreValue } from '@/components/score-badge'
import { UpdatedBadge } from '@/components/updated-badge'

/**
 * 工具媒体卡：大圆角 + 封面预览区 + hover 微放大。
 * 借鉴 motionsites 画廊的卡片观感：先给一个"封面"，再给标题与元信息，
 * 而不是把信息平铺在一块描边盒子里。
 */
export function ToolCard({ tool, index = 0 }: { tool: Tool; index?: number }) {
  const top = rankedCapabilities(tool.capabilities, 4).slice(0, 3)
  const isFree = tool.pricing.model === 'free' || tool.pricing.model === 'open-source'

  return (
    <article
      className="media-card spotlight group reveal"
      style={{ ['--d' as string]: `${Math.min(index, 8) * 45}ms` }}
    >
      {/* 封面：logo 放大做视觉锚点，角上放分类小标签 */}
      <div className="media-cover h-28">
        <ToolLogo
          src={tool.logo}
          alt={`${tool.name} 标志`}
          size={52}
          variant="cover"
          rounded="rounded-none"
          className="opacity-90"
        />
        <span className="absolute left-3 top-3 text-[11px] font-medium text-muted-foreground">
          {tool.categories.map((c) => CATEGORY_LABELS[c]).join(' · ')}
        </span>
        {isFree ? (
          <span className="absolute right-3 top-3 text-[11px] font-medium text-score-3">免费</span>
        ) : null}
      </div>

      {/* 标题区 */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="flex items-baseline justify-between gap-3">
          <Link
            href={`/tools/${tool.id}`}
            className="text-[15px] font-semibold leading-snug hover:text-primary"
          >
            {tool.name}
            <span className="absolute inset-0" aria-hidden />
          </Link>
          <ScoreBadge score={tool.overallScore} showMax label={tool.name} />
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">{tool.vendor}</p>
        <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-6 text-foreground/80">
          {tool.tagline}
        </p>

        {/* 最强维度：小色点 + 分数，不用药丸 */}
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          {top.map((c) => (
            <li key={c.key} className="inline-flex items-center gap-1">
              <ScoreDot score={c.score} />
              {capabilityShort(c.key)} {c.score}
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2.5 text-[11px] text-muted-foreground">
          <UpdatedBadge date={tool.updatedAt} prefix="更新于" showStale={false} />
          <span className="inline-flex items-center gap-1 text-foreground/70 transition-colors group-hover:text-primary">
            {tool.chinaAccessible ? '大陆可直连' : '大陆需借助网络工具'}
            <ArrowRight
              className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </article>
  )
}

/** 紧凑表格：用于工具库「表格视图」与对比页 */
export function ToolTable({ tools }: { tools: Tool[] }) {
  return (
    <div className="overflow-x-auto">
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
              综合分
            </th>
            <th scope="col" className="px-4 py-2.5 text-right font-medium text-muted-foreground">
              中文
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
            <tr key={tool.id} className={cn('hover:bg-accent/40', i > 0 && 'border-t border-hairline')}>
              <th scope="row" className="py-2.5 pr-4 text-left font-normal">
                <Link href={`/tools/${tool.id}`} className="flex items-center gap-2 hover:text-primary">
                  <ToolLogo src={tool.logo} alt="" size={22} className="border-0 bg-transparent p-0" />
                  <span>
                    <span className="font-medium">{tool.name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{tool.vendor}</span>
                  </span>
                </Link>
              </th>
              <td className="px-4 py-2.5 text-muted-foreground">
                {tool.categories.map((c) => CATEGORY_LABELS[c]).join(' / ')}
              </td>
              <td className="px-4 py-2.5 text-right">
                <ScoreValue score={tool.overallScore} />
              </td>
              <td className="px-4 py-2.5 text-right tabular-nums">{tool.chineseQuality}</td>
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