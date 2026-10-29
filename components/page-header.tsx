import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DesignCopy } from './design-copy'

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
  illustrated = false,
  aside,
  art,
}: {
  title: string
  description?: string
  breadcrumbs?: Crumb[]
  meta?: React.ReactNode
  actions?: React.ReactNode
  className?: string
  illustrated?: boolean
  aside?: React.ReactNode
  art?: React.ReactNode
}) {
  return (
    <div
      className={cn('page-heading x-page-heading', className)}
      data-illustrated={illustrated || undefined}
    >
      <div className="container">
        <div className="x-page-topline">
          <p className="x-page-overline">
            <span aria-hidden="true">+</span> XIAN <span aria-hidden="true">/</span> EXPLORE
          </p>
          {breadcrumbs?.length ? (
            <Breadcrumbs items={breadcrumbs} className="x-page-breadcrumbs" />
          ) : null}
        </div>
        <div
          className={cn('x-page-heading-grid', aside && 'has-aside', !aside && art && 'has-art')}
        >
          <div className="x-page-copy min-w-0">
            <h1 className="x-page-title">
              <DesignCopy>{title}</DesignCopy>
            </h1>
            {description ? (
              <p className="x-page-description">
                <DesignCopy>{description}</DesignCopy>
              </p>
            ) : null}
            {meta ? (
              <div className="x-page-meta flex flex-wrap items-center gap-x-4 gap-y-2">{meta}</div>
            ) : null}
            {actions ? <div className="x-page-actions flex flex-wrap gap-2">{actions}</div> : null}
          </div>
          {aside ? (
            <aside className="x-page-aside">{aside}</aside>
          ) : art ? (
            <div className="x-page-art">{art}</div>
          ) : null}
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
    <section className={cn('py-10 sm:py-12', className)}>
      {title || eyebrow ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 pb-2">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? (
              <Heading
                className={cn(
                  'title-serif',
                  headingLevel === 'h2' ? 'mt-2 text-2xl' : 'mt-1 text-lg',
                )}
              >
                <DesignCopy>{title}</DesignCopy>
              </Heading>
            ) : null}
            {description ? (
              <p className="measure-wide mt-2 text-sm leading-6 text-muted-foreground">
                <DesignCopy>{description}</DesignCopy>
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
