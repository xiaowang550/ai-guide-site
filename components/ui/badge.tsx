import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium leading-4 transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border text-muted-foreground',
        highlight: 'bg-highlight/10 text-highlight',
        success: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
        warning: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
        danger: 'bg-danger/10 text-danger',
      },
      size: {
        default: 'text-xs',
        lg: 'px-2 py-1 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { badgeVariants }