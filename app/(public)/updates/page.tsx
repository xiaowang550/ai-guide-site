import { PageRegions } from '@/components/page-regions'
import '@/app/styles/reference-hero.css'
import type { Metadata } from 'next'
import { ReferenceArt } from '@/components/reference-art'
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
    <PageRegions
      moduleId="news"
      sections={[
        {
          id: 'content',
          content: (
            <div className="news-page container">
              <NewsBoard
                initial={seedNewsItems()}
                hero={
                  <div className="news-hero">
                    <div>
                      <h1>AI 实时资讯</h1>
                      <p>最新消息，简短看懂。找到与你的学习、教学和工作有关的变化。</p>
                    </div>
                    <ReferenceArt />
                  </div>
                }
              />
            </div>
          ),
        },
      ]}
    />
  )
}
