'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, Menu, X, ArrowRight, Bookmark } from 'lucide-react'
import { CommandSearch } from '@/components/command-search'
import { BrandMark } from '@/components/brand-mark'
import { useSiteModules } from '@/components/site-module-context'
import { pathEnabled } from '@/lib/site-modules'
import { hasNativeHomeRegion } from './regions'
export function XianNavigation() {
  const [open, setOpen] = useState(false),
    pathname = usePathname(),
    { config } = useSiteModules()
  const links = [
    {
      href: hasNativeHomeRegion(config, 'tools') ? '/#explore' : '/tools/',
      title: '探索',
      path: '/tools',
    },
    { href: '/#workspace', title: '工作台', path: '/' },
    { href: '/guides/', title: '学习', path: '/guides' },
    { href: '/cases/', title: '实践', path: '/cases' },
    { href: '/updates/', title: '动态', path: '/updates' },
  ].filter(
    (link) =>
      pathEnabled(config, link.path) &&
      (link.title !== '工作台' || hasNativeHomeRegion(config, 'workspace')),
  )
  useEffect(() => {
    setOpen(false)
  }, [pathname])
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
    <header className="x-nav">
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
              pathname !== '/' && pathname.startsWith(link.path) && link.path !== '/'
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
