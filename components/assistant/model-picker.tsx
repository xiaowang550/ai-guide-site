'use client'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Search, Sparkles, X } from 'lucide-react'
import type { FreeModel, ModelCatalog } from '@/lib/assistant-models'
export function ModelPicker({
  catalog,
  selected,
  onChange,
  busy,
}: {
  catalog: ModelCatalog | null
  selected: string
  onChange: (id: string) => void
  busy: boolean
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(''),
    [focused, setFocused] = useState(0)
  const trigger = useRef<HTMLButtonElement>(null),
    search = useRef<HTMLInputElement>(null),
    list = useRef<HTMLDivElement>(null)
  const models = (catalog?.models ?? []).filter((m) =>
    `${m.name} ${m.id} ${m.provider}`.toLowerCase().includes(query.toLowerCase()),
  )
  const current = catalog?.models.find((m) => m.id === selected)
  useEffect(() => {
    if (open) search.current?.focus()
  }, [open])
  useEffect(() => {
    if (busy) setOpen(false)
  }, [busy])
  function close() {
    setOpen(false)
    trigger.current?.focus()
  }
  function pick(model: FreeModel) {
    if (model.available) {
      onChange(model.id)
      close()
    }
  }
  return (
    <div className="assistant-picker">
      <button
        ref={trigger}
        type="button"
        className="assistant-model-trigger"
        aria-expanded={open}
        aria-controls="assistant-model-list"
        disabled={busy}
        onClick={() => {
          setOpen(!open)
          setQuery('')
          setFocused(0)
        }}
      >
        <Sparkles size={14} aria-hidden /> <span>{current?.name ?? '选择免费模型'}</span>
        <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div
          className="assistant-model-menu"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              close()
            }
            if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
              e.preventDefault()
              const next =
                (focused + (e.key === 'ArrowDown' ? 1 : -1) + models.length) %
                Math.max(1, models.length)
              setFocused(next)
              list.current
                ?.querySelectorAll<HTMLElement>('[role=option]')
                [next]?.scrollIntoView({ block: 'nearest' })
            }
            if (e.key === 'Enter' && models[focused]) {
              e.preventDefault()
              pick(models[focused])
            }
          }}
        >
          <div className="assistant-model-menu-heading">
            <strong>免费模型</strong>
            <span>{catalog?.models.length ?? 0} 个</span>
            <button type="button" aria-label="关闭模型菜单" onClick={close}>
              <X size={16} />
            </button>
          </div>
          <label className="assistant-model-search">
            <Search size={15} aria-hidden />
            <input
              ref={search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setFocused(0)
              }}
              placeholder="搜索名称或平台"
              aria-label="搜索免费模型"
            />
          </label>
          <div
            ref={list}
            id="assistant-model-list"
            className="assistant-model-list"
            role="listbox"
            aria-label="选择免费模型"
          >
            {models.map((m, i) => (
              <button
                key={m.id}
                type="button"
                role="option"
                aria-selected={selected === m.id}
                aria-disabled={!m.available}
                className={`assistant-model-option ${i === focused ? 'is-focused' : ''}`}
                onMouseEnter={() => setFocused(i)}
                onClick={() => pick(m)}
              >
                <span className="assistant-model-icon">
                  {m.provider === 'opencode'
                    ? '🐇'
                    : m.id === 'openrouter/free'
                      ? '✦'
                      : m.name.slice(0, 1)}
                </span>
                <span className="assistant-model-label">
                  <strong>{m.name}</strong>
                  <small>
                    {m.provider === 'opencode' ? 'OpenCode' : m.id.split('/')[0]} ·{' '}
                    {m.available
                      ? m.context
                        ? `${Math.round(m.context / 1000)}K 上下文`
                        : '以平台限制为准'
                      : '音频专用'}
                  </small>
                </span>
                <span className="assistant-free-tag">免费</span>
                {selected === m.id && <Check size={16} aria-hidden />}
              </button>
            ))}
            {!models.length && (
              <p className="assistant-menu-empty">没有找到这个模型，试试其他名称。</p>
            )}
          </div>
          <div className="assistant-model-detail">
            <strong>{current?.name ?? '按任务选择'}</strong>
            <p>{current?.note ?? '所有模型均按当前官方免费目录筛选。'}</p>
            <div>
              {current?.vision && <span>支持图像输入</span>}
              {current?.reasoning && <span>支持推理</span>}
              {current?.tools && <span>支持工具调用</span>}
            </div>
            <small>本次助手提供文字对话。免费服务可能有额度限制。</small>
          </div>
          <a href="https://openrouter.ai/models?max_price=0" target="_blank" rel="noreferrer">
            查看官方免费模型目录 ↗
          </a>
        </div>
      )}
    </div>
  )
}
