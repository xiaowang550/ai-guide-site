import { describe, expect, it } from 'vitest'
import { megaNav } from '@/lib/site'
import { activeNavigationHref } from '@/lib/site-navigation'

describe('子页所属栏目', () => {
  it.each([
    ['/learn/access/', '/guides'],
    ['/learn/access?from=menu', '/guides'],
    ['/start/', '/guides'],
    ['/paths/zero-to-pro/', '/guides'],
    ['/guides/long-pdf-summary/', '/guides'],
    ['/find/', '/tools'],
    ['/compare/', '/tools'],
    ['/learn/prompt/', '/learn'],
    ['/learn/glossary/', '/learn'],
    ['/learn/advanced/', '/learn'],
    ['/cases/weekly-report-ops/', '/cases'],
    ['/saved/', '/updates'],
    ['/about/', '/updates'],
    ['/', '/'],
  ])('%s 高亮 %s，桌面与移动端共用判断', (path, href) => {
    expect(activeNavigationHref(path, megaNav)).toBe(href)
  })
  it('教程入口被隐藏时，不把海外使用帮助误归到知识库', () => {
    expect(
      activeNavigationHref(
        '/learn/access',
        megaNav.filter((item) => item.href !== '/guides'),
      ),
    ).toBeNull()
  })
  it('前缀相似的概念页仍属于知识库，首页不误选任意子页', () => {
    expect(activeNavigationHref('/learn/accessibility', megaNav)).toBe('/learn')
    expect(activeNavigationHref('/unlisted', megaNav)).toBeNull()
  })
  it('管理员单独展示进阶栏目时，明确的顶层入口优先于父栏目子项', () => {
    expect(
      activeNavigationHref('/learn/advanced', [
        ...megaNav,
        { href: '/learn/advanced', label: '进阶', hint: '' },
      ]),
    ).toBe('/learn/advanced')
  })
})
