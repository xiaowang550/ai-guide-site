import type { Metadata } from 'next'
import { AdminShell } from '@/components/admin/admin-shell'

export const metadata: Metadata = {
  title: '内容管理后台',
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return <AdminShell />
}
