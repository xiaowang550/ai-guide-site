import { describe, expect, it } from 'vitest'
import { answer, detectIntent, guessFlags, guessScenario, type AssistantToolsIndex } from '../assistant'
import { tools } from '@/data/tools'
import { concepts } from '@/data/concepts'
import { guides } from '@/data/guides'
import { scenarios } from '@/data/scenarios'
import { searchDocs } from '@/data'

/**
 * 助手测试用「真实数据」构建索引，而不是造假数据：
 * 助手在浏览器里拿到的就是这份 JSON，测试必须保证结论与站内数据一致。
 */
const index: AssistantToolsIndex = {
  tools,
  searchDocs,
  concepts: concepts.map((c) => ({
    id: c.id,
    term: c.term,
    termEn: c.termEn,
    definition: c.definition,
    analogy: c.analogy,
  })),
  guides: guides.map((g) => ({ id: g.id, title: g.title, summary: g.summary, type: g.type })),
  scenarios,
}

const NOW = new Date('2026-10-02T00:00:00Z')

describe('detectIntent（意图识别）', () => {
  const cases: [string, string][] = [
    ['不知道该用哪个工具', 'recommend'],
    ['帮我选一个做 PPT 的', 'recommend'],
    ['写代码用什么好', 'recommend'],
    ['DeepSeek 有什么坑', 'tool-pros-cons'],
    ['这个工具有什么缺点', 'tool-pros-cons'],
    ['什么是 RAG', 'concept'],
    ['幻觉是什么意思', 'concept'],
    ['怎么写周报', 'guide'],
    ['有没有讲提示词的教程', 'guide'],
    ['数据多久没更新了', 'freshness'],
    ['现在的数据可信吗', 'freshness'],
  ]

  it.each(cases)('「%s」→ %s', (query, expected) => {
    expect(detectIntent(query, index)).toBe(expected)
  })

  it('空查询与无关查询走站内搜索', () => {
    expect(detectIntent('', index)).toBe('search')
    expect(detectIntent('zzzz不存在的东西', index)).toBe('search')
  })
})

describe('guessFlags / guessScenario（从自然语言抽条件与场景）', () => {
  it('识别免费、大陆直连、隐私、中文等条件', () => {
    expect(guessFlags('要免费的工具').mustBeFree).toBe(true)
    expect(guessFlags('国内能直连的').chinaDirect).toBe(true)
    expect(guessFlags('数据保密不能上传').privacySensitive).toBe(true)
    expect(guessFlags('要中文好一点的').chineseFirst).toBe(true)
  })

  it('没有这些词时不给条件', () => {
    const f = guessFlags('随便推荐一个')
    expect(f.mustBeFree).toBeUndefined()
    expect(f.chinaDirect).toBeUndefined()
  })

  it('能根据描述猜到场景', () => {
    expect(guessScenario('我要做 PPT', index.scenarios)).toBe('make-office')
    expect(guessScenario('想读一份很长的文档', index.scenarios)).toBe('read-long-doc')
  })

  it('完全无关的描述猜不到场景（会引导用户去决策器手选）', () => {
    expect(guessScenario('随便说点什么吧', index.scenarios)).toBeNull()
  })
})

describe('answer（回答生成）', () => {
  it('推荐类回答必须给出工具名、理由与依据', () => {
    const a = answer('写代码用什么好', index, NOW)
    expect(a.intent).toBe('recommend')
    expect(a.headline.length).toBeGreaterThan(5)
    expect(a.paragraphs.length).toBeGreaterThan(0)
    expect(a.links.length).toBeGreaterThan(0)
    expect(a.basis).toBeTruthy()
  })

  it('推荐结果必须是站内真实存在的工具', () => {
    const a = answer('帮我选个工具做 PPT', index, NOW)
    const href = a.links.find((l) => l.href.startsWith('/tools/'))?.href ?? ''
    const id = href.replace('/tools/', '')
    expect(tools.some((t) => t.id === id)).toBe(true)
  })

  it('识别不到场景时不编结论，而是引导去决策器', () => {
    const a = answer('随便帮我选一个', index, NOW)
    expect(a.links.some((l) => l.href === '/find')).toBe(true)
    expect(a.headline).toContain('决策器')
  })

  it('优缺点回答要包含「别用它做」这类关键提醒', () => {
    const a = answer('NotebookLM 有什么弱点', index, NOW)
    expect(a.intent).toBe('tool-pros-cons')
    const text = a.paragraphs.join(' ')
    expect(text).toContain('短板')
    expect(text.length).toBeGreaterThan(40)
  })

  it('概念回答必须来自站内概念数据', () => {
    const a = answer('什么是 RAG', index, NOW)
    expect(a.intent).toBe('concept')
    const hit = index.concepts.find((c) => a.headline.includes(c.term))
    expect(hit).toBeTruthy()
    expect(a.paragraphs.join(' ')).toContain(hit!.definition.slice(0, 10))
    expect(a.links.some((l) => l.href === `/learn/${hit!.id}`)).toBe(true)
  })

  it('教程回答给出可点开的教程链接', () => {
    const a = answer('怎么写周报', index, NOW)
    expect(a.intent).toBe('guide')
    expect(a.links.some((l) => l.href.startsWith('/guides/'))).toBe(true)
  })

  it('保鲜回答给出看板入口与依据', () => {
    const a = answer('数据多久没更新了', index, NOW)
    expect(a.intent).toBe('freshness')
    expect(a.links.some((l) => l.href === '/freshness')).toBe(true)
    expect(a.basis).toContain('保鲜引擎')
  })

  it('搜索兜底不会凭空编造链接', () => {
    const a = answer('zzzz不存在的东西', index, NOW)
    expect(a.intent).toBe('search')
    a.links.forEach((l) => expect(l.href).toMatch(/^\//))
  })

  it('每个回答都带可点击的追问建议', () => {
    for (const q of ['帮我选一个工具', '什么是 RAG', '数据多久没更新了', 'DeepSeek 有什么坑']) {
      const a = answer(q, index, NOW)
      expect(a.followUps.length, q).toBeGreaterThan(0)
      expect(a.followUps.length, q).toBeLessThanOrEqual(3)
    }
  })

  it('纯函数：相同输入结果完全一致', () => {
    const a1 = answer('帮我选个工具', index, NOW)
    const a2 = answer('帮我选个工具', index, NOW)
    expect(a1).toEqual(a2)
  })

  it('助手不会声称自己联网（口径一致）', () => {
    const a = answer('帮我选个工具', index, NOW)
    const text = [a.headline, ...a.paragraphs, a.basis ?? ''].join(' ')
    expect(text).not.toContain('实时联网')
    expect(text).not.toContain('我查了一下最新')
  })
})