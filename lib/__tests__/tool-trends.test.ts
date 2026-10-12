import { describe, expect, it, vi } from 'vitest'
import { freshTrends, summarizeTrends } from '../tool-trends'
import { toTenPointScore } from '../display-score'
import { makeTestEnv, request } from './helpers/admin-test-env'

describe('十分制与公开调用热度', () => {
  it('等比例展示，不制造额外精度；异常分数安全归零或截断', () => {
    expect([0, 1, 3.7, 5].map(toTenPointScore)).toEqual([0, 2, 7.4, 10])
    expect(toTenPointScore(NaN)).toBe(0)
    expect(toTenPointScore(8)).toBe(10)
  })
  it('先合并每天调用量，再按真实模型排名映射系列；忽略 other 和异常行', () => {
    const result = summarizeTrends({
      meta: { as_of: '2026-10-12T00:00:00Z' },
      data: [
        { model_permaslug: 'deepseek/v4', total_tokens: '90071992547409930' },
        { model_permaslug: 'anthropic/claude-5', total_tokens: '50071992547409930' },
        { model_permaslug: 'anthropic/claude-5', total_tokens: '50071992547409930' },
        { model_permaslug: 'other', total_tokens: '999999999999999999999' },
        { model_permaslug: 'openai/gpt-6', total_tokens: 'not-number' },
      ],
    })
    expect(result?.items.map((item) => item.toolId)).toEqual(['claude', 'deepseek'])
    expect(summarizeTrends({ data: [] })).toBeNull()
  })
  it('过期信息不继续标成热门', () => {
    expect(
      freshTrends(
        {
          asOf: '2026-10-01',
          method: 'snapshot',
          items: [{ toolId: 'claude', model: 'Claude', rank: 1 }],
        },
        Date.parse('2026-10-12'),
      ).items,
    ).toEqual([])
  })
  it('匿名入口只返回公开榜单摘要；Key 留在服务端且请求命中缓存', async () => {
    const env = await makeTestEnv()
    env.env.OPENROUTER_API_KEY = 'test-private-key'
    const upstream = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toMatch(/^https:\/\/openrouter.ai\/api\/v1\/datasets\/rankings-daily\?/)
      expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer test-private-key')
      return Response.json({
        meta: { as_of: new Date().toISOString() },
        data: [{ model_permaslug: 'deepseek/v4', total_tokens: '200' }],
      })
    })
    env.env.ASSISTANT_FETCH = upstream
    const first = await request(env, 'GET', '/api/tool-trends')
    expect(first.status).toBe(200)
    expect(first.json.items[0].toolId).toBe('deepseek')
    expect(JSON.stringify(first.json)).not.toContain('test-private-key')
    await request(env, 'GET', '/api/tool-trends')
    expect(upstream).toHaveBeenCalledTimes(1)
  })
  it('上游失败有冷却，不因访客不断刷新重复请求', async () => {
    const env = await makeTestEnv()
    env.env.OPENROUTER_API_KEY = 'test-key'
    const upstream = vi.fn(async () => new Response('', { status: 429 }))
    env.env.ASSISTANT_FETCH = upstream
    await request(env, 'GET', '/api/tool-trends')
    await request(env, 'GET', '/api/tool-trends')
    expect(upstream).toHaveBeenCalledTimes(1)
  })
})
