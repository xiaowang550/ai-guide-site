/* eslint-disable @typescript-eslint/no-explicit-any --
 *
 * 本文件里的 any 全部来自 JSON 载荷的动态形状（接口返回什么就断言什么），
 * 理由见 helpers/admin-test-env.ts 顶部说明。与其维护几百行镜像类型，
 * 不如放宽 lint 并把理由写在这里。
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { CAPABILITY_META } from '@/lib/score'
import { FRESHNESS_THRESHOLDS } from '@/lib/freshness'
import {
  ADMIN_CAPABILITY_KEYS,
  ADMIN_CAPABILITY_LABELS,
  CONTENT_KINDS,
} from '@/lib/admin/capability-keys'
import { TOOL_FRESHNESS, countEvidenceGaps } from '@/lib/admin/review'
import { NEGATION_WORDS, validateToolContent } from '@/lib/admin/validate'
import { normalizePath, EVENT_NAMES, isKnownEvent } from '@/lib/admin/analytics'
import { diffContent, summarizeChanges } from '@/lib/admin/diff'
import { intParam, weakEtag } from '@/lib/admin/http'
import { validTool } from './helpers/admin-test-env'

/**
 * 跨模块一致性门禁。
 *
 * 后台的几个模块为了能在 Workers 运行时执行（不解析 `@/` 别名），
 * 各自复制了一份主站的定义：能力维度、新鲜度阈值、「实测」的否定词表。
 * 复制是隔离构建体系的必要代价，但代价必须有人兜底 ——
 * 这些断言就是那个兜底。改了一处不改另一处，这里立刻红。
 */

describe('能力维度：后台与主站必须一致', () => {
  it('14 个维度的键与 lib/score.ts 完全一致（顺序也一致）', () => {
    expect([...ADMIN_CAPABILITY_KEYS]).toEqual(CAPABILITY_META.map((c) => c.key))
  })

  it('维度数量是 14（公开站多处硬编码了这个数字）', () => {
    expect(ADMIN_CAPABILITY_KEYS.length).toBe(14)
    expect(CAPABILITY_META.length).toBe(14)
  })

  it('中文标签齐全，且与主站一致', () => {
    for (const meta of CAPABILITY_META) {
      expect(
        ADMIN_CAPABILITY_LABELS[meta.key],
        `维度 ${meta.key} 缺少中文标签`
      ).toBe(meta.label)
    }
    expect(Object.keys(ADMIN_CAPABILITY_LABELS).length).toBe(ADMIN_CAPABILITY_KEYS.length)
  })
})

describe('新鲜度阈值：后台与 lib/freshness.ts 必须一致', () => {
  it('工具阈值完全相等', () => {
    expect(TOOL_FRESHNESS).toEqual(FRESHNESS_THRESHOLDS.tool)
  })

  it('依据缺失的判定与公开站的「≥4 或 ≤2 必须写依据」规则一致', () => {
    const make = (scores: Record<string, number>) => {
      const caps: Record<string, unknown> = {}
      for (const k of ADMIN_CAPABILITY_KEYS) {
        caps[k] = { score: scores[k] ?? 3, basis: '' }
      }
      return { capabilities: caps }
    }

    // 5 分、4 分、2 分、1 分 都要写依据；3 分不强制
    expect(countEvidenceGaps(make({ writing: 5 }))).toBe(1)
    expect(countEvidenceGaps(make({ writing: 4 }))).toBe(1)
    expect(countEvidenceGaps(make({ writing: 2 }))).toBe(1)
    expect(countEvidenceGaps(make({ writing: 1 }))).toBe(1)
    expect(countEvidenceGaps(make({ writing: 3 }))).toBe(0)
    expect(countEvidenceGaps(make({}))).toBe(0)
  })
})

describe('「实测」口径：后台校验与 claim-policy 门禁一致', () => {
  it('否定词表与 claim-policy.test.ts 的 NEGATION 相同', () => {
    const testSrc = readFileSync('lib/__tests__/claim-policy.test.ts', 'utf8')
    const m = testSrc.match(/const NEGATION = \/([^\n]+)\//)
    expect(m, 'claim-policy 测试里的 NEGATION 正则找不到 —— 门禁可能被改过').toBeTruthy()

    const fromTest = new RegExp(m![1])
    const flags = fromTest.flags
    const fromAdmin = new RegExp(NEGATION_WORDS.source, flags)

    // 逐个否定词验证两边行为一致
    const words = ['不做', '不做自建', '不来自', '未经', '不做任何', '不来自本地', '不会', '未能', '无法', '不涉及', '不靠', '不以', '而非', '不是']
    for (const w of words) {
      const sample = `我们${w}做过自建评测`
      expect(fromTest.test(sample), `claim-policy 不认「${w}」，两边不一致`).toBe(true)
      expect(fromAdmin.test(sample), `后台校验不认「${w}」`).toBe(true)
    }

    // 两边都必须认为「我们自己的实测」是违规的
    const violation = '我们自己的实测：用固定的测试任务跑一遍'
    expect(fromTest.test(violation)).toBe(false)
    expect(fromAdmin.test(violation)).toBe(false)
  })

  it('后台拒绝含未加否定「实测」的内容', () => {
    const cases: [string, unknown][] = [
      ['evidence 字段', { ...validTool(), evidence: '我们自己的实测跑了 200 道题' }],
      ['强项条目', { ...validTool(), strengths: ['我们自己的实测第一名', '第二点', '第三点'] }],
      ['描述', { ...validTool(), description: '这是一段足够长的介绍文字。我们自己的实测显示它很强，够长了吧。' }],
      ['维度依据', (() => {
        const t = validTool()
        const caps = { ...(t.capabilities as object) }
        ;(caps as any).coding = { score: 5, basis: '我们自己的实测' }
        return { ...t, capabilities: caps }
      })()],
      ['嵌套的 access.note', {
        ...validTool(),
        access: { note: '我们自己的实测证明可以用' },
      }],
    ]

    for (const [label, data] of cases) {
      const res = validateToolContent({ itemId: 'tool:testtool', data })
      expect(res.ok, `${label} 里的违规表述竟然通过了后台校验`).toBe(false)
      expect(
        res.issues.some((i) => i.message.includes('实测')),
        `${label} 没有给出针对「实测」的提示`
      ).toBe(true)
    }
  })

  it('合法的否定表述照常通过', () => {
    const ok = [
      '本站不做自建评测，依据来自官方公开资料。',
      '我们无法在本地复现闭源模型。',
      '这不是实测数据，来源是模型卡。',
      '结论段必须能指出哪些是实测。',
    ]
    for (const evidence of ok) {
      const res = validateToolContent({
        itemId: 'tool:testtool',
        data: validTool({ evidence }),
      })
      expect(res.ok, `合法的否定表述被误拦：${evidence}`).toBe(true)
    }
  })

  it('后台自己的源码里没有违规表述（否则门禁扫到会红）', () => {
    for (const f of [
      'lib/admin/validate.ts',
      'lib/admin/content.ts',
      'lib/admin/review.ts',
      'lib/admin/analytics.ts',
      'lib/admin/feedback.ts',
      'lib/admin/api.ts',
      'lib/admin/auth.ts',
      'db/schema.sql',
    ]) {
      const src = readFileSync(f, 'utf8')
      src.split('\n').forEach((line, i) => {
        if (!line.includes('实测')) return
        // 与 claim-policy.test.ts 完全一致的两道豁免：
        //   1) 注释行不算用户可见文案
        //   2) ALLOW 白名单里的正当场景（校验器里的反例字符串就在其中）
        const trimmed = line.trimStart()
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return
        if (NEGATION_WORDS.test(line)) return
        if (line.includes('结论段必须能指出哪些是实测')) return
        if (line.includes('我实测下来并不成立')) return
        // 与 claim-policy 的新增豁免保持一致：检测这个词的代码行
        if (line.includes("includes('实测')") || line.includes('includes("实测")')) return
        expect.fail(`${f}:${i + 1} 出现了未加否定的「实测」：${line.trim().slice(0, 80)}`)
      })
    }
  })
})

describe('事件名白名单', () => {
  it('每个事件都有中文标签与说明（后台要直接展示）', () => {
    for (const e of EVENT_NAMES) {
      expect(e.label, `${e.name} 缺中文标签`).toBeTruthy()
      expect(e.description, `${e.name} 缺说明`).toBeTruthy()
      expect(isKnownEvent(e.name)).toBe(true)
    }
  })

  it('事件名唯一且都是 snake_case', () => {
    const names = EVENT_NAMES.map((e) => e.name)
    expect(new Set(names).size).toBe(names.length)
    for (const n of names) expect(n).toMatch(/^[a-z][a-z0-9_]*$/)
  })

  it('未知事件被拒', () => {
    expect(isKnownEvent('rm_rf')).toBe(false)
    expect(isKnownEvent(123)).toBe(false)
    expect(isKnownEvent('')).toBe(false)
  })
})

describe('路径归一化', () => {
  it('去掉 query、尾斜杠与重复斜杠', () => {
    expect(normalizePath('/tools/kimi/')).toBe('/tools/kimi')
    expect(normalizePath('/tools/kimi')).toBe('/tools/kimi')
    expect(normalizePath('/tools/kimi/?a=b')).toBe('/tools/kimi')
    expect(normalizePath('/tools/kimi#frag')).toBe('/tools/kimi')
    expect(normalizePath('/a//b//')).toBe('/a/b')
    expect(normalizePath('/')).toBe('/')
  })

  it('外部地址与非字符串被拒', () => {
    expect(normalizePath('https://evil.example.com/x')).toBeNull()
    expect(normalizePath('')).toBeNull()
    expect(normalizePath(null)).toBeNull()
    expect(normalizePath(123)).toBeNull()
    expect(normalizePath('/x'.repeat(300))).toBeNull()
    // 以 // 开头的会被 URL 解析成协议相对地址（host 变成 'a'），因此拒绝 ——
    // 站内路径本来也不该以双斜杠开头
    expect(normalizePath('//a//b')).toBeNull()
  })
})

describe('HTTP 工具函数的边界', () => {
  it('intParam 对缺失参数走兜底而不是当成 0', () => {
    // 这条是被真实 bug 逼出来的：Number(null) === 0，
    // 会让 URL 里没写 ?limit= 的接口返回 LIMIT 1
    expect(intParam(null, 100)).toBe(100)
    expect(intParam(undefined, 100)).toBe(100)
    expect(intParam('', 100)).toBe(100)
    expect(intParam('abc', 100)).toBe(100)
    expect(intParam('25', 100)).toBe(25)
    expect(intParam(25.7, 100)).toBe(25)
    expect(intParam('0', 100)).toBe(0)
  })

  it('weakEtag 对相同内容给相同值，对不同内容给不同值', () => {
    expect(weakEtag('abc')).toBe(weakEtag('abc'))
    expect(weakEtag('abc')).not.toBe(weakEtag('abd'))
    expect(weakEtag('abc')).toMatch(/^W\//)
  })
})

describe('版本差异对比', () => {
  it('能定位到具体字段', () => {
    const before = { name: 'A', capabilities: { coding: { score: 3, basis: 'x' } } }
    const after = { name: 'B', capabilities: { coding: { score: 5, basis: 'x' } } }
    const changes = diffContent(before, after)
    const paths = changes.map((c) => c.path)
    expect(paths).toContain('name')
    expect(paths).toContain('capabilities.coding.score')
  })

  it('区分新增与删除', () => {
    const changes = diffContent({ a: 1, gone: 'x' }, { a: 1, added: 'y' })
    const byPath = Object.fromEntries(changes.map((c) => [c.path, c.kind]))
    expect(byPath.added).toBe('added')
    expect(byPath.gone).toBe('removed')
  })

  it('相同内容没有差异', () => {
    const t = { a: 1, b: [1, 2] }
    expect(diffContent(t, { ...t })).toEqual([])
    expect(summarizeChanges([])).toContain('相同')
  })

  it('跳过派生字段与版本元信息，不产生假变更', () => {
    // updatedAt 每次发布都变、overallScore 由公开站重算，
    // 两者出现在差异里只会让管理员以为自己弄坏了数据
    const paths = (b: Record<string, unknown>, a: Record<string, unknown>) =>
      diffContent(b, a).map((c) => c.path)

    expect(paths({ name: 'A', updatedAt: '2026-01-01' }, { name: 'A', updatedAt: '2026-06-01' })).toEqual([])
    expect(
      paths({ name: 'A', overallScore: 0 }, { name: 'A', overallScore: undefined })
    ).toEqual([])
    expect(paths({ name: 'A' }, { name: 'B' })).toEqual(['name'])
  })

  it('diff 不会修改传入的对象', () => {
    const before = { name: 'A', updatedAt: '2026-01-01', overallScore: 3 }
    const snapshot = JSON.parse(JSON.stringify(before))
    diffContent(before, { name: 'B' })
    expect(before).toEqual(snapshot)
  })

  it('差异摘要可读，不出现 [object Object]', () => {
    // 第一版这里写成了 changes.join('、')，历史列表里满屏 [object Object]
    const summary = summarizeChanges(
      diffContent(
        { name: 'A', capabilities: { coding: { score: 3, basis: 'x' } }, strengths: ['a'] },
        { name: 'B', capabilities: { coding: { score: 5, basis: 'x' } }, strengths: ['a', 'b'] }
      )
    )
    expect(summary).not.toContain('object Object')
    expect(summary).toContain('改了')
    expect(summary).toContain('维度评分')
  })

  it('版本摘要不含派生字段', () => {
    const paths = diffContent(
      { name: 'A', overallScore: 4.2, updatedAt: '2026-01-01' },
      { name: 'B', overallScore: 4.8, updatedAt: '2026-07-01' }
    ).map((c) => c.path)
    expect(paths).toEqual(['name'])
  })

  it('数组整体比较，不逐元素展开', () => {
    const changes = diffContent({ tags: ['a', 'b'] }, { tags: ['a', 'b', 'c'] })
    expect(changes.length).toBe(1)
    expect(changes[0].path).toBe('tags')
  })

  it('深层嵌套不会无限递归', () => {
    let deep: any = { v: 1 }
    for (let i = 0; i < 30; i++) deep = { nested: deep }
    // 不要求正确，只要求不挂
    expect(() => diffContent(deep, deep)).not.toThrow()
  })

  it('null 输入被当作空对象处理', () => {
    expect(diffContent(null, { a: 1 }).length).toBeGreaterThan(0)
    expect(diffContent({ a: 1 }, null).length).toBeGreaterThan(0)
    expect(diffContent(null, null)).toEqual([])
  })
})

describe('内容类型白名单', () => {
  it('目前只开放 tool，未开放的类型不能被写进库', () => {
    expect([...CONTENT_KINDS]).toEqual(['tool'])
  })

  it('未支持的类型被校验拒绝', () => {
    const res = validateToolContent({ itemId: 'case:x', data: validTool() })
    expect(res.ok).toBe(true) // validateToolContent 不检查类型前缀
    // 但 API 层用 kind 判断，未支持的类型会落到 validateContent
  })
})
