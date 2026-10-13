import { toTenPointScore } from '@/lib/display-score'
import type { CapabilityKey, CapabilityScore, Score } from '@/data/types'
import { capabilityLabel, scoreBarWidth, scoreColorVar } from '@/lib/score'
import { cn } from '@/lib/utils'
import { capabilityRating } from '@/lib/capability-rating'

/** 带分数与「打分依据」tooltip 的横向评分条 */
export function CapabilityBar({
  capabilityKey,
  capability,
  showBasis = true,
  compact = false,
  className,
}: {
  capabilityKey: CapabilityKey
  capability: CapabilityScore
  showBasis?: boolean
  compact?: boolean
  className?: string
}) {
  const label = capabilityLabel(capabilityKey)
  const score = capability.score as Score
  const width = scoreBarWidth(score)
  return (
    <div className={cn('py-1.5', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className={cn('whitespace-nowrap font-medium', compact ? 'text-xs' : 'text-sm')}>
          {label}
        </span>
        <span className="flex shrink-0 items-baseline gap-1 whitespace-nowrap text-xs text-muted-foreground">
          <span className="mr-1">{capabilityRating(score)?.label}</span>
          <span className="font-semibold tabular-nums" style={{ color: scoreColorVar(score) }}>
            {toTenPointScore(score)}
          </span>
          <span className="text-xs">/10</span>
        </span>
      </div>
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={toTenPointScore(score)}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-label={`${label}，${capabilityRating(score)?.label}，编辑参考 ${toTenPointScore(score)} 分，满分 10 分`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width, backgroundColor: scoreColorVar(score) }}
        />
      </div>
      {showBasis && capability.basis ? (
        <p className="mt-1 text-xs leading-6 text-muted-foreground">{capability.basis}</p>
      ) : null}
    </div>
  )
}
