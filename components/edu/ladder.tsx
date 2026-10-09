import Link from 'next/link'
import type { EduProgram, EduTier } from '@/data/types'
import { cn } from '@/lib/utils'

/** 阶梯视图：教师四层 / 学生三层，明确标出「这是阶梯不是并列选项」 */
export function Ladder({
  tiers,
  programs,
  audience,
}: {
  tiers: readonly EduTier[]
  programs: EduProgram[]
  audience: 'teacher' | 'student'
}) {
  const list = [...tiers].filter((t) => t.audience === audience).sort((a, b) => a.order - b.order)

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {list.map((tier, i) => {
        const items = programs.filter((p) => p.tier === tier.id)
        return (
          <div
            key={tier.id}
            className={cn(
              'relative flex flex-col border-b border-hairline pb-5',
              i === 0 && 'border-primary/40'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
                  i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}
              >
                {tier.order}
              </span>
              <span className="text-xs text-muted-foreground">{tier.id}</span>
            </div>
            <h3 className="mt-3 text-base font-semibold leading-snug">{tier.name}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-foreground/80">{tier.goal}</p>
            <p className="mt-3 rounded-lg bg-muted/60 p-2.5 text-xs leading-5 text-muted-foreground">
              前置：{tier.requires}
            </p>
            <ul className="mt-3 space-y-1.5">
              {items.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/edu/programs/${p.id}`}
                    className="block truncate rounded-md border px-2.5 py-1.5 text-xs hover:border-primary/50 hover:bg-accent/40"
                  >
                    {p.title}
                  </Link>
                </li>
              ))}
              {items.length === 0 ? (
                <li className="rounded-md border border-dashed px-2.5 py-1.5 text-xs text-muted-foreground">
                  课程开发中
                </li>
              ) : null}
            </ul>
          </div>
        )
      })}
    </div>
  )
}