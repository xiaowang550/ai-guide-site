'use client'

import { useEffect, useState } from 'react'
import type { Tool } from '@/data/types'
import { ComparePicker } from '@/components/compare-picker'
import { CompareTable } from '@/components/compare-table'

/**
 * 对比页主容器：URL ?ids=a,b,c ↔ 选中状态双向同步。
 * 默认选中由服务端传入，保证首屏 HTML 就带对比表（利于 SEO 与首屏渲染）。
 * 客户端挂载后若地址栏带 ids，则以地址栏为准。
 */
export function CompareWorkbench({ tools, defaultIds }: { tools: Tool[]; defaultIds: string[] }) {
  const [selected, setSelected] = useState<string[]>(defaultIds)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = (params.get('ids') ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter((id) => tools.some((t) => t.id === id))
      .slice(0, 4)
    setSelected(fromUrl.length >= 2 ? fromUrl : defaultIds)
    setHydrated(true)
  }, [tools, defaultIds])

  useEffect(() => {
    if (!hydrated) return
    const qs = selected.length > 0 ? `?ids=${selected.join(',')}` : ''
    window.history.replaceState(null, '', `/compare${qs}`)
  }, [selected, hydrated])

  const selectedTools = selected
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is Tool => Boolean(t))

  return (
    <>
      <ComparePicker tools={tools} selected={selected} onChange={setSelected} />
      {selectedTools.length >= 2 ? (
        <CompareTable tools={selectedTools} />
      ) : (
        <p className="mt-6 border-y border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          至少选择两个工具才能对比。可以从工具库里挑 2-4 个再回来。
        </p>
      )}
    </>
  )
}