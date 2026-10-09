import { AlertTriangle } from 'lucide-react'
import { formatDate, isStale, STALE_DAYS } from '@/lib/score'
import { cn } from '@/lib/utils'

/**
 * 数据新鲜度：纯文字 + 小圆点，不占用视觉层级。
 * 超过 90 天未复核才升级成警示色（这是本站时效性原则的唯一视觉表达）。
 */
export function UpdatedBadge({
  date,
  className,
  prefix = '数据更新于',
  showStale = true,
}: {
  date: string
  className?: string
  prefix?: string
  showStale?: boolean
}) {
  const stale = showStale && isStale(date)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px]',
        stale ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
        className
      )}
      title={
        stale
          ? `本页数据已超过 ${STALE_DAYS} 天未复核，可能已过时，请在「AI 实时资讯」查看官方最新消息`
          : `本页数据复核于 ${formatDate(date)}`
      }
    >
      <span
        aria-hidden
        className={cn(
          'h-1 w-1 rounded-full',
          stale ? 'bg-amber-600 dark:bg-amber-400' : 'bg-muted-foreground/50'
        )}
      />
      {stale ? <AlertTriangle className="h-3 w-3" aria-hidden /> : null}
      {prefix} {formatDate(date)}
      {stale ? '（可能已过时）' : ''}
    </span>
  )
}