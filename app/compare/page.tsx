import type { Metadata } from 'next'
import { tools } from '@/data'
import { PageHeader } from '@/components/page-header'
import { CompareWorkbench } from '@/components/compare-workbench'
import { MAX_COMPARE } from '@/components/compare-picker'

export const metadata: Metadata = {
  title: '工具对比',
  // 数量范围从 MAX_COMPARE 推导，避免以后改了上限文案没跟着改
  description: `2-${MAX_COMPARE} 个 AI 工具并排对比：14 维能力、价格、免费额度、大陆可直连、幻觉风险、上手成本。支持 URL 参数分享。`,
  alternates: { canonical: '/compare' },
}

export default function ComparePage() {
  // 默认展示综合分最高的几个工具，保证首屏就有内容；URL 带 ids 时客户端会覆盖
  const DEFAULT_SHOWN = 3
  const defaultIds = [...tools]
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, Math.min(DEFAULT_SHOWN, MAX_COMPARE))
    .map((t) => t.id)

  return (
    <>
      <PageHeader
        title="工具对比"
        description={`横向比较 2-${MAX_COMPARE} 个工具。地址栏里的 ?ids=a,b,c 可以直接分享给别人。`}
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '工具库', href: '/tools' }, { label: '对比' }]}
      />

      <div className="container py-8">
        <CompareWorkbench tools={tools} defaultIds={defaultIds} />
      </div>
    </>
  )
}