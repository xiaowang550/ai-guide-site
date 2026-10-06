import type { CapabilityKey, CapabilityScore, Score } from '@/data/types'
import { capabilityLabel, scoreBarWidth, scoreColorVar } from '@/lib/score'
import { cn } from '@/lib/utils'

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
        <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>{label}</span>
        <span className="flex items-baseline gap-1 text-xs text-muted-foreground">
          {showBasis && capability.basis ? (
            <span className="hidden max-w-[60%] truncate text-[11px] text-muted-foreground/80 sm:inline">
              {capability.basis}
            </span>
          ) : null}
          <span className="font-semibold tabular-nums" style={{ color: scoreColorVar(score) }}>
            {score}
          </span>
          <span className="text-[11px]">/5</span>
        </span>
      </div>
      <div
        className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"
        role="meter"
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={5}
        aria-label={`${label} 能力评分 ${score} 分，满分 5 分`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width, backgroundColor: scoreColorVar(score) }}
        />
      </div>
      {showBasis && capability.basis ? (
        <p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:hidden">{capability.basis}</p>
      ) : null}
    </div>
  )
}