import { afterEach, describe, expect, it, vi } from 'vitest'
import { login, makeTestEnv, request } from './helpers/admin-test-env'
import { TOOL_WATCH_SOURCES } from '@/lib/news/tool-sources'
import { NEWS_SOURCES } from '@/lib/news/sources'
import { parseNews, trustedUrl } from '@/lib/news/parse'
import { editNews, ensureNews, readNews, refreshNews } from '@/lib/news/service'
import { applyToolReview } from '@/data/tool-reviews'
import { tools } from '@/data/tools'
import { checkToolSources, readToolSourceStates } from '@/lib/news/tool-watch'

afterEach(() => vi.unstubAllGlobals())
const now = new Date('2026-10-08T08:00:00Z')
const openai = NEWS_SOURCES.find((source) => source.id === 'openai')!
const rss = (title = 'GPT-6 new feature', url = 'https://openai.com/index/new-feature/') =>
  `<rss><channel><item><title>${title}</title><link>${url}</link><pubDate>Wed, 07 Oct 2026 10:00:00 GMT</pubDate></item></channel></rss>`

describe('官方消息解析', () => {
  it('Cursor 日期链接不遮盖后面的真实标题', () => {
    const source = NEWS_SOURCES.find((item) => item.id === 'cursor')!
    const html =
      '<a href="/changelog/remote-control"><time dateTime="2026-10-06T00:00:00Z">Oct 6, 2026</time></a><h1><a href="/changelog/remote-control">Remote control for local agents</a></h1>'
    expect(parseNews(html, source, now)[0].title).toBe('Remote control for local agents')
  })
  it('区分发布时间与获取时间，并规范化去重链接', () => {
    const items = parseNews(
      rss() + rss('duplicate', 'https://openai.com/index/new-feature?utm_source=test'),
      openai,
      now,
    )
    expect(items).toHaveLength(1)
    expect(items[0].publishedAt).toBe('2026-10-07T10:00:00.000Z')
    expect(items[0].url).toBe('https://openai.com/index/new-feature')
  })
  it('拒绝冒充官方来源、执行协议、超远未来日期和实体声明', () => {
    for (const url of [
      'https://openai.com.evil.test/news',
      'javascript:alert(1)',
      'https://user:pass@openai.com/news',
    ])
      expect(trustedUrl(url, openai)).toBeNull()
    expect(parseNews(rss().replace('2026', '2028'), openai, now)).toEqual([])
    expect(() =>
      parseNews('<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///secret">]>' + rss(), openai, now),
    ).toThrow()
  })
  it('Qwen 当前文章接口保留含小数版本号的路径，日期不受机器时区影响', () => {
    const source = NEWS_SOURCES.find((item) => item.id === 'qwen')!
    const body = JSON.stringify({
      data: {
        articles: [
          { title: 'Qwen Image 2.1', path: 'qwen-image-2.1', extra: { date: '2026-09-20' } },
          { title: 'bad', path: '../bad', extra: { date: '2026-09-20' } },
        ],
      },
    })
    expect(parseNews(body, source, now)).toMatchObject([
      { url: 'https://qwen.ai/blog?id=qwen-image-2.1', publishedAt: '2026-09-20T00:00:00.000Z' },
    ])
  })
  it('不把 GitHub 草稿和预发布版本当成正式发布', () => {
    const source = NEWS_SOURCES.find((item) => item.id === 'ollama')!
    const release = {
      name: 'v0.40.1',
      html_url: 'https://github.com/ollama/ollama/releases/tag/v0.40.1',
      published_at: '2026-10-07T23:22:59Z',
    }
    expect(
      parseNews(JSON.stringify([release, { ...release, prerelease: true }]), source, now),
    ).toHaveLength(1)
  })
})

describe('持续同步与后台权限', () => {
  it('未采集或断网时保留已核对快照，公开响应不缓存', async () => {
    const env = await makeTestEnv()
    const response = await request(env, 'GET', '/api/news')
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toMatch(/no-store/)
    expect(response.json.items.length).toBeGreaterThan(0)
    expect(response.json.lastFetchedAt).toBeNull()
    expect(response.json.stale).toBe(true)
    const before = await readNews(env.db, { now })
    await refreshNews(env.db, {
      now,
      force: true,
      sources: [openai],
      fetcher: vi.fn().mockRejectedValue(new Error('internal-secret')),
    })
    const after = await readNews(env.db, { now })
    expect(after.items).toEqual(before.items)
    expect(after.sources.find((item) => item.id === 'openai')).not.toHaveProperty('error')
    expect(
      (await readNews(env.db, { now, includeHidden: true })).sources.find(
        (item) => item.id === 'openai',
      )?.error,
    ).toBe('internal-secret')
  })
  it('部分来源失败不影响其他来源，新消息只创建一条相关工具复核任务', async () => {
    const env = await makeTestEnv()
    const google = NEWS_SOURCES.find((item) => item.id === 'google')!
    const fetcher = vi.fn(async (url: string | URL | Request) =>
      String(url) === openai.url
        ? new Response(rss(), { headers: { etag: 'version1' } })
        : new Response('', { status: 503 }),
    )
    const first = await refreshNews(env.db, {
      now,
      force: true,
      sources: [openai, google],
      fetcher,
    })
    expect(first).toMatchObject({ added: 1, succeeded: 1, failed: 1 })
    expect((await env.db.all('SELECT * FROM review_tasks')).length).toBe(1)
    const again = await refreshNews(env.db, { now, force: true, sources: [openai], fetcher })
    expect(again.added).toBe(0)
    expect((await env.db.all('SELECT * FROM review_tasks')).length).toBe(1)
  })
  it('304 保留消息并更新检查时间；30 分钟内不会重复采集', async () => {
    const env = await makeTestEnv()
    await refreshNews(env.db, {
      now,
      force: true,
      sources: [openai],
      fetcher: vi.fn().mockResolvedValue(new Response(rss(), { headers: { etag: 'v1' } })),
    })
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 304 }))
    expect((await refreshNews(env.db, { now, sources: [openai], fetcher })).skipped).toBe(true)
    expect(fetcher).not.toHaveBeenCalled()
    const later = new Date(now.getTime() + 31 * 60000)
    await refreshNews(env.db, { now: later, sources: [openai], fetcher })
    expect(fetcher.mock.calls[0][1].headers['If-None-Match']).toBe('v1')
    expect((await readNews(env.db, { now: later })).lastFetchedAt).toBe(later.toISOString())
    expect(
      (await readNews(env.db, { tool: 'chatgpt', now: later })).items.some(
        (item) => item.title === 'GPT-6 new feature',
      ),
    ).toBe(true)
  })
  it('重定向仅允许固定官方域名，并保留原始尾斜线避免重定向循环', async () => {
    const env = await makeTestEnv()
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 308, headers: { location: 'https://openai.com/news/' } }),
      )
      .mockResolvedValueOnce(new Response(rss()))
    expect(
      (await refreshNews(env.db, { now, force: true, sources: [openai], fetcher })).succeeded,
    ).toBe(1)
    expect(fetcher.mock.calls[1][0]).toBe('https://openai.com/news/')
    const blocked = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }),
      )
    expect(
      (await refreshNews(env.db, { now, force: true, sources: [openai], fetcher: blocked })).failed,
    ).toBe(1)
    expect(blocked).toHaveBeenCalledTimes(1)
  })
  it('同步锁阻止并发任务；管理员标题和隐藏设置不被下次同步覆盖', async () => {
    const env = await makeTestEnv()
    await ensureNews(env.db, now)
    await env.db.run('INSERT INTO news_refresh_lock VALUES (1,?,?)', [
      'other',
      now.getTime() + 10000,
    ])
    const fetcher = vi.fn().mockResolvedValue(new Response(rss()))
    expect(
      (await refreshNews(env.db, { now, force: true, sources: [openai], fetcher })).skipped,
    ).toBe(true)
    expect(fetcher).not.toHaveBeenCalled()
    await env.db.run('UPDATE news_refresh_lock SET until_ms=0')
    await refreshNews(env.db, { now, force: true, sources: [openai], fetcher })
    const item = (await readNews(env.db, { now })).items.find(
      (item) => item.title === 'GPT-6 new feature',
    )!
    await editNews(env.db, item.id, { title: '中文标题', summary: '核对后的短摘要', hidden: true })
    await refreshNews(env.db, {
      now,
      force: true,
      sources: [openai],
      fetcher: vi.fn().mockResolvedValue(new Response(rss('changed original title'))),
    })
    expect((await readNews(env.db, { now })).items.some((row) => row.id === item.id)).toBe(false)
    expect(
      (await readNews(env.db, { now, includeHidden: true })).items.find(
        (row) => row.id === item.id,
      ),
    ).toMatchObject({ title: '中文标题', summary: '核对后的短摘要', hidden: true })
  })
  it('旧雷达与资讯编辑只供所有者访问，并校验同源和输入长度', async () => {
    const env = await makeTestEnv({ withAdmin: true })
    for (const path of ['/api/admin/news', '/api/admin/update-radar'])
      expect((await request(env, 'GET', path)).status).toBe(401)
    expect((await request(env, 'POST', '/api/admin/news/refresh')).status).toBe(401)
    await login(env)
    const feed = await request(env, 'GET', '/api/admin/news')
    const id = feed.json.items[0].id
    expect((await request(env, 'GET', '/api/admin/update-radar')).json.publicEnabled).toBe(false)
    expect(
      (await request(env, 'PATCH', `/api/admin/news/${id}`, { title: 'x'.repeat(231) })).status,
    ).toBe(400)
    expect(
      (
        await request(
          env,
          'PATCH',
          `/api/admin/news/${id}`,
          { hidden: true },
          { origin: 'https://evil.test' },
        )
      ).status,
    ).toBe(403)
    expect(
      (await request(env, 'PATCH', `/api/admin/news/${id}`, { title: '核对后的消息' })).status,
    ).toBe(200)
    expect((await env.db.all("SELECT * FROM audit_log WHERE action='news-edit'")).length).toBe(1)
    await env.db.run("UPDATE admins SET role='editor'")
    expect((await request(env, 'GET', '/api/admin/news')).status).toBe(403)
  })
})

describe('资料复核优先级', () => {
  it('已纠正的资料不会被历史快照盖回去，但之后的管理员编辑仍优先', () => {
    const claude = tools.find((tool) => tool.id === 'claude')!
    expect(claude.weaknesses.join(' ')).not.toContain('主产品不做联网')
    expect(claude.capabilities.research.score).toBe(3)
    const edited = { ...claude, description: '管理员新增的使用场景', updatedAt: '2026-10-09' }
    expect(applyToolReview(edited)).toBe(edited)
    const stale = { ...claude, description: '历史文本', updatedAt: '2026-09-01' }
    expect(applyToolReview(stale).description).not.toBe('历史文本')
  })
})

describe('全部工具的来源维护', () => {
  it('首次检查不编造更新，正文变化生成待办，失败保留最后成功时间', async () => {
    const env = await makeTestEnv()
    const html = (price: string) =>
      `<html><main><h1>Official pricing</h1><p>${'Current product plan and usage information. '.repeat(5)}${price}</p></main></html>`
    const initial = await checkToolSources(env.db, {
      now,
      ids: ['cursor'],
      fetcher: vi.fn().mockResolvedValue(new Response(html('$20'))),
    })
    expect(initial).toMatchObject({ changed: 0, succeeded: 1 })
    expect((await readToolSourceStates(env.db)).length).toBe(TOOL_WATCH_SOURCES.length)
    expect((await env.db.all('SELECT * FROM review_tasks')).length).toBe(0)
    const changed = await checkToolSources(env.db, {
      now: new Date(now.getTime() + 7 * 3600000),
      ids: ['cursor'],
      fetcher: vi.fn().mockResolvedValue(new Response(html('$25'))),
    })
    expect(changed).toMatchObject({ changed: 1, succeeded: 1 })
    expect((await env.db.all('SELECT * FROM review_tasks')).length).toBe(1)
    const before = (await readToolSourceStates(env.db)).find((item) => item.id === 'cursor')!
    await checkToolSources(env.db, {
      now: new Date(now.getTime() + 14 * 3600000),
      ids: ['cursor'],
      fetcher: vi.fn().mockRejectedValue(new Error('network failed')),
    })
    const after = (await readToolSourceStates(env.db)).find((item) => item.id === 'cursor')!
    expect(after.succeededAt).toBe(before.succeededAt)
    expect(after.status).toBe('error')
    expect(after.error).toBe('network failed')
  })
  it('不把 CSR 空壳、验证码或同域短页面视为已核验正文', async () => {
    const env = await makeTestEnv()
    const result = await checkToolSources(env.db, {
      now,
      ids: ['cursor'],
      fetcher: vi
        .fn()
        .mockResolvedValue(new Response('<html><script>const currentPrice=20</script></html>')),
    })
    expect(result.failed).toBe(1)
    expect(
      (await readToolSourceStates(env.db)).find((item) => item.id === 'cursor')?.succeededAt,
    ).toBeNull()
  })
})
