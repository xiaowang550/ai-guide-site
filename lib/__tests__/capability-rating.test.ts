import { describe, expect, it } from 'vitest'
import { capabilityRating } from '../capability-rating'

describe('能力等级展示', () => {
  it('区分没有资料与明确不支持，避免缺失数据被当成零分', () => {
    expect(capabilityRating(undefined)).toBeNull()
    expect(capabilityRating(NaN)).toBeNull()
    expect(capabilityRating(0)).toEqual({ value: 0, label: '不支持', display: '0.0' })
  })
  it('十分制显示保留原有五分档语义，不改变推荐所用数值', () => {
    expect(capabilityRating(3)).toEqual({ value: 3, label: '基本可用', display: '6.0' })
    expect(capabilityRating(5)).toEqual({ value: 5, label: '强项', display: '10.0' })
    expect(capabilityRating(4.2)?.value).toBe(4.2)
    expect(capabilityRating(4.2)?.display).toBe('8.4')
  })
})
