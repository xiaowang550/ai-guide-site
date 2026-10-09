'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus, Eye, Save, ArrowUpRight, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import { apiGet, apiSend } from './api-client'
import { notifySiteChange } from '@/lib/site-sync'
import { LayoutEditor } from './layout-editor'
import { type SiteLayout } from '@/lib/site-layout'
import {
  moduleHref,
  type PublicSiteConfig,
  type SiteModule,
  type ModuleBlock,
  type ModuleKind,
} from '@/lib/site-modules'

const labels: Record<string, string> = {
  cards: '内容卡片',
  steps: '操作步骤',
  faq: '常见问答',
  links: '资料链接',
}
const blank = (): SiteModule => ({
  id: '',
  title: '',
  description: '',
  kind: 'cards',
  enabled: false,
  home: true,
  navigation: true,
  order: 100,
  blocks: [{ title: '', text: '' }],
  version: 0,
  updatedAt: '',
})
export function ModulesView() {
  const [config, setConfig] = useState<PublicSiteConfig | null>(null),
    [editing, setEditing] = useState<SiteModule | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false),
    [previewPath, setPreviewPath] = useState('/'),
    [frameKey, setFrameKey] = useState(0),
    [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop'),
    [previewScale, setPreviewScale] = useState(1)
  const frame = useRef<HTMLIFrameElement>(null)
  const viewport = useRef<HTMLDivElement>(null)
  const previewWidth = previewDevice === 'desktop' ? 1280 : 390
  useEffect(() => {
    const element = viewport.current
    if (!element) return
    const fit = () => setPreviewScale(Math.min(1, element.clientWidth / previewWidth))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [previewWidth])
  const draftLayout = useRef<SiteLayout | null>(null)
  const previewLayout = useCallback((layout: SiteLayout) => {
    draftLayout.current = layout
    frame.current?.contentWindow?.postMessage(
      { type: 'site-layout-preview', layout },
      location.origin,
    )
  }, [])
  const load = useCallback(async () => {
    try {
      setConfig(await apiGet('/api/admin/modules'))
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [])
  useEffect(() => {
    void load()
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin === location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'site-modules-changed'
      )
        void load()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [load])
  async function act(task: () => Promise<unknown>, message: string) {
    setBusy(true)
    setError('')
    setMessage('')
    try {
      await task()
      await load()
      notifySiteChange()
      frame.current?.contentWindow?.postMessage({ type: 'site-modules-refresh' }, location.origin)
      setMessage(message)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败')
      return false
    } finally {
      setBusy(false)
    }
  }
  async function save() {
    if (!editing) return
    const { id, updatedAt, version, ...body } = editing
    void updatedAt
    const ok = await act(
      () =>
        apiSend(id ? `/api/admin/modules/${id}` : '/api/admin/modules', id ? 'PATCH' : 'POST', {
          ...body,
          ...(id ? { version } : {}),
        }),
      editing.enabled
        ? '已公开，访客刷新后即可看到；已打开页面约 5 秒同步。'
        : '草稿已保存，访客暂时看不到。',
    )
    if (ok) setEditing(null)
  }
  const updateBlock = (index: number, patch: Partial<ModuleBlock>) =>
    setEditing((current) =>
      current
        ? {
            ...current,
            blocks: current.blocks.map((block, i) =>
              i === index ? { ...block, ...patch } : block,
            ),
          }
        : null,
    )
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">前台与模块管理</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            开关栏目、添加资料与练习，直接管理访客看到的内容。
          </p>
        </div>
        <button
          className="admin-primary-button"
          onClick={() => {
            setEditing(blank())
            setError('')
            setMessage('')
          }}
        >
          <Plus className="h-4 w-4" /> 新建模块
        </button>
      </div>
      {error && (
        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-xl bg-accent p-4 text-sm" role="status">
          {message}
        </p>
      )}
      {config && (
        <LayoutEditor
          config={config}
          busy={busy}
          onPreview={previewLayout}
          onSave={(body) =>
            act(
              () => apiSend('/api/admin/layout', 'PATCH', body),
              '布局已保存，预览立即更新，访客页面最多约 5 秒自动同步。',
            )
          }
        />
      )}
      <div className="module-admin-layout">
        <section className="admin-card p-5">
          <h2 className="font-semibold">栏目开关</h2>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            关闭后隐藏入口并停止公开。管理员预览仍能查看；公开站无需登录。
          </p>
          <div className="mt-4 divide-y">
            {config?.modules.map((module) => (
              <div key={module.id} className="flex items-center gap-3 py-4">
                <button
                  className="module-switch"
                  type="button"
                  role="switch"
                  aria-checked={module.enabled}
                  aria-label={`${module.title}公开开关`}
                  disabled={busy}
                  onClick={() =>
                    void act(
                      () =>
                        apiSend(`/api/admin/modules/${module.id}`, 'PATCH', {
                          version: module.version,
                          enabled: !module.enabled,
                        }),
                      module.enabled ? '已关闭栏目。' : '已开放栏目。',
                    )
                  }
                >
                  <span />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{module.title}</p>
                  <span className="text-[11px] text-muted-foreground">
                    {module.kind === 'builtin' ? '内置栏目' : labels[module.kind]} ·{' '}
                    {module.enabled ? '已公开' : '未公开'}
                  </span>
                </div>
                <button
                  className="admin-icon-button"
                  title={`预览${module.title}`}
                  onClick={() => {
                    setPreviewPath(moduleHref(module))
                    setFrameKey((key) => key + 1)
                  }}
                >
                  <Eye className="h-4 w-4" />
                </button>
                {module.kind !== 'builtin' && (
                  <button
                    className="text-xs text-primary"
                    onClick={() => setEditing(structuredClone(module))}
                  >
                    编辑
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
        <section className="admin-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
            <h2 className="text-sm font-semibold">前台预览</h2>
            <div className="flex flex-wrap items-center gap-3">
              {(['desktop', 'mobile'] as const).map((device) => (
                <button
                  type="button"
                  key={device}
                  aria-pressed={previewDevice === device}
                  className={`min-h-11 rounded-lg px-2 text-xs ${previewDevice === device ? 'bg-accent text-primary' : 'text-muted-foreground'}`}
                  onClick={() => setPreviewDevice(device)}
                >
                  {device === 'desktop' ? '桌面' : '手机'}
                </button>
              ))}
              <button
                className="text-xs text-primary"
                onClick={() => {
                  setPreviewPath('/')
                  setFrameKey((key) => key + 1)
                }}
              >
                首页
              </button>
              <button
                className="text-xs text-primary"
                onClick={() => setFrameKey((key) => key + 1)}
              >
                刷新预览
              </button>
              <a
                href={previewPath}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground"
              >
                访客页面 <ArrowUpRight className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div ref={viewport} className="overflow-hidden">
            <div
              className="mx-auto"
              style={{ width: previewWidth * previewScale, height: 740 * previewScale }}
            >
              <iframe
                ref={frame}
                key={frameKey}
                title="管理员前台预览"
                src={`${previewPath}${previewPath.includes('?') ? '&' : '?'}admin-preview=1`}
                className="module-admin-preview"
                style={{
                  width: previewWidth,
                  height: 740,
                  transform: `scale(${previewScale})`,
                  transformOrigin: 'top left',
                }}
                onLoad={() => {
                  if (draftLayout.current) previewLayout(draftLayout.current)
                }}
              />
            </div>
          </div>
        </section>
      </div>
      {editing && (
        <section className="admin-card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{editing.id ? '编辑模块' : '创建一个内容模块'}</h2>
            <button className="text-sm text-muted-foreground" onClick={() => setEditing(null)}>
              收起
            </button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="module-field">
              标题
              <input
                maxLength={60}
                value={editing.title}
                onChange={(e) => setEditing({ ...editing, title: e.target.value })}
              />
            </label>
            <label className="module-field">
              展示方式
              <select
                value={editing.kind}
                onChange={(e) => setEditing({ ...editing, kind: e.target.value as ModuleKind })}
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="module-field md:col-span-2">
              一句话简介
              <textarea
                maxLength={240}
                rows={2}
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
              />
            </label>
            <label className="module-field">
              排序（数字越小越靠前）
              <input
                type="number"
                min={0}
                max={999}
                value={editing.order}
                onChange={(e) => setEditing({ ...editing, order: Number(e.target.value) })}
              />
            </label>
            <div className="flex flex-wrap items-center gap-5 text-sm">
              {(
                [
                  ['enabled', '公开'],
                  ['home', '展示在首页'],
                  ['navigation', '显示导航入口'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editing[key]}
                    onChange={(e) => setEditing({ ...editing, [key]: e.target.checked })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {editing.blocks.map((block, i) => (
              <div key={i} className="rounded-2xl border p-4">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>内容 {i + 1}</span>
                  <div className="ml-auto flex items-center gap-2">
                    {([-1, 1] as const).map((delta) => (
                      <button
                        key={delta}
                        className="admin-icon-button"
                        aria-label={`${delta < 0 ? '上移' : '下移'}内容 ${i + 1}`}
                        disabled={i + delta < 0 || i + delta >= editing.blocks.length}
                        onClick={() => {
                          const blocks = [...editing.blocks]
                          blocks.splice(i + delta, 0, blocks.splice(i, 1)[0])
                          setEditing({ ...editing, blocks })
                        }}
                      >
                        {delta < 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                      </button>
                    ))}
                    <button
                      title="移除内容项"
                      onClick={() =>
                        setEditing({ ...editing, blocks: editing.blocks.filter((_, j) => j !== i) })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid gap-3">
                  <label className="module-field">
                    小标题
                    <input
                      maxLength={100}
                      value={block.title}
                      onChange={(e) => updateBlock(i, { title: e.target.value })}
                    />
                  </label>
                  <label className="module-field">
                    内容
                    <textarea
                      rows={4}
                      maxLength={2500}
                      value={block.text}
                      onChange={(e) => updateBlock(i, { text: e.target.value })}
                    />
                  </label>
                  <label className="module-field">
                    资料链接（选填）
                    <input
                      placeholder="/guides/… 或 https://…"
                      value={block.href ?? ''}
                      maxLength={500}
                      onChange={(e) => updateBlock(i, { href: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <button
              className="admin-secondary-button"
              disabled={editing.blocks.length >= 12}
              onClick={() =>
                setEditing({ ...editing, blocks: [...editing.blocks, { title: '', text: '' }] })
              }
            >
              <Plus className="h-4 w-4" /> 添加内容
            </button>
            <button className="admin-primary-button" disabled={busy} onClick={() => void save()}>
              <Save className="h-4 w-4" /> 保存{editing.enabled ? '并公开' : '草稿'}
            </button>
            {editing.id && (
              <button
                className="admin-secondary-button"
                disabled={busy}
                onClick={() =>
                  void act(
                    () => apiSend(`/api/admin/modules/${editing.id}`, 'DELETE'),
                    '模块已归档，公开入口已移除。',
                  ).then((ok) => {
                    if (ok) setEditing(null)
                  })
                }
              >
                归档模块
              </button>
            )}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            关闭的模块可以继续编辑和预览；公开后无需重新构建网站。
          </p>
        </section>
      )}
    </div>
  )
}
