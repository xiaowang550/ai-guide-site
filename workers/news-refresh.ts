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
        console.log('工具来源检查', await checkToolSources(db))
      }),
    )
  },
  async fetch() {
    return new Response('Not Found', { status: 404 })
  },
}

export default worker
