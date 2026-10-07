'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ApiError,
  apiGet,
  apiSend,
  formatDateTime,
  relativeTime,
  type ContentDetail,
  type ContentItem,
  type VersionInfo,
} from './api-client'

/**
 * 内容：编辑 → 预览 → 发布 → 回滚。
 *
 * 表单是 **schema 驱动**的：字段定义在 FIELD_SPECS 里，渲染逻辑统一处理。
 * 为什么不用 40 个手写输入框 —— 加一个字段要改三处（表单、初始化、提交），
 * 迟早会漏掉某一处，而漏掉的症状是「改了没生效」或「存进去是空的」。
 * schema 驱动之后，加字段只改 FIELD_SPECS 一行。
 *
 * 底层仍然是 JSON：表单改不到的字段（multimodal、platforms 等结构化字段）
 * 走「高级编辑」里的原始 JSON，改完由服务端的 validateToolContent 校验。
 * 猜一个能覆盖全部字段的表单是不现实的，与其做个半吊子 UI，
 * 不如把 JSON 入口如实摆出来。
 */

/** 单个可编辑字段的描述 */
type FieldSpec = {
  key: string
  label: string
  /** text=单行； textarea=多行； lines=每行一项的列表； bool=开关； number=数字 */
  type: 'text' | 'textarea' | 'lines' | 'bool' | 'number'
  hint?: string
  max?: number
}

const FIELD_SPECS: FieldSpec[] = [
  {
    key: 'id',
    label: 'id / slug',
    type: 'text',
    max: 40,
    hint: '站内唯一标识，用小写字母与连字符。新建条目时这一项决定条目 id，之后不要再改。',
  },
  { key: 'name', label: '名称', type: 'text', max: 40 },
  { key: 'nameEn', label: '英文名', type: 'text', max: 60 },
  { key: 'vendor', label: '厂商 / 团队', type: 'text', max: 40 },
  { key: 'tagline', label: '一句话定位', type: 'text', max: 60, hint: '工具详情页标题下方那一句' },
  { key: 'description', label: '介绍', type: 'textarea', hint: '2-3 句，至少 20 字' },
  { key: 'strengths', label: '强项（每行一条，3-5 条）', type: 'lines' },
  { key: 'weaknesses', label: '弱项（每行一条，3-5 条）', type: 'lines', hint: '必须诚实写，这是本站的立足点' },
  { key: 'avoidFor', label: '别用它做（每行一条，3 条）', type: 'lines' },
  { key: 'bestFor', label: '最适合（每行一条，3 条）', type: 'lines' },
  {
    key: 'evidence',
    label: '评分方法说明',
    type: 'textarea',
    hint: '本站不做自建评测。写清依据来自官方公开资料 / 能力边界判断 / 社区共识，以及什么情况下这个分数不再成立。',
  },
  { key: 'contextWindow', label: '上下文窗口', type: 'text', max: 40 },
  { key: 'hallucinationRisk', label: '幻觉风险', type: 'text', max: 10, hint: 'low / medium / high' },
  { key: 'latency', label: '响应速度', type: 'text', max: 10, hint: 'fast / medium / slow' },
  { key: 'stability', label: '稳定性', type: 'text', max: 10, hint: 'high / medium / low' },
  { key: 'chinaAccessible', label: '大陆可直连', type: 'bool' },
  { key: 'hasApi', label: '有官方 API', type: 'bool' },
  { key: 'alternatives', label: '替代品 id（逗号分隔）', type: 'text', hint: '不能包含自己' },
]

const CAPABILITY_LABELS: Record<string, string> = {
  writing: '写作表达',
  longform: '长文理解',
  reasoning: '逻辑推理',
  math: '数理计算',
  coding: '编程开发',
  research: '联网研究',
  agent: '任务自动化',
  data: '数据分析',
  office: '办公产出',
  imageGen: '图像生成',
  vision: '图像理解',
  video: '视频生成',
  voice: '语音音乐',
  realtime: '实时交互',
}

type Draft = Record<string, unknown>

function getPath(obj: Draft, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[k]
    return undefined
  }, obj)
}

function setPath(obj: Draft, path: string, value: unknown): Draft {
  const keys = path.split('.')
  const out: Draft = { ...obj }
  let cur: Record<string, unknown> = out
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    const next = cur[k]
    cur[k] = typeof next === 'object' && next !== null ? { ...(next as object) } : {}
    cur = cur[k] as Record<string, unknown>
  }
  cur[keys[keys.length - 1]] = value
  return out
}

export function ContentView() {
  const [items, setItems] = useState<ContentItem[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [detail, setDetail] = useState<ContentDetail | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [jsonMode, setJsonMode] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [panel, setPanel] = useState<'edit' | 'preview' | 'history'>('edit')
  const [changeNote, setChangeNote] = useState('')
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)
  const [issues, setIssues] = useState<{ field: string; message: string }[]>([])
  const [busy, setBusy] = useState(false)

  const loadItems = useCallback(async () => {
    try {
      const res = await apiGet<{ items: ContentItem[] }>('/api/admin/content')
      setItems(res.items)
      return res.items
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof ApiError ? e.message : '加载失败' })
      return []
    }
  }, [])

  const loadDetail = useCallback(async (itemId: string) => {
    try {
      const res = await apiGet<ContentDetail>(`/api/admin/content/${encodeURIComponent(itemId)}`)
      setDetail(res)
      // 打开时优先显示未发布草稿（那是上次没发完的编辑），否则显示已发布内容
      const initial = res.draft?.data ?? res.published
      setDraft(initial ? { ...initial } : null)
      setJsonText(initial ? JSON.stringify(initial, null, 2) : '{}')
      return res
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof ApiError ? e.message : '加载失败' })
      return null
    }
  }, [])

  useEffect(() => {
    void loadItems().then((list) => {
      if (list.length > 0 && !selected) setSelected(list[0].id)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selected) void loadDetail(selected)
  }, [selected, loadDetail])

  async function saveDraft() {
    if (!draft) return
    // 新建条目时 selected 还是 null，条目 id 由 slug（即 id 字段）推导。
    // 否则「新建一条」永远存不进去 —— 这是第一版里的真实 bug：
    // saveDraft 开头就要求 selected，而新建路径根本没设它。
    const slug = (detail?.item.slug ?? (typeof draft.id === 'string' ? draft.id : '')).trim()
    const itemId = selected ?? (slug ? `tool:${slug}` : null)
    if (!itemId) {
      setMsg({ kind: 'err', text: '新建条目需要先填好「名称」下方的 id 字段（用它作为 slug）。' })
      return
    }

    setBusy(true)
    setIssues([])
    try {
      const payload = jsonMode ? parseJsonText() : draft
      await apiSend(`/api/admin/content/${encodeURIComponent(itemId)}/draft`, 'PUT', {
        kind: detail?.item.kind ?? 'tool',
        slug,
        data: payload,
        // 只有已存在的条目才做乐观锁；新建时没有 edit_version
        expectedEditVersion: detail ? detail.item.edit_version : undefined,
      })
      // 重新载入放在提示之前：先刷新视图再告诉用户「好了」，
      // 否则会出现「已保存」与预览内容对不上的窗口 ——
      // 用户可能在陈旧预览上就点了发布。
      await loadDetail(itemId)
      await loadItems()
      setSelected(itemId)
      setPanel('preview')
      setMsg({ kind: 'ok', text: '草稿已保存。草稿不会出现在公开站，需要点「发布」。' })
    } catch (e) {
      if (e instanceof ApiError) {
        setIssues(e.issues)
        setMsg({ kind: 'err', text: e.message })
      } else {
        setMsg({ kind: 'err', text: '保存失败' })
      }
    } finally {
      setBusy(false)
    }
  }

  function parseJsonText(): Draft {
    try {
      return JSON.parse(jsonText) as Draft
    } catch {
      throw new ApiError(400, null, 'JSON 格式不对，请检查引号与逗号。')
    }
  }

  async function publish() {
    const itemId = selected ?? (draft ? `tool:${draft.id}` : null)
    if (!itemId) {
      setMsg({ kind: 'err', text: '请先选择或保存一条内容。' })
      return
    }
    setBusy(true)
    setIssues([])
    try {
      const res = await apiSend<{ version: number }>(
        `/api/admin/content/${encodeURIComponent(itemId)}/publish`,
        'POST',
        { changeNote }
      )
      setChangeNote('')
      await loadDetail(itemId)
      await loadItems()
      setSelected(itemId)
      setPanel('history')
      setMsg({
        kind: 'ok',
        text: `已发布为第 ${res.version} 版。公开站会在下次构建时更新（Cloudflare 上约 2-4 分钟）。`,
      })
    } catch (e) {
      if (e instanceof ApiError) {
        setIssues(e.issues)
        setMsg({ kind: 'err', text: e.message })
      } else {
        setMsg({ kind: 'err', text: '发布失败' })
      }
    } finally {
      setBusy(false)
    }
  }

  async function rollback(version: number) {
    if (!selected) return
    if (!confirm(`确定恢复到第 ${version} 版？\n\n历史不会丢失，只是把「当前发布的是哪一版」指回去。`)) return
    setBusy(true)
    try {
      await apiSend(`/api/admin/content/${encodeURIComponent(selected)}/rollback`, 'POST', {
        version,
        reason: '后台手动恢复',
      })
      setMsg({ kind: 'ok', text: `已恢复到第 ${version} 版。公开站会在下次构建时更新。` })
      await loadDetail(selected)
      await loadItems()
    } catch (e) {
      setMsg({ kind: 'err', text: e instanceof ApiError ? e.message : '恢复失败' })
    } finally {
      setBusy(false)
    }
  }

  async function discardDraft() {
    if (!selected || !confirm('丢弃当前草稿？已发布的内容不受影响。')) return
    await apiSend(`/api/admin/content/${encodeURIComponent(selected)}/draft`, 'DELETE')
    setMsg({ kind: 'ok', text: '草稿已丢弃。' })
    await loadDetail(selected)
    await loadItems()
  }

  const caps = (draft?.capabilities ?? {}) as Record<string, { score?: number; basis?: string }>

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* 列表 */}
      <aside>
        <h2 className="text-sm font-semibold">条目</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          这里只有后台改动过的内容。仓库里的基线数据不算在内 ——
          需要编辑任何一条，先在下面选它并保存草稿。
        </p>
        <button
          type="button"
          className="mt-2 w-full rounded border border-dashed border-hairline px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={async () => {
            setSelected(null)
            setDetail(null)
            setDraft({
              id: '',
              name: '新工具',
              nameEn: '',
              vendor: '',
              logo: '/logos/placeholder.svg',
              tagline: '一句话定位',
              description: '',
              tags: [],
              strengths: ['', '', ''],
              weaknesses: ['', '', ''],
              avoidFor: ['', '', ''],
              bestFor: ['', '', ''],
              capabilities: Object.fromEntries(
                Object.keys(CAPABILITY_LABELS).map((k) => [k, { score: 3, basis: '' }])
              ),
              chinaAccessible: true,
              hasApi: false,
              pricing: { model: 'freemium', freeTier: '' },
              platforms: ['web'],
              alternatives: [],
            })
            setPanel('edit')
          }}
        >
          + 新建一条
        </button>

        <ul className="mt-3 space-y-1">
          {(items ?? []).map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => setSelected(it.id)}
                className={
                  selected === it.id
                    ? 'w-full rounded border border-primary/40 bg-primary/5 px-2 py-1.5 text-left text-sm'
                    : 'w-full rounded border border-hairline px-2 py-1.5 text-left text-sm hover:bg-muted'
                }
              >
                <span className="block truncate font-medium">{it.published_title ?? it.slug}</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  {it.published_version !== null ? `v${it.published_version}` : '未发布'}
                  {it.has_draft ? ' · 有草稿' : ''}
                  {it.published_at ? ` · ${relativeTime(it.published_at)}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {items?.length === 0 ? (
          <p className="mt-3 rounded border border-dashed border-hairline px-2 py-2 text-xs leading-5 text-muted-foreground">
            还没有任何内容。运行 <code>npm run admin:seed</code> 迁移基线数据，或点上面的「新建一条」。
          </p>
        ) : null}
      </aside>

      {/* 详情 */}
      <section>
        {!selected && !draft ? (
          <p className="text-sm text-muted-foreground">从左边选一条，或新建一条。</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-hairline pb-2">
              {(['edit', 'preview', 'history'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPanel(p)}
                  className={
                    panel === p
                      ? 'border-b-2 border-primary px-2 py-1 text-sm font-medium'
                      : 'border-b-2 border-transparent px-2 py-1 text-sm text-muted-foreground hover:text-foreground'
                  }
                >
                  {p === 'edit' ? '编辑' : p === 'preview' ? '预览' : '历史版本'}
                </button>
              ))}
              <span className="flex-1" />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={jsonMode}
                  onChange={(e) => {
                    setJsonMode(e.target.checked)
                    if (e.target.checked && draft) setJsonText(JSON.stringify(draft, null, 2))
                  }}
                />
                高级编辑（原始 JSON）
              </label>
            </div>

            {msg ? (
              <p
                className={
                  msg.kind === 'ok'
                    ? 'mt-3 rounded border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm'
                    : 'mt-3 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm'
                }
              >
                {msg.text}
              </p>
            ) : null}

            {issues.length > 0 ? (
              <ul className="mt-3 space-y-1 rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs">
                {issues.map((i, idx) => (
                  <li key={idx}>
                    <span className="font-medium">{i.field || '(整体)'}</span>：{i.message}
                  </li>
                ))}
              </ul>
            ) : null}

            {/* 编辑 */}
            {panel === 'edit' ? (
              <div className="mt-4">
                {jsonMode ? (
                  <div>
                    <p className="mb-1.5 text-xs text-muted-foreground">
                      直接编辑完整 JSON。改错了会在保存时被校验拦下，不会写进库。
                    </p>
                    <textarea
                      value={jsonText}
                      onChange={(e) => setJsonText(e.target.value)}
                      spellCheck={false}
                      className="h-[28rem] w-full rounded border border-hairline bg-background p-2 font-mono text-xs outline-none focus:border-primary"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {FIELD_SPECS.map((f) => (
                        <FieldInput
                          key={f.key}
                          spec={f}
                          value={getPath(draft ?? {}, f.key)}
                          onChange={(v) => setDraft((d) => (d ? setPath(d, f.key, v) : d))}
                        />
                      ))}
                    </div>

                    <div>
                      <h3 className="text-sm font-medium">14 维能力评分</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        ≥4 分或 ≤2 分的维度必须写依据，否则复核待办会一直提醒你。
                      </p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {Object.keys(CAPABILITY_LABELS).map((k) => {
                          const cap = caps[k] ?? { score: 3, basis: '' }
                          const needsBasis = (cap.score ?? 0) >= 4 || (cap.score ?? 0) <= 2
                          return (
                            <div key={k} className="rounded border border-hairline px-2 py-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium">{CAPABILITY_LABELS[k]}</span>
                                <input
                                  type="number"
                                  min={0}
                                  max={5}
                                  step={1}
                                  value={cap.score ?? 3}
                                  onChange={(e) =>
                                    setDraft((d) =>
                                      d
                                        ? setPath(d, `capabilities.${k}.score`, Number(e.target.value))
                                        : d
                                    )
                                  }
                                  className="w-14 rounded border border-hairline bg-background px-1.5 py-0.5 text-xs tabular-nums"
                                />
                              </div>
                              <input
                                value={cap.basis ?? ''}
                                onChange={(e) =>
                                  setDraft((d) =>
                                    d ? setPath(d, `capabilities.${k}.basis`, e.target.value) : d
                                  )
                                }
                                placeholder={needsBasis ? '这一档需要写依据' : '依据（可留空）'}
                                className={
                                  needsBasis && !(cap.basis ?? '').trim()
                                    ? 'mt-1 w-full rounded border border-amber-500/50 bg-background px-1.5 py-0.5 text-[11px]'
                                    : 'mt-1 w-full rounded border border-hairline bg-background px-1.5 py-0.5 text-[11px]'
                                }
                              />
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium">免费额度</h3>
                      <input
                        value={(getPath(draft ?? {}, 'pricing.freeTier') as string) ?? ''}
                        onChange={(e) =>
                          setDraft((d) => (d ? setPath(d, 'pricing.freeTier', e.target.value) : d))
                        }
                        placeholder="例如：每月 5 次免费对话"
                        className="mt-1 w-full rounded border border-hairline bg-background px-2 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                  <button
                    onClick={() => void saveDraft()}
                    disabled={busy || !draft}
                    className="rounded bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    保存草稿
                  </button>
                  {detail?.draft ? (
                    <button
                      onClick={() => void discardDraft()}
                      className="rounded border border-hairline px-3 py-1.5 text-sm"
                    >
                      丢弃草稿
                    </button>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    保存草稿后可预览，确认无误再发布。草稿永远不会出现在公开站。
                  </p>
                </div>
              </div>
            ) : null}

            {/* 预览 */}
            {panel === 'preview' ? (
              <div className="mt-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-64 flex-1">
                    <label className="block text-xs font-medium">本次改动的说明（会写进版本历史）</label>
                    <input
                      value={changeNote}
                      onChange={(e) => setChangeNote(e.target.value)}
                      placeholder="例如：修正免费额度，补写 coding 维度依据"
                      className="mt-1 w-full rounded border border-hairline bg-background px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    onClick={() => void publish()}
                    disabled={busy || !detail?.draft}
                    className="rounded bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    发布
                  </button>
                </div>
                {!detail?.draft ? (
                  <p className="mt-3 rounded border border-dashed border-hairline px-3 py-3 text-sm text-muted-foreground">
                    当前没有待发布的草稿。先在「编辑」里保存一次。
                  </p>
                ) : null}

                <PreviewBlock title="将要发布的内容（草稿）" data={detail?.draft?.data ?? null} />
                <PreviewBlock title="当前线上版本" data={detail?.published ?? null} />
                <DiffBlock before={detail?.published ?? null} after={detail?.draft?.data ?? null} />
              </div>
            ) : null}

            {/* 历史 */}
            {panel === 'history' ? (
              <div className="mt-4">
                <p className="text-xs text-muted-foreground">
                  每一版都是不可变的完整快照。「恢复」不会删掉任何历史，只是把当前发布的版本指回去。
                </p>
                <ul className="mt-3 divide-y divide-hairline border-y border-hairline">
                  {(detail?.versions ?? []).map((v: VersionInfo) => (
                    <li key={v.version} className="flex flex-wrap items-center gap-3 py-2.5">
                      <span className="w-10 shrink-0 text-sm font-medium tabular-nums">v{v.version}</span>
                      <span className="min-w-40 flex-1">
                        <span className="block text-sm">{v.change_note || '（没有填写说明）'}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">
                          {v.summary} · {formatDateTime(v.created_at)}
                          {v.actor ? ` · ${v.actor}` : ''}
                        </span>
                      </span>
                      {v.is_published === 1 ? (
                        <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] text-emerald-700 dark:text-emerald-300">
                          当前线上
                        </span>
                      ) : (
                        <button
                          onClick={() => void rollback(v.version)}
                          disabled={busy}
                          className="rounded border border-hairline px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          恢复这一版
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {detail?.versions.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">还没有任何版本。</p>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

/* ── 表单控件 ───────────────────────────────────────────────────────────── */

function FieldInput({
  spec,
  value,
  onChange,
}: {
  spec: FieldSpec
  value: unknown
  onChange: (v: unknown) => void
}) {
  const cls = 'mt-1 w-full rounded border border-hairline bg-background px-2 py-1.5 text-sm outline-none focus:border-primary'

  if (spec.type === 'bool') {
    return (
      <label className="flex items-center gap-2 pt-5 text-sm">
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        {spec.label}
      </label>
    )
  }

  if (spec.type === 'lines') {
    const list = Array.isArray(value) ? (value as string[]) : []
    return (
      <div className={spec.key === 'description' || spec.key === 'evidence' ? 'sm:col-span-2' : 'sm:col-span-2'}>
        <label className="block text-xs font-medium">{spec.label}</label>
        {spec.hint ? <p className="text-[11px] text-muted-foreground">{spec.hint}</p> : null}
        <textarea
          value={list.join('\n')}
          onChange={(e) => onChange(e.target.value.split('\n'))}
          rows={Math.max(3, list.length + 1)}
          className={cls}
        />
      </div>
    )
  }

  if (spec.type === 'textarea') {
    return (
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium">{spec.label}</label>
        {spec.hint ? <p className="text-[11px] text-muted-foreground">{spec.hint}</p> : null}
        <textarea
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={cls}
        />
      </div>
    )
  }

  return (
    <div>
      <label className="block text-xs font-medium">{spec.label}</label>
      {spec.hint ? <p className="text-[11px] text-muted-foreground">{spec.hint}</p> : null}
      <input
        type={spec.type === 'number' ? 'number' : 'text'}
        value={value === undefined || value === null ? '' : String(value)}
        maxLength={spec.max}
        onChange={(e) =>
          onChange(spec.key === 'alternatives' ? e.target.value.split(',').map((s) => s.trim()).filter(Boolean) : e.target.value)
        }
        className={cls}
      />
    </div>
  )
}

/* ── 预览与差异 ─────────────────────────────────────────────────────────── */

function PreviewBlock({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  return (
    <div className="mt-4">
      <h3 className="text-xs font-medium">{title}</h3>
      <pre className="mt-1 max-h-64 overflow-auto rounded border border-hairline bg-muted/30 p-2 text-[11px] leading-5">
        {data ? JSON.stringify(data, null, 2) : '（无）'}
      </pre>
    </div>
  )
}

/** 逐字段对比，让「这一版到底改了什么」在发布前就看得见 */
function DiffBlock({
  before,
  after,
}: {
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
}) {
  const changes = useMemo(() => computeDiff(before, after), [before, after])
  if (changes.length === 0) {
    return (
      <p className="mt-4 rounded border border-dashed border-hairline px-3 py-2 text-xs text-muted-foreground">
        草稿与线上版本没有差异。
      </p>
    )
  }
  return (
    <div className="mt-4">
      <h3 className="text-xs font-medium">本次会改动 {changes.length} 个字段</h3>
      <ul className="mt-1.5 space-y-1 text-xs">
        {changes.map((c, i) => (
          <li key={i} className="rounded border border-hairline px-2 py-1">
            <span className="font-medium">{c.path}</span>
            <div className="mt-0.5 text-muted-foreground">
              <span className="text-red-600 line-through dark:text-red-400">{trunc(c.before)}</span>
              <span className="mx-1.5">→</span>
              <span className="text-emerald-700 dark:text-emerald-300">{trunc(c.after)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function trunc(v: unknown): string {
  if (v === undefined) return '（无）'
  const s = typeof v === 'string' ? v : JSON.stringify(v)
  return s.length > 120 ? s.slice(0, 120) + '…' : s
}

/**
 * 前端侧的轻量 diff，只用于展示；服务端另有一份带深度上限的实现。
 *
 * 要跳过两类字段，否则差异块里全是噪音：
 *   · updatedAt    —— 每次发布由服务端注入，属于版本元信息
 *   · overallScore —— 派生字段，公开站按 14 维加权重算，保存时会被丢弃。
 *                     不跳过的话每次保存都会显示一条「综合分被清空」的假变更，
 *                     管理员会以为自己弄坏了数据。
 */
function computeDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): { path: string; before: unknown; after: unknown }[] {
  const SKIP = new Set(['updatedAt', 'overallScore'])
  const out: { path: string; before: unknown; after: unknown }[] = []
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])
  for (const k of [...keys].sort()) {
    if (SKIP.has(k)) continue
    const b = before?.[k]
    const a = after?.[k]
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    out.push({ path: k, before: b, after: a })
  }
  return out
}
