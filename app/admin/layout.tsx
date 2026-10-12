import type { Metadata } from 'next'
import '@/app/styles/reference-base.css'
import './admin.css'

export const metadata: Metadata = {
  title: '管理工作台',
  robots: { index: false, follow: false, nocache: true },
}

/** 与公开站导航、助手、引导和统计采集隔离的管理区域。 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main id="admin-main" className="public-site admin-workspace">
      {children}
    </main>
  )
}
