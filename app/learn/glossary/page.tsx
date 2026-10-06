import type { Metadata } from 'next'
import { glossary } from '@/data'
import { GlossaryBrowser } from '@/components/glossary-browser'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = {
  title: 'AI 术语表（中英对照）',
  description:
    'AI 领域常见术语的中英对照速查：Transformer、Attention、RAG、微调、蒸馏、量化、Tool Use、MCP、幻觉、RLHF……支持中英文检索与首字母索引。',
  alternates: { canonical: '/learn/glossary' },
}

export default function GlossaryPage() {
  return (
    <>
      <PageHeader
        title="AI 术语表"
        description="中英对照，一句话释义 + 详细说明。看到不懂的词先来这儿查一遍，比被人用黑话糊弄好。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '知识库', href: '/learn' }, { label: '术语表' }]}
      />
      <div className="container py-8">
        <GlossaryBrowser entries={glossary} />
      </div>
    </>
  )
}