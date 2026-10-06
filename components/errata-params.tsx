'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ErrataForm } from '@/components/errata-form'

/**
 * 包装层：读 URL 上的 ?from= 参数用于预填页面字段。
 *
 * 为什么需要 Suspense：静态导出下 useSearchParams 会让页面在构建时要求
 * 动态渲染，用 Suspense 包起来即可保持整站静态导出。
 */
export function ErrataFormWithParam() {
  return (
    <Suspense fallback={<div className="mt-5 h-40" />}>
      <ErrataFormFromUrl />
    </Suspense>
  )
}

function ErrataFormFromUrl() {
  const params = useSearchParams()
  const from = params.get('from') ?? undefined
  return <ErrataForm from={from} />
}