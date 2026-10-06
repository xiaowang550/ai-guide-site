import { describe, expect, it } from 'vitest'
import { createFuse, searchDocs, SEARCH_TYPE_LABELS } from '../search'
import { searchDocs as siteDocs } from '@/data'

const DOCS = siteDocs

describe('搜索索引', () => {
  it('索引包含全部内容类型', () => {
    const types = new Set(DOCS.map((d) => d.type))
    for (const t of ['tool', 'concept', 'guide', 'case', 'path', 'program', 'toolkit', 'briefing']) {
      expect(types.has(t as (typeof DOCS)[number]['type']), `缺少类型 ${t}`).toBe(true)
    }
  })

  it('每条索引都有 href 与摘要（渲染必需）', () => {
    for (const d of DOCS) {
      expect(d.id.length).toBeGreaterThan(0)
      expect(d.href.startsWith('/')).toBe(true)
      expect(d.title.length).toBeGreaterThan(0)
      expect(d.summary.length).toBeGreaterThan(0)
    }
  })

  it('同一 type + id 不重复', () => {
    const keys = DOCS.map((d) => `${d.type}:${d.id}`)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('索引规模在纯客户端可接受范围（< 400 条）', () => {
    expect(DOCS.length).toBeGreaterThan(50)
    expect(DOCS.length).toBeLessThan(400)
  })
})

describe('searchDocs（模糊搜索）', () => {
  it('空查询返回空结果而不是全量', () => {
    expect(searchDocs(DOCS, '')).toEqual([])
    expect(searchDocs(DOCS, '   ')).toEqual([])
  })

  it('英文术语能命中对应概念（RAG）', () => {
    const hits = searchDocs(DOCS, 'RAG')
    expect(hits.length).toBeGreaterThan(0)
    expect(
      hits.some((h) => h.doc.id === 'rag' && h.doc.type === 'concept'),
      `RAG 搜索结果: ${hits.map((h) => h.doc.id).join(',')}`
    ).toBe(true)
  })

  it('中文术语能命中（幻觉）', () => {
    const hits = searchDocs(DOCS, '幻觉')
    expect(hits.some((h) => h.doc.id === 'hallucination')).toBe(true)
  })

  it('工具名与厂商名能命中', () => {
    expect(searchDocs(DOCS, 'deepseek')[0].doc.id).toBe('deepseek')
    const byVendor = searchDocs(DOCS, '字节跳动')
    expect(byVendor.some((h) => h.doc.id === 'doubao')).toBe(true)
  })

  it('教育模块内容可被搜到（课程 / 教案包 / 简报）', () => {
    expect(searchDocs(DOCS, '教案包').some((h) => h.doc.type === 'toolkit')).toBe(true)
    expect(searchDocs(DOCS, '使用规范').some((h) => h.doc.type === 'program')).toBe(true)
    expect(searchDocs(DOCS, '简报').some((h) => h.doc.type === 'briefing')).toBe(true)
  })

  it('结果按相关度排序且受 limit 限制', () => {
    const hits = searchDocs(DOCS, 'AI', 5)
    expect(hits.length).toBeLessThanOrEqual(5)
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i - 1].score).toBeLessThanOrEqual(hits[i].score)
    }
  })

  it('搜不到时返回空数组，不抛错', () => {
    expect(searchDocs(DOCS, 'zzzz不存在的关键词qqqq')).toEqual([])
  })

  it('是纯函数：同样查询结果一致', () => {
    expect(searchDocs(DOCS, '提示词').map((h) => h.doc.id)).toEqual(
      searchDocs(DOCS, '提示词').map((h) => h.doc.id)
    )
  })

  it('createFuse 可直接复用（供搜索页复用同一套权重）', () => {
    const fuse = createFuse(DOCS)
    expect(fuse.search('Kimi')[0].item.id).toBe('kimi')
  })
})

describe('SEARCH_TYPE_LABELS', () => {
  it('覆盖全部搜索类型且无多余项', () => {
    const types = new Set(DOCS.map((d) => d.type))
    expect(Object.keys(SEARCH_TYPE_LABELS).sort()).toEqual([...types].sort())
  })
})