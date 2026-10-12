import '@/app/styles/reference-hero.css'
import '@/app/styles/reference-paths.css'
import type { Metadata } from 'next'
import { paths } from '@/data'
import { PageHeader } from '@/components/page-header'
import { PathCard } from '@/components/path-card'
export const metadata: Metadata = {
  title: '学习路径',
  description: '按起点选择路线，每个阶段都有练习，进度保存在当前浏览器。',
  alternates: { canonical: '/paths' },
}
export default function PathsPage() {
  return (
    <>
      <PageHeader
        illustrated
        title="学习路径"
        description="选择适合自己起点的路线。每个阶段都有可完成的练习，进度保存在当前浏览器。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '学习路径' }]}
      />
      <div className="container py-8">
        <div className="path-grid">
          {paths.map((path, index) => (
            <PathCard key={path.id} path={path} index={index} />
          ))}
        </div>
      </div>
    </>
  )
}
