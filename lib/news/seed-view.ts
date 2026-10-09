import { newsSeed } from '@/data/news-seed'
import { NEWS_SOURCES } from './sources'
import type { NewsItem } from './types'

/** 仅用于首屏和接口不可达时的已核对快照，不标记为实时获取。 */
export function seedNewsItems(): NewsItem[] {
  return newsSeed
    .map((item, index) => ({
      ...item,
      id: `seed-${index}`,
      sourceName: NEWS_SOURCES.find((source) => source.id === item.sourceId)?.name ?? '官方来源',
      originalTitle: item.title,
      fetchedAt: '',
      reviewed: true,
    }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
}
