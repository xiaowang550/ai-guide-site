'use client'

import { useEffect, useRef, useState } from 'react'
import type { CapabilityKey } from '@/data/types'
import type { CompareTool } from '@/lib/compare-tool'
import { CAPABILITY_META, capabilityLabel, capabilityShort } from '@/lib/score'

type View = 'radar' | 'bars' | 'line' | 'table'
const VIEWS: { id: View; name: string; hint: string }[] = [
  { id: 'radar', name: '雷达图', hint: '看能力分布：越靠外，该项能力越强。点击维度查看解释。' },
  { id: 'bars', name: '条形图', hint: '逐项比较：同一维度里，条越长、分数越高。' },
  {
    id: 'line',
    name: '折线图',
    hint: '看不同维度的高低；横轴是能力分类，不是时间。重合时可隐藏一条线。',
  },
  { id: 'table', name: '数值表', hint: '直接查分数；点击能力名称，看它能帮你做什么。' },
]
const GROUPS: { name: string; keys: CapabilityKey[] }[] = [
  { name: '全部 14 维', keys: CAPABILITY_META.map((m) => m.key) },
  { name: '日常办公', keys: ['writing', 'longform', 'reasoning', 'research', 'data', 'office'] },
  { name: '编程与自动化', keys: ['reasoning', 'math', 'coding', 'agent', 'data'] },
  { name: '图片与音视频', keys: ['imageGen', 'vision', 'video', 'voice', 'realtime'] },
]
const COLORS = ['#387461', '#5677ad', '#a56d39', '#916ba3']
const DASHES = ['', '7 4', '2 4', '10 3 2 3']
const SCORE_MEANINGS = ['不提供', '基本不具备', '偏弱', '够用', '较强', '第一梯队']
const keyLabel = (key: CapabilityKey) => (key === 'agent' ? '自动化' : capabilityShort(key))

/** Present the existing editorial scores, without changing weights or inventing a benchmark. */
export function CompareCharts({ tools }: { tools: CompareTool[] }) {
  const [view, setView] = useState<View>('radar')
  const [group, setGroup] = useState(0)
  const [dimension, setDimension] = useState<CapabilityKey>('writing')
  const [hidden, setHidden] = useState<string[]>([])
  const container = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(560)
  useEffect(() => {
    if (!container.current) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(240, Math.min(640, Math.round(entry.contentRect.width))))
    })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [])

  const keys = GROUPS[group].keys
  const filtered = tools.filter((t) => !hidden.includes(t.id))
  // A changed tool selection must never leave an empty chart.
  const visible = filtered.length ? filtered : tools
  const color = (tool: CompareTool) => COLORS[tools.indexOf(tool) % COLORS.length]
  const dash = (tool: CompareTool) => DASHES[tools.indexOf(tool) % DASHES.length]
  const top = Math.max(...visible.map((t) => t.capabilities[dimension].score))
  const winners = visible.filter((t) => t.capabilities[dimension].score === top)
  const meta = CAPABILITY_META.find((m) => m.key === dimension)!
  const height = width + 32,
    centerX = width / 2,
    centerY = height / 2,
    radius = width * 0.31
  function point(index: number, score: number, extra = 0) {
    const angle = (index * Math.PI * 2) / keys.length - Math.PI / 2
    const r = (radius * score) / 5 + extra
    return { x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r }
  }
  function polygon(scores: number[]) {
    return scores
      .map((s, i) => {
        const p = point(i, s)
        return `${p.x},${p.y}`
      })
      .join(' ')
  }
  function marker(tool: CompareTool, x: number, y: number) {
    const index = tools.indexOf(tool) % 4
    if (index === 1) return <rect x={x - 4} y={y - 4} width={8} height={8} />
    if (index === 2) return <path d={`M${x},${y - 5}l5,9h-10Z`} />
    if (index === 3) return <path d={`M${x},${y - 5}l5,5l-5,5l-5,-5Z`} />
    return <circle cx={x} cy={y} r={4} />
  }
  function chooseGroup(index: number) {
    setGroup(index)
    if (!GROUPS[index].keys.includes(dimension)) setDimension(GROUPS[index].keys[0])
  }
  function toggle(tool: CompareTool) {
    if (visible.includes(tool) && visible.length === 1) return
    const currentlyHidden = tools.filter((t) => !visible.includes(t)).map((t) => t.id)
    setHidden(
      visible.includes(tool)
        ? [...currentlyHidden, tool.id]
        : currentlyHidden.filter((id) => id !== tool.id),
    )
  }
  function interactive(key: CapabilityKey, label: string) {
    return {
      role: 'button',
      tabIndex: 0,
      'aria-label': label,
      onClick: () => setDimension(key),
      onKeyDown: (e: React.KeyboardEvent<SVGGElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setDimension(key)
        }
      },
      className: 'cursor-pointer outline-none focus:stroke-foreground',
    }
  }

  return (
    <section
      aria-label="能力图表对比"
      className="compare-visual rounded-2xl border bg-card p-4 sm:p-7"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <h2 className="text-xl font-semibold">先看你要做的事</h2>
          <p className="mt-2 text-sm text-muted-foreground">0–5 分，看清各自强项。</p>
        </div>
        <div
          className="grid w-full grid-cols-4 gap-1 rounded-xl bg-muted/60 p-1 sm:w-auto"
          role="group"
          aria-label="图表视图"
        >
          {VIEWS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={view === item.id}
              onClick={() => setView(item.id)}
              className={`min-h-11 rounded-lg px-1.5 text-xs sm:px-3 sm:text-sm ${view === item.id ? 'bg-card font-semibold text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </div>
      <div
        className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
        role="group"
        aria-label="按任务查看能力"
      >
        {GROUPS.map((item, i) => (
          <button
            key={item.name}
            type="button"
            aria-pressed={group === i}
            onClick={() => chooseGroup(i)}
            className={`min-h-11 rounded-full border px-3 text-xs sm:px-4 sm:text-sm ${group === i ? 'border-primary/25 bg-accent font-medium text-primary' : 'border-transparent text-muted-foreground hover:bg-muted'}`}
          >
            {item.name}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3" role="group" aria-label="显示或隐藏工具">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            aria-pressed={visible.includes(tool)}
            onClick={() => toggle(tool)}
            title={
              visible.length === 1 && visible.includes(tool) ? '至少保留一个工具' : '点击显示或隐藏'
            }
            className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm ${visible.includes(tool) ? 'font-medium' : 'text-muted-foreground line-through opacity-60'}`}
          >
            <svg width="32" height="16" aria-hidden>
              <path d="M1 8H31" stroke={color(tool)} strokeWidth={2} strokeDasharray={dash(tool)} />
              <g fill={color(tool)} stroke="hsl(var(--card))" strokeWidth={1}>
                {marker(tool, 16, 8)}
              </g>
            </svg>
            {tool.name}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground" aria-live="polite">
        {VIEWS.find((v) => v.id === view)!.hint}
      </p>
      <div className="mt-5 grid min-w-0 gap-7 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)] lg:gap-10">
        <div ref={container} className="min-w-0">
          {view === 'radar' && (
            <svg
              data-chart="radar"
              viewBox={`0 0 ${width} ${height}`}
              className="mx-auto block w-full max-w-[640px]"
              aria-label="能力雷达图，越靠外分数越高；可点击维度"
              role="group"
            >
              {[1, 2, 3, 4, 5].map((level) => (
                <g key={level}>
                  <polygon
                    points={polygon(keys.map(() => level))}
                    fill="none"
                    stroke="hsl(var(--border))"
                  />
                  <text
                    x={centerX + 6}
                    y={centerY - (radius * level) / 5 + 15}
                    fontSize={12}
                    fill="hsl(var(--muted-foreground))"
                  >
                    {level}
                  </text>
                </g>
              ))}
              {keys.map((key, i) => {
                const p = point(i, 5)
                return (
                  <line
                    key={key}
                    x1={centerX}
                    y1={centerY}
                    x2={p.x}
                    y2={p.y}
                    stroke="hsl(var(--border))"
                  />
                )
              })}
              {visible.map((tool) => (
                <g key={tool.id}>
                  <polygon
                    points={polygon(keys.map((key) => tool.capabilities[key].score))}
                    fill={color(tool)}
                    fillOpacity={0.045}
                    stroke={color(tool)}
                    strokeWidth={2.3}
                    strokeDasharray={dash(tool)}
                    strokeLinejoin="round"
                  />
                  {keys.map((key, i) => {
                    const p = point(i, tool.capabilities[key].score)
                    return (
                      <g
                        key={key}
                        fill={color(tool)}
                        stroke="hsl(var(--card))"
                        strokeWidth={1}
                        {...interactive(
                          key,
                          `${tool.name}，${capabilityLabel(key)}，${tool.capabilities[key].score} / 5`,
                        )}
                      >
                        <circle cx={p.x} cy={p.y} r={10} fill="transparent" stroke="none" />
                        {marker(tool, p.x, p.y)}
                      </g>
                    )
                  })}
                </g>
              ))}
              {keys.map((key, i) => {
                const p = point(i, 5, width < 360 ? 16 : 30)
                const anchor = p.x < centerX - 10 ? 'end' : p.x > centerX + 10 ? 'start' : 'middle'
                return (
                  <g key={key} {...interactive(key, `查看${capabilityLabel(key)}的含义和分数`)}>
                    <text
                      x={p.x}
                      y={p.y}
                      textAnchor={anchor}
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={dimension === key ? 700 : 400}
                      fill={dimension === key ? 'hsl(var(--primary))' : 'hsl(var(--foreground))'}
                    >
                      {keyLabel(key)}
                    </text>
                  </g>
                )
              })}
            </svg>
          )}
          {view === 'bars' && (
            <div data-chart="bars" className="space-y-6 py-2">
              {keys.map((key) => (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() => setDimension(key)}
                    className="mb-2 min-h-11 text-left text-sm font-semibold text-primary hover:underline"
                  >
                    {capabilityLabel(key)}{' '}
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      查看解释 ↗
                    </span>
                  </button>
                  <div className="space-y-2">
                    {visible.map((tool) => (
                      <div
                        key={tool.id}
                        className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)_2.5rem] items-center gap-2 text-xs"
                      >
                        <span className="break-words">{tool.name}</span>
                        <div className="h-3 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${tool.capabilities[key].score * 20}%`,
                              background: color(tool),
                            }}
                          />
                        </div>
                        <span className="text-right tabular-nums">
                          {tool.capabilities[key].score}/5
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {view === 'line' && (
            <div>
              <p className="mb-2 text-xs text-muted-foreground lg:hidden">左右滑动查看全部维度。</p>
              <div
                className="overflow-x-auto rounded-xl"
                tabIndex={0}
                role="region"
                aria-label="折线图，可左右滑动"
              >
                <svg
                  data-chart="line"
                  width={Math.max(520, keys.length * 64 + 64)}
                  height={340}
                  role="group"
                  aria-label="各能力分数折线图，固定 0 到 5 分刻度"
                >
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <g key={n}>
                      <line
                        x1={38}
                        y1={280 - n * 48}
                        x2={Math.max(520, keys.length * 64 + 64) - 25}
                        y2={280 - n * 48}
                        stroke="hsl(var(--border))"
                      />
                      <text
                        x={15}
                        y={285 - n * 48}
                        fontSize={14}
                        fill="hsl(var(--muted-foreground))"
                      >
                        {n}
                      </text>
                    </g>
                  ))}
                  {visible.map((tool) => (
                    <g key={tool.id}>
                      <polyline
                        points={keys
                          .map(
                            (key, i) =>
                              `${58 + (i * (Math.max(520, keys.length * 64 + 64) - 90)) / (keys.length - 1)},${280 - tool.capabilities[key].score * 48}`,
                          )
                          .join(' ')}
                        fill="none"
                        stroke={color(tool)}
                        strokeWidth={2.3}
                        strokeDasharray={dash(tool)}
                      />
                      {keys.map((key, i) => {
                        const x =
                            58 +
                            (i * (Math.max(520, keys.length * 64 + 64) - 90)) / (keys.length - 1),
                          y = 280 - tool.capabilities[key].score * 48
                        return (
                          <g
                            key={key}
                            fill={color(tool)}
                            stroke="hsl(var(--card))"
                            strokeWidth={1}
                            {...interactive(
                              key,
                              `${tool.name}，${capabilityLabel(key)}，${tool.capabilities[key].score} / 5`,
                            )}
                          >
                            <circle cx={x} cy={y} r={10} fill="transparent" stroke="none" />
                            {marker(tool, x, y)}
                          </g>
                        )
                      })}
                    </g>
                  ))}
                  {keys.map((key, i) => (
                    <g key={key} {...interactive(key, `查看${capabilityLabel(key)}的含义和分数`)}>
                      <text
                        x={
                          58 + (i * (Math.max(520, keys.length * 64 + 64) - 90)) / (keys.length - 1)
                        }
                        y={311}
                        textAnchor="middle"
                        fontSize={14}
                        fill="hsl(var(--foreground))"
                      >
                        {keyLabel(key)}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>
          )}
          {view === 'table' && (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="能力数值表，可左右滑动"
            >
              <table data-chart="table" className="w-full text-sm">
                <caption className="sr-only">所选任务的能力分数，满分 5 分</caption>
                <thead>
                  <tr>
                    <th scope="col" className="sticky left-0 bg-card p-3 text-left">
                      能力
                    </th>
                    {visible.map((t) => (
                      <th scope="col" key={t.id} className="min-w-[120px] p-3 text-center">
                        {t.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {keys.map((key) => (
                    <tr key={key} className="border-t">
                      <th
                        scope="row"
                        className="sticky left-0 min-w-[140px] bg-card p-3 text-left font-normal"
                      >
                        <button
                          onClick={() => setDimension(key)}
                          className="min-h-11 text-primary hover:underline"
                        >
                          {capabilityLabel(key)}
                        </button>
                      </th>
                      {visible.map((t) => (
                        <td key={t.id} className="p-3 text-center tabular-nums">
                          {t.capabilities[key].score}/5
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <aside
          className="self-start rounded-xl bg-accent/35 p-5 sm:p-6"
          aria-label="维度解释与评分依据"
        >
          <label
            className="block text-xs font-medium text-muted-foreground"
            htmlFor="compare-dimension"
          >
            选择一项，看它能做什么
          </label>
          <select
            id="compare-dimension"
            value={dimension}
            onChange={(e) => setDimension(e.target.value as CapabilityKey)}
            className="mt-2 min-h-11 w-full rounded-lg border bg-card px-3 text-sm"
          >
            {keys.map((key) => (
              <option key={key} value={key}>
                {capabilityLabel(key)}
              </option>
            ))}
          </select>
          <div className="mt-5" aria-live="polite">
            <h3 className="text-lg font-semibold">{meta.label}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
            <p className="mt-4 text-sm font-medium">
              {visible.length === 1
                ? `当前显示 ${visible[0].name}：${top}/5。`
                : top === 0
                  ? '所选工具都不提供这项能力。'
                  : winners.length === visible.length
                    ? '这一项评分相同，再看费用和使用条件。'
                    : `${winners.map((t) => t.name).join('、')}${winners.length > 1 ? '并列' : ''}分数较高：${top}/5。`}
            </p>
            <ul className="mt-5 space-y-5">
              {visible.map((tool) => (
                <li key={tool.id}>
                  <p className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: color(tool) }}
                        aria-hidden
                      />
                      {tool.name}
                    </span>
                    <span>
                      {tool.capabilities[dimension].score}/5 ·{' '}
                      {SCORE_MEANINGS[tool.capabilities[dimension].score]}
                    </span>
                  </p>
                  <details className="mt-1 text-xs text-muted-foreground">
                    <summary className="min-h-9 cursor-pointer py-1.5">查看评分依据</summary>
                    <p className="pt-1 leading-7">
                      {tool.capabilities[dimension].basis?.trim() ||
                        '暂无文字依据，请查看工具详情。'}
                    </p>
                  </details>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
      <div className="mt-6 border-t pt-4 text-xs leading-7 text-muted-foreground">
        <p>0 不提供 · 1 基本不具备 · 2 偏弱 · 3 够用 · 4 较强 · 5 第一梯队</p>
        <p>
          按具体任务看单项分数；图形面积不代表更适合你。评分为公开资料整理，
          <a href="/about" className="text-primary underline underline-offset-4">
            查看评分方法
          </a>
          。
        </p>
      </div>
    </section>
  )
}
