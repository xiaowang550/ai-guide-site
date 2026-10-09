'use client'

/**
 * 后台前端调用 API 的唯一入口。
 *
 * 为什么所有请求都从这里走，而不是各组件自己 fetch：
 *   · **会话失效要统一处理**。任何接口返回 401 就跳回登录页 ——
 *     如果每个组件各写各的，会出现「仪表盘正常、点保存却莫名失败」的割裂体验，
 *     而根因只是会话过期了。
 *   · **错误文案统一**。后端返回的 `{error}` 直接展示，不让组件自己拼「出错了」。
 *   · **CSRF 头统一**。写操作需要带 `X-Requested-With`，
 *     配合后端的 Origin 校验形成第二道防线。
 */

/** 后端返回的错误体 */
interface ApiErrorBody {
  error?: string
  issues?: { field: string; message: string }[]
  meta?: Record<string, unknown>
}

export class ApiError extends Error {
  status: number
  issues: { field: string; message: string }[]
  meta: Record<string, unknown>

  constructor(status: number, body: ApiErrorBody | null, fallback: string) {
    super(body?.error || fallback)
    this.name = 'ApiError'
    this.status = status
    this.issues = body?.issues ?? []
    this.meta = body?.meta ?? {}
  }
}

/** 会话失效时的回调，由 AdminShell 注册，用于跳回登录页 */
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn
}

async function parse<T>(res: Response): Promise<T> {
  let body: ApiErrorBody | null = null
  try {
    body = (await res.clone().json()) as ApiErrorBody
  } catch {
    body = null
  }
  if (!res.ok) {
    // 401 单独处理：这是「需要重新登录」，不是「操作失败」
    if (res.status === 401 && onUnauthorized) onUnauthorized()
    throw new ApiError(res.status, body, `请求失败（${res.status}）`)
  }
  return body as T
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { credentials: 'same-origin', cache: 'no-store', signal })
  return parse<T>(res)
}

export async function apiSend<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: {
      'content-type': 'application/json',
      // 后端只校验 Origin；这个头是给同源策略之外的第二层保险，
      // 也让浏览器 DevTools 里能一眼看出这是 XHR 而不是表单提交
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return parse<T>(res)
}

/* ── 具体接口的类型 ─────────────────────────────────────────────────────── */

export interface SessionInfo {
  authenticated: boolean
  username?: string
  role?: string
}

export interface ContentItem {
  id: string
  kind: string
  slug: string
  published_version: number | null
  published_title: string | null
  published_at: string | null
  edit_version: number
  updated_at: string
  has_draft: number
  draft_updated_at: string | null
}

export interface VersionInfo {
  version: number
  change_note: string | null
  size_bytes: number
  actor: string | null
  created_at: string
  is_published: number
  summary: string
}

export interface ContentDetail {
  item: ContentItem
  published: Record<string, unknown> | null
  draft: {
    data: Record<string, unknown>
    base_version: number | null
    note: string | null
    updated_at: string
  } | null
  versions: VersionInfo[]
}

export interface ReviewTask {
  id: string
  item_id: string | null
  kind: string
  title: string
  detail: string | null
  severity: string
  due_date: string | null
  status: string
  created_at: string
}

export interface FeedbackItem {
  id: string
  kind: string
  page_url: string | null
  contact: string | null
  message: string
  status: string
  handled_note: string | null
  created_at: string
}

export interface Dashboard {
  content: {
    total: number
    published: number
    withDraft: number
    neverPublished: number
    lastPublish: { at: string; actor: string } | null
  }
  feedback: { total: number; new: number; triaged: number; resolved: number; dismissed: number }
  review: { open: number; high: number; overdue: number; byKind: Record<string, number> }
  analytics: {
    hasData: boolean
    firstDay: string | null
    totalViews: number
    totalEvents: number
    viewsByDay: { day: string; count: number }[]
    topPages: { path: string; count: number }[]
    topEvents: { name: string; label: string; count: number }[]
  }
  privacyNote: string
}

/* ── 日期格式化 ─────────────────────────────────────────────────────────── */

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 相对时间：后台里「3 天前发布」比时间戳更容易判断该不该复核 */
export function relativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = Math.floor((now - t) / 1000)
  if (diff < 60) return '刚刚'
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`
  const days = Math.floor(diff / 86400)
  if (days < 30) return `${days} 天前`
  if (days < 365) return `${Math.floor(days / 30)} 个月前`
  return `${Math.floor(days / 365)} 年前`
}
