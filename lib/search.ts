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
  const normalized = q.toLocaleLowerCase()
  const exact = (doc: SearchDoc) =>
    doc.id.toLocaleLowerCase() === normalized ||
    [doc.title, doc.subtitle ?? '', ...doc.keywords, ...doc.tags].some(
      (value) =>
        value.toLocaleLowerCase() === normalized ||
        value
          .toLocaleLowerCase()
          .split(/[^a-z0-9\u4e00-\u9fff]+/)
          .includes(normalized),
    )
  return createFuse(docs)
    .search(q)
    .sort(
      (a, b) => Number(exact(b.item)) - Number(exact(a.item)) || (a.score ?? 1) - (b.score ?? 1),
    )
    .slice(0, limit)
    .map((r) => ({ doc: r.item, score: r.score ?? 1 }))
}

export { SEARCH_TYPE_LABELS } from './search-labels'

/** 先限定内容类型，再截断结果，避免大量工具命中挤掉教程或案例。 */
export function searchDocsByType(
  docs: SearchDocWithWeight[],
  query: string,
  type: SearchDoc['type'] | 'all',
  limit = 60,
): SearchHit[] {
  return searchDocs(type === 'all' ? docs : docs.filter((doc) => doc.type === type), query, limit)
}
