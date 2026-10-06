/**
 * 勘误反馈的数据模型与纯逻辑（可单测）。
 *
 * 站点没有后端，反馈无法直接提交到服务器。要让反馈闭环可用，
 * 就必须解决三件事：
 *   1) **结构化**：让填写出来的东西能直接入库，而不是一句自由文本
 *   2) **可携带**：一键复制成纯文本，或用 mailto: 带内容跳到收件箱
 *   3) **不丢失**：本地暂存队列，避免用户填一半关掉页面就白填
 *
 * 这三条都只能在前端完成，所以逻辑写成纯函数便于测试。
 */

export interface ErrataSubmission {
  id: string
  /** 问题出现在哪个页面（站内路由） */
  pageUrl: string
  /** 出问题的字段，例如「弱项」「价格」「评分依据」 */
  field: string
  /** 现在的说法是什么 / 问题是什么 */
  problem: string
  /** 应该改成什么（可留空，表示只是"我有疑问"） */
  correction: string
  /** 依据链接（强烈建议填，这是核对的关键） */
  sourceUrl: string
  /** 怎么发现的（可选） */
  note: string
  /** 填写时间 ISO */
  createdAt: string
}

export const ERRATA_FIELDS = [
  '评分依据',
  '能力分数',
  '强项 / 弱点',
  '别用它做',
  '价格与额度',
  '功能描述',
  '上下文 / 多模态',
  '大陆可直连',
  '更新时间',
  '链接失效',
  '其他',
] as const

export const ERRATA_STORAGE_KEY = 'ai-map:errata-queue:v1'

export function createEmptySubmission(pageUrl = ''): ErrataSubmission {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    pageUrl,
    field: ERRATA_FIELDS[0],
    problem: '',
    correction: '',
    sourceUrl: '',
    note: '',
    createdAt: new Date().toISOString(),
  }
}

/** 只填了内容才算一条可提交的反馈 */
export function hasContent(s: ErrataSubmission): boolean {
  return s.problem.trim().length > 0
}

export interface ValidationResult {
  ok: boolean
  /** 缺失的必填项 */
  missing: string[]
  /** 提醒但不拦着提交 */
  warnings: string[]
}

export function validateSubmission(s: ErrataSubmission): ValidationResult {
  const missing: string[] = []
  const warnings: string[] = []

  if (!s.pageUrl.trim()) missing.push('问题页面')
  if (!s.problem.trim()) missing.push('问题描述')

  if (s.pageUrl.trim() && !s.pageUrl.trim().startsWith('/')) {
    warnings.push('页面建议填写站内路径（例如 /tools/deepseek），方便我们直接定位')
  }
  if (!s.sourceUrl.trim()) {
    warnings.push('没有填依据链接：勘误被采纳的概率会低一些，但我们仍会核对')
  }
  if (!s.sourceUrl.trim() && s.correction.trim()) {
    warnings.push('给了修改建议但没给依据，容易出现双方理解不一致')
  }

  return { ok: missing.length === 0, missing, warnings }
}

/** 生成可直接入库的纯文本（复制 / 邮件正文都用它） */
export function buildErrataText(s: ErrataSubmission): string {
  const lines = [
    '【站点勘误反馈】',
    `问题页面：${s.pageUrl.trim() || '(未填写)'}`,
    `问题字段：${s.field}`,
    `问题描述：${s.problem.trim()}`,
  ]
  if (s.correction.trim()) lines.push(`建议修改为：${s.correction.trim()}`)
  lines.push(`依据链接：${s.sourceUrl.trim() || '(未提供)'}`)
  if (s.note.trim()) lines.push(`补充说明：${s.note.trim()}`)
  lines.push(`提交时间：${s.createdAt.slice(0, 16).replace('T', ' ')}`)
  return lines.join('\n')
}

/** 多条合并成一份，方便一次发完 */
export function buildErrataBatchText(list: ErrataSubmission[]): string {
  if (list.length === 0) return ''
  if (list.length === 1) return buildErrataText(list[0])
  const parts = list.map((s, i) => `--- 第 ${i + 1} 条 ---\n${buildErrataText(s)}`)
  return `【站点勘误反馈】共 ${list.length} 条\n\n${parts.join('\n\n')}`
}

/** 生成 mailto: 链接（mailto 有长度上限，超长时提示改用复制） */
export function buildMailto(list: ErrataSubmission[], address: string): {
  href: string
  /** 主题 */
  subject: string
  /** 正文是否过长（mailto 可能被邮件客户端截断） */
  tooLong: boolean
} {
  const body = buildErrataBatchText(list)
  const subject = `勘误反馈 ${list.length} 条`
  const encoded = encodeURIComponent(body)
  // 各家邮件客户端的 URL 上限差异很大，1800 字符是比较安全的阈值
  const tooLong = body.length > 1800
  return {
    href: `mailto:${address}?subject=${encodeURIComponent(subject)}&body=${encoded}`,
    subject,
    tooLong,
  }
}

/** 本地队列读写（容错：数据损坏时返回空队列而不是崩） */
export function readQueue(storage: Pick<Storage, 'getItem'>): ErrataSubmission[] {
  try {
    const raw = storage.getItem(ERRATA_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (x): x is ErrataSubmission =>
        x && typeof x.id === 'string' && typeof x.problem === 'string'
    )
  } catch {
    return []
  }
}

export function writeQueue(
  storage: Pick<Storage, 'setItem'>,
  list: ErrataSubmission[]
): void {
  try {
    storage.setItem(ERRATA_STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* 隐私模式 / 配额满：反馈仍可复制导出，不阻断使用 */
  }
}

export function addToQueue(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  submission: ErrataSubmission
): ErrataSubmission[] {
  const next = [submission, ...readQueue(storage)].slice(0, 20)
  writeQueue(storage, next)
  return next
}

export function removeFromQueue(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  id: string
): ErrataSubmission[] {
  const next = readQueue(storage).filter((s) => s.id !== id)
  writeQueue(storage, next)
  return next
}

/** 校验从 URL 传入的 from 参数是否安全（只允许站内路径，防止开放重定向） */
export function safePageParam(raw: string | undefined): string {
  if (!raw) return ''
  const value = raw.trim()
  if (!value.startsWith('/')) return ''
  if (value.startsWith('//')) return '' // 协议相对 URL 会跳出站点
  return value.slice(0, 120)
}
