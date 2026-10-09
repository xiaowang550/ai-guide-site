'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { CompareTool as Tool } from '@/lib/compare-tool'
import { cn } from '@/lib/utils'
import { ToolLogo } from '@/components/tool-logo'

// 常量必须从非 client 模块导入。原先在这里 `export const MAX_COMPARE = 4`，
// 服务端页面拿它拼文案时被替换成 client 引用桩，函数源码被写进了 HTML。
// 详见 lib/compare-constants.ts 顶部的说明。
import { MAX_COMPARE } from '@/lib/compare-constants'

/** 受控的选择器：已选 id 由上层管理，便于与 URL / 对比表联动 */
export function ComparePicker({
  tools,
  selected,
  onChange,
}: {
  tools: Tool[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [query, setQuery] = useState('')

  const candidates = tools.filter(
    (t) =>
      !selected.includes(t.id) &&
      (query.trim() === '' ||
        `${t.name}${t.nameEn}${t.vendor}`.toLowerCase().includes(query.trim().toLowerCase())),
  )

  function toggle(id: string) {
    onChange(
      selected.includes(id)
        ? selected.filter((x) => x !== id)
        : selected.length >= MAX_COMPARE
          ? selected
          : [...selected, id],
    )
  }

  return (
    <div className="mb-6 border-t border-hairline pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">
          对比对象（{selected.length}/{MAX_COMPARE}）
        </span>
        {selected.length === 0 ? (
          <span className="text-sm text-muted-foreground">还没有选择工具</span>
        ) : null}
        {selected.map((id) => {
          const tool = tools.find((t) => t.id === id)
          if (!tool) return null
          return (
            <span key={id} className="pill py-1 pl-1.5 pr-2.5 hover:border-foreground/25">
              <ToolLogo src={tool.logo} alt="" size={18} className="border-0 bg-transparent p-0" />
              {tool.name}
              <button
                type="button"
                onClick={() => toggle(id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`移除 ${tool.name}`}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          )
        })}
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          disabled={selected.length >= MAX_COMPARE}
          className={cn(
            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium',
            selected.length >= MAX_COMPARE && 'cursor-not-allowed opacity-50',
          )}
        >
          <Plus className="h-3 w-3" aria-hidden />
          添加工具
        </button>
      </div>

      {pickerOpen ? (
        <div className="mt-4 border-t border-hairline pt-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索工具名或厂商"
            className="h-8 w-full max-w-xs rounded-md border bg-background px-2 text-xs"
            aria-label="搜索要对比的工具"
          />
          <ul className="mt-3 grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                >
                  <ToolLogo src={t.logo} alt="" size={20} className="border-0 bg-transparent p-0" />
                  <span className="min-w-0 flex-1 truncate">{t.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {t.overallScore.toFixed(1)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
