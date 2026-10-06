import type { CapabilityKey, CapabilityScore } from '@/data/types'
import { CAPABILITY_META, MAX_SCORE, scoreColorVar } from '@/lib/score'
import { cn } from '@/lib/utils'

/**
 * 14 维能力雷达图（纯 SVG，无图表库依赖）
 * 无障碍：图形 aria-hidden，同时渲染一份等价的文字表格作为替代。
 */
export function CapabilityRadar({
  capabilities,
  compareCapabilities,
  compareName,
  className,
}: {
  capabilities: Record<CapabilityKey, CapabilityScore>
  /** 可选：叠加第二个工具的轮廓（用于对比） */
  compareCapabilities?: Record<CapabilityKey, CapabilityScore>
  compareName?: string
  className?: string
}) {
  const size = 440
  const cx = size / 2
  const cy = size / 2
  const radius = 150
  const n = CAPABILITY_META.length
  const levels = [0.2, 0.4, 0.6, 0.8, 1]

  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const point = (i: number, ratio: number) => {
    const r = radius * ratio
    return [cx + r * Math.cos(angle(i)), cy + r * Math.sin(angle(i))] as const
  }

  const polygon = (getScore: (key: CapabilityKey) => number) =>
    CAPABILITY_META.map((meta, i) => point(i, getScore(meta.key) / MAX_SCORE).join(',')).join(' ')

  const mainPoints = polygon((k) => capabilities[k]?.score ?? 0)
  const comparePoints = compareCapabilities ? polygon((k) => compareCapabilities[k]?.score ?? 0) : null

  return (
    <div className={cn('w-full', className)}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="mx-auto h-auto w-full max-w-[460px]"
        role="img"
        aria-label={`14 维能力雷达图，详细分数见下方表格`}
      >
        {/* 网格 */}
        {levels.map((level) => (
          <polygon
            key={level}
            points={polygon(() => level * MAX_SCORE)}
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth={level === 1 ? 1.2 : 1}
          />
        ))}
        {/* 轴线 */}
        {CAPABILITY_META.map((meta, i) => {
          const [x, y] = point(i, 1)
          return <line key={meta.key} x1={cx} y1={cy} x2={x} y2={y} stroke="hsl(var(--border))" />
        })}
        {/* 刻度 */}
        {[1, 3, 5].map((v) => (
          <text
            key={v}
            x={cx + 4}
            y={cy - (radius * v) / MAX_SCORE + 10}
            fontSize={9}
            fill="hsl(var(--muted-foreground))"
          >
            {v}
          </text>
        ))}
        {/* 对比轮廓 */}
        {comparePoints ? (
          <polygon
            points={comparePoints}
            fill="hsl(var(--highlight) / 0.10)"
            stroke="hsl(var(--highlight))"
            strokeWidth={1.6}
            strokeDasharray="4 3"
          />
        ) : null}
        {/* 主轮廓 */}
        <polygon
          points={mainPoints}
          fill="hsl(var(--primary) / 0.16)"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* 顶点 */}
        {CAPABILITY_META.map((meta, i) => {
          const [x, y] = point(i, (capabilities[meta.key]?.score ?? 0) / MAX_SCORE)
          return (
            <circle
              key={meta.key}
              cx={x}
              cy={y}
              r={3}
              fill={scoreColorVar(capabilities[meta.key]?.score ?? 0)}
            />
          )
        })}
        {/* 轴标签 */}
        {CAPABILITY_META.map((meta, i) => {
          const [x, y] = point(i, 1.19)
          const deg = (angle(i) * 180) / Math.PI + 90
          const anchor = Math.abs(deg) < 5 ? 'middle' : Math.abs(deg - 180) < 5 ? 'middle' : deg > 0 ? 'start' : 'end'
          return (
            <text
              key={meta.key}
              x={x}
              y={y}
              fontSize={11}
              textAnchor={anchor}
              dominantBaseline="middle"
              fill="hsl(var(--muted-foreground))"
            >
              {meta.short}
            </text>
          )
        })}
      </svg>

      {compareCapabilities ? (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          <span className="mr-3 inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 bg-primary" /> 当前工具
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 border-t-2 border-dashed border-highlight" />{' '}
            {compareName}
          </span>
        </p>
      ) : null}
    </div>
  )
}

/** 雷达图的文字替代：14 维分数一览表 */
export function CapabilityMatrixTable({
  tools,
  className,
}: {
  tools: { id: string; name: string; capabilities: Record<CapabilityKey, CapabilityScore> }[]
  className?: string
}) {
  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <caption className="sr-only">14 个能力维度的评分对照表</caption>
        <thead>
          <tr className="border-b">
            <th scope="col" className="w-28 py-2 text-left font-medium">
              维度
            </th>
            {tools.map((t) => (
              <th key={t.id} scope="col" className="py-2 pl-3 text-left font-medium">
                {t.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CAPABILITY_META.map((meta) => (
            <tr key={meta.key} className="border-b last:border-0">
              <th scope="row" className="py-1.5 pr-2 text-left font-normal text-muted-foreground">
                {meta.label}
              </th>
              {tools.map((t) => {
                const score = t.capabilities[meta.key]?.score ?? 0
                return (
                  <td key={t.id} className="py-1.5 pl-3 tabular-nums">
                    <span
                      className="inline-flex h-6 min-w-[2.5rem] items-center justify-center rounded-md text-xs font-semibold text-white"
                      style={{ backgroundColor: scoreColorVar(score) }}
                    >
                      {score}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}