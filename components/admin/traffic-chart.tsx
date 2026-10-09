'use client'

import { useId, useState } from 'react'

/** SVG 趋势图，不引入图表库。图表与完整数据表共享同一份数据。 */
export function TrafficChart({
  points,
  realtime = false,
}: {
  points: { label: string; count: number }[]
  realtime?: boolean
}) {
  const id = useId().replace(/:/g, '')
  const [selected, setSelected] = useState<number | null>(null)
  const maximum = Math.max(1, ...points.map((p) => p.count))
  const x = (i: number) => 42 + (i / Math.max(1, points.length - 1)) * 818
  const y = (count: number) => 200 - (count / maximum) * 162
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p.count)}`).join(' ')
  const area = `${line} L${x(points.length - 1)},200 L42,200 Z`
  const label = (raw: string) =>
    realtime
      ? new Date(raw + ':00Z').toLocaleTimeString('zh-CN', {
          timeZone: 'Asia/Shanghai',
          hour: '2-digit',
          minute: '2-digit',
        })
      : raw.length === 7
        ? raw.replace('-', '年') + '月'
        : raw.slice(5).replace('-', '/')
  const shown = selected === null ? null : points[selected]
  return (
    <div className="traffic-chart">
      <div className="mb-2 flex h-6 items-center justify-between text-xs text-muted-foreground">
        <span>
          {shown
            ? `${label(shown.label)} · ${shown.count.toLocaleString()} 次浏览`
            : '把鼠标移到图表上，查看具体数据'}
        </span>
        <span>PV</span>
      </div>
      <svg
        viewBox="0 0 890 240"
        role="img"
        aria-label={realtime ? '最近一小时每分钟页面浏览量' : '所选时间范围页面浏览量趋势'}
        className="w-full overflow-visible"
        onMouseLeave={() => setSelected(null)}
      >
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity=".18" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity=".01" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((level) => (
          <g key={level}>
            <line
              x1="42"
              x2="860"
              y1={y(maximum * level)}
              y2={y(maximum * level)}
              stroke="hsl(var(--border))"
              strokeDasharray="4 5"
            />
            <text
              x="30"
              y={y(maximum * level) + 4}
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
            >
              {Math.round(maximum * level)}
            </text>
          </g>
        ))}
        {points.length > 0 && (
          <>
            <path d={area} fill={`url(#${id})`} />
            <path
              d={line}
              stroke="hsl(var(--primary))"
              fill="none"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {points.map((p, i) => (
              <g key={p.label}>
                <rect
                  x={x(i) - 818 / Math.max(1, points.length - 1) / 2}
                  y="20"
                  width={Math.max(10, 818 / Math.max(1, points.length - 1))}
                  height="185"
                  fill="transparent"
                  onMouseEnter={() => setSelected(i)}
                />
                <circle
                  cx={x(i)}
                  cy={y(p.count)}
                  r={selected === i ? 4 : points.length <= 12 ? 3 : 0}
                  fill="hsl(var(--primary))"
                />
              </g>
            ))}
          </>
        )}
        {points
          .filter(
            (_, i) =>
              i === 0 ||
              i === points.length - 1 ||
              (points.length > 6 && i === Math.floor(points.length / 2)),
          )
          .map((p) => (
            <text
              key={p.label}
              x={x(points.indexOf(p))}
              y="226"
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize="11"
            >
              {label(p.label)}
            </text>
          ))}
      </svg>
      {points.every((p) => p.count === 0) && (
        <p className="mt-1 text-center text-xs text-muted-foreground">
          这个时间范围还没有浏览记录。访客打开公开页面后会自动计入。
        </p>
      )}
      <details className="mt-4 text-xs text-muted-foreground">
        <summary className="cursor-pointer">查看完整数据</summary>
        <div className="mt-3 max-h-48 overflow-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                <th className="pb-2">时间</th>
                <th className="pb-2 text-right">浏览量</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.label}>
                  <td className="py-1">{label(p.label)}</td>
                  <td className="text-right tabular-nums">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
