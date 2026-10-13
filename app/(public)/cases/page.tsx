import '@/app/styles/reference-hero.css'
import '@/app/styles/reference-cases.css'
import type { Metadata } from 'next'
import { cases, toolsById } from '@/data'
import { PageHeader } from '@/components/page-header'
import { CaseExplorer } from '@/components/case-explorer'
import { DocumentScene } from '@/components/document-scene'
import { caseScene } from '@/data/case-scenes'

export const metadata: Metadata = {
  title: '案例库',
  description:
    '按任务与行业选择AI案例，配合场景图、可复制提示词与动手工作台，练习准备材料、生成草稿和人工核对。',
  alternates: { canonical: '/cases' },
}

export default function CasesPage() {
  const industries = Array.from(new Set(cases.map((c) => c.industry)))
  const displayCases = [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <>
      <PageHeader
        illustrated
        art={<DocumentScene />}
        title="案例库：别人到底怎么用的"
        description="选一个日常任务，看场景图、亲手改材料，带走核对后的成果。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '案例' }]}
      />

      <div className="container py-8">
        <details className="mb-6 text-sm text-muted-foreground">
          <summary className="cursor-pointer text-xs">
            {cases.length} 个案例 · {industries.length} 个行业 · 查看阅读说明
          </summary>
          <p className="mt-3 leading-7">
            案例按典型任务整理，提示词可复制。结果说明是编辑判断，未经本站逐案验证；请核对实际效果。
          </p>
        </details>

        <CaseExplorer
          items={displayCases.map((item) => ({
            id: item.id,
            title: item.title,
            industry: item.industry,
            role: item.role,
            summary: item.summary ?? item.scenario,
            reusability: item.reusability,
            updatedAt: item.updatedAt,
            illustrative: item.kind === 'illustrative',
            cover: caseScene(item.id),
            tools: item.tools
              .map((id) => toolsById[id])
              .filter(Boolean)
              .map((tool) => ({ id: tool.id, name: tool.name, logo: tool.logo })),
          }))}
        />
      </div>
    </>
  )
}
