'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

/**
 * 「重新尝试」按钮。
 *
 * 单独拆成 client 组件：离线页本身要保持 server 组件才能导出 metadata
 * （Next 不允许 'use client' 组件导出 metadata）。
 */
export function RetryButton() {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors hover:bg-accent"
    >
      <RefreshCw className="h-4 w-4" aria-hidden />
      重新尝试
    </button>
  )
}