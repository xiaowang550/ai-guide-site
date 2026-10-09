import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, type Dirent } from 'node:fs'
import { join } from 'node:path'
import { siteConfig } from '../site'

/**
 * 页面标题门禁。
 *
 * 背景：layout 用 `title.template = '%s | 站点名'`。页面自设 title 时
 * 会被拼成「工具库 | 站点名」，这是对的；但首页如果也自设，
 * 就会变成「首页 | 站点名」—— 全站最重要的页面用了信息量最低的标题，
 * 搜索结果里既没有站点名也没有任何关键词。
 *
 * 这类问题不报错、测试也测不出来（除非专门检查），所以这里显式锁住。
 */
const SKIP = ['node_modules', '.next', 'out', '.git', '__tests__']

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
    else if (e.name === 'page.tsx') out.push(full)
  }
  return out
}

/** 取出页面自设的 title（没有则返回 null 表示继承 layout） */
function ownTitle(file: string): string | null {
  const src = readFileSync(file, 'utf8')
  const block = src.match(/export const metadata[^=]*=\s*\{([\s\S]{0,800}?)\n\}/)
  if (!block) return null
  const t = block[1].match(/\btitle:\s*'([^']*)'/)
  return t ? t[1] : null
}

const pages = walk('app').map((f) => ({ file: f.replace(/\\/g, '/'), title: ownTitle(f) }))

describe('页面标题', () => {
  it('扫描到页面（防止路径写错导致空跑）', () => {
    expect(pages.length).toBeGreaterThan(20)
  })

  it('首页不覆盖 layout 的默认标题', () => {
    const home = pages.find((p) => p.file === 'app/(public)/page.tsx')
    expect(home, '找不到首页').toBeDefined()
    expect(
      home?.title,
      '首页设了 title 会变成「首页 | 站点名」，应继承 layout 的站点名 + 标语'
    ).toBeNull()
  })

  it('首页有 description 与 canonical（这两项不能丢）', () => {
    const src = readFileSync('app/(public)/page.tsx', 'utf8')
    expect(src).toMatch(/description:/)
    expect(src).toMatch(/canonical:\s*'\/'/)
  })

  it('静态页面都自设了 title（否则标题全都一样，搜索结果无法区分）', () => {
    // 动态路由（[slug]）用 generateMetadata 按数据生成标题，
    // 静态源码里当然看不到字面量，所以不纳入这项检查
    const noTitle = pages.filter(
      (p) => p.file !== 'app/(public)/page.tsx' && !p.file.includes('[slug]') && p.title === null
    )
    expect(
      noTitle.map((p) => p.file),
      '这些页面会继承 layout 标题，与首页完全相同'
    ).toEqual([])
  })

  it('动态路由用 generateMetadata 生成标题（不是漏写）', () => {
    const dynamic = pages.filter((p) => p.file.includes('[slug]'))
    expect(dynamic.length, '没扫到动态路由').toBeGreaterThan(0)
    const bad = dynamic.filter((p) => {
      const src = readFileSync(p.file, 'utf8')
      return !src.includes('generateMetadata')
    })
    expect(
      bad.map((p) => p.file),
      '动态路由既没有字面量 title 也没有 generateMetadata'
    ).toEqual([])
  })

  it('没有页面的 title 是「首页」这种无信息量的词', () => {
    const generic = pages.filter((p) => p.title && /^(首页|主页|home|index)$/i.test(p.title.trim()))
    expect(
      generic.map((p) => `${p.file} -> ${p.title}`),
      '这类标题在搜索结果里毫无区分度'
    ).toEqual([])
  })

  it('layout 确实配了 title.template 与站点名（自设 title 才会带上站点名）', () => {
    const layout = readFileSync('app/layout.tsx', 'utf8')
    expect(layout, '缺少 title.template').toMatch(/template:\s*`/)
    expect(layout, '缺少站点名').toContain('siteConfig.name')
    // 站点名本身要有内容，不能是占位
    expect(siteConfig.name.length).toBeGreaterThan(1)
  })
})