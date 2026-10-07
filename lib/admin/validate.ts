/**
 * 后台写入时的内容校验。
 *
 * 为什么后台也要有校验，而不是只靠 CI：
 * 公开站的 `claim-policy.test.ts` 只在提交/构建时跑。管理员在后台粘贴一段
 * 「我们自己的实测」进 evidence 字段，CI 抓不到（内容在 D1 里，不在仓库里），
 * 但这句话会直接显示在工具详情页上。
 * 那正是这个测试存在的理由所指向的虚假陈述 —— 所以**写入时就要拦**。
 *
 * 另一层保障：写入 D1 的内容会经 `lib/content/` 合并进公开站的数据数组，
 * 于是现有的 194 项 data 测试（含 14 维完整性、替代品引用有效性）
 * 在 CI 里会再校验一遍。两层是互补的：这里拦「不能写的」，
 * 那里拦「写对了但不自洽的」。
 */
import { ADMIN_CAPABILITY_KEYS, type ContentKind } from './capability-keys.ts'

export interface ValidationIssue {
  /** 出错的字段路径，如 'capabilities.coding.score' */
  field: string
  message: string
}

export interface ValidationResult {
  ok: boolean
  issues: ValidationIssue[]
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * 「实测」的否定词表。
 *
 * 与 `lib/__tests__/claim-policy.test.ts` 里的 NEGATION 是同一份判据，
 * 两处都有副本是因为一个跑在 Workers、一个跑在 vitest 里，不能互相 import。
 * `lib/__tests__/admin-schema.test.ts` 会断言两边内容一致。
 */
export const NEGATION_WORDS =
  /(不做|不做自建|不来自|未经|不做任何|不来自本地|不会|未能|无法|不涉及|不靠|不以|而非|不是)/

/** 允许出现「实测」的正当场景：说明本站**没有**做实测 */
const CLAIM_EXEMPT = [
  '结论段必须能指出哪些是实测',
  '我实测下来并不成立',
]

function hasUnnegatedClaim(text: string): boolean {
  if (!text.includes('实测')) return false
  if (NEGATION_WORDS.test(text)) return false
  return !CLAIM_EXEMPT.some((e) => text.includes(e))
}

/** 会渲染给用户的所有文本字段，逐个查「实测」 */
function collectUserVisibleText(value: unknown, path: string, out: { text: string; path: string }[]) {
  if (typeof value === 'string') {
    out.push({ text: value, path })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((v, i) => collectUserVisibleText(v, `${path}[${i}]`, out))
    return
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      collectUserVisibleText(v, path ? `${path}.${k}` : k, out)
    }
  }
}

function requireString(
  obj: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  opts: { min?: number; max?: number } = {}
): string {
  const v = obj[field]
  if (typeof v !== 'string' || v.trim() === '') {
    issues.push({ field, message: '必填，且不能只有空白' })
    return ''
  }
  const len = v.trim().length
  if (opts.min !== undefined && len < opts.min) {
    issues.push({ field, message: `至少 ${opts.min} 字，当前 ${len} 字` })
  }
  if (opts.max !== undefined && len > opts.max) {
    issues.push({ field, message: `最多 ${opts.max} 字，当前 ${len} 字` })
  }
  return v
}

function requireStringArray(
  obj: Record<string, unknown>,
  field: string,
  issues: ValidationIssue[],
  opts: { min: number; max?: number }
): string[] {
  const v = obj[field]
  if (!Array.isArray(v)) {
    issues.push({ field, message: `必须是数组，且 ${opts.min}-${opts.max ?? opts.min} 条` })
    return []
  }
  const list = v.filter((x): x is string => typeof x === 'string' && x.trim() !== '')
  if (list.length < opts.min) {
    issues.push({ field, message: `至少 ${opts.min} 条，当前 ${list.length} 条` })
  }
  if (opts.max !== undefined && list.length > opts.max) {
    issues.push({ field, message: `最多 ${opts.max} 条，当前 ${list.length} 条` })
  }
  for (const item of list) {
    if (hasUnnegatedClaim(item)) {
      issues.push({
        field,
        message:
          '文本里出现了未加否定的「实测」。本站对外承诺不做自建评测，' +
          // 这一行里必须自带否定词：口径门禁是逐行判断的，
          // 而这行本身就把「我们自己的实测」当反例引用了一遍。
          // 写成「不要…」过不了 —— 门禁的否定词表里没有「不要」，只有「不做」。
          '本站不做自建评测，不要写成「我们自己的实测」—— 那样等于对没做过的事做了陈述。' +
          '请改成「官方基准 / 能力边界判断 / 社区共识」，或明确写成「本站不做实测」。',
      })
      break
    }
  }
  return list
}

export interface ValidateToolInput {
  /** 条目 id，形如 'tool:kimi' */
  itemId: string
  data: unknown
}

/**
 * 校验一份工具资料。
 *
 * 校验规则与 data/tools.ts 的既有约定保持一致（强项/弱项 3-5 条、
 * 别用它做 3 条、14 维评分 0-5 分并带依据），理由是这些内容会经
 * lib/content/ 合并进公开站的数据数组，不符合约定的数据会让
 * 页面渲染出空列表或错误的评分条。
 */
export function validateToolContent(input: ValidateToolInput): ValidationResult {
  const issues: ValidationIssue[] = []
  const { data, itemId } = input

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, issues: [{ field: '', message: '内容必须是一个对象' }] }
  }
  const obj = data as Record<string, unknown>

  const expectedSlug = itemId.startsWith('tool:') ? itemId.slice('tool:'.length) : ''
  if (expectedSlug) {
    if (obj.id !== expectedSlug) {
      issues.push({
        field: 'id',
        message: `id 必须是「${expectedSlug}」，与条目 id 一致。改 id 等于新建一个工具，无法用于覆盖已有条目。`,
      })
    }
    if (typeof obj.id === 'string' && !SLUG_RE.test(obj.id)) {
      issues.push({ field: 'id', message: 'id 只能用小写字母、数字与连字符' })
    }
  }

  requireString(obj, 'name', issues, { max: 40 })
  requireString(obj, 'nameEn', issues, { max: 60 })
  requireString(obj, 'vendor', issues, { max: 40 })
  requireString(obj, 'logo', issues, { max: 200 })
  requireString(obj, 'tagline', issues, { max: 60 })
  requireString(obj, 'description', issues, { min: 20, max: 400 })

  requireStringArray(obj, 'strengths', issues, { min: 3, max: 5 })
  requireStringArray(obj, 'weaknesses', issues, { min: 3, max: 5 })
  requireStringArray(obj, 'avoidFor', issues, { min: 3, max: 3 })
  requireStringArray(obj, 'bestFor', issues, { min: 3, max: 3 })

  if (typeof obj.tags !== 'object' || !Array.isArray(obj.tags) || obj.tags.length === 0) {
    issues.push({ field: 'tags', message: '至少 1 个标签，用于站内搜索' })
  }

  // evidence 是承诺「不做自建评测」的主要落点，必须单独查口径
  if (obj.evidence !== undefined) {
    if (typeof obj.evidence !== 'string') {
      issues.push({ field: 'evidence', message: '必须是文本' })
    } else if (hasUnnegatedClaim(obj.evidence)) {
      issues.push({
        field: 'evidence',
        message:
          '评分依据里出现了未加否定的「实测」。本站不做自建评测，' +
          '请改成「官方公开资料 / 能力边界判断 / 社区公开反馈」。',
      })
    }
  }

  // ── 14 维能力分 ──
  const caps = obj.capabilities
  if (!caps || typeof caps !== 'object' || Array.isArray(caps)) {
    issues.push({ field: 'capabilities', message: '必须包含 14 个维度的评分' })
  } else {
    const capObj = caps as Record<string, unknown>
    for (const key of ADMIN_CAPABILITY_KEYS) {
      const cap = capObj[key]
      if (!cap || typeof cap !== 'object') {
        issues.push({ field: `capabilities.${key}`, message: '缺少该维度的评分' })
        continue
      }
      const c = cap as Record<string, unknown>
      const score = c.score
      if (typeof score !== 'number' || !Number.isFinite(score)) {
        issues.push({ field: `capabilities.${key}.score`, message: '必须是数字' })
      } else if (score < 0 || score > 5) {
        issues.push({ field: `capabilities.${key}.score`, message: `分数必须在 0-5 之间，当前 ${score}` })
      }
      // 依据可以留空（公开站会标「依据写得薄」），但必须能是字符串
      if (c.basis !== undefined && typeof c.basis !== 'string') {
        issues.push({ field: `capabilities.${key}.basis`, message: '必须是文本' })
      } else if (typeof c.basis === 'string' && hasUnnegatedClaim(c.basis)) {
        issues.push({
          field: `capabilities.${key}.basis`,
          message:
            '依据里出现了未加否定的「实测」。本站不做自建评测，' +
            '请改成公开资料或社区共识的表述。',
        })
      }
    }
    const extra = Object.keys(capObj).filter(
      (k) => !(ADMIN_CAPABILITY_KEYS as readonly string[]).includes(k)
    )
    if (extra.length > 0) {
      issues.push({
        field: 'capabilities',
        message: `出现了未知维度：${extra.join(', ')}。维度集合由能力图谱定义，不能自行增删。`,
      })
    }
  }

  // overallScore 是派生字段，由公开站的 lib/score.ts 加权算出。
  // 允许它出现在提交里（表单会把读到的值原样带回来），但要求与手算一致是不现实的，
  // 所以这里只提示；真正的强制手段是 content 层写入时丢弃它。
  if (obj.overallScore !== undefined) {
    issues.push({
      field: 'overallScore',
      message: '综合分由 14 维加权自动计算，保存时会被忽略，不用手工维护。',
      severity: 'warning',
    } as ValidationIssue & { severity: string })
  }

  // ── 替代品引用 ──
  const alts = obj.alternatives
  if (!Array.isArray(alts)) {
    issues.push({ field: 'alternatives', message: '必须是数组' })
  } else {
    const bad = alts.filter((a) => typeof a !== 'string' || !SLUG_RE.test(a))
    if (bad.length > 0) {
      issues.push({ field: 'alternatives', message: '替代品 id 必须是小写 slug' })
    }
    if (alts.includes(obj.id)) {
      issues.push({ field: 'alternatives', message: '不能把自己列为自己的替代品' })
    }
    if (new Set(alts).size !== alts.length) {
      issues.push({ field: 'alternatives', message: '有重复项' })
    }
    // 引用是否真的存在，留给 CI 的 data 测试用完整数据校验 ——
    // 后台拿不到全量工具清单，硬查只会漏。
  }

  // ── 布尔与枚举 ──
  if (typeof obj.chinaAccessible !== 'boolean') {
    issues.push({ field: 'chinaAccessible', message: '必须是 true 或 false' })
  }
  if (typeof obj.hasApi !== 'boolean') {
    issues.push({ field: 'hasApi', message: '必须是 true 或 false' })
  }

  const pricing = obj.pricing
  if (!pricing || typeof pricing !== 'object' || Array.isArray(pricing)) {
    issues.push({ field: 'pricing', message: '必须包含定价信息' })
  } else {
    const p = pricing as Record<string, unknown>
    const model = p.model
    if (!['free', 'freemium', 'paid', 'open-source'].includes(String(model))) {
      issues.push({
        field: 'pricing.model',
        message: '只能是 free / freemium / paid / open-source 之一',
      })
    }
    requireString(p, 'freeTier', issues, { max: 80 })
  }

  // ── 全字段口径扫描 ──
  // 逐个字段查过之后这里再整体扫一遍，防止漏掉某个新增字段
  // （access.note、contextWindow 之类也是用户可见文本）
  const texts: { text: string; path: string }[] = []
  collectUserVisibleText(obj, '', texts)
  for (const { text, path } of texts) {
    if (hasUnnegatedClaim(text)) {
      issues.push({
        field: path || '(根)',
        message: '出现了未加否定的「实测」。本站不做自建评测，请改成公开资料或社区共识的表述。',
      })
      break
    }
  }

  // 去掉与 warnings 混淆的严重项统计：ok 只看 error 级
  const errors = issues.filter((i) => !(i as { severity?: string }).severity)
  return { ok: errors.length === 0, issues }
}

export function validateContent(
  kind: ContentKind,
  itemId: string,
  data: unknown
): ValidationResult {
  if (kind === 'tool') return validateToolContent({ itemId, data })
  return { ok: false, issues: [{ field: '', message: `暂不支持编辑 ${kind} 类型的内容` }] }
}
