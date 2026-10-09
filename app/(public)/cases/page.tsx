import type { Metadata } from 'next'
import { cases, toolsById } from '@/data'
import { PageHeader } from '@/components/page-header'
import { CaseExplorer } from '@/components/case-explorer'

export const metadata: Metadata = {
  title: '案例库',
  description:
    '真实场景的 AI 应用案例：原来的痛点、用了什么工具、完整提示词原文、实际结果、花了多久、踩过的坑。按行业与角色筛选。',
  alternates: { canonical: '/cases' },
}

export default function CasesPage() {
  const industries = Array.from(new Set(cases.map((c) => c.industry)))
  const displayCases = [...cases].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <>
      <PageHeader
        title="案例库：别人到底怎么用的"
        description="选一个任务，看看资料准备、提示词和核对方法。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '案例' }]}
      />

      <div className="container py-8">
        <details className="mb-6 text-sm text-muted-foreground">
          <summary className="cursor-pointer text-xs">
            {cases.length} 个案例 · {industries.length} 个行业 · 查看阅读说明
          </summary>
          <p className="mt-3 leading-7">
            共 {cases.length} 个案例，覆盖 {industries.length} 个行业。案例由典型场景改编整理而成，
            提示词可原样复现；结果描述是编辑判断而非本站逐案实测，不同团队实际效果会有差异。
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
