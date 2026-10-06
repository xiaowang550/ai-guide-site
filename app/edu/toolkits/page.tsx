import type { Metadata } from 'next'
import { toolsById } from '@/data'
import { eduToolkits } from '@/data/edu-toolkits'
import { eduPrograms } from '@/data/edu-programs'
import { PageHeader } from '@/components/page-header'
import { ToolkitExplorer } from '@/components/edu/toolkit-explorer'

export const metadata: Metadata = {
  title: '课程与教案包',
  description:
    '学校拿到即可开课、即可备课的完整材料：含教案结构、课堂活动、讨论题、AI 使用规范要点与学生使用声明，按学段与学科编排，标注版本与适用时间。',
  alternates: { canonical: '/edu/toolkits' },
}

export default function ToolkitsPage() {
  // 只把封面需要的三个字段交给客户端，避免把完整工具档案打进浏览器包
  const toolRefs = Object.values(toolsById).map((t) => ({
    id: t.id,
    name: t.name,
    logo: t.logo,
  }))

  return (
    <>
      <PageHeader
        title="课程与教案包"
        description="不是讲义片段，而是可以直接进课堂的完整材料。每套包含教案结构、课堂活动、讨论题、AI 使用规范要点与学生使用声明。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: 'AI 教育服务', href: '/edu' },
          { label: '课程与教案包' },
        ]}
      />
      <div className="container py-8">
        <ToolkitExplorer
        toolkits={eduToolkits}
        programs={eduPrograms}
        toolRefs={toolRefs}
      />
      </div>
    </>
  )
}