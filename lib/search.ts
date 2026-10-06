import Fuse from 'fuse.js'
import type { SearchDoc } from '@/data/types'

export interface SearchDocWithWeight extends SearchDoc {
  /** 提高中文标题命中的权重 */
  weight?: number
}

export function createFuse(docs: SearchDocWithWeight[]): Fuse<SearchDocWithWeight> {
  return new Fuse(docs, {
    keys: [
      { name: 'title', weight: 0.42 },
      { name: 'subtitle', weight: 0.18 },
      { name: 'keywords', weight: 0.18 },
      { name: 'tags', weight: 0.12 },
      { name: 'summary', weight: 0.1 },
    ],
    threshold: 0.34,
    ignoreLocation: true,
    minMatchCharLength: 1,
    includeScore: true,
  })
}

export interface SearchHit {
  doc: SearchDocWithWeight
  score: number
}

/** 纯函数式搜索入口（不持有状态，方便测试） */
export function searchDocs(docs: SearchDocWithWeight[], query: string, limit = 12): SearchHit[] {
  const q = query.trim()
  if (!q) return []
  return createFuse(docs)
    .search(q)
    .slice(0, limit)
    .map((r) => ({ doc: r.item, score: r.score ?? 1 }))
}

export const SEARCH_TYPE_LABELS: Record<SearchDoc['type'], string> = {
  tool: '工具',
  concept: '概念',
  guide: '教程',
  case: '案例',
  path: '路径',
  program: '课程',
  toolkit: '教案包',
  briefing: '简报',
}