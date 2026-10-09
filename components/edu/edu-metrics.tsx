import type { EduMetrics } from '@/lib/edu'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 过程指标卡：对应方案「预期价值与成果」中的过程指标口径。
 *
 * 示例数据的处理（这一条是本组件存在的关键理由）：
 * schools 页顶部有一条显眼的「本页目前展示的是示例数据」警示，
 * 但首页也用了这个指标组件。原先这里只在卡片下面写一行小字
 * 「含示例数据」，字号 11px、和另外五张真实指标并排，
 * 读者一眼扫过去只会看到「覆盖学校 8 所」这个大数字 ——
 * **同一份数据在两个页面给出了强弱悬殊的提示**，很容易被当成真实覆盖。
 *
 * 现在只要 includesSample 为真，就在整块指标上方加一条与 schools 页
 * 同规格的警示条，并把这张卡本身也标出来。宁可啰嗦，也不要让示例数据
 * 在首页看起来像真成绩。
 */
export function EduMetricsBar({ metrics, className }: { metrics: EduMetrics; className?: string }) {
  const items = [
    { label: '在校课程', value: metrics.programs, unit: '门', hint: '教师四层 + 学生三层' },
    { label: '教案包', value: metrics.toolkits, unit: '套', hint: '按学段与学科，可直接开课' },
    {
      label: '覆盖学校',
      value: metrics.schools,
      unit: '所',
      hint: metrics.includesSample
        ? `示例数据 · 其中试点验证 ${metrics.pilotSchools} 所`
        : `其中试点验证 ${metrics.pilotSchools} 所`,
      sample: metrics.includesSample,
    },
    {
      label: '覆盖教师',
      value: metrics.teachersReached,
      unit: '人次',
      hint: metrics.includesSample
        ? `示例数据 · 种子教师 ${metrics.seedTeachers} 人`
        : `种子教师 ${metrics.seedTeachers} 人`,
      sample: metrics.includesSample,
    },
    { label: '近 90 天更新', value: metrics.recentlyUpdated, unit: '项', hint: '内容维护是固定动作' },
  ]

  return (
    <div className={className}>
      {metrics.includesSample ? (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm leading-6">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span>
            下面的「覆盖学校」与「覆盖教师」为<strong className="font-medium">示例数据</strong>
            ，不是真实覆盖成果。试点与推广板块目前全部条目均标注为示例，
            接入实际信息后会替换，并在本行取消提示。
          </span>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {items.map((item) => (
          <div
            key={item.label}
            className={cn(
              'border-t pt-4',
              item.sample ? 'border-amber-500/50' : 'border-hairline'
            )}
          >
            <p className="text-xs text-muted-foreground">
              {item.label}
              {item.sample ? (
                <span className="ml-1.5 rounded border border-amber-500/50 px-1 py-px text-xs text-amber-700 dark:text-amber-300">
                  示例
                </span>
              ) : null}
            </p>
            <p className="mt-1.5 flex items-baseline gap-1">
              <span className="text-2xl font-bold tabular-nums">{item.value}</span>
              <span className="text-xs text-muted-foreground">{item.unit}</span>
            </p>
            <p className="mt-1 text-xs leading-4 text-muted-foreground">{item.hint}</p>
          </div>
        ))}
      </div>
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
