import type { Metadata } from 'next'
import { SearchPageClient } from '@/components/search-page'

export const metadata: Metadata = {
  title: '搜索',
  description: '全站聚合搜索：工具、概念、教程、案例、学习路径。',
  alternates: { canonical: '/search' },
}

export default function SearchPage() {
  // 静态导出下服务端读不到 query，由客户端组件从地址栏读取；搜索索引同样客户端按需加载
  return <SearchPageClient />
}