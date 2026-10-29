'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu, X, ArrowRight, Bookmark } from 'lucide-react'
import { CommandSearch } from '@/components/command-search'
import { BrandMark } from '@/components/brand-mark'
import { useSiteModules } from '@/components/site-module-context'
import { pathEnabled, moduleForPath, moduleHref, builtinModules } from '@/lib/site-modules'
import { siteNavigation } from '@/lib/site-navigation'
import { hasNativeHomeRegion } from './regions'
export function XianNavigation() {
  const [open, setOpen] = useState(false),
    [activeAnchor, setActiveAnchor] = useState(''),
    pathname = usePathname(),
    { config } = useSiteModules()
  const header = useRef<HTMLElement>(null)
  const anchors: Record<string, { region: string; anchor: string; title: string }> = {
    tools: { region: 'tools', anchor: 'explore', title: '探索' },
    guides: { region: 'guides', anchor: 'learning', title: '学习' },
    cases: { region: 'start', anchor: 'missions', title: '实践' },
  }
  const links = siteNavigation(config)
    .filter((item) => item.href !== '/')
    .map((item) => {
      const id =
        moduleForPath(item.href) ?? config.modules.find((m) => moduleHref(m) === item.href)?.id
      const entry = config.modules.find((m) => m.id === id)
      const customTitle =
        entry?.title !== builtinModules.find((m) => m.id === id)?.title ? entry?.title : undefined
      const anchor = id ? anchors[id] : undefined
      return {
        href:
          pathname === '/' && anchor && hasNativeHomeRegion(config, anchor.region)
            ? `/#${anchor.anchor}`
            : item.href,
        title:
          customTitle ||
          anchor?.title ||
          (id === 'news' ? '动态' : id === 'knowledge' ? '知识' : item.label),
        path: item.href,
      }
    })
  if (pathEnabled(config, '/') && hasNativeHomeRegion(config, 'workspace')) {
    const toolsIndex = links.findIndex((item) => moduleForPath(item.path) === 'tools')
    links.splice(toolsIndex >= 0 ? toolsIndex + 1 : 0, 0, {
      href: '/#workspace',
      title: '工作台',
      path: '/',
    })
  }
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const total = document.documentElement.scrollHeight - innerHeight
      header.current?.style.setProperty('--x-progress', String(total > 0 ? scrollY / total : 0))
      header.current?.setAttribute('data-scrolled', String(scrollY > 30))
      if (pathname !== '/') return setActiveAnchor('')
      let current = ''
      let nearestTop = -Infinity
      for (const id of ['explore', 'workspace', 'learning', 'missions']) {
        const el = document.getElementById(id)
        const top = el?.getBoundingClientRect().top
        if (top !== undefined && top < innerHeight * 0.45 && top > nearestTop) {
          current = id
          nearestTop = top
        }
      }
      setActiveAnchor(current)
    }
    const scroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', scroll, { passive: true })
    window.addEventListener('resize', scroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', scroll)
      window.removeEventListener('resize', scroll)
    }
  }, [pathname, config.revision])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    const outside = (e: PointerEvent) => {
      if (!(e.target as Element).closest('.x-nav')) setOpen(false)
    }
    window.addEventListener('keydown', key)
    window.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('keydown', key)
      window.removeEventListener('pointerdown', outside)
    }
  }, [open])
  return (
    <header ref={header} className="x-nav">
      <Link href="/" className="x-nav-brand" aria-label="弦域首页">
        <BrandMark full />
      </Link>
      <nav aria-label="主导航" className={open ? 'x-nav-links is-open' : 'x-nav-links'}>
        {links.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            onClick={() => setOpen(false)}
            aria-current={
              pathname === '/' && link.href === `/#${activeAnchor}`
                ? 'location'
                : pathname !== '/' && pathname.startsWith(link.path) && link.path !== '/'
                  ? 'page'
                  : undefined
            }
          >
            {link.title}
            <span />
          </Link>
        ))}
        <Link href="/school/login/" className="x-nav-school" onClick={() => setOpen(false)}>
          教师空间 <ArrowUpRight size={12} />
        </Link>
      </nav>
      <div className="x-nav-tools">
        <CommandSearch className="x-nav-search" />
        {pathEnabled(config, '/saved') && (
          <Link className="x-nav-saved" href="/saved/" aria-label="学习夹" title="学习夹">
            <Bookmark size={18} />
          </Link>
        )}
        {pathEnabled(config, '/start') && (
          <Link className="x-nav-cta" href="/start/">
            开始探索 <ArrowUpRight size={14} />
          </Link>
        )}
        <button
          className="x-menu-button"
          aria-label={open ? '关闭菜单' : '打开菜单'}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      <span className="x-nav-progress" aria-hidden="true" />
    </header>
  )
}
export function XianFooter() {
  const { config } = useSiteModules()
  return (
    <footer className="x-footer">
      <div className="x-footer-top">
        <Link href="/" aria-label="弦域首页">
          <BrandMark full />
        </Link>
        <p>
          为好奇心，留一片新的宇宙。
          <br />
          <span>EXPLORE. EXPERIMENT. CREATE.</span>
        </p>
        <a href="#main" aria-label="返回页面顶部">
          回到顶部 <ArrowUpRight size={17} />
        </a>
      </div>
      <div className="x-footer-bottom">
        <span>© {new Date().getFullYear()} XIAN 弦域</span>
        <nav aria-label="页脚导航">
          {pathEnabled(config, '/saved') && <Link href="/saved/">学习夹</Link>}
          <Link href="/about/">关于弦域</Link>
          <Link href="/feedback/">反馈</Link>
          <Link href="/school/login/">教师空间</Link>
          <Link href="/admin/">管理后台</Link>
        </nav>
        <span>
          保持好奇，持续创造 <ArrowRight size={13} />
        </span>
      </div>
    </footer>
  )
}
