import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { LibraryPanel } from '@/components/learning/library-panel'
export const metadata: Metadata = {
  title: '我的学习夹',
  description: '收藏实用教程、工具与案例，快速回到最近看过的内容。无需账号，保存在本机。',
  robots: { index: false, follow: false },
}
export default function SavedPage() {
  return (
    <>
      <PageHeader
        title="我的学习夹"
        description="用得上的先留住，下次接着看。无需登录，收藏和最近浏览保存在这台设备上。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '学习夹' }]}
      />
      <LibraryPanel />
    </>
  )
}
