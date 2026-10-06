/**
 * 勘误反馈 → GitHub Issues（纯静态站下的可行方案）。
 *
 * 为什么不直接调 Issues API 写入：
 * 那需要在浏览器里放一个 GitHub token，等于把 token 公开给所有访客。
 * token 泄露后任何人都能以你的名义改仓库、建 issue、甚至提 PR。
 *
 * 这里采用两个都**不需要 token**的能力：
 * 1) 预填 Issue 链接：用户点一下，GitHub 打开已填好标题与正文的 Issue 表单，
 *    他自己登录提交 —— 相当于"帮用户填好表格"，而不是"替他提交"。
 * 2) 公开 API 读取：GitHub 允许匿名读公开仓库的 issues，
 *    用来显示"这一页已有多少条反馈""哪条数据被质疑最多"，即反馈统计。
 *
 * 仓库未配置时（feedbackRepo 为空），相关入口自动隐藏，
 * 复制与邮件两个出口始终可用 —— 功能不因缺少仓库而降级。
 */
import { buildErrataBatchText, type ErrataSubmission } from './errata'

export const ISSUE_LABEL = '勘误反馈'

export interface FeedbackIssue {
  number: number
  title: string
  htmlUrl: string
  state: 'open' | 'closed'
  createdAt: string
  /** 从正文解析出的页面路径 */
  pageUrl: string
}

/** 构造预填 Issue 的链接（用户点击后在 GitHub 完成提交） */
export function buildIssueUrl(
  repo: string,
  list: ErrataSubmission[],
  options: { titlePrefix?: string } = {}
): string {
  const title = `${options.titlePrefix ?? ''}[勘误] ${list[0]?.pageUrl ?? '站内数据'}${list.length > 1 ? ` 等 ${list.length} 处` : ''}`
  const body = `${buildErrataBatchText(list)}

---
提交者：使用「AI 能力地图」的读者
如果需要补充上下文（你的业务场景、为什么发现这个问题），可以直接追加在下方。`

  const params = new URLSearchParams({
    title,
    body,
    labels: ISSUE_LABEL,
  })
  return `https://github.com/${repo}/issues/new?${params.toString()}`
}

/** 公开 API：读取反馈类issue（无需 token，有速率限制，失败要能降级） */
export function buildIssuesApiUrl(repo: string, perPage = 50): string {
  const params = new URLSearchParams({
    state: 'all',
    labels: ISSUE_LABEL,
    per_page: String(perPage),
    sort: 'created',
    direction: 'desc',
  })
  return `https://api.github.com/repos/${repo}/issues?${params.toString()}`
}

/**
 * 从 issue 正文里把页面路径解析回来。
 *
 * 我们生成正文时第一行固定是「【站点勘误反馈】」，
 * 第二行是「问题页面：xxx」，这里按行解析而不是靠正则，
 * 避免用户手动编辑正文后解析结果错乱。
 */
export function parseIssueBody(body: string): string {
  const lines = (body ?? '').split('\n').slice(0, 6)
  for (const line of lines) {
    const m = line.match(/^问题页面：\s*(\S+)/)
    if (m && m[1].startsWith('/')) return m[1]
  }
  return ''
}

/** 把 GitHub 返回的 issue 规整成我们需要的形状（并过滤掉 PR，PR 也是 issue） */
export function normalizeIssues(raw: unknown): FeedbackIssue[] {
  if (!Array.isArray(raw)) return []
  const out: FeedbackIssue[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    // GitHub 用 pull_request 字段区分 PR，PR 不算反馈
    if (o.pull_request) continue
    if (typeof o.number !== 'number' || typeof o.html_url !== 'string') continue
    out.push({
      number: o.number,
      title: String(o.title ?? ''),
      htmlUrl: o.html_url,
      state: o.state === 'closed' ? 'closed' : 'open',
      createdAt: String(o.created_at ?? ''),
      pageUrl: parseIssueBody(String(o.body ?? '')),
    })
  }
  return out
}

export interface FeedbackStats {
  total: number
  open: number
  closed: number
  /** 按页面聚合，含次数 */
  byPage: { pageUrl: string; count: number; issues: FeedbackIssue[] }[]
  /** 最近 5 条 */
  recent: FeedbackIssue[]
}

/** 汇总统计：哪些页面的数据被质疑最多 */
export function aggregateFeedback(issues: FeedbackIssue[]): FeedbackStats {
  const total = issues.length
  const open = issues.filter((i) => i.state === 'open').length
  const closed = issues.filter((i) => i.state === 'closed').length

  const map = new Map<string, FeedbackIssue[]>()
  for (const issue of issues) {
    const key = issue.pageUrl || '(未标注页面)'
    const list = map.get(key) ?? []
    list.push(issue)
    map.set(key, list)
  }

  const byPage = [...map.entries()]
    .map(([pageUrl, list]) => ({ pageUrl, count: list.length, issues: list }))
    .sort((a, b) => b.count - a.count)

  return {
    total,
    open,
    closed,
    byPage,
    recent: issues.slice(0, 5),
  }
}

/** 某一条内容已有的反馈数（用于详情页提示"这条已被质疑过"） */
export function feedbackCountFor(stats: FeedbackStats, pageUrl: string): number {
  return stats.byPage.find((p) => p.pageUrl === pageUrl)?.count ?? 0
}

/** 仓库地址是否看起来合法（防把用户输入拼成坏 URL） */
export function isValidRepo(repo: string): boolean {
  return /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(repo.trim())
}
