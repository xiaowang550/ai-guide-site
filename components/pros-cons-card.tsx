import { Ban, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 强项 / 弱项 / 别用它做 —— 三栏并列，本站信任度的核心组件。
 * 用顶部 2px 色条区分三栏，而不是三个描边盒子。
 */
export function ProsConsCard({
  strengths,
  weaknesses,
  avoidFor,
  className,
}: {
  strengths: string[]
  weaknesses: string[]
  avoidFor: string[]
  className?: string
}) {
  return (
    <div className={cn('grid gap-x-8 gap-y-6 sm:grid-cols-3', className)}>
      <Column title="它最强的地方" items={strengths} tone="positive" />
      <Column title="它的短板" items={weaknesses} tone="negative" />
      <Column title="别用它做" items={avoidFor} tone="warning" />
    </div>
  )
}

const TONE: Record<
  'positive' | 'negative' | 'warning',
  { bar: string; icon: React.ReactNode; text: string }
> = {
  positive: {
    bar: 'bg-score-4',
    icon: <span className="text-score-4">↑</span>,
    text: 'text-score-4',
  },
  negative: {
    bar: 'bg-score-1',
    icon: <Minus className="h-3.5 w-3.5" aria-hidden />,
    text: 'text-score-1',
  },
  warning: {
    bar: 'bg-highlight',
    icon: <Ban className="h-3.5 w-3.5" aria-hidden />,
    text: 'text-highlight',
  },
}

function Column({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'positive' | 'negative' | 'warning'
}) {
  const t = TONE[tone]
  return (
    <div>
      <div className={cn('mb-3 h-0.5 w-8 rounded-full', t.bar)} aria-hidden />
      <h3 className={cn('flex items-center gap-1.5 text-sm font-semibold', t.text)}>
        {title}
      </h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm leading-6 text-foreground/85">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}