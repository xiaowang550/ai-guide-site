import type { Db } from '../db/types.ts'

import {
  builtinModules,
  DEFAULT_LAYOUT,
  type SiteLayout,
  safeModuleLink,
  type PublicSiteConfig,
  type SiteModule,
} from '../site-modules.ts'

const SCHEMA = `CREATE TABLE IF NOT EXISTS site_modules(id TEXT PRIMARY KEY,data TEXT NOT NULL,archived INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS site_features(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL,updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS site_layout(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS feature_requests(id TEXT PRIMARY KEY,title TEXT NOT NULL,request TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL,result TEXT,workspace TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_build ON feature_requests((1)) WHERE status IN ('queued','running');`
export class ModuleInputError extends Error {}
export class ModuleConflictError extends Error {}
export async function ensureModules(db: Db) {
  try {
    if (
      await db.first(
        "SELECT id FROM site_features WHERE id=1 AND EXISTS(SELECT 1 FROM site_modules WHERE id='saved') AND EXISTS(SELECT 1 FROM site_modules WHERE id='beginner') AND EXISTS(SELECT 1 FROM site_layout WHERE id=1)",
      )
    )
      return
  } catch {}
  await db.exec(SCHEMA)
  const now = new Date().toISOString()
  await db.batch([
    ...builtinModules.map((module) => ({
      sql: 'INSERT OR IGNORE INTO site_modules(id,data) VALUES(?,?)',
      params: [module.id, JSON.stringify({ ...module, updatedAt: now })],
    })),
    {
      sql: 'INSERT OR IGNORE INTO site_features VALUES(1,?,?)',
      params: [JSON.stringify({ assistant: true, onboarding: true }), now],
    },
    {
      sql: 'INSERT OR IGNORE INTO site_layout VALUES(1,?)',
      params: [JSON.stringify({ ...DEFAULT_LAYOUT, updatedAt: now })],
    },
  ])
}
export async function readSiteConfig(db: Db, privateView = false): Promise<PublicSiteConfig> {
  await ensureModules(db)
  const [rows, features, layoutRow] = await Promise.all([
    db.all<{ data: string }>('SELECT data FROM site_modules WHERE archived=0'),
    db.first<{ data: string; updated_at: string }>(
      'SELECT data,updated_at FROM site_features WHERE id=1',
    ),
    db.first<{ data: string }>('SELECT data FROM site_layout WHERE id=1'),
  ])
  const modules = rows
    .map((row) => JSON.parse(row.data) as SiteModule)
    .filter((module) => privateView || module.kind === 'builtin' || module.enabled)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
  const layout = JSON.parse(layoutRow?.data ?? JSON.stringify(DEFAULT_LAYOUT)) as SiteLayout
  // 草稿模块的布局 ID 与内容一样仅供管理员读取。
  const navigationIds = new Set([
    'home',
    ...modules
      .filter((module) => module.kind === 'builtin' || module.navigation)
      .map((module) => module.id),
  ])
  const homeIds = new Set([
    ...DEFAULT_LAYOUT.home,
    ...modules
      .filter((module) => module.kind !== 'builtin' && module.home)
      .map((module) => module.id),
  ])
  const revision =
    [features?.updated_at ?? '', layout.updatedAt, ...modules.map((module) => module.updatedAt)]
      .sort()
      .at(-1) ?? ''
  return {
    revision,
    modules,
    features: JSON.parse(features?.data ?? '{}') as PublicSiteConfig['features'],
    layout: {
      ...layout,
      navigation: layout.navigation.filter((id) => navigationIds.has(id)),
      hiddenNavigation: layout.hiddenNavigation.filter((id) => navigationIds.has(id)),
      home: layout.home.filter((id) => homeIds.has(id)),
      hiddenHome: layout.hiddenHome.filter((id) => homeIds.has(id)),
    },
  }
}
export async function saveSiteLayout(db: Db, input: unknown, actor: string) {
  check(input)
  if (
    Object.keys(input).some(
      (key) => !['navigation', 'home', 'hiddenNavigation', 'hiddenHome', 'version'].includes(key),
    )
  )
    throw new ModuleInputError('布局字段不正确。')
  const current = await readSiteConfig(db, true)
  if (input.version !== current.layout.version)
    throw new ModuleConflictError('布局已在其他页面修改，请刷新后再调整。')
  const next = { ...current.layout } as SiteLayout
  for (const field of ['navigation', 'home', 'hiddenNavigation', 'hiddenHome'] as const) {
    if (input[field] === undefined) continue
    const value = input[field]
    const known = new Set(
      field === 'navigation' || field === 'hiddenNavigation'
        ? [
            'home',
            ...current.modules
              .filter((module) => module.kind === 'builtin' || module.navigation)
              .map((module) => module.id),
          ]
        : [
            ...DEFAULT_LAYOUT.home,
            ...current.modules
              .filter((module) => module.kind !== 'builtin' && module.home)
              .map((module) => module.id),
          ],
    )
    if (
      !Array.isArray(value) ||
      value.length > 100 ||
      value.some((id) => typeof id !== 'string' || !known.has(id)) ||
      new Set(value).size !== value.length
    )
      throw new ModuleInputError('请选择有效的布局项，同一位置不能重复放置同一模块。')
    next[field] = value as string[]
  }
  if (next.hiddenNavigation.includes('home'))
    throw new ModuleInputError('首页入口需要保留，可以调整位置。')
  next.version++
  next.updatedAt = new Date().toISOString()
  const updated = await db.run(
    "UPDATE site_layout SET data=? WHERE id=1 AND json_extract(data,'$.version')=?",
    [JSON.stringify(next), current.layout.version],
  )
  if (!updated.changes) throw new ModuleConflictError('布局已更新，请重新加载。')
  await db.run('INSERT INTO audit_log(at,actor,action,target,detail) VALUES(?,?,?,?,?)', [
    next.updatedAt,
    actor,
    'layout-save',
    'site',
    JSON.stringify({ version: next.version }),
  ])
  return readSiteConfig(db, true)
}
function check(input: unknown): asserts input is Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw new ModuleInputError('模块内容必须是对象。')
}
export async function saveSiteModule(
  db: Db,
  id: string | null,
  input: unknown,
  actor: string,
): Promise<SiteModule> {
  await ensureModules(db)
  check(input)
  if (
    Object.keys(input).some(
      (key) =>
        ![
          'title',
          'description',
          'kind',
          'enabled',
          'home',
          'navigation',
          'order',
          'blocks',
          'version',
        ].includes(key),
    )
  )
    throw new ModuleInputError('包含不支持的模块字段。')
  const existing = id
    ? await db.first<{ data: string; archived: number }>(
        'SELECT data,archived FROM site_modules WHERE id=?',
        [id],
      )
    : null
  if (id && !existing) throw new ModuleInputError('模块不存在。')
  if (existing?.archived) throw new ModuleInputError('这个模块已归档。')
  const previous = existing ? (JSON.parse(existing.data) as SiteModule) : null
  if (previous && input.version !== previous.version)
    throw new ModuleConflictError('模块已在其他页面更新，请刷新后重试。')
  const next = {
    ...(previous ?? {
      id: crypto.randomUUID(),
      kind: 'cards',
      title: '',
      description: '',
      enabled: false,
      home: true,
      navigation: true,
      order: 100,
      blocks: [],
      version: 0,
    }),
    ...input,
  } as SiteModule
  if (
    previous?.kind === 'builtin' &&
    Object.keys(input).some((key) => !['enabled', 'version', 'order'].includes(key))
  )
    throw new ModuleInputError('内置栏目可以开关和排序；内容通过对应编辑功能管理。')
  if (
    !['builtin', 'cards', 'steps', 'faq', 'links'].includes(next.kind) ||
    (previous?.kind !== 'builtin' && next.kind === 'builtin')
  )
    throw new ModuleInputError('请选择卡片、步骤、问答或资料链接模板。')
  if (
    typeof next.title !== 'string' ||
    !next.title.trim() ||
    next.title.length > 60 ||
    typeof next.description !== 'string' ||
    next.description.length > 240
  )
    throw new ModuleInputError('标题需为 1–60 字，简介最多 240 字。')
  if (['enabled', 'home', 'navigation'].some((key) => typeof next[key as 'enabled'] !== 'boolean'))
    throw new ModuleInputError('开关值必须是布尔值。')
  if (!Number.isInteger(next.order) || next.order < 0 || next.order > 999)
    throw new ModuleInputError('排序范围为 0–999。')
  if (!Array.isArray(next.blocks) || next.blocks.length > 12)
    throw new ModuleInputError('每个模块最多 12 项内容。')
  for (const block of next.blocks) {
    check(block)
    if (
      Object.keys(block).some((key) => !['title', 'text', 'href'].includes(key)) ||
      typeof block.title !== 'string' ||
      !block.title.trim() ||
      block.title.length > 100 ||
      typeof block.text !== 'string' ||
      block.text.length > 2500 ||
      (block.href !== undefined &&
        (typeof block.href !== 'string' || block.href.length > 500 || !safeModuleLink(block.href)))
    )
      throw new ModuleInputError('内容项需有标题和正文；链接只支持站内地址或 HTTPS。')
  }
  if (next.kind !== 'builtin' && next.enabled && !next.blocks.length)
    throw new ModuleInputError('先添加至少一项内容，再公开模块。')
  next.id = previous?.id ?? next.id
  next.title = next.title.trim()
  next.version = (previous?.version ?? 0) + 1
  next.updatedAt = new Date().toISOString()
  if (previous) {
    const result = await db.run(
      "UPDATE site_modules SET data=? WHERE id=? AND json_extract(data,'$.version')=?",
      [JSON.stringify(next), next.id, previous.version],
    )
    if (!result.changes) throw new ModuleConflictError('模块已更新，请重新加载。')
  } else
    await db.run('INSERT INTO site_modules(id,data) VALUES(?,?)', [next.id, JSON.stringify(next)])
  await db.run('INSERT INTO audit_log(at,actor,action,target,detail) VALUES(?,?,?,?,?)', [
    next.updatedAt,
    actor,
    'module-save',
    next.id,
    JSON.stringify({ version: next.version, enabled: next.enabled, kind: next.kind }),
  ])
  return next
}
export async function archiveSiteModule(db: Db, id: string, actor: string) {
  await ensureModules(db)
  const existing = await db.first<{ data: string }>(
    'SELECT data FROM site_modules WHERE id=? AND archived=0',
    [id],
  )
  if (!existing) throw new ModuleInputError('模块不存在。')
  if ((JSON.parse(existing.data) as SiteModule).kind === 'builtin')
    throw new ModuleInputError('内置栏目请使用关闭按钮。')
  await db.run('UPDATE site_modules SET archived=1 WHERE id=?', [id])
  await db.run('INSERT INTO audit_log(at,actor,action,target,detail) VALUES(?,?,?,?,?)', [
    new Date().toISOString(),
    actor,
    'module-archive',
    id,
    '保留数据，停止公开',
  ])
}
export async function saveSiteFeatures(db: Db, input: unknown, actor: string) {
  check(input)
  if (
    Object.keys(input).some((key) => !['assistant', 'onboarding'].includes(key)) ||
    Object.values(input).some((value) => typeof value !== 'boolean')
  )
    throw new ModuleInputError('仅支持助手与引导的布尔开关。')
  await ensureModules(db)
  const now = new Date().toISOString()
  await db.run('UPDATE site_features SET data=json_patch(data,?),updated_at=? WHERE id=1', [
    JSON.stringify(input),
    now,
  ])
  const row = await db.first<{ data: string }>('SELECT data FROM site_features WHERE id=1')
  const features = JSON.parse(row!.data) as PublicSiteConfig['features']
  await db.run('INSERT INTO audit_log(at,actor,action,target,detail) VALUES(?,?,?,?,?)', [
    now,
    actor,
    'site-settings',
    'site',
    JSON.stringify(features),
  ])
  return features
}

export interface BuildRequest {
  id: string
  title: string
  request: string
  status: string
  createdAt: string
  updatedAt: string
  result: string | null
}
export interface CodexBridge {
  status: () => Promise<{ available: boolean; message: string; version?: string }>
  run: (id: string, prompt: string) => Promise<void>
  changes: (id: string) => Promise<{ path: string; before: string | null; after: string | null }[]>
}
export async function listBuildRequests(db: Db): Promise<BuildRequest[]> {
  await ensureModules(db)
  return (
    await db.all<Record<string, string>>(
      'SELECT * FROM feature_requests ORDER BY created_at DESC LIMIT 50',
    )
  ).map((row) => ({
    id: row.id,
    title: row.title,
    request: row.request,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    result: row.result ?? null,
  }))
}
export async function createBuildRequest(db: Db, input: unknown, actor: string) {
  check(input)
  if (
    Object.keys(input).some((key) => !['title', 'request'].includes(key)) ||
    typeof input.title !== 'string' ||
    !input.title.trim() ||
    input.title.length > 100 ||
    typeof input.request !== 'string' ||
    input.request.trim().length < 10 ||
    input.request.length > 8000
  )
    throw new ModuleInputError('请填写标题与至少 10 字的功能需求。')
  await ensureModules(db)
  const id = crypto.randomUUID(),
    now = new Date().toISOString()
  await db.run(
    "INSERT INTO feature_requests(id,title,request,status,created_at,updated_at) VALUES(?,?,?,'draft',?,?)",
    [id, input.title.trim(), input.request.trim(), now, now],
  )
  await db.run('INSERT INTO audit_log(at,actor,action,target,detail) VALUES(?,?,?,?,?)', [
    now,
    actor,
    'feature-request',
    id,
    input.title.trim(),
  ])
  return (await listBuildRequests(db)).find((item) => item.id === id)!
}
