import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Crumb {
  label: string
  href?: string
}

export function Breadcrumbs({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="面包屑" className={cn('text-xs text-muted-foreground', className)}>
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 ? <ChevronRight className="h-3 w-3" aria-hidden /> : null}
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground/80">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  meta,
  actions,
  className,
}: {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  meta?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('border-b bg-muted/20', className)}>
      <div className="container py-10 sm:py-14">
        {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} className="mb-4" /> : null}
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <h1 className="title-serif text-[1.7rem] sm:text-[2.1rem]">{title}</h1>
            {description ? (
              <p className="measure-wide mt-4 text-[15px] leading-7 text-muted-foreground">
                {description}
              </p>
            ) : null}
            {meta ? (
              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
    </div>
  )
}

export function Section({
  title,
  description,
  children,
  className,
  headingLevel = 'h2',
  action,
  eyebrow,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  headingLevel?: 'h2' | 'h3'
  action?: React.ReactNode
  /** 区块上方的英文小标签，用来替代"药丸 badge" */
  eyebrow?: string
}) {
  const Heading = headingLevel
  return (
    <section className={cn('py-9', className)}>
      {title || eyebrow ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-hairline pb-4">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? (
              <Heading
                className={cn(
                  'title-serif',
                  headingLevel === 'h2' ? 'mt-1.5 text-xl' : 'mt-1 text-lg'
                )}
              >
                {title}
              </Heading>
            ) : null}
            {description ? (
              <p className="measure-wide mt-2 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="border-y border-dashed border-border py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}