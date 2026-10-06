import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, type Dirent } from 'node:fs'
import { join } from 'node:path'

/**
 * 口径门禁：全站不能出现声称「我们做过自建评测」的文案。
 *
 * 背景：本站对外承诺「不做自建评测」，评分来自官方文档、公开基准与使用者反馈。
 * 但页面文案很容易在迭代中被写成「基于实测的判断」—— 一旦这么写，
 * 就是对我们没做过的事做了虚假陈述，比评分高低严重得多。
 *
 * 这个测试直接扫源码，把这类表述挡在提交之前。
 */

/** 会「渲染给用户看」的目录 */
const SCAN_DIRS = ['app', 'components', 'data', 'lib']

/** 扫源码时跳过的目录：测试自身、__tests__ 里要出现「实测」两个字做断言 */
const SKIP = ['__tests__', 'node_modules', '.next', 'out', '.git']

function walk(dir: string, out: string[] = []): string[] {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (SKIP.some((s) => full.includes(s))) continue
    if (e.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = SCAN_DIRS.flatMap((d) => walk(d)).filter((f) => /\.(ts|tsx|md|mdx)$/.test(f))

/**
 * 允许出现的场景：说明「本站不做实测」这类**否定**表述。
 * 匹配「不…实测」「没有…实测」时不算违规。
 */
const NEGATION = /(不做|不做自建|不来自|未经|不做任何|不来自本地|不会|未能|无法|不涉及|不靠|不以|而非|不是)/

/**
 * 显式豁免：这些位置出现「实测」是**诚实且必要**的。
 *
 * 关键区分：
 *   - **代码注释**里写「实测首屏从 166 KB 涨到 314 KB」——那是我们真的跑出来的
 *     数字，写下来是为了不让后来人重犯同样的错。这跟对外声称评测无关。
 *   - **给学校用的规范模板**里写「哪些是实测、哪些是引用」——学校可以自己验证
 *     自己买的东西，本站不该替他们决定能不能提这个词。
 *
 * reason 必须写清楚，否则过半年没人知道为什么放过。
 */
const ALLOW: { match: (line: string) => boolean; reason: string }[] = [
  {
    match: (l) => l.trimStart().startsWith('//') || l.trimStart().startsWith('*') || l.trimStart().startsWith('/*'),
    reason: '代码注释：记录开发时真实测得的数字（包体积、模型行为），不是对外评测声明',
  },
  {
    match: (l) => l.includes('结论段必须能指出哪些是实测'),
    reason: 'AI 使用规范模板：这一条是给学校用的，学校可以自己验证自购工具',
  },
  {
    match: (l) => l.includes('我实测下来并不成立'),
    reason: '案例正文叙述者视角：案例要表达的核心观点就是「模型排序不可全信」',
  },
]

describe('评分口径：不得声称做过自建实测', () => {
  it('扫描范围确实覆盖到文件（防止路径写错导致测试空跑）', () => {
    expect(files.length).toBeGreaterThan(50)
  })

  it('用户可见文案里不出现未加否定的「实测」', () => {
    const offenders: string[] = []

    for (const file of files) {
      const text = readFileSync(file, 'utf8')
      text.split('\n').forEach((line, i) => {
        if (!line.includes('实测')) return
        if (NEGATION.test(line)) return
        if (ALLOW.some((a) => a.match(line))) return
        offenders.push(`${file}:${i + 1}  ${line.trim().slice(0, 90)}`)
      })
    }

    expect(
      offenders,
      `以下文案声称我们做过自建评测，但本站明确「不做自建评测」：\n${offenders.join('\n')}`
    ).toEqual([])
  })

  it('豁免项都写明了理由（防止豁免被无声堆积）', () => {
    for (const a of ALLOW) {
      expect(a.reason.length, '豁免必须写理由').toBeGreaterThan(10)
    }
  })

  it('工具详情与列表页都明确写出「不做自建评测」', () => {
    const detail = readFileSync('app/tools/[slug]/page.tsx', 'utf8')
    const list = readFileSync('app/tools/page.tsx', 'utf8')
    expect(detail, '工具详情页缺少口径说明').toContain('不做自建评测')
    expect(list, '工具列表页缺少口径说明').toContain('不做自建评测')
  })
})