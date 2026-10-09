import type { Metadata } from 'next'
import { eduPrograms } from '@/data/edu-programs'
import { PageHeader } from '@/components/page-header'
import { ProgramExplorer } from '@/components/edu/program-explorer'

export const metadata: Metadata = {
  title: '课程体系：初中认识、高中实践、教师教学',
  description: '从零基础认识开始，选择初中、高中或教师路线，按顺序找到课程与实际课堂活动。',
  alternates: { canonical: '/edu/programs' },
}
export default function ProgramsPage() {
  const programs = eduPrograms.map(
    ({ id, title, tier, stage, lessons, outcome, deliverables }) => ({
      id,
      title,
      tier,
      stage,
      lessons,
      outcome,
      deliverables,
    }),
  )
  return (
    <>
      <PageHeader
        className="school-page-heading"
        title="课程体系"
        description="先选学习对象，再走第一步。每门课都留下一份能检查、能继续使用的材料。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '学校服务', href: '/edu' },
          { label: '课程体系' },
        ]}
      />
      <div className="container py-8">
        <ProgramExplorer programs={programs} />
      </div>
    </>
  )
}
