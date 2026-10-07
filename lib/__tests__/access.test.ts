import { describe, expect, it } from 'vitest'
import { tools } from '@/data'
import { auditAccess, classifyAccess, hasAlternatives, OUT_OF_SCOPE } from '../access'

/**
 * 网络可访问性内容门禁。
 *
 * 这类内容最容易出两类问题：
 * 1. **腐化** —— 新增工具时忘了写说明，或替代方案指向了另一个打不开的工具，
 *    等于把用户从一扇关着的门推到另一扇。
 * 2. **越界** —— 文案里混进绕过网络限制的方法或厂商名。
 *    本站明确不提供这类内容，所以要变成会失败的测试，而不是靠自觉。
 */
describe('网络可访问性说明的完整性', () => {
  const report = auditAccess(tools)

  it('每个不可直连的工具都写清了实际情况', () => {
    expect(
      report.missingNote,
      '这些工具 chinaAccessible: false 但没写 access，读者点进去会毫无下一步'
    ).toEqual([])
  })

  it('可直连的工具不写「打不开」的说明（自相矛盾）', () => {
    expect(report.contradictory).toEqual([])
  })

  it('替代方案指向的工具都真实存在', () => {
    expect(report.danglingAlternative, '替代方案里有不存在的工具 id').toEqual([])
  })

  it('替代方案必须是自己可直连的工具（否则等于推到另一扇关着的门）', () => {
    expect(
      report.blockedAlternative,
      '这些替代方案自己也不可直连，对读者毫无帮助'
    ).toEqual([])
  })

  it('实际��况写得足够具体（不少于 20 字）', () => {
    expect(report.tooShort, '这些说明太短，等于没写').toEqual([])
  })

  it('说明与替代方案里不出现绕过网络限制的内容', () => {
    expect(
      report.suspicious,
      'access 文案里出现了不该出现的词。本站不提供此类内容'
    ).toEqual([])
  })

  it('不可直连的工具都给了替代方案', () => {
    const blocked = tools.filter((t) => !t.chinaAccessible)
    const noAlt = blocked.filter((t) => !hasAlternatives(t))
    expect(
      noAlt.map((t) => t.id),
      '这些工具告诉读者「打不开」却不说能换什么，等于把人堵死'
    ).toEqual([])
  })

  it('替代方案数量合理（1 个太单薄，超过 4 个等于没帮读者选）', () => {
    for (const t of tools.filter((x) => !x.chinaAccessible)) {
      const n = t.access?.alternatives.length ?? 0
      expect(n, `${t.id} 的替代方案有 ${n} 个`).toBeGreaterThanOrEqual(1)
      expect(n, `${t.id} 的替代方案有 ${n} 个`).toBeLessThanOrEqual(4)
    }
  })
})

describe('原因分类', () => {
  it('可直连的工具没有原因分类', () => {
    const ok = tools.filter((t) => t.chinaAccessible)
    for (const t of ok) {
      expect(classifyAccess(t), `${t.id} 可直连，不该有分类`).toBeNull()
    }
  })

  it('不可直连且提到服务条款的归为 tos-restricted（风险最高的一类）', () => {
    const risky = tools.filter((t) => !t.chinaAccessible && /服务条款/.test(t.access?.reality ?? ''))
    expect(risky.length, '没有工具被归到条款限制类，说明判断逻辑没生效').toBeGreaterThan(0)
    for (const t of risky) {
      expect(classifyAccess(t), `${t.id} 应归为 tos-restricted`).toBe('tos-restricted')
    }
  })

  it('所有不可直连工具都有分类', () => {
    const blocked = tools.filter((t) => !t.chinaAccessible)
    const noReason = blocked.filter((t) => classifyAccess(t) === null)
    expect(noReason.map((t) => t.id)).toEqual([])
  })
})

describe('立场：不提供的内容已记录在案', () => {
  it('清单非空且每项都写清了原因', () => {
    expect(OUT_OF_SCOPE.length).toBeGreaterThan(0)
    for (const item of OUT_OF_SCOPE) {
      expect(item.topic.length).toBeGreaterThan(4)
      expect(item.why.length, '必须写清为什么不提供').toBeGreaterThan(8)
    }
  })

  it('清单覆盖了「绕过方法」「共享账号」「过度承诺」三类', () => {
    const blob = OUT_OF_SCOPE.map((x) => x.topic).join(' ')
    expect(blob).toContain('绕过网络限制')
    expect(blob).toContain('账号')
    expect(blob).toContain('一定可用')
  })
})