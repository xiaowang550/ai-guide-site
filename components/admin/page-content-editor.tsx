'use client'
import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Copy, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { PAGE_REGIONS, mergedRegions } from '@/lib/module-registry'
import {
  moduleAudience,
  moduleHref,
  type PageRegion,
  type PublicSiteConfig,
} from '@/lib/site-modules'

const kinds = { cards: '卡片', steps: '步骤', faq: '问答', links: '链接' }
export function PageContentEditor({
  config,
  audience,
  busy,
  onSave,
  onPreview,
}: {
  config: PublicSiteConfig
  audience: 'public' | 'school'
  busy: boolean
  onSave: (id: string, version: number, regions: PageRegion[]) => Promise<boolean>
  onPreview: (href: string) => void
}) {
  const pages = config.modules.filter((m) => moduleAudience(m) === audience && PAGE_REGIONS[m.id])
  const [pageId, setPageId] = useState(audience === 'school' ? 'school' : 'home')
  const pageModule = pages.find((m) => m.id === pageId) ?? pages[0]
  const [regions, setRegions] = useState<PageRegion[]>([]),
    [version, setVersion] = useState(0)
  const [dirty, setDirty] = useState(false),
    [expanded, setExpanded] = useState('')
  const [query, setQuery] = useState(''),
    [filter, setFilter] = useState<'all' | 'hidden' | 'deleted'>('all')
  useEffect(() => {
    if (!pageModule || dirty) return
    const merged = mergedRegions(pageModule.id, pageModule.regions)
    if (pageModule.id === 'home' && !pageModule.regions) {
      const order = [...new Set([...config.layout.home, ...merged.map((region) => region.id)])]
      merged.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
      setRegions(merged.map((r) => ({ ...r, enabled: !config.layout.hiddenHome.includes(r.id) })))
    } else setRegions(merged)
    setVersion(pageModule.version)
  }, [pageModule, dirty, config.layout])
  if (!pageModule) return null
  const update = (next: PageRegion[]) => {
    setRegions(next)
    setDirty(true)
  }
  const patch = (id: string, value: Partial<PageRegion>) =>
    update(regions.map((r) => (r.id === id ? { ...r, ...value } : r)))
  function move(id: string, delta: number) {
    const next = [...regions],
      i = next.findIndex((r) => r.id === id),
      j = i + delta
    if (j < 0 || j >= next.length) return
    next.splice(j, 0, next.splice(i, 1)[0])
    update(next)
  }
  function edit(region: PageRegion) {
    const defaults = PAGE_REGIONS[pageModule!.id].find((r) => r.id === region.id)?.items
    if (region.blocks === undefined && defaults)
      patch(region.id, { blocks: structuredClone(defaults) })
    setExpanded(expanded === region.id ? '' : region.id)
  }
  return (
    <section className="admin-card p-5" aria-label="页面内容管理">
      <fieldset disabled={busy} className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">页面内容管理</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              选择页面，编辑区块和内容项。筛选、对话等功能区可以移动或隐藏，保留原有操作。
            </p>
          </div>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => onPreview(moduleHref(pageModule))}
          >
            预览这个页面
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="module-field">
            选择页面
            <select
              aria-label="选择页面"
              value={pageModule.id}
              disabled={dirty || busy}
              onChange={(e) => {
                setPageId(e.target.value)
                setExpanded('')
                setQuery('')
                setFilter('all')
              }}
            >
              {pages.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </label>
          <label className="module-field">
            查找区块或内容
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="输入标题或内容"
            />
          </label>
        </div>
        <div className="my-4 flex flex-wrap items-center gap-2">
          {(['all', 'hidden', 'deleted'] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              className={`min-h-11 rounded-lg px-3 text-sm ${filter === f ? 'bg-accent text-primary' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部区块' : f === 'hidden' ? '已隐藏' : '已删除'}
            </button>
          ))}
          <button
            type="button"
            className="admin-secondary-button ml-auto"
            disabled={busy || regions.length >= 40}
            onClick={() => {
              const id = crypto.randomUUID()
              update([
                ...regions,
                {
                  id,
                  title: '新内容区块',
                  description: '',
                  kind: 'cards',
                  enabled: true,
                  blocks: [{ id: crypto.randomUUID(), title: '新内容', text: '', enabled: true }],
                },
              ])
              setExpanded(id)
              setFilter('all')
              setQuery('')
            }}
          >
            <Plus size={16} />
            新增区块
          </button>
        </div>
        <div className="space-y-3">
          {regions
            .filter((r) =>
              filter === 'deleted' ? r.deleted : !r.deleted && (filter !== 'hidden' || !r.enabled),
            )
            .filter((r) =>
              `${r.title} ${r.description} ${(r.blocks ?? PAGE_REGIONS[pageModule.id].find((definition) => definition.id === r.id)?.items ?? []).map((b) => b.title + b.text).join(' ')}`
                .toLocaleLowerCase()
                .includes(query.trim().toLocaleLowerCase()),
            )
            .map((region) => {
              const definition = PAGE_REGIONS[pageModule.id].find((r) => r.id === region.id)
              const editable = region.kind !== 'native' || !!definition?.items
              return (
                <article
                  key={region.id}
                  className="rounded-xl border p-4"
                  aria-label={`区块：${region.title}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="min-w-0 flex-1 break-words text-sm">{region.title}</strong>
                    <span className="text-xs text-muted-foreground">
                      {definition?.nested
                        ? '页面内侧栏 / 卡片组'
                        : region.kind === 'native'
                          ? '原有区块'
                          : kinds[region.kind]}
                    </span>
                    {region.deleted ? (
                      <button
                        type="button"
                        className="admin-secondary-button"
                        onClick={() => patch(region.id, { deleted: false, enabled: true })}
                      >
                        <RotateCcw size={16} />
                        恢复
                      </button>
                    ) : (
                      <>
                        <label className="flex min-h-11 items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            aria-label={`显示${region.title}`}
                            checked={region.enabled}
                            disabled={busy}
                            onChange={(e) => patch(region.id, { enabled: e.target.checked })}
                          />
                          显示
                        </label>
                        {[-1, 1].map((delta) => (
                          <button
                            key={delta}
                            type="button"
                            className="admin-icon-button"
                            aria-label={`${delta < 0 ? '上移' : '下移'}区块${region.title}`}
                            disabled={
                              busy ||
                              !!definition?.nested ||
                              regions.indexOf(region) + delta < 0 ||
                              regions.indexOf(region) + delta >= regions.length
                            }
                            onClick={() => move(region.id, delta)}
                          >
                            {delta < 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                          </button>
                        ))}
                        {editable && (
                          <button
                            type="button"
                            className="admin-secondary-button"
                            aria-expanded={expanded === region.id}
                            disabled={busy}
                            onClick={() => edit(region)}
                          >
                            {expanded === region.id ? '收起' : '编辑内容'}
                          </button>
                        )}
                        <button
                          type="button"
                          className="admin-icon-button"
                          aria-label={`删除区块${region.title}`}
                          disabled={busy}
                          onClick={() => patch(region.id, { deleted: true, enabled: false })}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                  {expanded === region.id && !region.deleted && editable && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="module-field">
                          区块标题
                          <input
                            maxLength={100}
                            value={region.title}
                            onChange={(e) => patch(region.id, { title: e.target.value })}
                          />
                        </label>
                        {region.kind !== 'native' && (
                          <label className="module-field">
                            展示方式
                            <select
                              aria-label="展示方式"
                              value={region.kind}
                              onChange={(e) =>
                                patch(region.id, { kind: e.target.value as PageRegion['kind'] })
                              }
                            >
                              {Object.entries(kinds).map(([key, label]) => (
                                <option key={key} value={key}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label className="module-field sm:col-span-2">
                          简介（选填）
                          <input
                            maxLength={240}
                            value={region.description}
                            onChange={(e) => patch(region.id, { description: e.target.value })}
                          />
                        </label>
                      </div>
                      {(region.blocks ?? []).map((block, i) => {
                        const blocks = region.blocks ?? []
                        const change = (value: Partial<typeof block>) =>
                          patch(region.id, {
                            blocks: blocks.map((b, j) => (j === i ? { ...b, ...value } : b)),
                          })
                        return (
                          <fieldset key={block.id} className="rounded-xl bg-muted/30 p-4">
                            <legend className="px-2 text-xs">内容 {i + 1}</legend>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <label className="mr-auto flex min-h-11 items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={block.enabled !== false}
                                  aria-label={`显示内容${i + 1}`}
                                  onChange={(e) => change({ enabled: e.target.checked })}
                                />
                                显示
                              </label>
                              {[-1, 1].map((delta) => (
                                <button
                                  key={delta}
                                  type="button"
                                  className="admin-icon-button"
                                  aria-label={`${delta < 0 ? '上移' : '下移'}内容${i + 1}`}
                                  disabled={i + delta < 0 || i + delta >= blocks.length}
                                  onClick={() => {
                                    const next = [...blocks]
                                    next.splice(i + delta, 0, next.splice(i, 1)[0])
                                    patch(region.id, { blocks: next })
                                  }}
                                >
                                  {delta < 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                                </button>
                              ))}
                              <button
                                type="button"
                                className="admin-icon-button"
                                aria-label={`复制内容${i + 1}`}
                                disabled={blocks.length >= 30}
                                onClick={() =>
                                  patch(region.id, {
                                    blocks: [
                                      ...blocks.slice(0, i + 1),
                                      {
                                        ...block,
                                        id: crypto.randomUUID(),
                                        title: `${block.title.slice(0, 95)} 副本`,
                                      },
                                      ...blocks.slice(i + 1),
                                    ],
                                  })
                                }
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                type="button"
                                className="admin-icon-button"
                                aria-label={`删除内容${i + 1}`}
                                onClick={() =>
                                  patch(region.id, { blocks: blocks.filter((_, j) => j !== i) })
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                            <div className="grid gap-3">
                              <label className="module-field">
                                内容标题
                                <input
                                  maxLength={100}
                                  value={block.title}
                                  onChange={(e) => change({ title: e.target.value })}
                                />
                              </label>
                              <label className="module-field">
                                正文
                                <textarea
                                  rows={3}
                                  maxLength={2500}
                                  value={block.text}
                                  onChange={(e) => change({ text: e.target.value })}
                                />
                              </label>
                              <label className="module-field">
                                链接（选填）
                                <input
                                  maxLength={500}
                                  value={block.href ?? ''}
                                  placeholder="/guides/… 或 https://…"
                                  onChange={(e) => change({ href: e.target.value })}
                                />
                              </label>
                            </div>
                          </fieldset>
                        )
                      })}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          className="admin-secondary-button"
                          disabled={(region.blocks?.length ?? 0) >= 30}
                          onClick={() =>
                            patch(region.id, {
                              blocks: [
                                ...(region.blocks ?? []),
                                {
                                  id: crypto.randomUUID(),
                                  title: '新内容',
                                  text: '',
                                  enabled: true,
                                },
                              ],
                            })
                          }
                        >
                          <Plus size={16} />
                          添加内容项
                        </button>
                        {definition?.items && (
                          <button
                            type="button"
                            className="admin-secondary-button"
                            onClick={() => {
                              const { blocks: _blocks, ...rest } = region
                              void _blocks
                              update(
                                regions.map((r) =>
                                  r.id === region.id
                                    ? { ...rest, title: definition.title, description: '' }
                                    : r,
                                ),
                              )
                              setExpanded('')
                            }}
                          >
                            恢复原始内容
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
        </div>
        {pageModule.version !== version && dirty && (
          <p className="mt-4 text-sm" role="alert">
            页面已在其他窗口更新。请放弃本次修改后重新编辑，避免覆盖他人的内容。
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t pt-4">
          <button
            type="button"
            className="admin-primary-button"
            disabled={busy || !dirty || version !== pageModule.version}
            onClick={async () => {
              if (await onSave(pageModule.id, version, regions)) setDirty(false)
            }}
          >
            <Save size={16} />
            保存页面内容
          </button>
          <button
            type="button"
            className="admin-secondary-button"
            disabled={busy || !dirty}
            onClick={() => {
              setDirty(false)
              setExpanded('')
            }}
          >
            放弃修改
          </button>
          <span className="text-xs text-muted-foreground">
            {dirty
              ? '有未保存的修改；保存或放弃后可切换页面。'
              : '已保存。可在右侧预览，或打开网站查看。'}
          </span>
        </div>
      </fieldset>
    </section>
  )
}
