'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CoverArt } from '@/components/cover-art'
import type { EduProgram, EduToolkit } from '@/data/types'
import { isCurrent } from '@/lib/edu-shared'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/page-header'

/**
 * 教案包列表 + 按课程筛选。
 * 静态导出下服务端读不到 query，这里在客户端从地址栏读取并同步回 URL。
 */
export interface ToolRef {
  id: string
  name: string
  logo: string
}

export function ToolkitExplorer({
  toolkits,
  programs,
  toolRefs,
}: {
  toolkits: EduToolkit[]
  programs: EduProgram[]
  /** 由服务端传入的精简工具引用：避免客户端打包整个 data/ */
  toolRefs: ToolRef[]
}) {
  const toolById = new Map(toolRefs.map((t) => [t.id, t]))
  const [programFilter, setProgramFilter] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get('program')
    if (value) setProgramFilter(value)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const qs = programFilter ? `?program=${programFilter}` : ''
    window.history.replaceState(null, '', `/edu/toolkits${qs}`)
  }, [programFilter, hydrated])

  const filtered = useMemo(
    () => (programFilter ? toolkits.filter((t) => t.programId === programFilter) : toolkits),
    [toolkits, programFilter]
  )

  const byStage = filtered.reduce<Record<string, EduToolkit[]>>((acc, t) => {
    ;(acc[t.stage] ||= []).push(t)
    return acc
  }, {})

  const filterProgram = programs.find((p) => p.id === programFilter)

  return (
    <div>
      {/* 课程筛选 */}
      <div className="mb-6 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          按课程筛选
        </span>
        <FilterChip active={!programFilter} onClick={() => setProgramFilter('')}>
          全部
        </FilterChip>
        {programs.map((p) => (
          <FilterChip
            key={p.id}
            active={programFilter === p.id}
            onClick={() => setProgramFilter(p.id)}
          >
            {p.title.length > 12 ? `${p.title.slice(0, 12)}…` : p.title}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="该课程暂未配套教案包"
          description="教案包仍在开发中，可先查看课程大纲，或通过答疑通道申请校本定制。"
          action={
            <Button asChild size="sm" variant="outline">
              <Link href="/edu/programs">返回课程体系</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-10">
          {Object.entries(byStage).map(([stage, items]) => (
            <section key={stage}>
              <h2 className="text-xl">{stage}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">
                {items.length} 套教案包，覆盖{' '}
                {Array.from(new Set(items.map((t) => t.subject))).join('、')}
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {items.map((t, i) => {
                  const program = programs.find((p) => p.id === t.programId)
                  const current = isCurrent(t.validFrom, t.validTo)
                  return (
                    <Link
                      key={t.id}
                      href={`/edu/toolkits/${t.id}`}
                      className="media-card spotlight reveal group"
                      style={{ ['--d' as string]: `${Math.min(i, 8) * 45}ms` }}
                    >
                      <CoverArt
                        id={t.id}
                        eyebrow={`${t.stage} · ${t.subject}`}
                        tools={t.toolIds.map((id) => toolById.get(id)).filter((x): x is ToolRef => Boolean(x))}
                      />
                      <div className="flex flex-1 flex-col p-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">{t.lessons} 课时</Badge>
                          <Badge variant="outline">{t.version}</Badge>
                          {!current ? <Badge variant="danger">已更新</Badge> : null}
                        </div>
                        <h3 className="mt-2.5 text-[15px] font-semibold leading-snug">{t.title}</h3>
                        <p className="mt-2 line-clamp-2 flex-1 text-[13px] leading-6 text-muted-foreground">
                          {t.lessonPlans[0]?.goal}
                        </p>
                        <ul className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                          <li>配套课程：{program?.title ?? t.programId}</li>
                          <li>
                            讨论题 {t.discussionQuestions.length} 个 · 活动设计 {t.activities.length} 项
                          </li>
                        </ul>
                        <span className="mt-3 inline-flex items-center gap-1 border-t border-hairline pt-2.5 text-[11px] text-foreground/70 transition-colors group-hover:text-primary">
                          打开教案包
                          <ArrowRight
                            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-10 border-t pt-6 text-xs leading-6 text-muted-foreground">
        教案包按「学段 × 学科」编排，避免一套课件走遍所有学校。需要结合本校教研安排调整时，
        请通过
        <Link href="/edu/support" className="text-primary underline underline-offset-4">
          {' '}
          答疑与反馈
        </Link>{' '}
        说明学段、学科与课时要求，我们提供可调整的部分（讨论题、活动、数据案例），而不是替换成另一套课件。
      </p>

      {filterProgram ? (
        <span className="sr-only" aria-live="polite">
          已筛选课程：{filterProgram.title}
        </span>
      ) : null}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:border-primary/40 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}