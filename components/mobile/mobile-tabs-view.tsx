'use client'

import { useLayoutEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Bookmark,
  BookOpen,
  Home,
  Layers,
  Newspaper,
  GraduationCap,
  FileText,
  ShieldCheck,
  MessageCircle,
} from 'lucide-react'
import { useSiteModules } from '@/components/site-module-context'
import { pathEnabled } from '@/lib/site-modules'
import { activeNavigationHref, siteNavigation } from '@/lib/site-navigation'

export function MobileTabsView({ school = false }: { school?: boolean }) {
  const pathname = usePathname()
  const { config, ready, preview } = useSiteModules()
  const navigation = siteNavigation(config)
  const items = school
    ? [
        { href: '/edu', label: '总览', icon: Home },
        { href: '/edu/programs', label: '课程', icon: GraduationCap },
        { href: '/edu/toolkits', label: '教案', icon: FileText },
        { href: '/edu/policy', label: '规范', icon: ShieldCheck },
        { href: '/edu/support', label: '答疑', icon: MessageCircle },
      ]
    : [
        { href: '/', label: '首页', icon: Home },
        { href: '/guides', label: '教程', icon: BookOpen },
        { href: '/tools', label: '工具', icon: Layers },
        { href: '/updates', label: '资讯', icon: Newspaper },
        { href: '/saved', label: '学习夹', icon: Bookmark },
      ].filter(
        (item) =>
          pathEnabled(config, item.href) &&
          (item.href === '/saved' || navigation.some((nav) => nav.href === item.href)),
      )
  const active = school
    ? activeNavigationHref(
        pathname,
        items.map((item) => ({ ...item, hint: '' })),
      )
    : (activeNavigationHref(pathname, navigation) ?? pathname.replace(/\/+$/, ''))
  useLayoutEffect(() => {
    window.dispatchEvent(new Event('zhiya:layout'))
  }, [ready, school, items.length])
  if (school && !ready) return null
  return (
    <nav className="mobile-tabs" aria-label={school ? '教师端常用导航' : '手机常用导航'}>
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={school && preview ? `${href}?admin-preview=1` : href}
          prefetch={false}
          aria-current={active === href ? 'page' : undefined}
        >
          <Icon size={20} aria-hidden />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  )
}
