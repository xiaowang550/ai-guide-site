import Image from 'next/image'
import { cn } from '@/lib/utils'

/** 工具 Logo：本地 SVG，站点内自托管，不依赖第三方图床 */
export function ToolLogo({
  src,
  alt,
  size = 40,
  className,
  rounded = 'rounded-lg',
  /** cover：媒体卡封面用的浅底大图 */
  variant = 'chip',
}: {
  src: string
  alt: string
  size?: number
  className?: string
  rounded?: string
  variant?: 'chip' | 'cover'
}) {
  if (variant === 'cover') {
    return (
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn('object-contain', className)}
        unoptimized
      />
    )
  }
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center border bg-white p-1 dark:bg-white/90',
        rounded,
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full object-contain"
        unoptimized
      />
    </span>
  )
}