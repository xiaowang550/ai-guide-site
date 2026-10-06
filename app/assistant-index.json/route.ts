import { tools, concepts, guides, searchDocs } from '@/data'
import { scenarios } from '@/data/scenarios'

/**
 * 助手索引（静态 JSON，按需加载）。
 *
 * 与 search-index 同思路：助手是「用户主动打开」的功能，
 * 所以索引不进首屏 HTML，只有点开助手时才下载。
 *
 * 工具档案是完整对象（决策器需要 14 维能力分与条件字段），
 * 但概念只带定义与比喻、教程只带标题与摘要 —— 助手回答不需要全文，
 * 正文让用户点进对应页面看，这样索引保持很小。
 */
export const dynamic = 'force-static'

export function GET() {
  const payload = {
    tools,
    searchDocs,
    concepts: concepts.map((c) => ({
      id: c.id,
      term: c.term,
      termEn: c.termEn,
      definition: c.definition,
      analogy: c.analogy,
    })),
    guides: guides.map((g) => ({
      id: g.id,
      title: g.title,
      summary: g.summary,
      type: g.type,
    })),
    scenarios,
  }

  return new Response(JSON.stringify(payload), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=0, s-maxage=31536000, immutable',
    },
  })
}