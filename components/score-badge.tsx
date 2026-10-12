import { cn } from '@/lib/utils'
import { scoreColorVar, scoreTone } from '@/lib/score'
import { toTenPointScore } from '@/lib/display-score'

/**
 * 评分展示：细横条 + 数字，而不是彩色圆角药丸。
 * 数据密集的地方（比如对比表）用 <ScoreValue /> 只留数字。
 */
export function ScoreBadge({
  score,
  className,
  showMax = false,
  label,
  variant = 'bar',
}: {
  score: number
  className?: string
  showMax?: boolean
  label?: string
  variant?: 'bar' | 'value' | 'star'
}) {
  const rounded = Math.max(0, Math.min(5, Math.round(score)))
  const tone = scoreTone(rounded)
  const display = toTenPointScore(score).toFixed(1)
  const description = `${label ? label + ' ' : ''}评分 ${display} 分，满分 10 分，等级 ${toneLabel(tone)}`
  if (variant === 'star') {
    return (
      <span
        title={description}
        aria-label={description}
        className={cn(
          'tool-score-star inline-flex shrink-0 items-center gap-1 font-semibold tabular-nums',
          className,
        )}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="m12 2 3.1 6.3 7 .9-5.1 5 1.2 7-6.2-3.3L5.8 21l1.2-6.8-5-5 6.9-1Z" />
        </svg>
        {display}
      </span>
    )
  }

  if (variant === 'value') {
    return (
      <span
        title={description}
        aria-label={description}
        className={cn('font-semibold tabular-nums', className)}
        style={{ color: scoreColorVar(rounded) }}
      >
        {display}
        {showMax && <span className="ml-px text-xs font-normal opacity-60">/10</span>}
      </span>
    )
  }

  return (
    <span
      title={description}
      className={cn('inline-flex items-center gap-1.5', className)}
      aria-label={description}
    >
      <span className="h-1 w-10 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className="block h-full rounded-full"
          style={{
            width: `${toTenPointScore(score) * 10}%`,
            backgroundColor: scoreColorVar(rounded),
          }}
        />
      </span>
      <span
        className="text-sm font-semibold tabular-nums"
        style={{ color: scoreColorVar(rounded) }}
      >
        {display}
      </span>
    </span>
  )
}

/** 只有数字的评分，用于表格内（避免每格都画一根条） */
export function ScoreValue({ score, className }: { score: number; className?: string }) {
  return <ScoreBadge score={score} variant="value" className={className} />
}

export function toneLabel(tone: ReturnType<typeof scoreTone>): string {
  return { weak: '偏弱', fair: '一般', good: '良好', strong: '强', top: '第一梯队' }[tone]
}

/** 颜色小方块，用于图例与紧凑列表 */
export function ScoreDot({ score }: { score: number }) {
  const rounded = Math.max(0, Math.min(5, Math.round(score)))
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
      style={{ backgroundColor: scoreColorVar(rounded) }}
    />
  )
}
