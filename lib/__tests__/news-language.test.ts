import { describe, expect, it, vi } from 'vitest'
import { makeTestEnv } from './helpers/admin-test-env'
import { NEWS_SOURCES } from '../news/sources'
import { ensureNews, readNews, refreshNews, editNews } from '../news/service'
import { acceptedTranslation, localizeNews } from '../news/localize'
import { newsDisplay } from '../news/display'
import { assistantNewsTranslations } from '../assistant-service'

const now = new Date('2026-10-13T08:00:00Z')
const source = NEWS_SOURCES.find((s) => s.id === 'openai')!
const url = 'https://openai.com/index/language-test'
async function fixture(title = 'GPT-6 new controls') {
  const env = await makeTestEnv()
  const body = `<rss><item><title>${title}</title><link>${url}</link><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate><description><![CDATA[<p>GPT-6 adds account controls.</p><script>private()</script>]]></description></item></rss>`
  await refreshNews(env.db, {
    force: true,
    now,
    sources: [source],
    fetcher: vi.fn().mockResolvedValue(new Response(body)),
  })
  return env
}
describe('来源保留与中文整理', () => {
  it('短摘录净化后整理，保留原始标题、URL、日期且不冒充人工复核', async () => {
    const env = await fixture()
    const translator = vi.fn(async (inputs) => {
      expect(inputs[0].excerpt).toBe('GPT-6 adds account controls.')
      return [
        {
          id: inputs[0].id,
          title: 'GPT-6 新增账号控制',
          summary: '官方介绍 GPT-6 的账号控制更新。',
        },
      ]
    })
    expect(await localizeNews(env.db, translator, now)).toBe(1)
    const item = (await readNews(env.db, { now })).items.find((item) => item.url === url)!
    expect(item).toMatchObject({
      title: 'GPT-6 新增账号控制',
      originalTitle: 'GPT-6 new controls',
      reviewed: false,
      translation: 'automatic',
      url,
      publishedAt: '2026-10-12T10:00:00.000Z',
    })
    expect(newsDisplay(item).languageLabel).toBe('自动中文整理')
    expect(await localizeNews(env.db, translator, new Date(now.getTime() + 600000))).toBe(0)
    expect(translator).toHaveBeenCalledTimes(1)
  })
  it('失败使用明确的中文等待提示，不生成猜测内容，半小时内不重试相同消息', async () => {
    const env = await fixture()
    const translator = vi
      .fn()
      .mockRejectedValue(new Error('upstream private key should not escape'))
    expect(await localizeNews(env.db, translator, now)).toBe(0)
    const item = (await readNews(env.db, { now })).items.find((item) => item.url === url)!
    expect(newsDisplay(item).summary).toContain('正在整理')
    expect(newsDisplay(item).title).not.toBe(item.originalTitle)
    await localizeNews(env.db, translator, new Date(now.getTime() + 600000))
    expect(translator).toHaveBeenCalledTimes(1)
  })
  it('同步原始标题变化时，旧译文立即失效', async () => {
    const env = await fixture()
    await localizeNews(
      env.db,
      async (items) => [{ id: items[0].id, title: 'GPT-6 账号控制', summary: '' }],
      now,
    )
    await refreshNews(env.db, {
      force: true,
      now,
      sources: [source],
      fetcher: vi
        .fn()
        .mockResolvedValue(
          new Response(
            `<rss><item><title>GPT-6 revised announcement</title><link>${url}</link><pubDate>Mon, 12 Oct 2026 10:00:00 GMT</pubDate></item></rss>`,
          ),
        ),
    })
    const item = (await readNews(env.db, { now })).items.find((item) => item.url === url)!
    expect(item.title).toBe('GPT-6 revised announcement')
    expect(item.translation).toBeUndefined()
  })
  it('并发锁与每日次数上限阻止访客重复消耗配额', async () => {
    const env = await fixture()
    const translator = vi.fn(async () => [])
    await Promise.all([
      localizeNews(env.db, translator, now),
      localizeNews(env.db, translator, now),
    ])
    expect(translator).toHaveBeenCalledTimes(1)
    await env.db.run('UPDATE news_language_budget SET count=24')
    await env.db.run('UPDATE news_localizations SET attempted_at=NULL')
    await localizeNews(env.db, translator, new Date(now.getTime() + 600000))
    expect(translator).toHaveBeenCalledTimes(1)
  })
  it('整理过程中发生的管理员编辑、隐藏操作不会被译文覆盖', async () => {
    const env = await fixture()
    await localizeNews(
      env.db,
      async (items) => {
        await editNews(env.db, items[0].id, {
          title: '管理员确认的消息',
          summary: '已核对摘要',
          hidden: true,
        })
        return [{ id: items[0].id, title: 'GPT-6 译文', summary: '译文摘要' }]
      },
      now,
    )
    const item = (await readNews(env.db, { now, includeHidden: true })).items.find(
      (item) => item.url === url,
    )!
    expect(item).toMatchObject({ title: '管理员确认的消息', summary: '已核对摘要', hidden: true })
    expect(item.translation).toBeUndefined()
  })
  it('只用固定免费路由，空配置时不发请求，已有凭据不会出现在返回内容中', async () => {
    const env = await fixture()
    const fetcher = vi.fn(async (_url, options) => {
      const body = JSON.parse(options.body)
      expect(body.model).toBe('openrouter/free')
      const inputs = JSON.parse(body.messages[1].content)
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify([
                  { id: inputs[0].id, title: 'GPT-6 新增控制', summary: '' },
                ]),
              },
            },
          ],
        }),
      )
    })
    expect(await assistantNewsTranslations(env.db, { ASSISTANT_FETCH: fetcher })).toBe(0)
    expect(fetcher).not.toHaveBeenCalled()
    expect(
      await assistantNewsTranslations(env.db, {
        OPENROUTER_API_KEY: 'test-only-secret',
        ASSISTANT_FETCH: fetcher,
      }),
    ).toBe(1)
    const feed = await readNews(env.db, { now })
    expect(JSON.stringify(feed)).not.toContain('test-only-secret')
    expect(fetcher.mock.calls[0][0]).toBe('https://openrouter.ai/api/v1/chat/completions')
  })
  it('旧表升级重复执行仍保留全部消息与人工字段', async () => {
    const env = await fixture()
    await env.db.exec('DROP TABLE news_localizations; DROP TABLE news_language_lock;')
    await ensureNews(env.db, now)
    await ensureNews(env.db, now)
    expect((await readNews(env.db, { now })).items.some((item) => item.url === url)).toBe(true)
  })
})
describe('译文边界', () => {
  const input = { id: 'a', title: 'GPT-6 adds controls', excerpt: '' }
  it('拒绝新增数字、链接、HTML、非中文或其他消息的输出', () => {
    for (const output of [
      { id: 'a', title: 'GPT-7 新版本' },
      { id: 'a', title: '免费 100 次' },
      { id: 'a', title: 'GPT-6 <script>坏内容</script>' },
      { id: 'a', title: 'GPT-6 https://evil.test 中文' },
      { id: 'a', title: 'English only' },
      { id: 'other', title: '中文内容' },
    ])
      expect(acceptedTranslation(output, input)).toBeNull()
  })
  it('仅有标题时丢弃模型自行生成的摘要', () => {
    expect(
      acceptedTranslation(
        { id: 'a', title: 'GPT-6 新增控制', summary: '猜测功能已全面开放' },
        input,
      ),
    ).toEqual({ title: 'GPT-6 新增控制', summary: null })
  })
})
