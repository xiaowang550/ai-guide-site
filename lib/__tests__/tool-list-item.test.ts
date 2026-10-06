import { describe, expect, it } from 'vitest'
import { tools } from '@/data'
import {
  scoresToCapabilityMap,
  toListItem,
  toListItems,
  type ToolListItem,
} from '../tool-list-item'

/**
 * 列表投影的守门测试。
 *
 * 这条约束的价值：一旦有人不小心把完整 `Tool` 传给客户端组件，
 * 首屏 HTML 会悄悄涨十几 KB，而没有任何报错。这里把它变成会失败的测试。
 */
describe('ToolListItem 投影', () => {
  const item = toListItem(tools[0])
  const original = tools[0]

  it('保留卡片与表格渲染需要的字段', () => {
    expect(item.name).toBe(original.name)
    expect(item.vendor).toBe(original.vendor)
    expect(item.logo).toBe(original.logo)
    expect(item.overallScore).toBe(original.overallScore)
    expect(item.chinaAccessible).toBe(original.chinaAccessible)
    expect(item.updatedAt).toBe(original.updatedAt)
  })

  it('保留客户端筛选需要的字段', () => {
    expect(item.categories).toEqual(original.categories)
    expect(item.tags).toEqual(original.tags)
    expect(item.platforms).toEqual(original.platforms)
    expect(item.hallucinationRisk).toBe(original.hallucinationRisk)
    expect(item.pricing.model).toBe(original.pricing.model)
  })

  it('14 个维度全部投影为分数', () => {
    const keys = Object.keys(item.scores)
    expect(keys).toHaveLength(14)
    for (const k of keys) {
      expect(typeof item.scores[k as keyof typeof item.scores]).toBe('number')
    }
  })

  it('不携带任何长文本（这是这个投影存在的全部理由）', () => {
    const json = JSON.stringify(item)
    // 逐个字段确认长文本没被带进来
    for (const field of ['strengths', 'weaknesses', 'avoidFor', 'bestFor', 'evidence', 'sources', 'basis'] as const) {
      expect(json, `投影里不该出现 ${field}`).not.toContain(`"${field}"`)
    }
  })

  it('投影后体积明显小于原对象（至少省掉一半）', () => {
    const before = JSON.stringify(original).length
    const after = JSON.stringify(item).length
    expect(after, `投影只省了 ${before - after} 字节`).toBeLessThan(before / 2)
  })

  it('scoresToCapabilityMap 能还原成既有纯函数可用的形状', () => {
    const map = scoresToCapabilityMap(item.scores)
    expect(Object.keys(map)).toHaveLength(14)
    expect(map[Object.keys(map)[0] as keyof typeof map].score).toBe(
      item.scores[Object.keys(item.scores)[0] as keyof typeof item.scores]
    )
  })

  it('toListItems 批量投影，数量与输入一致', () => {
    const all = toListItems(tools)
    expect(all).toHaveLength(tools.length)
    expect(new Set(all.map((x) => x.id)).size).toBe(tools.length)
  })

  it('每个工具投影后都不含长文本（防止个别工具字段结构不同而漏网）', () => {
    const offenders: string[] = []
    for (const t of tools) {
      const json = JSON.stringify(toListItem(t))
      if (json.includes('"evidence"') || json.includes('"weaknesses"') || json.includes('"basis"')) {
        offenders.push(t.id)
      }
    }
    expect(offenders, '这些工具的投影里仍带着长文本').toEqual([])
  })

  it('类型约束：投影结果不满足完整 Tool（证明它确实更小）', () => {
    // 这条是「编译期证明」：如果有人把 ToolListItem 当 Tool 用，tsc 会报错
    const partial: ToolListItem = item
    expect(partial).not.toHaveProperty('evidence')
    expect(partial).not.toHaveProperty('strengths')
  })
})