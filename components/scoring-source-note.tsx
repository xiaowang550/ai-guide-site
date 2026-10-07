import Link from 'next/link'
import { SCORING_SOURCE_SUMMARY, SCORING_SOURCES } from '@/lib/scoring-statement'
import { cn } from '@/lib/utils'

/**
 * 评分来源说明的统一组件。
 *
 * 五处页面共用（about / 工具库 / 工具详情 / 对比 / 评分方法锚点），
 * 保证「分数怎么来的」这个承诺只有一种说法。
 * 改动请改 lib/scoring-statement.ts，不要改这里的文案。
 */
export function ScoringSourceNote({
  className,
  variant = 'block',
}: {
  className?: string
  /** inline = 一行短句；block = 带来源清单的完整块 */
  variant?: 'inline' | 'block'
}) {
  if (variant === 'inline') {
    return (
      <p className={cn('text-xs leading-5 text-muted-foreground', className)}>
        {SCORING_SOURCE_SUMMARY} 详见{' '}
        <Link href="/about#scoring" className="text-primary underline underline-offset-4">
          评分方法
        </Link>
        。
      </p>
    )
  }

  return (
    <div className={cn('rounded-xl border bg-muted/30 px-4 py-3.5', className)}>
      <p className="text-sm font-medium">这些分数是怎么来的</p>
      <p className="mt-1.5 text-sm leading-6 text-foreground/85">{SCORING_SOURCE_SUMMARY}</p>
      <ul className="mt-2.5 space-y-1">
        {SCORING_SOURCES.map((s) => (
          <li key={s} className="flex gap-2 text-xs leading-5 text-muted-foreground">
            <span aria-hidden className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
            {s}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 text-xs text-muted-foreground">
        完整口径与已知局限见{' '}
        <Link href="/about#scoring" className="text-primary underline underline-offset-4">
          评分方法
        </Link>
        ；有依据写得薄的地方会在工具详情页逐条标出。
      </p>
    </div>
  )
}
