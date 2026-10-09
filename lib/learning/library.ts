export type LearningKind = 'tool' | 'guide' | 'case' | 'concept' | 'path'
export interface LearningEntry {
  href: string
  title: string
  summary: string
  kind: LearningKind
  at: string
}
type Store = Pick<Storage, 'getItem' | 'setItem'>
const KEYS = { saved: 'ai-map:learning-saved:v1', recent: 'ai-map:learning-recent:v1' }
export const LIBRARY_EVENT = 'ai-map:learning-library-change'
export const MAX_SAVED = 100
export function validLearningEntry(value: unknown): value is LearningEntry {
  if (!value || typeof value !== 'object') return false
  const item = value as LearningEntry
  const routes: Record<LearningKind, string> = {
    tool: 'tools',
    guide: 'guides',
    case: 'cases',
    concept: 'learn',
    path: 'paths',
  }
  return (
    typeof item.href === 'string' &&
    Object.hasOwn(routes, item.kind) &&
    new RegExp(`^/${routes[item.kind]}/[a-z0-9-]+/?$`).test(item.href) &&
    typeof item.title === 'string' &&
    !!item.title.trim() &&
    item.title.length <= 160 &&
    typeof item.summary === 'string' &&
    item.summary.length <= 300 &&
    typeof item.at === 'string' &&
    Number.isFinite(Date.parse(item.at))
  )
}
function browserStore(): Store | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage
  } catch {
    return undefined
  }
}
export function readLibrary(
  kind: 'saved' | 'recent',
  store: Store | undefined = browserStore(),
): LearningEntry[] {
  try {
    const value = JSON.parse(store?.getItem(KEYS[kind]) ?? '[]')
    if (!Array.isArray(value)) return []
    const seen = new Set<string>()
    return value
      .filter(validLearningEntry)
      .filter((item) => {
        if (seen.has(item.href)) return false
        seen.add(item.href)
        return true
      })
      .slice(0, kind === 'saved' ? MAX_SAVED : 8)
  } catch {
    return []
  }
}
function write(
  kind: 'saved' | 'recent',
  items: LearningEntry[],
  store: Store | undefined,
): boolean {
  try {
    if (!store) return false
    store.setItem(KEYS[kind], JSON.stringify(items))
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(LIBRARY_EVENT))
    return true
  } catch {
    return false
  }
}
export function toggleSaved(
  entry: LearningEntry,
  store: Store | undefined = browserStore(),
): { ok: boolean; saved: boolean; message: string } {
  const items = readLibrary('saved', store),
    exists = items.some((item) => item.href === entry.href)
  if (!validLearningEntry(entry))
    return { ok: false, saved: exists, message: '这份内容暂时无法收藏。' }
  if (!exists && items.length >= MAX_SAVED)
    return { ok: false, saved: false, message: '学习夹已满，请先移除一些旧收藏。' }
  const next = exists ? items.filter((item) => item.href !== entry.href) : [entry, ...items]
  const ok = write('saved', next, store)
  return {
    ok,
    saved: ok ? !exists : exists,
    message: ok
      ? exists
        ? '已移出学习夹'
        : '已加入学习夹，保存在这台设备上'
      : '浏览器未能保存，请检查本机存储空间或隐私设置。',
  }
}
export function recordRecent(
  entry: LearningEntry,
  store: Store | undefined = browserStore(),
): boolean {
  if (!validLearningEntry(entry)) return false
  return write(
    'recent',
    [entry, ...readLibrary('recent', store).filter((item) => item.href !== entry.href)].slice(0, 8),
    store,
  )
}
export function removeSaved(href: string, store: Store | undefined = browserStore()): boolean {
  return write(
    'saved',
    readLibrary('saved', store).filter((item) => item.href !== href),
    store,
  )
}
export function restoreSaved(
  entry: LearningEntry,
  store: Store | undefined = browserStore(),
): boolean {
  if (!validLearningEntry(entry)) return false
  const items = readLibrary('saved', store).filter((item) => item.href !== entry.href)
  return items.length < MAX_SAVED && write('saved', [entry, ...items], store)
}
export function clearRecent(store: Store | undefined = browserStore()): boolean {
  return write('recent', [], store)
}
