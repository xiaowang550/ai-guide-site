'use client'
import { usePathname } from 'next/navigation'
import { BrandMark } from './brand-mark'
import { useSiteModules } from './site-module-context'
import { activeNavigationHref, siteNavigation } from '@/lib/site-navigation'
import { pathEnabled } from '@/lib/site-modules'
import type { NavItem } from '@/lib/site'
import {
  Home,
  BookOpen,
  Layers,
  Compass,
  Search,
  Bookmark,
  ArrowUpRight,
  Menu,
  GraduationCap,
  Newspaper,
  MessageSquare,
} from 'lucide-react'
const iconFor = (href: string) =>
  href === '/' || href === '/edu/'
    ? Home
    : href.includes('tools')
      ? Layers
      : href.includes('cases')
        ? Compass
        : href.includes('updates')
          ? Newspaper
          : BookOpen
export function TemplateNavigation({ school = false }: { school?: boolean }) {
  const { config } = useSiteModules(),
    path = usePathname()
  const links: readonly NavItem[] = school
    ? [
        { href: '/edu/', label: '教学桌面', hint: '教学任务' },
        { href: '/edu/programs/', label: '课程路线', hint: '安排课程' },
        { href: '/edu/toolkits/', label: '课程与教案', hint: '准备教学材料' },
        { href: '/edu/policy/', label: '使用规范', hint: '整理课堂规范' },
        { href: '/edu/support/', label: '教学支持', hint: '答疑与反馈' },
      ]
    : siteNavigation(config)
  const active = activeNavigationHref(path, links)
  const nav = (
    <>
      {links.map((item) => {
        const Icon = iconFor(item.href)
        return (
          <div className="template-nav-item" key={item.href}>
            <a href={item.href} aria-current={active === item.href ? 'page' : undefined}>
              <Icon size={19} />
              <span>{item.label === '首页' ? '我的桌面' : item.label}</span>
              <span className="template-nav-dot" />
            </a>
            {item.children?.length ? (
              <details className="template-subnav">
                <summary aria-label={`展开${item.label}子栏目`}>⌄</summary>
                <div>
                  {item.children.map((child) => (
                    <a href={child.href} key={child.href}>
                      {child.label}
                      <ArrowUpRight size={13} />
                    </a>
                  ))}
                </div>
              </details>
            ) : null}
          </div>
        )
      })}
    </>
  )
  return (
    <>
      <aside
        className="template-navigation template-only"
        aria-label={school ? '教师导航' : '主导航'}
      >
        <a href={school ? '/edu/' : '/'} className="template-brand">
          <BrandMark />
          <small>{school ? '教学空间' : '知芽AI'}</small>
        </a>
        <div className="template-nav-caption">{school ? '教学空间' : '开始探索'}</div>
        <nav>{nav}</nav>
        <div className="template-nav-bottom">
          {!school && (
            <>
              <a href="/search/">
                <Search size={18} />
                搜索
              </a>
              {pathEnabled(config, '/saved') && (
                <a href="/saved/">
                  <Bookmark size={18} />
                  学习夹
                </a>
              )}
              <a href="/feedback/">
                <MessageSquare size={18} />
                反馈
              </a>
            </>
          )}
          <a href={school ? '/' : '/school/login/'}>
            {school ? <Home size={18} /> : <GraduationCap size={18} />}{' '}
            {school ? '返回公开网站' : '教师空间'}
            <ArrowUpRight size={15} />
          </a>
        </div>
      </aside>
      <header className="template-topbar template-only">
        <span>
          {school ? '教师空间' : (links.find((l) => l.href === active)?.label ?? '知芽AI')}
        </span>
        <div>
          <a href="/search/" aria-label="搜索">
            <Search size={18} />
            <span>搜索</span>
          </a>
          {!school && pathEnabled(config, '/find') && (
            <a href="/find/" className="template-top-action">
              帮我选
              <ArrowUpRight size={16} />
            </a>
          )}
          <details className="template-menu">
            <summary aria-label="打开导航">
              <Menu size={21} />
            </summary>
            <nav>
              {nav}
              <a href="/search/">搜索</a>
              <a href={school ? '/' : '/school/login/'}>{school ? '返回公开网站' : '教师空间'}</a>
            </nav>
          </details>
        </div>
      </header>
    </>
  )
}
