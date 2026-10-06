import { describe, expect, it } from 'vitest'
import {
  aggregateFeedback,
  buildIssueUrl,
  buildIssuesApiUrl,
  feedbackCountFor,
  isValidRepo,
  normalizeIssues,
  parseIssueBody,
  type FeedbackIssue,
} from '../feedback-stats'
import type { ErrataSubmission } from '../errata'

const sub: ErrataSubmission = {
  id: 'a1',
  pageUrl: '/tools/deepseek',
  field: '价格与额度',
  problem: '价格过时',
  correction: '以官网为准',
  sourceUrl: 'https://example.com/pricing',
  note: '',
  createdAt: '2026-10-05T00:00:00.000Z',
}

function issue(n: number, page: string, state: 'open' | 'closed' = 'open'): FeedbackIssue {
  return {
    number: n,
    title: `[勘误] ${page}`,
    htmlUrl: `https://github.com/o/r/issues/${n}`,
    state,
    createdAt: '2026-10-05T00:00:00Z',
    pageUrl: page,
  }
}

describe('buildIssueUrl', () => {
  it('指向该仓库的新建 Issue 页，并预填标题与正文', () => {
    const url = buildIssueUrl('owner/repo', [sub])
    expect(url.startsWith('https://github.com/owner/repo/issues/new?')).toBe(true)
    const params = new URL(url).searchParams
    expect(params.get('title')).toContain('[勘误]')
    expect(params.get('title')).toContain('/tools/deepseek')
    expect(params.get('body')).toContain('问题页面：/tools/deepseek')
    expect(params.get('labels')).toContain('勘误反馈')
  })

  it('多条反馈时标题标明数量', () => {
    const url = buildIssueUrl('owner/repo', [sub, { ...sub, id: 'a2' }])
    expect(new URL(url).searchParams.get('title')).toContain('2 处')
  })

  it('正文包含我们生成的结构化内容', () => {
    const url = buildIssueUrl('owner/repo', [sub])
    expect(decodeURIComponent(new URL(url).searchParams.get('body') ?? '')).toContain(
      '依据链接：https://example.com/pricing'
    )
  })

  it('正文里说明这是站点读者提交的', () => {
    const url = buildIssueUrl('owner/repo', [sub])
    expect(new URL(url).searchParams.get('body')).toContain('站点')
  })
})

describe('buildIssuesApiUrl', () => {
  it('按标签筛选并请求公开 API', () => {
    const url = buildIssuesApiUrl('owner/repo', 10)
    expect(url).toContain('https://api.github.com/repos/owner/repo/issues')
    expect(url).toContain('labels=' + encodeURIComponent('勘误反馈'))
    expect(url).toContain('per_page=10')
    expect(url).toContain('state=all')
  })
})

describe('parseIssueBody', () => {
  it('解析我们自己生成的正文', () => {
    const body = '【站点勘误反馈】\n问题页面：/tools/kimi\n问题字段：弱项\n问题描述：xxx'
    expect(parseIssueBody(body)).toBe('/tools/kimi')
  })

  it('用户改写正文后仍能解析（只要前几行还在）', () => {
    const body = '补充：我是数学老师\n问题页面：/learn/rag\n问题字段：定义'
    expect(parseIssueBody(body)).toBe('/learn/rag')
  })

  it('解析不到时返回空串而不是抛错', () => {
    expect(parseIssueBody('')).toBe('')
    expect(parseIssueBody('完全无关的内容')).toBe('')
    expect(parseIssueBody(undefined as unknown as string)).toBe('')
  })

  it('不把站外 URL 当成页面路径', () => {
    expect(parseIssueBody('问题页面：https://evil.com')).toBe('')
  })
})

describe('normalizeIssues', () => {
  it('过滤掉 PR（GitHub 里 PR 也是 issue）', () => {
    const raw = [
      { number: 1, title: 'a', html_url: 'u1', state: 'open', body: '', created_at: 'x' },
      { number: 2, title: 'b', html_url: 'u2', state: 'open', body: '', created_at: 'x', pull_request: {} },
    ]
    expect(normalizeIssues(raw).map((i) => i.number)).toEqual([1])
  })

  it('结构异常的条目被跳过，不影响其他条目', () => {
    const raw = [null, { nope: 1 }, { number: 5, title: 'x', html_url: 'u', state: 'closed', body: '' }]
    expect(normalizeIssues(raw).map((i) => i.number)).toEqual([5])
    expect(normalizeIssues(raw)[0].state).toBe('closed')
  })

  it('非数组输入返回空列表（API 报错时不崩）', () => {
    expect(normalizeIssues(null)).toEqual([])
    expect(normalizeIssues({ message: 'rate limited' })).toEqual([])
  })
})

describe('aggregateFeedback', () => {
  const issues = [
    issue(1, '/tools/deepseek'),
    issue(2, '/tools/deepseek'),
    issue(3, '/tools/kimi'),
    issue(4, '/tools/kimi', 'closed'),
    issue(5, '/learn/rag'),
    { ...issue(6, ''), pageUrl: '(未标注页面)' },
  ]

  it('统计总数 / 未解决 / 已解决', () => {
    const s = aggregateFeedback(issues)
    expect(s.total).toBe(6)
    expect(s.closed).toBe(1)
    expect(s.open).toBe(5)
  })

  it('按页面聚合，次数多的排前面', () => {
    const s = aggregateFeedback(issues)
    expect(s.byPage[0]).toMatchObject({ pageUrl: '/tools/deepseek', count: 2 })
    expect(s.byPage.map((p) => p.pageUrl)).toContain('/learn/rag')
    expect(s.byPage.map((p) => p.count)).toEqual([...s.byPage.map((p) => p.count)].sort((a, b) => b - a))
  })

  it('未标注页面的反馈单独归类，不会丢失', () => {
    const s = aggregateFeedback(issues)
    expect(s.byPage.some((p) => p.pageUrl === '(未标注页面)' && p.count === 1)).toBe(true)
    expect(s.byPage.reduce((sum, p) => sum + p.count, 0)).toBe(issues.length)
  })

  it('空列表也能汇总（未配置仓库时的正常状态）', () => {
    const s = aggregateFeedback([])
    expect(s.total).toBe(0)
    expect(s.byPage).toEqual([])
    expect(feedbackCountFor(s, '/tools/deepseek')).toBe(0)
  })
})

describe('feedbackCountFor', () => {
  it('返回该页面的反馈条数', () => {
    const stats = aggregateFeedback([issue(1, '/tools/kimi'), issue(2, '/tools/kimi'), issue(3, '/tools/x')])
    expect(feedbackCountFor(stats, '/tools/kimi')).toBe(2)
    expect(feedbackCountFor(stats, '/tools/x')).toBe(1)
    expect(feedbackCountFor(stats, '/none')).toBe(0)
  })
})

describe('isValidRepo', () => {
  it('接受 owner/repo', () => {
    expect(isValidRepo('owner/repo')).toBe(true)
    expect(isValidRepo('my-org/my_site.v2')).toBe(true)
  })

  it('拒绝非法形态（防止拼出坏 URL 或注入）', () => {
    expect(isValidRepo('')).toBe(false)
    expect(isValidRepo('justowner')).toBe(false)
    expect(isValidRepo('owner/repo/extra')).toBe(false)
    expect(isValidRepo('https://github.com/owner/repo')).toBe(false)
    expect(isValidRepo('owner/repo?x=1')).toBe(false)
  })
})