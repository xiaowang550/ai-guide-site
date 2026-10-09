import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, type Dirent } from 'node:fs'
import { join } from 'node:path'
import { megaNav, schoolNavigation, secondaryNav, siteConfig, siteTitle } from '../site'

/**
 * 站点配置门禁。
 *
 * 背景：改名这件事最容易「改一处漏三处」—— 页头一处、manifest 一处、
 * 助手提示词一处、Issue 署名一处。本次改名就发现 9 处硬编码。
 * 所以把「站名只能来自 siteConfig」变成会失败的测试。
 */

const SCAN_DIRS = ['app', 'components', 'lib', 'data']
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
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(full)
  }
  return out
}

const files = SCAN_DIRS.flatMap((d) => walk(d))

/** 站点名曾经用过的旧名，出现在源码里就说明漏改了 */
const OLD_NAMES = ['AI 能力地图']

describe('站点配置', () => {
  it('扫描范围覆盖到文件（防止路径写错导致空跑）', () => {
    expect(files.length).toBeGreaterThan(80)
  })

  it('源码里不再出现旧站名（改名要彻底）', () => {
    const offenders: string[] = []
    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      text.split('\n').forEach((line, i) => {
        for (const old of OLD_NAMES) {
          if (line.includes(old)) offenders.push(`${f}:${i + 1}  ${line.trim().slice(0, 70)}`)
        }
      })
    }
    expect(
      offenders,
      `这些地方还写着旧站名，应该改成读 siteConfig：\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('页头与 manifest 从配置读站名，不写死', () => {
    const header = readFileSync('components/site-header.tsx', 'utf8')
    expect(header).toContain('siteConfig.name')
    const manifest = readFileSync('app/manifest.ts', 'utf8')
    expect(manifest).toContain('siteConfig.shortName')
  })

  it('标语为空时标题只用站点名，不拼出破折号尾巴', () => {
    expect(siteConfig.tagline.trim(), '这个测试假设标语为空').toBe('')
    const t = siteTitle()
    expect(t).toBe(siteConfig.name)
    expect(t.endsWith('——'), '标题不能以破折号结尾').toBe(false)
    expect(t).not.toContain('——')
  })

  it('标语非空时正确拼接（防止把 siteTitle 改成永远只返回站名）', () => {
    const fake: { name: string; tagline: string } = {
      name: siteConfig.name,
      tagline: '测试标语',
    }
    expect(siteTitle(fake)).toBe(`${siteConfig.name} —— 测试标语`)
  })

  it('标语只有空白时也按「无标语」处理（不该产生「站名 —— 」）', () => {
    expect(siteTitle({ name: siteConfig.name, tagline: '   ' })).toBe(siteConfig.name)
  })

  it('layout 的标题用的是 siteTitle() 而不是字符串拼接', () => {
    const layout = readFileSync('app/layout.tsx', 'utf8')
    expect(layout).toContain('siteTitle()')
    expect(layout, 'default 标题不应再手工拼 tagline').not.toMatch(/\$\{siteConfig\.tagline\}/)
  })
})

describe('主导航结构', () => {
  it('有面板的分区至少 1 个子项（children 为空数组等于没做面板）', () => {
    const emptyArray = megaNav.filter((g) => Array.isArray(g.children) && g.children.length === 0)
    expect(
      emptyArray.map((g) => g.label),
      '这些分区写了空 children，应该直接省略该字段',
    ).toEqual([])
  })

  it('子项不得与所属分区同路径（否则面板里有两个一模一样的入口）', () => {
    const dup = megaNav.flatMap((g) =>
      (g.children ?? []).filter((c) => c.href === g.href).map((c) => `${g.label} → ${c.href}`),
    )
    expect(dup, '分区首页由一级标签直达，面板里不该再列一遍').toEqual([])
  })

  it('关键分区确实有面板（否则「更多功能进主导航」这个需求没达成）', () => {
    const mustHavePanel = ['/tools', '/edu']
    const missing = mustHavePanel.filter(
      (href) =>
        ([schoolNavigation, ...megaNav].find((g) => g.href === href)?.children?.length ?? 0) === 0,
    )
    expect(missing, '这些分区应该挂子项面板').toEqual([])
  })

  it('子项总数合理（太少说明没铺开，太多说明该分区太杂）', () => {
    const total = [schoolNavigation, ...megaNav].reduce((n, g) => n + (g.children?.length ?? 0), 0)
    expect(total, '分区里的子项加起来太少，面板等于没做').toBeGreaterThanOrEqual(10)
    expect(total, '子项过多，顶栏面板会过长').toBeLessThanOrEqual(24)
  })

  it('每个子项都有 hint（面板的价值就在于说明「点进去能拿到什么」）', () => {
    const noHint = megaNav
      .flatMap((g) => g.children ?? [])
      .filter((c) => !c.hint || c.hint.length < 4)
    expect(noHint.map((c) => `${c.href}`)).toEqual([])
  })

  it('每个子项都有 label 与 href', () => {
    const bad = megaNav.flatMap((g) => g.children ?? []).filter((c) => !c.href || !c.label)
    expect(bad.length).toBe(0)
  })

  it('href 全部是站内绝对路径（外链不该出现在主导航面板里）', () => {
    for (const c of megaNav.flatMap((g) => g.children ?? [])) {
      expect(c.href, `${c.href} 应以 / 开头`).toMatch(/^\/[a-z0-9/_-]*$/i)
    }
    for (const g of megaNav) {
      expect(g.href, `${g.href} 应以 / 开头`).toMatch(/^\//)
    }
  })

  it('href 不重复（重复链接会让面板看起来像坏了）', () => {
    const all = megaNav.flatMap((g) => [g.href, ...(g.children ?? []).map((c) => c.href)])
    const dup = all.filter((h, i) => all.indexOf(h) !== i)
    expect([...new Set(dup)], '这些路径在导航里出现了多次').toEqual([])
  })

  it('label 不重复（两个同名入口用户分不清）', () => {
    const labels = megaNav.flatMap((g) => [g.label, ...(g.children ?? []).map((c) => c.label)])
    const dup = labels.filter((l, i) => labels.indexOf(l) !== i)
    expect([...new Set(dup)]).toEqual([])
  })

  it('次级导航从主导航和保留的学校专区派生，入口不遗漏', () => {
    const flat = [
      schoolNavigation,
      ...(schoolNavigation.children ?? []),
      ...megaNav.flatMap((g) => g.children ?? []),
    ]
      .map((c) => c.href)
      .sort()
    expect(secondaryNav.map((c) => c.href).sort()).toEqual(flat)
  })

  it('分区数量不超过顶栏能容纳的范围', () => {
    expect(megaNav.length, '分区太多，顶栏会挤爆并换行').toBeLessThanOrEqual(8)
  })

  it('页面标题测试里的旧名已清理（改名波及到测试注释）', () => {
    const t = readFileSync('lib/__tests__/page-titles.test.ts', 'utf8')
    for (const old of OLD_NAMES) {
      expect(t, `测试文件里还有旧名 ${old}`).not.toContain(old)
    }
  })
})
