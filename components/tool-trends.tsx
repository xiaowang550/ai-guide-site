'use client'
import { useEffect, useState } from 'react'
import { Flame } from 'lucide-react'
import { freshTrends, type ToolTrends } from '@/lib/tool-trends'
import { toolTrendsSeed } from '@/data/tool-trends'

export function useToolTrends() {
  const [trends, setTrends] = useState(() => freshTrends(toolTrendsSeed))
  useEffect(() => {
    let active = true
    const refresh = () => {
      if (document.hidden) return
      import('@/lib/load-tool-trends')
        .then((module) => module.loadToolTrends())
        .then((value) => {
          if (active) setTrends(value)
        })
        .catch(() => {
          /* 网络中断时保留当前有效快照。 */
        })
    }
    refresh()
    const timer = setInterval(refresh, 600000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      active = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return trends
}
export function ToolHotBadge({ id, trends }: { id: string; trends: ToolTrends }) {
  const item = freshTrends(trends).items.find((item) => item.toolId === id)
  if (!item) return null
  const text = `${item.model} · OpenRouter ${trends.method === 'seven-days' ? '近七天' : '公开'}调用榜单前列 · ${trends.asOf.slice(0, 10)}。热度不等于用户人数或能力分。`
  return (
    <span className="tool-hot-badge" tabIndex={0} aria-label={text} title={text}>
      <Flame size={14} aria-hidden />
      <span>热门</span>
      <span className="tool-hot-tooltip" aria-hidden>
        {text}
      </span>
    </span>
  )
}
export function ToolTrendSource({ trends }: { trends: ToolTrends }) {
  if (!freshTrends(trends).items.length) return null
  return (
    <p className="tool-trend-source">
      火焰表示相关模型近期公开调用热度，与能力评分分开。来源：
      <a href="https://openrouter.ai/rankings" target="_blank" rel="noreferrer">
        OpenRouter
      </a>{' '}
      · 截至 {trends.asOf.slice(0, 10)} · CC BY 4.0
    </p>
  )
}
export function LiveHotBadge({ id }: { id: string }) {
  return <ToolHotBadge id={id} trends={useToolTrends()} />
}
export function LiveTrendSource() {
  return <ToolTrendSource trends={useToolTrends()} />
}
