import type { Metadata } from 'next'
import { guides, tools } from '@/data'
import { GuideExplorer } from '@/components/guide-explorer'
import { PageHeader } from '@/components/page-header'
import { latestUpdatedAt } from '@/lib/score'
import { UpdatedBadge } from '@/components/updated-badge'

export const metadata: Metadata = {
  title: '教程：AI 怎么用',
  description:
    '两类教程分开写：通用方法课讲怎么把话说清楚，场景实操课照着做完就能交活。含可复制提示词、预期输出与出错处理。',
  alternates: { canonical: '/guides' },
}

export default function GuidesPage() {
  const methodCount = guides.filter((g) => g.type === 'method').length
  const scenarioCount = guides.length - methodCount

  return (
    <>
      <PageHeader
        title="教程：AI 怎么用"
        description={`共 ${guides.length} 篇：${methodCount} 篇通用方法课 + ${scenarioCount} 篇场景实操课。方法课讲通用技巧，实操课每一步都写清在哪做、输入什么、预期输出是什么。`}
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '教程' }]}
        meta={<UpdatedBadge date={latestUpdatedAt(tools)} prefix="内容更新于" />}
      />
      <div className="container py-8">
        <GuideExplorer guides={guides} tools={tools} />
      </div>
    </>
  )
}