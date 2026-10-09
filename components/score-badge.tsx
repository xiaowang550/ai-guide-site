import { cn } from '@/lib/utils'
import { scoreColorVar, scoreTone } from '@/lib/score'

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
  variant?: 'bar' | 'value'
}) {
  const rounded = Math.max(0, Math.min(5, Math.round(score)))
  const tone = scoreTone(rounded)
  const display =
    typeof score === 'number' ? (Number.isInteger(score) ? score : score.toFixed(1)) : score

  if (variant === 'value') {
    return (
      <span
        title={`${label ? label + ' ' : ''}${score} / 5，等级 ${toneLabel(tone)}`}
        className={cn('font-semibold tabular-nums', className)}
        style={{ color: scoreColorVar(rounded) }}
      >
        {display}
        {showMax && <span className="ml-px text-xs font-normal opacity-60">/5</span>}
      </span>
    )
  }

  return (
    <span
      title={`${label ? label + ' ' : ''}评分 ${score} 分，共 5 分，等级 ${toneLabel(tone)}`}
      className={cn('inline-flex items-center gap-1.5', className)}
      aria-label={`${label ? label + ' ' : ''}评分 ${score} 分，共 5 分，等级 ${toneLabel(tone)}`}
    >
      <span className="h-1 w-10 overflow-hidden rounded-full bg-muted" aria-hidden>
        <span
          className="block h-full rounded-full"
          style={{ width: `${(rounded / 5) * 100}%`, backgroundColor: scoreColorVar(rounded) }}
        />
      </span>
      <span className="text-sm font-semibold tabular-nums" style={{ color: scoreColorVar(rounded) }}>
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