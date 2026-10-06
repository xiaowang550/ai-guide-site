import { describe, expect, it } from 'vitest'
import {
  addToQueue,
  buildErrataBatchText,
  buildErrataText,
  buildMailto,
  createEmptySubmission,
  hasContent,
  readQueue,
  removeFromQueue,
  safePageParam,
  validateSubmission,
  ERRATA_STORAGE_KEY,
  type ErrataSubmission,
} from '../errata'

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    deleteItem: (k: string) => void map.delete(k),
    raw: map,
  }
}

const filled: ErrataSubmission = {
  id: 'abc',
  pageUrl: '/tools/deepseek',
  field: '价格与额度',
  problem: '写的是旧价，现在是 2026-09 调过的价',
  correction: '应改为「以官方定价页为准」',
  sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing',
  note: '在对比页看到的',
  createdAt: '2026-10-05T02:30:00.000Z',
}

describe('validateSubmission', () => {
  it('页面与问题描述必填', () => {
    const v = validateSubmission({ ...filled, pageUrl: '', problem: '  ' })
    expect(v.ok).toBe(false)
    expect(v.missing).toEqual(['问题页面', '问题描述'])
  })

  it('缺依据链接只提醒不拦截（用户可能只是疑问）', () => {
    const v = validateSubmission({ ...filled, sourceUrl: '' })
    expect(v.ok).toBe(true)
    expect(v.warnings.some((w) => w.includes('依据链接'))).toBe(true)
  })

  it('给了修改建议却没依据时额外提醒', () => {
    const v = validateSubmission({ ...filled, sourceUrl: '' })
    expect(v.warnings.some((w) => w.includes('双方理解不一致'))).toBe(true)
  })

  it('页面不是站内路径时提醒', () => {
    const v = validateSubmission({ ...filled, pageUrl: 'https://example.com/x' })
    expect(v.warnings.some((w) => w.includes('站内路径'))).toBe(true)
  })

  it('完整填写时没有警告', () => {
    const v = validateSubmission(filled)
    expect(v.ok).toBe(true)
    expect(v.warnings).toEqual([])
  })
})

describe('hasContent', () => {
  it('只有空白内容不算可提交', () => {
    expect(hasContent({ ...filled, problem: '   ' })).toBe(false)
    expect(hasContent(filled)).toBe(true)
  })
})

describe('buildErrataText', () => {
  it('包含关键字段，且可选字段缺失时不留空位', () => {
    const text = buildErrataText({ ...filled, correction: '', note: '' })
    expect(text).toContain('问题页面：/tools/deepseek')
    expect(text).toContain('问题字段：价格与额度')
    expect(text).toContain('依据链接：https://api-docs.deepseek.com')
    expect(text).not.toContain('建议修改为')
    expect(text).not.toContain('补充说明')
  })

  it('时间戳格式化为可读形式', () => {
    expect(buildErrataText(filled)).toContain('2026-10-05 02:30')
  })

  it('内容里不含 Markdown 表格等易错格式（纯文本最好粘贴）', () => {
    const text = buildErrataText(filled)
    expect(text).not.toContain('|---')
    expect(text).not.toContain('```')
  })
})

describe('buildErrataBatchText', () => {
  it('单条时就是单条文本', () => {
    expect(buildErrataBatchText([filled])).toBe(buildErrataText(filled))
  })

  it('多条时带序号并声明总数', () => {
    const text = buildErrataBatchText([filled, { ...filled, id: 'def', problem: '第二个问题' }])
    expect(text).toContain('共 2 条')
    expect(text).toContain('第 1 条')
    expect(text).toContain('第 2 条')
    expect(text).toContain('第二个问题')
  })

  it('空列表返回空字符串', () => {
    expect(buildErrataBatchText([])).toBe('')
  })
})

describe('buildMailto', () => {
  it('生成带主题与正文的 mailto 链接', () => {
    const m = buildMailto([filled], '1302582367@qq.com')
    expect(m.href.startsWith('mailto:1302582367@qq.com?')).toBe(true)
    expect(decodeURIComponent(m.href)).toContain('问题页面')
    expect(decodeURIComponent(m.href)).toContain('勘误')
  })

  it('正文过长时提示改用复制', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ ...filled, id: `x${i}`, problem: '很长的描述'.repeat(60) }))
    const m = buildMailto(many, '1302582367@qq.com')
    expect(m.tooLong).toBe(true)
  })

  it('正常长度不报警', () => {
    expect(buildMailto([filled], '1302582367@qq.com').tooLong).toBe(false)
  })
})

describe('本地队列', () => {
  it('读写往返一致', () => {
    const s = memoryStorage()
    addToQueue(s, filled)
    const list = readQueue(s)
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe(filled.id)
  })

  it('新反馈排在最前（最近的在顶部）', () => {
    const s = memoryStorage()
    addToQueue(s, { ...filled, id: 'old' })
    addToQueue(s, { ...filled, id: 'new' })
    expect(readQueue(s).map((x) => x.id)).toEqual(['new', 'old'])
  })

  it('按 id 删除只影响那一条', () => {
    const s = memoryStorage()
    addToQueue(s, { ...filled, id: 'abc', problem: '第一个问题' })
    addToQueue(s, { ...filled, id: 'def', problem: '第二个问题' })
    // removeFromQueue 返回的是新列表，不需要再读一次
    const remaining = removeFromQueue(s, 'abc')
    expect(remaining.map((x) => x.id)).toEqual(['def'])
    // 存储里也确实同步了
    expect(readQueue(s).map((x) => x.id)).toEqual(['def'])
  })

  it('删除不存在的 id 不影响队列', () => {
    const s = memoryStorage()
    addToQueue(s, { ...filled, id: 'abc' })
    expect(removeFromQueue(s, 'nope').map((x) => x.id)).toEqual(['abc'])
  })

  it('数据损坏时返回空队列而不是崩', () => {
    const s = memoryStorage({ [ERRATA_STORAGE_KEY]: '{坏掉的 JSON' })
    expect(readQueue(s)).toEqual([])
  })

  it('结构不对的条目被过滤掉', () => {
    const s = memoryStorage({ [ERRATA_STORAGE_KEY]: JSON.stringify([{ nope: 1 }, filled]) })
    expect(readQueue(s).map((x) => x.id)).toEqual([filled.id])
  })

  it('队列上限 20 条，避免占满 localStorage', () => {
    const s = memoryStorage()
    for (let i = 0; i < 30; i++) addToQueue(s, { ...filled, id: `x${i}` })
    expect(readQueue(s)).toHaveLength(20)
  })
})

describe('safePageParam', () => {
  it('接受站内路径', () => {
    expect(safePageParam('/tools/deepseek')).toBe('/tools/deepseek')
  })

  it('拒绝站外 URL 与协议相对 URL（防开放重定向）', () => {
    expect(safePageParam('https://evil.com/x')).toBe('')
    expect(safePageParam('//evil.com/x')).toBe('')
    expect(safePageParam('javascript:alert(1)')).toBe('')
  })

  it('限制长度', () => {
    expect(safePageParam('/tools/' + 'a'.repeat(500)).length).toBeLessThanOrEqual(120)
  })

  it('空值返回空串', () => {
    expect(safePageParam(undefined)).toBe('')
  })
})

describe('createEmptySubmission', () => {
  it('有唯一 id 与时间戳', () => {
    const a = createEmptySubmission()
    const b = createEmptySubmission()
    expect(a.id).not.toBe(b.id)
    expect(a.createdAt).toBeTruthy()
    expect(hasContent(a)).toBe(false)
  })

  it('可预填页面', () => {
    expect(createEmptySubmission('/tools/kimi').pageUrl).toBe('/tools/kimi')
  })
})