import type { Metadata } from 'next'
import { eduToolkits } from '@/data/edu-toolkits'
import { eduPrograms } from '@/data/edu-programs'
import { PageHeader } from '@/components/page-header'
import { ToolkitExplorer } from '@/components/edu/toolkit-explorer'

export const metadata: Metadata = {
  title: '课程与教案包',
  description:
    '初中认识 AI、高中了解与使用、跨学段真实教学场景。每套含材料清单、课堂流程与可复制的学习单。',
  alternates: { canonical: '/edu/toolkits' },
}
export default function ToolkitsPage() {
  const toolkits = eduToolkits.map(
    ({ id, title, stage, subject, programId, mode, lessons, lessonPlans }) => ({
      id,
      title,
      stage,
      subject,
      programId,
      mode,
      lessons,
      goal: lessonPlans[0].goal,
      output: lessonPlans[0].studentOutput,
    }),
  )
  const programs = eduPrograms.map(({ id, title }) => ({ id, title }))
  return (
    <>
      <PageHeader
        className="school-page-heading"
        title="课程与教案包"
        description="选一个正在教学的场景，准备材料，按流程上课。先从一节课开始。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '学校服务', href: '/edu' },
          { label: '课程与教案包' },
        ]}
      />
      <div className="container py-8">
        <ToolkitExplorer toolkits={toolkits} programs={programs} />
      </div>
    </>
  )
}
