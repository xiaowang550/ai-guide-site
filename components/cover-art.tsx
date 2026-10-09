import { ToolLogo } from '@/components/tool-logo'
import { cn } from '@/lib/utils'

/**
 * 媒体卡封面：没有真实配图时的确定性封面视觉。
 *
 * 设计约束：
 * - 只在站内主色与强调色的色域内取色（蓝青区间 + 偶尔暖色），
 *   避免彩虹渐变那种"AI 生成感"。
 * - 同一 id 永远得到同一张封面（用 id 哈希推导），不会出现刷新就换色。
 * - 优先展示真实信息：工具 logo（来自数据），而不是装饰性插画。
 */
function hash(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export interface CoverArtProps {
  /** 用于生成封面的稳定种子，一般传内容 id */
  id: string
  /** 封面左上角的小标签，如「互联网运营 · 运营专员」 */
  eyebrow?: string
  /** 封面右下角的大号序号 */
  index?: number | string
  /**
   * 展示真实工具 logo（最多 4 个）。
   * 刻意只要求 id / logo / name：封面只需要这几项，
   * 调用方传精简数组即可，不必把完整工具档案拖进客户端包。
   */
  tools?: { id: string; logo: string; name: string }[]
  /**
   * 封面中央的大字。
   * 没有 logo 可展示时用它当视觉主体 —— 例如课程页用阶梯编号（T2 / S1），
   * 「这张卡属于哪一层」本身就是最该被看到的信息。
   */
  centerLabel?: string
  className?: string
  /** 封面高度 */
  height?: 'sm' | 'md' | 'lg'
}

export function CoverArt({
  id,
  eyebrow,
  index,
  tools = [],
  centerLabel,
  className,
  height = 'md',
}: CoverArtProps) {
  const h = hash(id)
  // 约 1/5 的封面走暖色（呼应强调色），其余在蓝青区间内变化
  const warm = h % 5 === 0
  const hue = warm ? 22 + (h % 10) : 205 + (h % 45)
  const hue2 = warm ? hue + 12 : hue + 18
  const angle = 120 + (h % 60)

  const heights = { sm: 'h-32', md: 'h-36', lg: 'h-44' }[height]

  return (
    <div
      className={cn('cover-art relative overflow-hidden', heights, className)}
      style={
        {
          '--cover-a': `${hue} ${warm ? '38%' : '32%'} ${warm ? '30%' : '26%'}`,
          '--cover-b': `${hue2} ${warm ? '46%' : '40%'} ${warm ? '20%' : '17%'}`,
          '--cover-angle': `${angle}deg`,
        } as React.CSSProperties
      }
      aria-hidden
    >
      {eyebrow ? (
        <span className="absolute left-5 right-5 top-4 line-clamp-2 text-xs font-medium leading-6 text-white/80">
          {eyebrow}
        </span>
      ) : null}

      {index !== undefined ? (
        <span className="absolute bottom-2 right-4 font-serif text-3xl leading-none text-white/20">
          {typeof index === 'number' ? String(index).padStart(2, '0') : index}
        </span>
      ) : null}

      {centerLabel ? (
        <span
          className={cn(
            'absolute inset-x-0 bottom-3 flex items-center justify-center font-serif text-4xl leading-none tracking-tight text-white/85',
            eyebrow ? 'top-16' : 'top-0',
          )}
        >
          {centerLabel}
        </span>
      ) : tools.length > 0 ? (
        <div
          className={cn(
            'absolute inset-x-0 bottom-3 flex items-center justify-center gap-3',
            eyebrow ? 'top-16' : 'top-0',
          )}
        >
          {tools.slice(0, 4).map((t) => (
            <span
              key={t.id}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/90 p-1.5 shadow-sm"
            >
              <ToolLogo src={t.logo} alt="" size={28} variant="cover" className="opacity-95" />
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
