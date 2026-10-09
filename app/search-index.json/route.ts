import { searchDocs } from '@/data'
import { lessonSummaries } from '@/data/lesson-summaries'

/**
 * 全站搜索索引（静态 JSON）。
 *
 * 为什么单独出一个接口而不是把索引塞进 layout props：
 * 之前 searchDocs 作为 props 传给 SiteHeader，会被序列化进**每一个页面**的 HTML，
 * 白白占掉每页十几 KB。改成按需拉取：用户第一次打开搜索时才下载这个文件
 * （约 4-6 KB gzip），首屏 HTML 明显变轻。
 */
export const dynamic = 'force-static'

export function GET() {
  const compact = searchDocs.map((doc) => {
    const title =
      doc.type === 'guide'
        ? (lessonSummaries[doc.id]?.title ?? doc.title)
        : doc.title
    return {
      ...doc,
      title,
      keywords: title === doc.title ? doc.keywords : [...doc.keywords, doc.title],
    }
  })
  return new Response(JSON.stringify(compact), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // 内容随构建产物固定，可以长期缓存
      'cache-control': 'public, max-age=0, s-maxage=31536000, immutable',
    },
  })
}
