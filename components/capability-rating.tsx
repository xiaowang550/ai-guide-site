import { CheckCircle2, CircleHelp, MinusCircle } from 'lucide-react'
import { capabilityRating } from '@/lib/capability-rating'
import { scoreColorVar } from '@/lib/score'

/** Text remains readable even when colors are unavailable. */
export function CapabilityRating({
  score,
  emphasis,
}: {
  score: number | undefined
  emphasis?: string
}) {
  const rating = capabilityRating(score)
  const Mark = !rating ? CircleHelp : rating.value >= 3 ? CheckCircle2 : MinusCircle
  return (
    <div
      data-capability-rating
      className="mx-auto w-full max-w-xs rounded-xl border border-hairline bg-muted/30 px-3 py-2.5 text-left text-foreground"
    >
      <div className="flex items-center justify-between gap-2 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Mark
            size={15}
            className={rating && rating.value >= 3 ? 'text-primary' : 'text-muted-foreground'}
            aria-hidden
          />
          {rating?.label ?? '待补充'}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {rating ? (
            <>
              {rating.display}
              <span className="text-xs font-normal text-muted-foreground">/10</span>
            </>
          ) : (
            '暂无资料'
          )}
        </span>
      </div>
      {rating && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full"
            style={{ width: `${rating.value * 20}%`, backgroundColor: scoreColorVar(rating.value) }}
          />
        </div>
      )}
      {emphasis && (
        <span className="mt-1.5 block text-xs font-medium text-primary">{emphasis}</span>
      )}
    </div>
  )
}
