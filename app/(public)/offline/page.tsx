import type { Metadata } from 'next'
import Link from 'next/link'
import { FileText, Home, WifiOff } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { RetryButton } from '@/components/retry-button'

export const metadata: Metadata = {
  title: '当前处于离线状态',
  description: '该页面尚未缓存，联网后可以正常打开。已访问过的页面仍可离线阅读。',
  robots: { index: false },
}

const CACHED_HINTS = [
  '已经打开过的页面可以继续离线阅读',
  '工具详情、概念解释、教程内容都是纯文本，离线也能看',
  '需要联网的功能：搜索、决策器推荐、AI 助手（会提示不可用）',
]

export default function OfflinePage() {
  return (
    <>
      <PageHeader
        title="当前处于离线状态"
        description="你访问的页面还没有被缓存，所以打不开。已访问过的页面仍然可以正常阅读。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '离线' }]}
      />
      <div className="container py-10">
        <div className="max-w-2xl">
          <p className="flex items-center gap-2 text-muted-foreground">
            <WifiOff className="h-4 w-4" aria-hidden />
            检查一下网络连接，或者稍后再试。
          </p>

          <h2 className="mt-8 text-lg">还能做什么</h2>
          <ul className="mt-3 space-y-2 text-sm text-foreground/85">
            {CACHED_HINTS.map((h) => (
              <li key={h} className="flex gap-2">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                {h}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href="/"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              <Home className="h-4 w-4" aria-hidden />
              回到首页
            </Link>
            <RetryButton />
          </div>

          <p className="mt-8 text-xs leading-6 text-muted-foreground">
            说明：本站在首次访问后会把页面缓存在你自己的浏览器里（不涉及账号与服务器）。
            想离线用工具详情、概念、教程这些内容，建议先在联网状态下把常用页面各打开一次。
          </p>
        </div>
      </div>
    </>
  )
}