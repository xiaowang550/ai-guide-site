import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { NewsBoard } from '@/components/news/news-board'
import { seedNewsItems } from '@/lib/news/seed-view'
import '@/app/styles/news.css'

export const metadata: Metadata = {
  title: 'AI 实时资讯',
  description:
    '关注 AI 新模型、新功能、工具变化与最新发布。消息附官方来源和发布时间，持续获取更新。',
  alternates: { canonical: '/updates' },
}
export default function NewsPage() {
  return (
    <>
      <PageHeader
        title="AI 实时资讯"
        description="最新消息，简短看懂。找到与你的学习、教学和工作有关的变化。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: 'AI 实时资讯' }]}
      />
      <div className="container py-8">
        <NewsBoard initial={seedNewsItems()} />
      </div>
    </>
  )
}
