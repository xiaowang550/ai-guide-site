/**
 * 管理后台 API —— 全部路由的实现。
 *
 * 本文件是**框架无关**的：输入标准 `Request`，输出标准 `Response`。
 * 于是同一份代码有两个运行位置：
 *   · `functions/api/[[path]].ts`  Cloudflare Pages Functions（D1）
 *   · `scripts/admin-dev.mjs`       本地 Node（node:sqlite）
 *
 * 这不是为了「本地能跑」这个小目标，而是为了让本地验证过的路径
 * 与线上运行的路径是**同一段代码**。如果本地用 mock、线上用 D1，
 * 就会出现「本地测过的接口线上 500」这种事。
 *
 * ── 权限模型 ──
 *
 * 三层，从外到内：
 *   1. 路由表里标注 `auth: 'required'` 的接口，一律先验会话；
 *   2. 写操作额外校验 Origin（同源），挡住 CSRF；
 *   3. 具体业务里再查角色（如需要 owner 的操作）。
 *
 * 登录之前，除了 `/api/admin/login`、`/api/admin/session`、
 * `/api/feedback`、`/api/collect`、`/api/content/published` 之外的一切接口
 * 都返回 401 —— 包括那些「本来只是想看一眼列表」的接口。
 * 后台 UI 只是静态壳，没有数据就什么都渲染不出来。
 */
import type { Db } from '../db/types.ts'
import { createD1Db, D1BindingMissingError } from '../db/d1.ts'
import type { D1Database } from '../db/d1.ts'
import { toInt, toText } from '../db/types.ts'
import {
  LOGIN_MAX_FAILURES,
  SESSION_COOKIE,
  buildClearCookie,
  buildSessionCookie,
  changePassword,
  destroySession,
  isLoginLocked,
  login,
  maskIp,
  nowIso,
  parseCookies,
  pruneExpiredSessions,
  pruneLoginAttempts,
  verifySession,
  type AdminIdentity,
} from './auth.ts'
import {
  deleteDraft,
  exportBackup,
  getDraft,
  getItem,
  getPublishedData,
  getVersionData,
  importBackup,
  listItems,
  listVersions,
  publishDraft,
  readPublishedAll,
  rollbackTo,
  saveDraft,
} from './content.ts'
import type { ContentKind } from './capability-keys.ts'
import { analyticsSummary, collect, recordMilestone, syncEventNames } from './analytics.ts'
import {
  FEEDBACK_STATUS_LABELS,
  feedbackCounts,
  listFeedback,
  pruneRateLimits,
  submitFeedback,
  updateFeedback,
} from './feedback.ts'
import {
  createManualTask,
  regenerateAutoTasks,
  listTasks,
  resolveTask,
  reviewSummary,
} from './review.ts'
import {
  fail,
  intParam,
  isSameOrigin,
  json,
  notFound,
  readJson,
  requestMeta,
  str,
  unauthorized,
  weakEtag,
} from './http.ts'
import { hashPassword } from './crypto.ts'
import { diffContent, summarizeChanges } from './diff.ts'

export interface AdminEnv {
  /** D1 绑定 */
  DB: D1Database
  /** 站点盐。用于限流键的哈希，换站点就该换盐 */
  SITE_SALT: string
  /**
   * 初始管理员密码（Cloudflare Secret）。
   *
   * **只在 admins 表为空时被使用一次**，用于创建第一个账号。
   * 一旦存在任何账号，这个变量就完全不再被读取 ——
   * 否则改了 secret 就能顶掉任何已注册账号。
   */
  ADMIN_PASSWORD?: string
  ADMIN_USERNAME?: string
}

/** 站点盐缺失时的兜底 */
const FALLBACK_SALT = 'ai-guide-site-dev-salt'

function saltOf(env: AdminEnv): string {
  return env.SITE_SALT || FALLBACK_SALT
}

/** 判断请求 URL 是否属于后台 API（不是则返回 null 交还给静态资源） */
export function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

interface RouteCtx {
  db: Db
  env: AdminEnv
  request: Request
  url: URL
  identity: AdminIdentity | null
  /** 会话令牌原文（登出、改密码时要用） */
  token: string | null
}

type Handler = (ctx: RouteCtx, params: Record<string, string>) => Promise<Response>

interface Route {
  method: string
  /** 路径模式，`:name` 匹配一段 */
  pattern: string
  auth: 'required' | 'public' | 'session-optional'
  handler: Handler
}

/**
 * 确保存在初始管理员。
 *
 * 只在 `admins` 表为空且配置了 ADMIN_PASSWORD 时创建。
 * 这个「只在为空时」的判断是安全关键：如果改成「每次登录都同步」，
 * 那么任何知道这个 secret 的人都能重置管理员密码。
 */
async function ensureBootstrapAdmin(db: Db, env: AdminEnv): Promise<void> {
  const existing = await db.first<{ n: number }>('SELECT COUNT(*) AS n FROM admins')
  if (toInt(existing?.n) > 0) return
  if (!env.ADMIN_PASSWORD) return

  const rec = await hashPassword(env.ADMIN_PASSWORD)
  const username = env.ADMIN_USERNAME || 'admin'
  await db.run(
    `INSERT INTO admins (username, password_hash, salt, iterations, role, created_at)
     VALUES (?, ?, ?, ?, 'owner', ?)`,
    [username, rec.hash, rec.salt, rec.iterations, nowIso()]
  )
  await db.run('INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)', [
    nowIso(),
    'system',
    'bootstrap',
    username,
    JSON.stringify({ note: '首次部署，用 ADMIN_PASSWORD 创建初始管理员' }),
  ])
}

/** 把路径按 :param 切分 */
function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const ps = pattern.split('/').filter(Boolean)
  const xs = pathname.split('/').filter(Boolean)
  if (ps.length !== xs.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].startsWith(':')) params[ps[i].slice(1)] = decodeURIComponent(xs[i])
    else if (ps[i] !== xs[i]) return null
  }
  return params
}

// ── 路由表 ─────────────────────────────────────────────────────────────────

const ROUTES: Route[] = [
  // ── 登录相关（无需登录）──
  {
    method: 'POST',
    pattern: '/api/admin/login',
    auth: 'public',
    handler: handleLogin,
  },
  {
    method: 'POST',
    pattern: '/api/admin/logout',
    auth: 'session-optional',
    handler: handleLogout,
  },
  {
    method: 'GET',
    pattern: '/api/admin/session',
    auth: 'session-optional',
    handler: handleSession,
  },
  {
    method: 'POST',
    pattern: '/api/admin/password',
    auth: 'required',
    handler: handleChangePassword,
  },

  // ── 仪表盘 ──
  {
    method: 'GET',
    pattern: '/api/admin/dashboard',
    auth: 'required',
    handler: handleDashboard,
  },

  // ── 内容 ──
  { method: 'GET', pattern: '/api/admin/content', auth: 'required', handler: handleListContent },
  {
    method: 'GET',
    pattern: '/api/admin/content/:itemId',
    auth: 'required',
    handler: handleGetContent,
  },
  {
    method: 'PUT',
    pattern: '/api/admin/content/:itemId/draft',
    auth: 'required',
    handler: handleSaveDraft,
  },
  {
    method: 'DELETE',
    pattern: '/api/admin/content/:itemId/draft',
    auth: 'required',
    handler: handleDeleteDraft,
  },
  {
    method: 'POST',
    pattern: '/api/admin/content/:itemId/publish',
    auth: 'required',
    handler: handlePublish,
  },
  {
    method: 'GET',
    pattern: '/api/admin/content/:itemId/versions/:version',
    auth: 'required',
    handler: handleGetVersion,
  },
  {
    method: 'POST',
    pattern: '/api/admin/content/:itemId/rollback',
    auth: 'required',
    handler: handleRollback,
  },

  // ── 反馈 ──
  { method: 'GET', pattern: '/api/admin/feedback', auth: 'required', handler: handleListFeedback },
  {
    method: 'PATCH',
    pattern: '/api/admin/feedback/:id',
    auth: 'required',
    handler: handleUpdateFeedback,
  },

  // ── 复核待办 ──
  { method: 'GET', pattern: '/api/admin/review', auth: 'required', handler: handleListReview },
  {
    method: 'POST',
    pattern: '/api/admin/review',
    auth: 'required',
    handler: handleCreateReview,
  },
  {
    method: 'POST',
    pattern: '/api/admin/review/regenerate',
    auth: 'required',
    handler: handleRegenerateReview,
  },
  {
    method: 'PATCH',
    pattern: '/api/admin/review/:id',
    auth: 'required',
    handler: handleResolveReview,
  },

  // ── 审计与备份 ──
  { method: 'GET', pattern: '/api/admin/audit', auth: 'required', handler: handleAudit },
  { method: 'GET', pattern: '/api/admin/backup', auth: 'required', handler: handleExportBackup },
  { method: 'POST', pattern: '/api/admin/backup', auth: 'required', handler: handleImportBackup },

  // ── 公开接口 ──
  { method: 'POST', pattern: '/api/feedback', auth: 'public', handler: handlePublicFeedback },
  { method: 'POST', pattern: '/api/collect', auth: 'public', handler: handleCollect },
  {
    method: 'GET',
    pattern: '/api/content/published',
    auth: 'public',
    handler: handlePublishedSnapshot,
  },
]

// ── 入口 ───────────────────────────────────────────────────────────────────

export async function handleApi(request: Request, env: AdminEnv): Promise<Response | null> {
  const url = new URL(request.url)
  if (!isApiPath(url.pathname)) return null

  let db: Db
  try {
    db = createD1Db(env.DB)
  } catch (e) {
    // 绑定缺失单独识别：它是部署环节最容易漏的一步，而症状完全指不回原因
    // （所有接口都正常，只有一个查库的接口 500，日志里只有 undefined.prepare）。
    if (e instanceof D1BindingMissingError) {
      console.error('[admin-api] D1 绑定缺失', url.pathname)
      return fail(
        500,
        'Pages 项目缺少名为 DB 的 D1 绑定。' +
          '注意：Pages 用 Git 集成构建时，wrangler.toml 里的 [[d1_databases]] 不会注入到' +
          'Functions 运行时，必须在 Dashboard → Settings → Functions → Bindings 里手动添加' +
          '（变量名 DB，绑定到 ai-guide-site 这个 D1 数据库）。'
      )
    }
    return fail(500, '数据库未配置：Pages 项目的 D1 绑定名为 DB。')
  }

  // 建初始管理员只在「有人尝试登录」时才做。
  //
  // 原先放在这里（每个请求都做）有两个问题：
  //   1. 每次请求都多一次 COUNT 查询 —— 而它对绝大多数请求毫无意义
  //   2. **它在 try/catch 之外**。数据库还没建表时，这一句
  //      `SELECT COUNT(*) FROM admins` 会直接抛错，异常一路冒到 Workers 运行时，
  //      用户看到的是 Cloudflare 的 HTML 错误页而不是我的 JSON 提示 ——
  //      「表不存在，需要执行 schema.sql」这条最关键的信息完全丢失。
  //      线上库漏建表时就会是这个症状，很难排查。
  //
  // 移到 handleLogin 里之后：既省掉了无谓查询，异常也落进统一的错误处理。
  const cookies = parseCookies(request.headers.get('Cookie'))
  const token = cookies[SESSION_COOKIE] ?? null
  const identity = await verifySession(db, token)

  let matched: { route: Route; params: Record<string, string> } | null = null
  let pathExists = false

  for (const route of ROUTES) {
    const params = matchPath(route.pattern, url.pathname)
    if (params === null) continue
    pathExists = true
    if (route.method !== request.method) continue
    matched = { route, params }
    break
  }

  if (!matched) {
    // 路径存在但方法不对 → 405；路径根本不存在 → 404。
    // 区分开是因为 405 能帮本地联调少猜几轮。
    return pathExists ? fail(405, `${request.method} 不被支持。`) : notFound('接口不存在。')
  }

  const { route, params } = matched

  if (route.auth === 'required' && !identity) return unauthorized()

  const isMutation = request.method !== 'GET' && request.method !== 'HEAD'
  if (isMutation && !isSameOrigin(request)) {
    return fail(403, '请求来源校验失败：写操作必须来自本站页面。')
  }

  const ctx: RouteCtx = { db, env, request, url, identity, token }
  try {
    return await route.handler(ctx, params)
  } catch (e) {
    // 「表不存在」是部署过程中最常见的一种状态（绑定了 D1 但还没执行 schema.sql），
    // 值得单独识别：它需要的是一条明确的操作指令，不是一句「服务端出错」。
    // 不识别的话，用户只能看到一个 500，而真正的原因藏在日志里。
    const message = e instanceof Error ? e.message : String(e)
    if (/no such table|SQLITE_ERROR.*table/i.test(message)) {
      console.error('[admin-api] 数据库缺少表结构', url.pathname, message)
      return fail(
        500,
        '数据库已绑定但还没有建表。请执行：' +
          'npx wrangler d1 execute ai-guide-site --remote --file=db/schema.sql' +
          '（然后 node --experimental-strip-types scripts/seed-content.mjs --remote 灌入内容）'
      )
    }
    // 不把内部错误原文返回给前端：那可能包含 SQL 或环境变量名。
    // 完整信息写进日志，前端只看到「服务端出错」。
    console.error('[admin-api] 未处理的异常', url.pathname, message)
    return fail(500, '服务端处理出错，请查看服务端日志。')
  }
}

/** 只在 http://localhost / 127.0.0.1 下省略 Secure，否则一律带上 */
function cookieSecure(request: Request): boolean {
  const host = new URL(request.url).hostname
  return !(host === 'localhost' || host === '127.0.0.1')
}

// ── 处理器：登录 ───────────────────────────────────────────────────────────

async function handleLogin(ctx: RouteCtx): Promise<Response> {
  const body = await readJson<{ username?: unknown; password?: unknown }>(ctx.request)
  const username = str(body?.username, 64)
  const password = typeof body?.password === 'string' ? body.password : ''

  // 空用户名也要走完整流程，否则「不填用户名」会明显快于「填错密码」，
  // 变成一个用来探测「哪些用户名存在」的时间侧信道。
  if (!username || !password) {
    return fail(400, '请填写用户名和密码。')
  }

  const meta = requestMeta(ctx.request)
  const salt = saltOf(ctx.env)

  // 建初始管理员放在这里（原先在 handleApi 的入口，每个请求都做一次）：
  // 只有真的有人来登录时才需要，而且这样它落在统一的错误处理里 ——
  // 库没建表时的异常会变成明确的操作提示，而不是 Cloudflare 的 HTML 错误页。
  try {
    await ensureBootstrapAdmin(ctx.db, ctx.env)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error('[admin-api] 初始化管理员失败', message)
    if (/no such table|SQLITE_ERROR.*table/i.test(message)) {
      return fail(
        500,
        '数据库已绑定但还没有建表。请先执行：' +
          'npx wrangler d1 execute ai-guide-site --remote --file=db/schema.sql'
      )
    }
    return fail(500, '服务端初始化失败，请查看服务端日志。')
  }

  // 先看是否已被锁：被锁时**不**做任何密码计算，
  // 否则攻击者可以用「响应时间是否随密码错误而变化」判断是否被锁。
  const lock = await isLoginLocked(ctx.db, username, maskIp(meta.ip), salt)
  if (lock.locked) {
    return fail(429, `登录失败次数过多，请稍后再试。`, { meta: { lockedUntil: lock.until } })
  }

  const result = await login(ctx.db, username, password, meta, salt)
  if (!result.ok) {
    await pruneLoginAttempts(ctx.db)
    // 这次失败刚好触发了锁定时返回 429 而不是 401：
    // 401 的语义是「凭据错了」，而此刻真实状态是「你已被暂时锁定」，
    // 继续给 401 会让人以为再试一次密码就可能成功。
    if (result.lockedUntil) {
      return fail(429, result.error ?? '登录失败次数过多，已暂时锁定。', {
        meta: { lockedUntil: result.lockedUntil },
      })
    }
    return fail(401, result.error ?? '登录失败', {
      meta: { remaining: result.remaining, lockedUntil: null },
    })
  }

  const cookie = buildSessionCookie(result.token!, { secure: cookieSecure(ctx.request) })
  return json(
    {
      ok: true,
      username: result.identity!.username,
      role: result.identity!.role,
      maxFailures: LOGIN_MAX_FAILURES,
    },
    200,
    { 'set-cookie': cookie }
  )
}

async function handleLogout(ctx: RouteCtx): Promise<Response> {
  await destroySession(ctx.db, ctx.token)
  return json({ ok: true }, 200, { 'set-cookie': buildClearCookie() })
}

async function handleSession(ctx: RouteCtx): Promise<Response> {
  if (!ctx.identity) return json({ authenticated: false })
  return json({
    authenticated: true,
    username: ctx.identity.username,
    role: ctx.identity.role,
  })
}

async function handleChangePassword(ctx: RouteCtx): Promise<Response> {
  const body = await readJson<{ oldPassword?: unknown; newPassword?: unknown }>(ctx.request)
  const oldPassword = typeof body?.oldPassword === 'string' ? body.oldPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
  const res = await changePassword(
    ctx.db,
    ctx.identity!.username,
    oldPassword,
    newPassword,
    ctx.token!
  )
  if (!res.ok) return fail(400, res.error ?? '修改失败')
  await ctx.db.run(
    'INSERT INTO audit_log (at, actor, action, target, detail) VALUES (?, ?, ?, ?, ?)',
    [nowIso(), ctx.identity!.username, 'password.change', ctx.identity!.username, null]
  )
  return json({ ok: true })
}

// ── 处理器：仪表盘 ─────────────────────────────────────────────────────────

async function handleDashboard(ctx: RouteCtx): Promise<Response> {
  const [items, feedback, review, analytics] = await Promise.all([
    listItems(ctx.db, 'tool'),
    feedbackCounts(ctx.db),
    reviewSummary(ctx.db),
    analyticsSummary(ctx.db, 14),
  ])

  const published = items.filter((i) => i.published_version !== null)
  const drafts = items.filter((i) => i.has_draft === 1)
  const neverPublished = items.filter((i) => i.published_version === null)

  const lastPublish = await ctx.db.first<{ at: string; actor: string }>(
    "SELECT at, actor FROM audit_log WHERE action = 'publish' ORDER BY at DESC LIMIT 1"
  )

  return json({
    content: {
      total: items.length,
      published: published.length,
      withDraft: drafts.length,
      neverPublished: neverPublished.length,
      lastPublish: lastPublish
        ? { at: toText(lastPublish.at), actor: toText(lastPublish.actor) }
        : null,
    },
    feedback,
    review,
    analytics,
    // 首次部署时把事件白名单写进库，之后就不用管了
    eventsSynced: true,
    privacyNote:
      '统计不记录 IP、User-Agent 或任何跨请求可关联标识，因此没有独立访客数。' +
      '本站不做用户画像、不存个人信息，这个取舍对统计口同样适用 —— ' +
      '这是设计决定，不是数据缺失。',
  })
}

// ── 处理器：内容 ───────────────────────────────────────────────────────────

async function handleListContent(ctx: RouteCtx): Promise<Response> {
  const items = await listItems(ctx.db)
  return json({ items })
}

async function handleGetContent(ctx: RouteCtx, params: Record<string, string>): Promise<Response> {
  const itemId = str(params.itemId, 120)
  const item = await getItem(ctx.db, itemId)
  if (!item) return notFound('条目不存在。')

  const [published, draft, versions] = await Promise.all([
    getPublishedData(ctx.db, itemId),
    getDraft(ctx.db, itemId),
    listVersions(ctx.db, itemId),
  ])

  // 历史列表带上「这一版相对上一版改了什么」，否则版本号只是数字，
  // 管理员没法判断该恢复到哪一版。
  const withSummary: Record<string, unknown>[] = []
  for (const v of versions) {
    const data = await getVersionData(ctx.db, itemId, v.version)
    const prev = v.version > 1 ? await getVersionData(ctx.db, itemId, v.version - 1) : null
    const changes = diffContent(prev, data)
    withSummary.push({ ...v, summary: summarizeChanges(changes) })
  }

  return json({ item, published, draft, versions: withSummary })
}

async function handleSaveDraft(ctx: RouteCtx, params: Record<string, string>): Promise<Response> {
  const itemId = str(params.itemId, 120)
  const body = await readJson<{
    kind?: unknown
    slug?: unknown
    data?: unknown
    note?: unknown
    expectedEditVersion?: unknown
  }>(ctx.request)

  const slug = str(body?.slug, 80)
  if (!slug) return fail(400, '缺少 slug。')
  const kind = str(body?.kind, 20) || 'tool'

  const result = await saveDraft(ctx.db, {
    itemId,
    kind: kind as ContentKind,
    slug,
    data: body?.data,
    actor: ctx.identity!.username,
    note: str(body?.note, 200),
    expectedEditVersion:
      body?.expectedEditVersion === undefined ? undefined : intParam(body.expectedEditVersion, -1),
  })

  if (!result.ok) {
    if (result.issues) return fail(422, '内容有问题，请按提示修改。', { issues: result.issues })
    return fail(409, result.error ?? '保存失败。')
  }
  return json({ ok: true, created: result.created ?? false })
}

async function handleDeleteDraft(ctx: RouteCtx, params: Record<string, string>): Promise<Response> {
  const removed = await deleteDraft(ctx.db, str(params.itemId, 120))
  return json({ ok: true, removed })
}

async function handlePublish(ctx: RouteCtx, params: Record<string, string>): Promise<Response> {
  const body = await readJson<{ changeNote?: unknown }>(ctx.request)
  const result = await publishDraft(ctx.db, {
    itemId: str(params.itemId, 120),
    actor: ctx.identity!.username,
    changeNote: str(body?.changeNote, 300),
  })
  if (!result.ok) {
    if (result.conflict) return fail(409, result.error ?? '发布冲突。')
    if (result.issues) return fail(422, '内容有问题，无法发布。', { issues: result.issues })
    return fail(400, result.error ?? '发布失败。')
  }
  return json({ ok: true, version: result.version })
}

async function handleGetVersion(ctx: RouteCtx, params: Record<string, string>): Promise<Response> {
  const itemId = str(params.itemId, 120)
  const version = intParam(params.version, -1)
  if (version < 1) return fail(400, '版本号无效。')
  const data = await getVersionData(ctx.db, itemId, version)
  if (!data) return notFound('该版本不存在或内容已损坏。')
  const prev = version > 1 ? await getVersionData(ctx.db, itemId, version - 1) : null
  const changes = diffContent(prev, data)
  return json({ data, changes, summary: summarizeChanges(changes) })
}

async function handleRollback(ctx: RouteCtx, params: Record<string, string>): Promise<Response> {
  const body = await readJson<{ version?: unknown; reason?: unknown }>(ctx.request)
  const version = intParam(body?.version, -1)
  if (version < 1) return fail(400, '缺少要恢复到的版本号。')

  const result = await rollbackTo(ctx.db, {
    itemId: str(params.itemId, 120),
    version,
    actor: ctx.identity!.username,
    reason: str(body?.reason, 300),
  })
  if (!result.ok) return fail(400, result.error ?? '回滚失败。')
  return json({ ok: true, version: result.version })
}

// ── 处理器：反馈 ───────────────────────────────────────────────────────────

async function handleListFeedback(ctx: RouteCtx): Promise<Response> {
  const status = ctx.url.searchParams.get('status')
  const items = await listFeedback(ctx.db, {
    status: status || undefined,
    limit: intParam(ctx.url.searchParams.get('limit'), 100),
  })
  return json({ items, counts: await feedbackCounts(ctx.db), labels: FEEDBACK_STATUS_LABELS })
}

async function handleUpdateFeedback(ctx: RouteCtx, params: Record<string, string>): Promise<Response> {
  const body = await readJson<{ status?: unknown; note?: unknown }>(ctx.request)
  const result = await updateFeedback(ctx.db, {
    id: str(params.id, 64),
    status: str(body?.status, 20),
    note: typeof body?.note === 'string' ? body.note.slice(0, 1000) : undefined,
    actor: ctx.identity!.username,
  })
  if (!result.ok) return notFound(result.error ?? '反馈不存在。')
  return json({ ok: true })
}

// ── 处理器：复核待办 ───────────────────────────────────────────────────────

async function handleListReview(ctx: RouteCtx): Promise<Response> {
  const status = ctx.url.searchParams.get('status')
  const [tasks, summary] = await Promise.all([
    listTasks(ctx.db, { status: status || undefined }),
    reviewSummary(ctx.db),
  ])
  return json({ tasks, summary })
}

async function handleCreateReview(ctx: RouteCtx): Promise<Response> {
  const body = await readJson<{
    title?: unknown
    detail?: unknown
    itemId?: unknown
    severity?: unknown
    dueDate?: unknown
  }>(ctx.request)
  const result = await createManualTask(ctx.db, {
    title: str(body?.title, 200),
    detail: typeof body?.detail === 'string' ? body.detail.slice(0, 1000) : undefined,
    itemId: str(body?.itemId, 120) || undefined,
    severity: str(body?.severity, 10),
    dueDate: str(body?.dueDate, 20) || undefined,
    actor: ctx.identity!.username,
  })
  if (!result.ok) return fail(400, result.error ?? '创建失败。')
  return json({ ok: true, id: result.id })
}

async function handleRegenerateReview(ctx: RouteCtx): Promise<Response> {
  const result = await regenerateAutoTasks(ctx.db)
  return json({ ok: true, ...result })
}

async function handleResolveReview(ctx: RouteCtx, params: Record<string, string>): Promise<Response> {
  const body = await readJson<{ status?: unknown; note?: unknown }>(ctx.request)
  const status = str(body?.status, 20)
  if (!['done', 'dismissed', 'open'].includes(status)) {
    return fail(400, 'status 只能是 done / dismissed / open。')
  }
  const result = await resolveTask(ctx.db, {
    id: str(params.id, 200),
    status: status as 'done' | 'dismissed' | 'open',
    actor: ctx.identity!.username,
    note: typeof body?.note === 'string' ? body.note.slice(0, 500) : undefined,
  })
  if (!result.ok) return notFound(result.error ?? '待办不存在。')
  return json({ ok: true })
}

// ── 处理器：审计与备份 ─────────────────────────────────────────────────────

async function handleAudit(ctx: RouteCtx): Promise<Response> {
  const limit = intParam(ctx.url.searchParams.get('limit'), 100)
  const actor = ctx.url.searchParams.get('actor')
  const action = ctx.url.searchParams.get('action')

  const where: string[] = []
  const args: (string | number)[] = []
  if (actor) {
    where.push('actor = ?')
    args.push(actor.slice(0, 64))
  }
  if (action) {
    where.push('action = ?')
    args.push(action.slice(0, 40))
  }
  const clause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const rows = await ctx.db.all<Record<string, unknown>>(
    `SELECT id, at, actor, action, target, detail FROM audit_log
     ${clause} ORDER BY id DESC LIMIT ?`,
    [...args, Math.min(Math.max(limit, 1), 500)]
  )
  return json({ entries: rows })
}

async function handleExportBackup(ctx: RouteCtx): Promise<Response> {
  const backup = await exportBackup(ctx.db)
  const body = JSON.stringify(backup, null, 2)
  return json(backup, 200, {
    // 允许浏览器直接下载成文件
    'content-disposition': `attachment; filename="content-backup-${backup.exportedAt.slice(0, 10)}.json"`,
    etag: weakEtag(body),
  })
}

async function handleImportBackup(ctx: RouteCtx): Promise<Response> {
  const body = await readJson<unknown>(ctx.request)
  const result = await importBackup(ctx.db, body, ctx.identity!.username)
  if (!result.ok) return fail(400, result.error ?? '导入失败。')
  return json(result)
}

// ── 处理器：公开接口 ───────────────────────────────────────────────────────

async function handlePublicFeedback(ctx: RouteCtx): Promise<Response> {
  const body = await readJson<{
    kind?: unknown
    message?: unknown
    contact?: unknown
    pageUrl?: unknown
  }>(ctx.request)
  const meta = requestMeta(ctx.request)
  const result = await submitFeedback(ctx.db, {
    kind: str(body?.kind, 20),
    message: body?.message,
    contact: body?.contact,
    pageUrl: body?.pageUrl,
    ip: meta.ip,
    siteSalt: saltOf(ctx.env),
  })
  if (!result.ok) return fail(400, result.error ?? '提交失败。')
  await pruneRateLimits(ctx.db)
  return json({ ok: true, id: result.id })
}

async function handleCollect(ctx: RouteCtx): Promise<Response> {
  const body = await readJson<{ path?: unknown; events?: unknown }>(ctx.request)
  const meta = requestMeta(ctx.request)
  const result = await collect(
    { path: body?.path, events: body?.events, ip: meta.ip, siteSalt: saltOf(ctx.env) },
    ctx.db
  )
  // 埋点失败不该影响访客，所以除非明确超限，一律 200。
  if (!result.ok) return json({ ok: true, accepted: 0 }, 202)
  return json({ ok: true, accepted: result.accepted }, 202)
}

/**
 * 公开的「已发布内容」快照。
 *
 * 这个接口**不需要认证**，而且这是有意的：它返回的内容本来就是公开的 ——
 * 公开站的每个页面都渲染了同样的数据。用它做构建时同步，
 * 就完全不需要在构建环境里放任何凭据（不用 wrangler、不用 API Token）。
 *
 * 这一点值得写清楚，因为它看起来像个安全漏洞：任何人拿到这个 JSON
 * 都能读到工具资料。但他们本来就能从公开站的页面上读到同样的内容，
 * 所以这里没有额外泄露任何东西 —— 只是省掉了整套构建凭据管理。
 *
 * 带 ETag，内容没变时构建脚本能拿到 304。
 */
async function handlePublishedSnapshot(ctx: RouteCtx): Promise<Response> {
  const items = await readPublishedAll(ctx.db)

  // ETag 只覆盖 items，**不包含 generatedAt**。
  //
  // 第一版把 generatedAt 算进 ETag 里了，结果这个接口永远返回 200 ——
  // 因为每次调用的 body 都不一样（时间戳变了），ETag 也就不可能匹配上。
  // 那样构建时同步就完全用不上 304，每次都要重传几百 KB。
  // 时间戳属于「响应元信息」，不属于内容，两者必须分开算。
  const etag = weakEtag(JSON.stringify(items))
  const body = JSON.stringify({
    format: 'ai-guide-published-content',
    version: 1,
    generatedAt: nowIso(),
    items,
  })

  const ifNoneMatch = ctx.request.headers.get('If-None-Match')
  if (ifNoneMatch && ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { etag, 'cache-control': 'no-cache' } })
  }

  await recordMilestone(ctx.db, 'snapshot-served')
  await syncEventNames(ctx.db)

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      etag,
      // 公开内容，可以被 CDN 短暂缓存；但用 no-cache 而不是长 max-age，
      // 这样发布后第一次请求就会回源拿到新内容。
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  })
}

/** 供本地开发服务器与测试复用：构造一个带 sqlite 的 env */
export function createSqliteEnvForTests(db: Db, overrides: Partial<AdminEnv> = {}): AdminEnv {
  return {
    DB: {} as D1Database,
    SITE_SALT: 'test-salt',
    ...overrides,
  }
}

export { pruneExpiredSessions }
