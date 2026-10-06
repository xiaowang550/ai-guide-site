import type { EduMetrics } from '@/lib/edu'
import { TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/** 过程指标卡：对应方案「预期价值与成果」中的过程指标口径 */
export function EduMetricsBar({ metrics, className }: { metrics: EduMetrics; className?: string }) {
  const items = [
    { label: '在校课程', value: metrics.programs, unit: '门', hint: '教师四层 + 学生三层' },
    { label: '教案包', value: metrics.toolkits, unit: '套', hint: '按学段与学科，可直接开课' },
    {
      label: '覆盖学校',
      value: metrics.schools,
      unit: '所',
      hint: metrics.includesSample
        ? `含示例数据 · 其中试点验证 ${metrics.pilotSchools} 所`
        : `其中试点验证 ${metrics.pilotSchools} 所`,
    },
    {
      label: '覆盖教师',
      value: metrics.teachersReached,
      unit: '人次',
      hint: metrics.includesSample
        ? `含示例数据 · 种子教师 ${metrics.seedTeachers} 人`
        : `种子教师 ${metrics.seedTeachers} 人`,
    },
    { label: '近 90 天更新', value: metrics.recentlyUpdated, unit: '项', hint: '内容维护是固定动作' },
  ]

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-5', className)}>
      {items.map((item) => (
        <div key={item.label} className="border-t border-hairline pt-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1.5 flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">{item.value}</span>
            <span className="text-xs text-muted-foreground">{item.unit}</span>
          </p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{item.hint}</p>
        </div>
      ))}
    </div>
  )
}

/** 更新新鲜度提示：对应「内容维护不是一次性交付」 */
export function EduFreshnessNote({ latestUpdate }: { latestUpdate: string }) {
  return (
    <p className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
      <TrendingUp className="h-3 w-3" aria-hidden />
      内容最近一次复核：{latestUpdate || '—'}
    </p>
  )
}