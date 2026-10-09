import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/70',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
      },
      size: {
        sm: 'h-9 px-3 text-xs',
        default: 'h-10 px-4',
        lg: 'h-12 px-5 text-sm',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild && props.children) {
      const child = React.Children.only(props.children) as React.ReactElement<Record<string, unknown>>
      const { ...childProps } = props as React.ButtonHTMLAttributes<HTMLButtonElement>
      delete childProps.className
      delete childProps.children
      delete childProps.disabled
      return React.cloneElement(child, {
        ...childProps,
        ref,
        className: cn(
          buttonVariants({ variant, size }),
          className,
          child.props.className as string | undefined
        ),
      })
    }
    return (
      <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { buttonVariants }
