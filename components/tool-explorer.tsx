'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { LayoutGrid, Rows3, Search, SlidersHorizontal, X } from 'lucide-react'
import type { CapabilityKey, Platform, ToolCategory } from '@/data/types'
import type { ToolListItem } from '@/lib/tool-list-item'
import { CAPABILITY_META, capabilityLabel } from '@/lib/score'
import { sortTools } from '@/lib/recommend'
import { CATEGORY_LABELS, PLATFORM_LABELS } from '@/lib/site'
import { TOOL_CATEGORIES } from '@/data/types'
import { cn } from '@/lib/utils'
import { ToolCard, ToolTable } from '@/components/tool-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/page-header'

type Risk = 'low' | 'medium' | 'high'

interface FilterState {
  q: string
  categories: ToolCategory[]
  free: boolean
  chinaDirect: boolean
  capability: CapabilityKey | 'any'
  minScore: number
  platforms: Platform[]
  risks: Risk[]
  sort: string
  dir: 'asc' | 'desc'
  view: 'grid' | 'table'
}

const DEFAULT_FILTERS: FilterState = {
  q: '',
  categories: [],
  free: false,
  chinaDirect: false,
  capability: 'any',
  minScore: 4,
  platforms: [],
  risks: [],
  sort: 'overall',
  dir: 'desc',
  view: 'grid',
}

const ALL_PLATFORMS: Platform[] = [
  'web',
  'ios',
  'android',
  'windows',
  'mac',
  'api',
  'plugin',
  'cli',
]
const ALL_RISKS: Risk[] = ['low', 'medium', 'high']
const RISK_LABELS: Record<Risk, string> = {
  low: '幻觉风险低',
  medium: '幻觉风险中',
  high: '幻觉风险高',
}

/** URL <-> state 同步（静态导出友好：用 history API，不触发路由重渲染） */
function stateToParams(s: FilterState): string {
  const p = new URLSearchParams()
  if (s.q) p.set('q', s.q)
  if (s.categories.length) p.set('cat', s.categories.join(','))
  if (s.free) p.set('free', '1')
  if (s.chinaDirect) p.set('cn', '1')
  if (s.capability !== 'any') p.set('cap', s.capability)
  if (s.capability !== 'any') p.set('min', String(s.minScore))
  if (s.platforms.length) p.set('plat', s.platforms.join(','))
  if (s.risks.length) p.set('risk', s.risks.join(','))
  if (s.sort !== 'overall') p.set('sort', s.sort)
  if (s.dir !== 'desc') p.set('dir', s.dir)
  if (s.view !== 'grid') p.set('view', s.view)
  return p.toString()
}

function paramsToState(params: URLSearchParams): Partial<FilterState> {
  const csv = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])
  const cap = params.get('cap')
  return {
    q: params.get('q') ?? '',
    categories: csv(params.get('cat')).filter((value) =>
      TOOL_CATEGORIES.includes(value as ToolCategory),
    ) as ToolCategory[],
    free: params.get('free') === '1',
    chinaDirect: params.get('cn') === '1',
    capability: cap && CAPABILITY_META.some((c) => c.key === cap) ? (cap as CapabilityKey) : 'any',
    minScore: [3, 4, 5].includes(Number(params.get('min'))) ? Number(params.get('min')) : 4,
    platforms: csv(params.get('plat')).filter((value) =>
      ALL_PLATFORMS.includes(value as Platform),
    ) as Platform[],
    risks: csv(params.get('risk')).filter((value) => ALL_RISKS.includes(value as Risk)) as Risk[],
    sort: ['overall', 'updated', 'chinese', ...CAPABILITY_META.map((item) => item.key)].includes(
      params.get('sort') ?? '',
    )
      ? params.get('sort')!
      : 'overall',
    dir: params.get('dir') === 'asc' ? 'asc' : 'desc',
    view: params.get('view') === 'table' ? 'table' : 'grid',
  }
}

export function ToolExplorer({ tools }: { tools: ToolListItem[] }) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const filterDialog = useRef<HTMLDialogElement>(null),
    filterButton = useRef<HTMLButtonElement>(null)

  // 挂载后从 URL 读取初始状态（避免静态导出时的 hydration 不一致）
  useEffect(() => {
    const read = () => {
      setFilters({
        ...DEFAULT_FILTERS,
        ...paramsToState(new URLSearchParams(window.location.search)),
      })
      setHydrated(true)
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])

  useEffect(() => {
    const dialog = filterDialog.current
    if (!dialog) return
    if (!mobileFilterOpen) {
      if (dialog.open) dialog.close()
      return
    }
    if (!dialog.open) dialog.showModal()
    const trigger = filterButton.current
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onResize = () => {
      if (innerWidth >= 1024) setMobileFilterOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = oldOverflow
      window.removeEventListener('resize', onResize)
      trigger?.focus({ preventScroll: true })
    }
  }, [mobileFilterOpen])

  useEffect(() => {
    if (!hydrated) return
    const qs = stateToParams(filters)
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    window.history.replaceState(null, '', url)
  }, [filters, hydrated])

  const result = useMemo(() => {
    const q = filters.q.trim().toLowerCase()
    const filtered = tools.filter((t) => {
      if (q) {
        const haystack = [t.name, t.nameEn, t.vendor, t.tagline, ...t.tags].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (filters.categories.length && !filters.categories.some((c) => t.categories.includes(c)))
        return false
      if (filters.free && !(t.pricing.model === 'free' || t.pricing.model === 'open-source'))
        return false
      if (filters.chinaDirect && !t.chinaAccessible) return false
      if (filters.capability !== 'any') {
        const s = t.scores[filters.capability] ?? 0
        if (s < filters.minScore) return false
      }
      if (filters.platforms.length && !filters.platforms.some((p) => t.platforms.includes(p)))
        return false
      if (filters.risks.length && !filters.risks.includes(t.hallucinationRisk)) return false
      return true
    })
    return sortTools(filtered, filters.sort as Parameters<typeof sortTools>[1], filters.dir)
  }, [tools, filters])

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
  }

  const activeChips: { label: string; onClear: () => void }[] = [
    ...filters.categories.map((c) => ({
      label: `分类：${CATEGORY_LABELS[c]}`,
      onClear: () => setFilters((f) => ({ ...f, categories: f.categories.filter((x) => x !== c) })),
    })),
    ...filters.platforms.map((p) => ({
      label: `平台：${PLATFORM_LABELS[p]}`,
      onClear: () => setFilters((f) => ({ ...f, platforms: f.platforms.filter((x) => x !== p) })),
    })),
    ...filters.risks.map((r) => ({
      label: RISK_LABELS[r],
      onClear: () => setFilters((f) => ({ ...f, risks: f.risks.filter((x) => x !== r) })),
    })),
    ...(filters.free
      ? [{ label: '免费可用', onClear: () => setFilters((f) => ({ ...f, free: false })) }]
      : []),
    ...(filters.chinaDirect
      ? [{ label: '大陆可直连', onClear: () => setFilters((f) => ({ ...f, chinaDirect: false })) }]
      : []),
    ...(filters.capability !== 'any'
      ? [
          {
            label: `${capabilityLabel(filters.capability)} ≥ ${filters.minScore} 分`,
            onClear: () => setFilters((f) => ({ ...f, capability: 'any' })),
          },
        ]
      : []),
    ...(filters.q
      ? [{ label: `关键词：${filters.q}`, onClear: () => setFilters((f) => ({ ...f, q: '' })) }]
      : []),
  ]

  const filterPanel = (
    <div className="space-y-6">
      <FilterGroup title="关键词">
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            placeholder="工具名 / 厂商 / 标签"
            maxLength={160}
            className="pl-8"
            aria-label="按关键词筛选工具"
          />
        </div>
      </FilterGroup>

      <FilterGroup title="分类">
        <ChipGroup>
          {TOOL_CATEGORIES.map((c) => (
            <Chip
              key={c}
              active={filters.categories.includes(c)}
              onClick={() => setFilters((f) => ({ ...f, categories: toggle(f.categories, c) }))}
            >
              {CATEGORY_LABELS[c]}
            </Chip>
          ))}
        </ChipGroup>
      </FilterGroup>

      <FilterGroup title="能力维度门槛">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filters.capability}
            onChange={(e) =>
              setFilters((f) => ({ ...f, capability: e.target.value as CapabilityKey | 'any' }))
            }
            className="h-8 rounded-md border bg-background px-2 text-xs"
            aria-label="选择能力维度"
          >
            <option value="any">不限维度</option>
            {CAPABILITY_META.map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </select>
          <select
            value={filters.minScore}
            onChange={(e) => setFilters((f) => ({ ...f, minScore: Number(e.target.value) }))}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            aria-label="最低分"
            disabled={filters.capability === 'any'}
          >
            {[3, 4, 5].map((n) => (
              <option key={n} value={n}>
                ≥ {n} 分
              </option>
            ))}
          </select>
        </div>
      </FilterGroup>

      <FilterGroup title="使用条件">
        <div className="space-y-2">
          <Toggle
            checked={filters.free}
            onChange={(v) => setFilters((f) => ({ ...f, free: v }))}
            label="完全免费 / 可自部署"
          />
          <Toggle
            checked={filters.chinaDirect}
            onChange={(v) => setFilters((f) => ({ ...f, chinaDirect: v }))}
            label="中国大陆可直连"
          />
        </div>
      </FilterGroup>

      <FilterGroup title="平台">
        <ChipGroup>
          {ALL_PLATFORMS.map((p) => (
            <Chip
              key={p}
              active={filters.platforms.includes(p)}
              onClick={() => setFilters((f) => ({ ...f, platforms: toggle(f.platforms, p) }))}
            >
              {PLATFORM_LABELS[p]}
            </Chip>
          ))}
        </ChipGroup>
      </FilterGroup>

      <FilterGroup title="幻觉风险">
        <ChipGroup>
          {ALL_RISKS.map((r) => (
            <Chip
              key={r}
              active={filters.risks.includes(r)}
              onClick={() => setFilters((f) => ({ ...f, risks: toggle(f.risks, r) }))}
            >
              {RISK_LABELS[r]}
            </Chip>
          ))}
        </ChipGroup>
      </FilterGroup>
    </div>
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* 桌面筛选栏 */}
      <aside className="hidden lg:block">
        <div className="sticky top-20 border-t border-hairline pt-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              筛选条件
            </h2>
            {activeChips.length > 0 ? (
              <button
                type="button"
                onClick={() => setFilters(DEFAULT_FILTERS)}
                className="text-xs text-primary hover:underline"
              >
                清空
              </button>
            ) : null}
          </div>
          {filterPanel}
        </div>
      </aside>

      <div className="min-w-0">
        {/* 工具栏 */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            ref={filterButton}
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFilterOpen((v) => !v)}
            aria-expanded={mobileFilterOpen}
            aria-controls="tool-filter-dialog"
          >
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            筛选
            {activeChips.length > 0 ? `（${activeChips.length}）` : ''}
          </Button>

          {/* 列表的 h2：既给标题层级（h1 → h2 → 卡片 h3），
              也顺带承担"结果计数"的职责，省掉一个单独的说明行 */}
          <h2 className="text-sm font-normal text-muted-foreground">
            共 <span className="font-semibold text-foreground">{result.length}</span> /{' '}
            {tools.length} 个工具
          </h2>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="hidden sm:inline">排序</span>
              <select
                value={filters.sort}
                onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
                className="h-8 rounded-md border bg-background px-2 text-xs text-foreground"
                aria-label="排序方式"
              >
                <option value="overall">综合分</option>
                <option value="updated">最近更新</option>
                <option value="chinese">中文能力</option>
                {CAPABILITY_META.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label} 单项分
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, dir: f.dir === 'desc' ? 'asc' : 'desc' }))}
              className="h-8 rounded-md border px-2 text-xs text-muted-foreground hover:bg-accent"
              aria-label={
                filters.dir === 'desc' ? '当前降序，点击改为升序' : '当前升序，点击改为降序'
              }
            >
              {filters.dir === 'desc' ? '降序 ↓' : '升序 ↑'}
            </button>
            <div className="flex overflow-hidden rounded-md border">
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, view: 'grid' }))}
                className={cn(
                  'inline-flex h-8 w-9 items-center justify-center',
                  filters.view === 'grid'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )}
                aria-label="卡片视图"
                aria-pressed={filters.view === 'grid'}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...f, view: 'table' }))}
                className={cn(
                  'inline-flex h-8 w-9 items-center justify-center',
                  filters.view === 'table'
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )}
                aria-label="表格视图"
                aria-pressed={filters.view === 'table'}
              >
                <Rows3 className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {activeChips.length > 0 ? (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                aria-label={`移除${chip.label}筛选`}
                type="button"
                onClick={chip.onClear}
                className="inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground"
              >
                {chip.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="px-1 text-xs text-primary hover:underline"
            >
              全部清空
            </button>
          </div>
        ) : null}

        <dialog
          id="tool-filter-dialog"
          ref={filterDialog}
          aria-labelledby="tool-filter-title"
          className="tool-filter-dialog"
          onCancel={() => setMobileFilterOpen(false)}
          onClose={() => setMobileFilterOpen(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              const rect = event.currentTarget.getBoundingClientRect()
              if (
                event.clientY < rect.top ||
                event.clientX < rect.left ||
                event.clientX > rect.right
              )
                setMobileFilterOpen(false)
            }
          }}
        >
          <div className="flex items-center justify-between border-b px-5 py-4">
            <div>
              <h2 id="tool-filter-title" className="text-base font-semibold">
                筛选工具
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">按你实际要做的事，慢慢缩小范围。</p>
            </div>
            <button
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent"
              aria-label="关闭工具筛选"
              onClick={() => setMobileFilterOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="tool-filter-body p-5">{filterPanel}</div>
          <div className="flex items-center gap-4 border-t bg-card px-5 py-4">
            <button
              className="min-h-11 text-sm text-muted-foreground"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              清空
            </button>
            <button
              className="min-h-11 flex-1 rounded-xl bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
              onClick={() => setMobileFilterOpen(false)}
            >
              查看 {result.length} 个工具
            </button>
          </div>
        </dialog>

        {result.length === 0 ? (
          <EmptyState
            title="没有符合当前条件的工具"
            description="试着放宽能力分数门槛，或去掉「大陆可直连」这类硬性条件。也可以直接用场景决策器描述你的需求。"
            action={
              <Button variant="outline" size="sm" onClick={() => setFilters(DEFAULT_FILTERS)}>
                清空全部筛选
              </Button>
            }
          />
        ) : filters.view === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {result.map((tool, i) => (
              <ToolCard key={tool.id} tool={tool} index={i} />
            ))}
          </div>
        ) : (
          <ToolTable tools={result} />
        )}
      </div>
    </div>
  )
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      {children}
    </div>
  )
}

function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>
}

function Chip({
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
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
      />
      <span className="text-muted-foreground">{label}</span>
    </label>
  )
}
