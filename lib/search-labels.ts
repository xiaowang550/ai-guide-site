import type { SearchDoc } from '@/data/types'
export const SEARCH_TYPE_LABELS: Record<SearchDoc['type'], string> = {
  module: '模块',
  news: '资讯',
  tool: '工具',
  concept: '概念',
  guide: '教程',
  case: '案例',
  path: '路径',
  program: '课程',
  toolkit: '教案包',
}
