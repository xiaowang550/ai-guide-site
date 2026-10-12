import { createD1Db, type D1Database } from '../lib/db/d1'
import { refreshNews } from '../lib/news/service'
import { checkToolSources } from '../lib/news/tool-watch'

const worker = {
  async scheduled(
    _event: unknown,
    env: { DB: D1Database },
    context: { waitUntil: (work: Promise<unknown>) => void },
  ) {
    const db = createD1Db(env.DB)
    context.waitUntil(
      refreshNews(db).then(async (result) => {
        console.log('AI 资讯同步', result)
        // 中文整理在 Pages 中读取已加密的助手凭据；定时任务无需复制任何密钥。
        try {
          const response = await fetch('https://ai-guide-site.pages.dev/api/news?limit=1', {
            redirect: 'manual',
            signal: AbortSignal.timeout(10000),
          })
          if (!response.ok) console.warn('中文整理触发暂不可用', response.status)
          await response.body?.cancel()
        } catch {
          console.warn('中文整理触发暂不可用')
        }
        console.log('工具来源检查', await checkToolSources(db))
      }),
    )
  },
  async fetch() {
    return new Response('Not Found', { status: 404 })
  },
}

export default worker
