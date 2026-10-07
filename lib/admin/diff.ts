/**
 * 版本差异对比。
 *
 * 用途是让后台历史列表能回答「这一版改了什么」，而不只是「这一版存在」。
 * 没有它的话，「恢复上一版本」这个功能就有个真实的风险：
 * 管理员看到一串版本号，但不知道要恢复的那一版到底改了什么，
 * 只能凭版本号猜或者干脆全恢复一遍。
 *
 * 输出是扁平的「字段路径 → 改前/改后」列表，按路径排序，
 * 前端直接渲染成表格，不需要再做任何结构处理。
 */

export type ChangeKind = 'added' | 'removed' | 'changed'

export interface FieldChange {
  /** 形如 'capabilities.coding.score' */
  path: string
  kind: ChangeKind
  before: unknown
  after: unknown
}

/** 数组里的元素整体作为一个值比较，不做逐元素 diff */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * 递归对比两个对象，最多递归 6 层。
 *
 * 深度上限是必要的：内容数据来自用户输入，理论上可以是任意深的嵌套结构。
 * 不设上限的话，一个构造出来的深层对象能让这个函数跑很久 ——
 * 后台虽然是自己人在用，但「编辑一个字段卡住整个后台」是很差的体验。
 */
const MAX_DEPTH = 6

function walk(before: unknown, after: unknown, path: string, out: FieldChange[], depth = 0) {
  if (depth > MAX_DEPTH) {
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      out.push({ path, kind: 'changed', before, after })
    }
    return
  }

  if (isPlainObject(before) && isPlainObject(after)) {
    const keys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const k of [...keys].sort()) {
      const p = path ? `${path}.${k}` : k
      const b = before[k]
      const a = after[k]
      if (!(k in after)) out.push({ path: p, kind: 'removed', before: b, after: undefined })
      else if (!(k in before)) out.push({ path: p, kind: 'added', before: undefined, after: a })
      else walk(b, a, p, out, depth + 1)
    }
    return
  }

  // 数组与原始值：整体比较
  if (JSON.stringify(before) !== JSON.stringify(after)) {
    out.push({ path, kind: 'changed', before, after })
  }
}

export function diffContent(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null
): FieldChange[] {
  const out: FieldChange[] = []
  // 跳过这两类字段，否则历史列表里全是噪音：
  //   · updatedAt    每次发布由服务端注入，是版本元信息不是内容改动
  //   · overallScore 派生字段，保存时被丢弃、公开站按 14 维重算。
  //     不跳过的话每次历史都会显示「综合分被清空」的假变更。
  //
  // 必须先浅拷贝再删：第一版直接对入参 delete，把调用方（服务端从库里读出来的
  // 那个对象）的字段也删掉了。diff 是纯函数，不能有副作用 —— 这是被
  // 「diff 不会修改传入的对象」那条断言逼出来的。
  const b = before ? { ...before } : before
  const a = after ? { ...after } : after
  if (b) stripNoise(b)
  if (a) stripNoise(a)

  if (!b && !a) return out
  if (!b) {
    walk({}, a, '', out)
    return out.sort(byPath)
  }
  if (!a) {
    walk(b, {}, '', out)
    return out.sort(byPath)
  }
  walk(b, a, '', out)
  return out.sort(byPath)
}

/** 就地移除噪声字段（只在 diff 内部使用，调用方传的是我们自己读出来的副本） */
function stripNoise(obj: Record<string, unknown>): void {
  delete obj.updatedAt
  delete obj.overallScore
}

/**
 * 排序：先按路径字母序，同一路径再按增删改的严重程度排。
 *
 * 「删掉一个字段」比「改一个字段的数值」更需要警惕，所以排在前面。
 */
function byPath(a: FieldChange, b: FieldChange): number {
  if (a.path !== b.path) return a.path < b.path ? -1 : 1
  const rank: Record<ChangeKind, number> = { removed: 0, changed: 1, added: 2 }
  return rank[a.kind] - rank[b.kind]
}

/**
 * 差异摘要，用于历史列表的一行展示。
 *
 * 格式：`改了 2 个字段（评分 1、文本 1）`。
 *
 * 第一版这里写的是 `changes.join('、')` 而不是 `parts.join('、')` ——
 * 于是历史列表里每一行都显示「改了 [object Object]、[object Object]…」。
 * 数组是 FieldChange 对象，join 会调用它们的 toString。
 */
export function summarizeChanges(changes: FieldChange[]): string {
  if (changes.length === 0) return '与上一版内容相同'

  const scores = changes.filter((c) => c.path.endsWith('.score')).length
  const texts = changes.filter((c) => typeof c.after === 'string' || typeof c.before === 'string').length
  const lists = changes.filter((c) => Array.isArray(c.after) || Array.isArray(c.before)).length
  const other = changes.length - scores - texts - lists

  const parts: string[] = []
  if (scores > 0) parts.push(`${scores} 个维度评分`)
  if (texts > 0) parts.push(`${texts} 处文本`)
  if (lists > 0) parts.push(`${lists} 个列表`)
  if (other > 0) parts.push(`${other} 个其他字段`)

  const breakdown = parts.length > 0 ? `（${parts.join('、')}）` : ''
  return `改了 ${changes.length} 个字段${breakdown}`
}
