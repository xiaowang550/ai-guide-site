export const NEWS_REFRESH_MS = 30 * 60 * 1000
export const NEWS_CLIENT_POLL_MS = 60 * 1000
export type NewsCategory = '模型发布' | '功能更新' | '编程工具' | '使用变化' | '研究与行业'

export interface NewsItem {
  id: string
  title: string
  originalTitle: string
  summary: string | null
  takeaway: string | null
  category: NewsCategory
  sourceId: string
  sourceName: string
  url: string
  publishedAt: string
  fetchedAt: string
  toolIds: string[]
  reviewed: boolean
  hidden?: boolean
}
export interface NewsSource {
  id: string
  name: string
  url: string
  format: 'rss' | 'html' | 'github' | 'qwen'
  hosts: string[]
  toolIds: string[]
  linkPattern?: string
}
export interface SourceState {
  id: string
  name: string
  status: 'pending' | 'ok' | 'error'
  attemptedAt: string | null
  succeededAt: string | null
  count: number
  error?: string | null
}
export interface NewsFeed {
  items: NewsItem[]
  lastFetchedAt: string | null
  stale: boolean
  intervalMinutes: number
  sources: SourceState[]
}
