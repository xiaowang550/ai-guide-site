'use client'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { ArrowDown, ArrowUp, GripVertical, RotateCcw, Save } from 'lucide-react'
import {
  DEFAULT_LAYOUT,
  homeCandidates,
  layoutOf,
  navigationCandidates,
  orderedIds,
  type SiteLayout,
} from '@/lib/site-layout'
import type { PublicSiteConfig } from '@/lib/site-modules'
type Scope = 'navigation' | 'home'
export function LayoutEditor({
  config,
  busy,
  onSave,
  onPreview,
}: {
  config: PublicSiteConfig
  busy: boolean
  onSave: (body: Record<string, unknown>) => Promise<boolean>
  onPreview: (layout: SiteLayout) => void
}) {
  const [draft, setDraft] = useState(() => layoutOf(config))
  const [announcement, setAnnouncement] = useState('')
  const [dragging, setDragging] = useState('')
  const drag = useRef<{ scope: Scope; id: string; x: number; y: number; moved: boolean } | null>(
    null,
  )
  const current = layoutOf(config)
  useEffect(() => {
    setDraft((previous) => (previous.version === current.version ? previous : current))
  }, [current])
  useEffect(() => {
    onPreview(draft)
  }, [draft, onPreview])
  const dirty = (['navigation', 'home', 'hiddenNavigation', 'hiddenHome'] as const).some(
    (field) => JSON.stringify(draft[field]) !== JSON.stringify(current[field]),
  )
  const candidates = {
    navigation: navigationCandidates(config.modules),
    home: homeCandidates(config.modules),
  }
  function move(scope: Scope, id: string, target: string) {
    setDraft((previous) => {
      const order = orderedIds(previous[scope], candidates[scope])
      const from = order.indexOf(id),
        to = order.indexOf(target)
      if (from < 0 || to < 0 || from === to) return previous
      order.splice(to, 0, order.splice(from, 1)[0])
      return { ...previous, [scope]: order }
    })
  }
  function arrow(scope: Scope, id: string, delta: number) {
    const order = orderedIds(draft[scope], candidates[scope])
    const target = order[order.indexOf(id) + delta]
    if (target) {
      move(scope, id, target)
      setAnnouncement(
        `${candidates[scope].find((item) => item.id === id)?.title}已${delta < 0 ? '上移' : '下移'}。保存后同步到公开站。`,
      )
    }
  }
  function pointerMove(event: PointerEvent<HTMLButtonElement>) {
    const item = drag.current
    if (!item) return
    if (!item.moved && Math.hypot(event.clientX - item.x, event.clientY - item.y) < 6) return
    item.moved = true
    setDragging(item.id)
    const list = event.currentTarget.closest('ol')
    const bounds = list?.getBoundingClientRect()
    if (list && bounds) {
      if (event.clientY < bounds.top + 40) list.scrollTop -= 18
      if (event.clientY > bounds.bottom - 40) list.scrollTop += 18
    }
    const row = document
      .elementFromPoint(event.clientX, event.clientY)
      ?.closest<HTMLElement>('[data-layout-row]')
    if (row?.dataset.scope === item.scope && row.dataset.layoutRow)
      move(item.scope, item.id, row.dataset.layoutRow)
  }
  function finishDrag() {
    if (drag.current?.moved) setAnnouncement('位置已调整，预览已更新；保存后同步到公开站。')
    drag.current = null
    setDragging('')
  }
  function toggle(scope: Scope, id: string, show: boolean) {
    const field = scope === 'navigation' ? 'hiddenNavigation' : 'hiddenHome'
    setDraft((previous) => ({
      ...previous,
      [field]: show ? previous[field].filter((value) => value !== id) : [...previous[field], id],
    }))
  }
  return (
    <section className="admin-card layout-editor p-5" aria-label="DIY 导航与首页布局">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold">DIY 导航与首页布局</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            拖动左侧手柄，或用箭头换位置。调整时预览跟随，保存后公开站自动同步。两处顺序互不影响。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="admin-secondary-button"
            disabled={busy}
            onClick={() =>
              setDraft({
                ...DEFAULT_LAYOUT,
                version: current.version,
                updatedAt: current.updatedAt,
              })
            }
          >
            <RotateCcw size={16} />
            恢复默认布局
          </button>
          <button
            className="admin-primary-button"
            disabled={busy || !dirty}
            onClick={() =>
              void onSave({
                navigation: orderedIds(draft.navigation, candidates.navigation),
                home: orderedIds(draft.home, candidates.home),
                hiddenNavigation: draft.hiddenNavigation.filter((id) =>
                  candidates.navigation.some((item) => item.id === id),
                ),
                hiddenHome: draft.hiddenHome.filter((id) =>
                  candidates.home.some((item) => item.id === id),
                ),
                version: current.version,
              })
            }
          >
            <Save size={16} />
            {busy ? '保存中…' : '保存布局'}
          </button>
        </div>
      </div>
      <div className="layout-boards">
        {(['navigation', 'home'] as const).map((scope) => {
          const order = orderedIds(draft[scope], candidates[scope])
          const hidden = scope === 'navigation' ? draft.hiddenNavigation : draft.hiddenHome
          return (
            <div key={scope} className="layout-board">
              <h3>{scope === 'navigation' ? '导航从左到右' : '首页从上到下'}</h3>
              <p className="intro-muted">
                {scope === 'navigation'
                  ? '桌面、手机菜单和页脚使用同一顺序。'
                  : '新建首页模块也能放到这些位置中。'}
              </p>
              <ol
                className="layout-list"
                aria-label={scope === 'navigation' ? '导航位置列表' : '首页模块位置列表'}
              >
                {order.map((id, index) => (
                  <li
                    key={id}
                    data-layout-row={id}
                    data-scope={scope}
                    data-dragging={dragging === id}
                    data-hidden={hidden.includes(id)}
                  >
                    <button
                      className="layout-handle"
                      type="button"
                      aria-label={`拖动${candidates[scope].find((item) => item.id === id)?.title}`}
                      disabled={busy}
                      onPointerDown={(event) => {
                        if (event.button !== 0) return
                        event.preventDefault()
                        drag.current = {
                          scope,
                          id,
                          x: event.clientX,
                          y: event.clientY,
                          moved: false,
                        }
                        event.currentTarget.setPointerCapture(event.pointerId)
                      }}
                      onPointerMove={pointerMove}
                      onPointerUp={finishDrag}
                      onPointerCancel={finishDrag}
                      onLostPointerCapture={finishDrag}
                    >
                      <GripVertical size={18} />
                    </button>
                    <span className="layout-row-title">
                      {candidates[scope].find((item) => item.id === id)?.title}
                      {config.modules.some((module) => module.id === id && !module.enabled) && (
                        <small>栏目已关闭</small>
                      )}
                    </span>
                    <label className="layout-visible">
                      <input
                        aria-label={`${scope === 'navigation' ? '导航' : '首页'}显示${candidates[scope].find((item) => item.id === id)?.title}`}
                        type="checkbox"
                        checked={!hidden.includes(id)}
                        disabled={busy || id === 'home'}
                        onChange={(event) => toggle(scope, id, event.target.checked)}
                      />
                      <span>显示</span>
                    </label>
                    <button
                      className="layout-arrow"
                      aria-label={`上移${candidates[scope].find((item) => item.id === id)?.title}`}
                      disabled={busy || index === 0}
                      onClick={() => arrow(scope, id, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="layout-arrow"
                      aria-label={`下移${candidates[scope].find((item) => item.id === id)?.title}`}
                      disabled={busy || index === order.length - 1}
                      onClick={() => arrow(scope, id, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground" role="status">
        {dirty ? announcement || '有未保存的布局调整。' : '当前布局已保存。'}
      </p>
    </section>
  )
}
