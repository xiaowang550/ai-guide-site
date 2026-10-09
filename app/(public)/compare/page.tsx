import type { Metadata } from 'next'
import { toCompareTool } from '@/lib/compare-tool'
import { tools } from '@/data'
import { PageHeader } from '@/components/page-header'
import { CompareWorkbench } from '@/components/compare-workbench'
import { ScoringSourceNote } from '@/components/scoring-source-note'
import { MAX_COMPARE, compareRangeText } from '@/lib/compare-constants'

export const metadata: Metadata = {
  title: '工具对比',
  // 数量范围从 MAX_COMPARE 推导，避免以后改了上限文案没跟着改
  description: `${compareRangeText()}并排对比：14 维能力、价格、免费额度、大陆可直连、幻觉风险、上手成本。支持 URL 参数分享。`,
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
        description={`${compareRangeText()}，按任务看清各自强项。雷达图、条形图、折线图随时切换；复制网址即可分享。`}
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '工具库', href: '/tools' },
          { label: '对比' },
        ]}
      />

      <div className="container py-8">
        {/*
          对比页原先完全没有评分来源说明，读者在这里看到一整屏分数
          却没有理由判断这些数字可不可信 —— 而工具库页和 about 页都写了。
          这是五处口径里唯一的一处空白，补上。
        */}
        <ScoringSourceNote className="mb-6" />

        <CompareWorkbench tools={tools.map(toCompareTool)} defaultIds={defaultIds} />
      </div>
    </>
  )
}
