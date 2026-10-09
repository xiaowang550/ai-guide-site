import { describe, it, expect } from 'vitest'
import {
  readLibrary,
  toggleSaved,
  recordRecent,
  removeSaved,
  restoreSaved,
  validLearningEntry,
  MAX_SAVED,
  type LearningEntry,
} from '@/lib/learning/library'
import { searchDocsByType } from '@/lib/search'
import type { SearchDoc } from '@/data/types'
import { caseMatchesTopic, filterCases, type CasePreview } from '@/lib/case-filters'
function storage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value)
    },
  }
}
const entry: LearningEntry = {
  href: '/guides/weekly-report',
  title: '写一份周报',
  summary: '从原始记录到待核对草稿。',
  kind: 'guide',
  at: '2026-10-09T01:00:00Z',
}
describe('免登录学习夹', () => {
  it('收藏、去重、移除和撤销保持本机内容一致', () => {
    const store = storage()
    expect(toggleSaved(entry, store)).toMatchObject({ ok: true, saved: true })
    expect(readLibrary('saved', store)).toEqual([entry])
    expect(removeSaved(entry.href, store)).toBe(true)
    expect(readLibrary('saved', store)).toEqual([])
    expect(restoreSaved(entry, store)).toBe(true)
    expect(restoreSaved(entry, store)).toBe(true)
    expect(readLibrary('saved', store)).toHaveLength(1)
    expect(toggleSaved(entry, store)).toMatchObject({ ok: true, saved: false })
  })
  it('最近浏览只保留最近八项，重复访问移到最前', () => {
    const store = storage()
    for (let i = 0; i < 12; i++) recordRecent({ ...entry, href: `/guides/lesson-${i}` }, store)
    expect(readLibrary('recent', store)).toHaveLength(8)
    recordRecent({ ...entry, href: '/guides/lesson-7' }, store)
    expect(readLibrary('recent', store)[0].href).toBe('/guides/lesson-7')
    expect(readLibrary('saved', store)).toEqual([])
  })
  it('损坏存储、安全链接和类型不匹配均不会进入学习夹', () => {
    const store = storage()
    store.setItem('ai-map:learning-saved:v1', 'bad-json')
    expect(readLibrary('saved', store)).toEqual([])
    for (const href of [
      'javascript:alert(1)',
      '//evil.test',
      '/admin/',
      '/guides/../admin',
      '/guides/%5cevil',
      'https://evil.test',
      '/cases/demo',
    ])
      expect(validLearningEntry({ ...entry, href }), href).toBe(false)
    store.setItem(
      'ai-map:learning-saved:v1',
      JSON.stringify([entry, { ...entry, href: '/admin/' }, entry]),
    )
    expect(readLibrary('saved', store)).toEqual([entry])
  })
  it('存储拒绝时明确失败，不虚报收藏成功；达到容量保留已有记录', () => {
    const denied = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
    }
    expect(toggleSaved(entry, denied)).toMatchObject({ ok: false, saved: false })
    const store = storage()
    for (let i = 0; i < MAX_SAVED; i++)
      toggleSaved({ ...entry, href: `/guides/lesson-${i}` }, store)
    expect(toggleSaved(entry, store)).toMatchObject({ ok: false, saved: false })
    expect(readLibrary('saved', store)).toHaveLength(MAX_SAVED)
  })
})
describe('找内容的交互', () => {
  it('先按类型筛选，教程不会被前面的大量工具挤出截断范围', () => {
    const tool = (id: string, type: SearchDoc['type']): SearchDoc => ({
      id,
      type,
      title: '资料整理',
      summary: '资料整理练习',
      href: type === 'tool' ? `/tools/${id}` : `/guides/${id}`,
      keywords: ['资料整理'],
      tags: [],
    })
    const docs = [
      ...Array.from({ length: 80 }, (_, i) => tool(`tool-${i}`, 'tool')),
      tool('lesson', 'guide'),
    ]
    expect(searchDocsByType(docs, '资料整理', 'guide', 10).map((hit) => hit.doc.id)).toEqual([
      'lesson',
    ])
  })
  it('教学与工作流允许交叉匹配，关键词和行业同时生效', () => {
    const item: CasePreview = {
      id: 'notice',
      title: '校内通知字段核对',
      industry: '学校行政',
      role: '教师',
      summary: '使用工作流整理资料，日期有冲突时暂停。',
      tools: [{ id: 'dify', name: 'Dify', logo: '/logos/dify.svg' }],
      reusability: 'high',
      updatedAt: '2026-10-09',
      illustrative: true,
    }
    expect(caseMatchesTopic(item, 'teaching')).toBe(true)
    expect(caseMatchesTopic(item, 'workflow')).toBe(true)
    expect(filterCases([item], 'DIFY', 'workflow', '学校行政')).toEqual([item])
    expect(filterCases([item], '通知', 'all', '金融')).toEqual([])
  })
})
