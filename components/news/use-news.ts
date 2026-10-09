'use client'

import { useEffect, useState } from 'react'
import { NEWS_CLIENT_POLL_MS, type NewsFeed, type NewsItem } from '@/lib/news/types'

export function useNews(initial: NewsItem[] = [], tool?: string, limit = 60) {
  const [feed, setFeed] = useState<NewsFeed>({
    items: initial,
    lastFetchedAt: null,
    stale: true,
    intervalMinutes: 30,
    sources: [],
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let active = true,
      busy = false
    let controller: AbortController | null = null
    const refresh = async () => {
      if (busy || document.hidden) return
      busy = true
      controller = new AbortController()
      const currentController = controller
      const timeout = setTimeout(() => currentController.abort(), 10000)
      try {
        const params = new URLSearchParams({ limit: String(limit) })
        if (tool) params.set('tool', tool)
        const response = await fetch(`/api/news?${params}`, {
          cache: 'no-store',
          signal: currentController.signal,
        })
        if (!response.ok) throw new Error('资讯获取暂时不可用')
        const data: NewsFeed = await response.json()
        if (active) {
          setFeed(data)
          setError('')
        }
      } catch {
        if (active) setError('暂时无法获取新消息，先展示已保存内容。')
      } finally {
        clearTimeout(timeout)
        busy = false
        if (active) setLoading(false)
      }
    }
    const visible = () => {
      if (!document.hidden) void refresh()
    }
    void refresh()
    const timer = setInterval(() => void refresh(), NEWS_CLIENT_POLL_MS)
    document.addEventListener('visibilitychange', visible)
    return () => {
      active = false
      controller?.abort()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', visible)
    }
  }, [tool, limit])
  return { feed, error, loading }
}
