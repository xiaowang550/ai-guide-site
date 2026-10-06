import type { Metadata } from 'next'
import { PolicyGenerator } from '@/components/edu/policy-generator'
import { PrintButton } from '@/components/print-button'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = {
  title: 'AI 使用规范生成器',
  description:
    '选学段、学科与使用强度，即时生成校级 AI 使用规范草案、明确红线、学生使用声明与作业评价调整建议。纯规则引擎，结果可复现。',
  alternates: { canonical: '/edu/policy' },
}

export default function PolicyPage() {
  return (
    <>
      <PageHeader
        title="AI 使用规范生成器"
        description="学校最缺的不是工具，而是标准：哪些内容可以进课堂、哪些做法必须禁止、作业该怎么改。选三个条件，拿到一份可讨论的草案。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: 'AI 使用规范' },
        ]}
      />
      
      {/* 打印：纸面上只保留内容，导航与按钮不输出 */}
      <div className="container print:hidden">
        <div className="flex justify-end pb-2">
          <PrintButton />
        </div>
      </div>
<div className="container py-8">
        <PolicyGenerator />
      </div>
    </>
  )
}