/**
 * 内容覆盖层：把后台（D1）里已发布的内容合并进站点的基线数据。
 *
 * ── 为什么要「覆盖」而不是把内容全搬进数据库 ──
 *
 * 仓库里的 `data/*.ts` 是这个站几十条门禁测试的输入（data.test.ts 有 194 项，
 * 校验 14 维完整性、替代品引用有效性、必填字段等）。如果把内容全部搬到 D1，
 * 这些测试就失去输入 —— 「内容是否自洽」变成了一件只有线上才知道的事。
 *
 * 所以分工是：
 *   · `data/*.ts` 仍然是**基线**，仍然过全部现有门禁
 *   · D1 里只放**通过后台改动过的字段**
 *   · 合并后走同一份门禁 —— 引用了不存在的工具、缺了能力维度，都会在 CI 里被抓到
 *
 * ── 覆盖为什么是「字段级」而不是整条替换 ──
 *
 * 整条替换的话，站点里任何一次对基线数据的手工修改（比如修 typo、加一个新工具）
 * 都会被后台的一条旧记录整份盖掉，而且没人会发现 ——
 * 冲突是静默的。字段级覆盖让「谁改了什么」一目了然，
 * 覆盖文件通常只有几百字节，不会明显增加前端包体积。
 */

/** 覆盖文件里的一条：工具 id → 被改过的字段 */
export type ToolOverride = Record<string, Record<string, unknown>>

export type OverrideFile = {
  format: 'ai-guide-content-overrides'
  version: 1
  generatedAt: string
  /** 内容快照的 ETag，用来判断是否需要重新生成 */
  sourceEtag: string | null
  overrides: ToolOverride
}

/** 空覆盖：构建时内容源不可达就用它，站点保持基线状态照常发布 */
export function emptyOverrides(): OverrideFile {
  return {
    format: 'ai-guide-content-overrides',
    version: 1,
    generatedAt: new Date(0).toISOString(),
    sourceEtag: null,
    overrides: {},
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * 计算「基线 → 新内容」的字段级差异。
 *
 * 数组按整体比较（不逐元素 diff）：工具数据里的数组都是
 * 强项 / 弱项 / 别用它做 / 替代品这类短列表，
 * 逐元素 diff 出来的结果没人看得懂，整体替换反而清楚。
 */
export function diffTool(
  baseline: Record<string, unknown>,
  incoming: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}

  for (const key of Object.keys(incoming)) {
    // updatedAt 由发布流程注入，属于版本元信息，不是内容改动 ——
    // 它本来就会每次发布都变，计进覆盖只会让覆盖文件永远显示「有改动」。
    if (key === 'updatedAt') continue

    const b = baseline[key]
    const a = incoming[key]

    if (!(key in baseline)) {
      out[key] = a
      continue
    }
    if (sameValue(a, b)) continue

    if (isPlainObject(a) && isPlainObject(b)) {
      const nested = diffTool(b, a)
      // 嵌套差异为空说明只是键顺序不同，不算改动
      if (Object.keys(nested).length > 0) out[key] = nested
      continue
    }

    out[key] = a
  }

  return out
}

/**
 * 计算整份覆盖表。
 *
 * 只有真正改过的工具才会出现在结果里 —— 未改动的工具零成本。
 */
export function buildOverrides(
  baselineTools: { id: string }[] & Record<string, unknown>[],
  incomingItems: { itemId: string; data: Record<string, unknown> }[]
): ToolOverride {
  const baselineById = new Map<string, Record<string, unknown>>()
  for (const t of baselineTools) {
    const rec = t as unknown as Record<string, unknown>
    baselineById.set(String(rec.id), rec)
  }

  const overrides: ToolOverride = {}
  for (const item of incomingItems) {
    const slug = item.itemId.startsWith('tool:') ? item.itemId.slice('tool:'.length) : item.itemId
    const baseline = baselineById.get(slug)
    if (!baseline) continue

    const diff = diffTool(baseline, item.data)
    // 后台可能改了 id，而 id 是合并的键 —— 这种内容无法作为覆盖生效，跳过
    delete diff.id
    if (Object.keys(diff).length > 0) overrides[slug] = diff
  }
  return overrides
}

/**
 * 深合并一层：覆盖值与基线值合并。
 *
 * 只处理对象；数组与标量直接用覆盖值。
 */
function mergeOne(base: unknown, over: unknown): unknown {
  if (!isPlainObject(over)) return over
  if (!isPlainObject(base)) return over
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(over)) {
    out[k] = mergeOne(base[k], v)
  }
  return out
}

/**
 * 把覆盖应用到基线工具列表。
 *
 * **未知工具 id 会被忽略而不是凭空造出一条。**
 * 这一点很重要：如果 D1 里有一条基线中不存在的工具（例如有人在后台新建了），
 * 直接塞进列表会生成一个没有任何页面的「幽灵工具」——
 * 列表页会显示它，但 /tools/<id>/ 页面不存在。
 * 新增工具应该走 git（代码变更，需要评审），而不是后台。
 */
export function applyOverrides<T extends { id: string }>(
  baselineTools: T[],
  overrides: ToolOverride | undefined | null
): { tools: T[]; applied: number; unknownIds: string[] } {
  if (!overrides || Object.keys(overrides).length === 0) {
    return { tools: baselineTools, applied: 0, unknownIds: [] }
  }

  const known = new Set(baselineTools.map((t) => t.id))
  const unknownIds: string[] = []
  for (const id of Object.keys(overrides)) {
    if (!known.has(id)) unknownIds.push(id)
  }

  let applied = 0
  const tools = baselineTools.map((tool) => {
    const over = overrides[tool.id]
    if (!over) return tool
    applied++
    return mergeOne(tool, over) as T
  })

  return { tools, applied, unknownIds }
}

/**
 * 把覆盖文件读成覆盖表，并对格式做校验。
 *
 * 校验失败时返回空覆盖而不是抛错：内容源出问题不该让整个站点发不出去，
 * 最坏的结果是「后台的改动这次没生效」—— 这在页面上能看出来，
 * 而站点挂掉看不出来。
 */
export function parseOverrideFile(raw: unknown): ToolOverride {
  if (!raw || typeof raw !== 'object') return {}
  const f = raw as Partial<OverrideFile>
  if (f.format !== 'ai-guide-content-overrides') return {}
  if (f.version !== 1) return {}
  if (!f.overrides || typeof f.overrides !== 'object') return {}

  const out: ToolOverride = {}
  for (const [id, patch] of Object.entries(f.overrides)) {
    if (patch && typeof patch === 'object' && !Array.isArray(patch)) {
      out[id] = patch as Record<string, unknown>
    }
  }
  return out
}
