'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Clock, Filter } from 'lucide-react'
import type { Difficulty, Guide, Tool } from '@/data/types'
import { DIFFICULTY_LABELS } from '@/lib/site'
import { cn } from '@/lib/utils'
import { ToolLogo } from '@/components/tool-logo'
import { Badge } from '@/components/ui/badge'

const LEVELS: (Difficulty | 'all')[] = ['all', 'beginner', 'intermediate', 'advanced']
type GuideSummary = Pick<
  Guide,
  'id' | 'title' | 'type' | 'level' | 'durationMin' | 'tools' | 'outcome' | 'summary'
>
type GuideTool = Pick<Tool, 'id' | 'name' | 'logo'>

/** 教程列表：按类型分区 + 难度筛选 */
export function GuideExplorer({ guides, tools }: { guides: GuideSummary[]; tools: GuideTool[] }) {
  const [level, setLevel] = useState<Difficulty | 'all'>('all')

  const filtered = useMemo(
    () => (level === 'all' ? guides : guides.filter((g) => g.level === level)),
    [guides, level],
  )

  const groups: { key: Guide['type']; title: string; desc: string }[] = [
    {
      key: 'method',
      title: '通用方法课',
      desc: '学会提问、追问和核对，换工具也能用。',
    },
    {
      key: 'scenario',
      title: '场景实操课',
      desc: '用自己的材料，完成一件真实任务。',
    },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Filter className="h-3.5 w-3.5" aria-hidden />
          难度
        </span>
        {LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLevel(l)}
            aria-pressed={level === l}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              level === l
                ? 'border-primary bg-primary/10 font-medium text-primary'
                : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {l === 'all' ? '全部' : DIFFICULTY_LABELS[l]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">共 {filtered.length} 篇</span>
      </div>

      <div className="space-y-10">
        {groups.map((group) => {
          const items = filtered.filter((g) => g.type === group.key)
          if (items.length === 0) return null
          return (
            <section key={group.key}>
              <h2 className="text-xl">{group.title}</h2>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{group.desc}</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {items.map((g, i) => (
                  <GuideCard key={g.id} guide={g} tools={tools} index={i} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function GuideCard({
  guide,
  tools,
  index = 0,
}: {
  guide: GuideSummary
  tools: GuideTool[]
  index?: number
}) {
  const related = guide.tools
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is GuideTool => Boolean(t))
  return (
    <Link
      href={`/guides/${guide.id}`}
      className="learning-card group flex h-full flex-col"
      style={{ ['--d' as string]: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <Badge
          variant={
            guide.level === 'beginner'
              ? 'success'
              : guide.level === 'intermediate'
                ? 'secondary'
                : 'outline'
          }
        >
          {DIFFICULTY_LABELS[guide.level]}
        </Badge>
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" aria-hidden />
          {guide.durationMin} 分钟
        </span>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-snug">{guide.title}</h3>
      <p className="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-muted-foreground">
        {guide.summary ?? guide.outcome}
      </p>
      {related.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {related.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              <ToolLogo src={t.logo} alt="" size={14} className="border-0 bg-transparent p-0" />
              {t.name}
            </span>
          ))}
        </div>
      ) : null}
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
        开始这篇教程
        <ArrowRight
          className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  )
}
