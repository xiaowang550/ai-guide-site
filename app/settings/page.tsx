import type { Metadata } from 'next'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { SettingsPanel } from '@/components/settings/settings-panel'

export const metadata: Metadata = {
  title: '设置',
  description: '助手显示与停靠位置、新手引导重播、本地偏好管理。设置只保存在你的浏览器里。',
  alternates: { canonical: '/settings' },
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="设置"
        description="这里管的是「这台设备上的使用偏好」，不是账号。所有开关都会立即生效。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '设置' }]}
      />
      <div className="container py-8">
        <div className="max-w-3xl">
          <SettingsPanel />

          <div className="mt-10 border-t border-hairline pt-6">
            <h2 className="text-sm font-semibold">没找到想要的功能？</h2>
            <p className="mt-2 text-[13px] leading-6 text-muted-foreground">
              本站是纯静态的（无后端、无账号、不收集数据），所以只做了不依赖服务器的功能。
              如果你需要某个能力，直接提需求 —— 评估是否能在纯静态前提下实现。
            </p>
            <div className="mt-4 flex flex-wrap gap-4">
              <Link href="/about#errata" className="link-animate text-sm">
                提交需求或勘误
              </Link>
              <Link href="/edu/support" className="link-animate text-sm">
                教师与学校答疑通道
              </Link>
              <Link href="/freshness" className="link-animate text-sm">
                数据保鲜看板
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}