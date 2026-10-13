'use client'

import { ModulesView } from './modules-view'
import { SiteSettingsView } from './site-settings-view'
import { BuildsView } from './builds-view'
import { NewsView } from './news-view'
import { UpdateRadarView } from './update-radar-view'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, setUnauthorizedHandler, type SessionInfo } from './api-client'
import { LoginView } from './login-view'
import { DashboardView } from './dashboard-view'
import { ContentView } from './content-view'
import { FeedbackView } from './feedback-view'
import { ReviewView } from './review-view'
import { AuditView } from './audit-view'
import { AccountView } from './account-view'
import { SchoolModulesView } from './school-modules-view'
import { SchoolAccountsView } from './school-accounts-view'
import Link from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { ResponsiveSheet } from '@/components/mobile/responsive-sheet'
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  ClipboardCheck,
  Compass,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react'

type TabKey =
  | 'modules'
  | 'school-accounts'
  | 'settings'
  | 'builds'
  | 'dashboard'
  | 'content'
  | 'feedback'
  | 'review'
  | 'audit'
  | 'account'
  | 'schools'
  | 'briefings'
  | 'news'
  | 'update-radar'

const TABS: { key: TabKey; label: string; hint: string; icon: typeof Activity }[] = [
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    label: '网站总览',
    hint: '内容状态、反馈、待办、访问统计',
  },
  { key: 'modules', icon: Compass, label: '大众 / 学生端', hint: '免登录前台、模块与 DIY 布局' },
  {
    key: 'school-accounts',
    icon: BookOpen,
    label: '学校端与账号',
    hint: '分配学校账号、重置密码与学校资源管理',
  },
  { key: 'settings', icon: ShieldCheck, label: '站点设置', hint: '全站功能与管理员偏好' },
  {
    key: 'builds',
    icon: BookOpen,
    label: 'Codex 功能构建',
    hint: '保存需求并生成可查看的代码草稿',
  },
  { key: 'content', icon: BookOpen, label: '内容管理', hint: '编辑工具资料、预览、发布、回滚' },
  {
    key: 'feedback',
    icon: MessageSquare,
    label: '访客反馈',
    hint: '查看问题、截图与使用感受，配置邮件通知',
  },
  { key: 'news', icon: Activity, label: 'AI 实时资讯', hint: '查看同步、整理摘要与管理公开消息' },
  {
    key: 'update-radar',
    icon: ClipboardCheck,
    label: '更新雷达（保留）',
    hint: '原站内变更日志，暂不公开',
  },
  { key: 'review', icon: ClipboardCheck, label: '复核待办', hint: '按新鲜度与依据完整度自动生成' },
  { key: 'schools', icon: BookOpen, label: '试点与推广', hint: '保留的私人模块，公开入口已关闭' },
  {
    key: 'briefings',
    icon: ClipboardCheck,
    label: '定期简报',
    hint: '保留历史内容，暂不向访客开放',
  },
  { key: 'account', icon: ShieldCheck, label: '账号安全', hint: '查看管理账号、修改密码' },
  { key: 'audit', icon: Activity, label: '操作记录', hint: '谁在什么时候做了什么，含备份导出' },
]

/**
 * 后台外壳：会话门禁 + 分区切换。
 *
 * 未登录时**不渲染任何数据区域**，只显示登录表单。
 * 这是刻意的：后台的静态 HTML 里不含任何业务数据，
 * 数据只在登录成功后从 /api/* 拉取。所以即使有人直接访问 /admin/，
 * 看到的也只是一个空壳 —— 所有真正的权限判断都在服务端做过了。
 */
export function AdminShell() {
  const [session, setSession] = useState<SessionInfo | null>(null)
  const [checking, setChecking] = useState(true)
  const [tab, setTab] = useState<TabKey>('dashboard')
  const [sectionsOpen, setSectionsOpen] = useState(false)

  async function logout() {
    try {
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      })
      if (response.ok) setSession({ authenticated: false })
    } catch {
      /* 网络恢复后可重试 */
    }
  }

  const checkSession = useCallback(async () => {
    try {
      const info = await apiGet<SessionInfo>('/api/admin/session')
      setSession(info)
      return info
    } catch {
      setSession({ authenticated: false })
      return { authenticated: false }
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    // 任何接口返回 401 都跳回登录态，而不是让当前面板静默失败
    setUnauthorizedHandler(() => {
      setSession({ authenticated: false })
      setChecking(false)
    })
    void checkSession()
    // 已访问过旧公开站的浏览器可能仍有旧 Service Worker；更新后重新读取登录态。
    const onControllerChange = () => void checkSession()
    navigator.serviceWorker?.addEventListener('controllerchange', onControllerChange)
    void navigator.serviceWorker
      ?.getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {})
    return () => {
      setUnauthorizedHandler(null)
      navigator.serviceWorker?.removeEventListener('controllerchange', onControllerChange)
    }
  }, [checkSession])

  if (checking) {
    return (
      <p className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        正在检查登录状态…
      </p>
    )
  }

  if (!session?.authenticated) {
    return <LoginView onSuccess={() => void checkSession()} />
  }

  return (
    <div className="admin-frame">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          <BrandMark full />
          <span className="admin-brand-caption">管理工作台</span>
        </Link>
        <p className="admin-nav-label">工作空间</p>
        <button
          type="button"
          className="admin-mobile-sections"
          aria-expanded={sectionsOpen}
          onClick={(event) => {
            event.currentTarget.focus({ preventScroll: true })
            setSectionsOpen(true)
          }}
        >
          切换分区 · {TABS.find((item) => item.key === tab)?.label}
        </button>
        {sectionsOpen && (
          <ResponsiveSheet title="管理后台分区" onClose={() => setSectionsOpen(false)}>
            <nav className="admin-section-grid" aria-label="手机后台分区">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-current={tab === item.key ? 'page' : undefined}
                  onClick={() => {
                    setTab(item.key)
                    setSectionsOpen(false)
                    window.scrollTo({ top: 0, behavior: 'instant' })
                  }}
                >
                  <item.icon size={20} aria-hidden />
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.hint}</small>
                  </span>
                </button>
              ))}
            </nav>
          </ResponsiveSheet>
        )}
        <nav aria-label="后台分区" className="admin-navigation">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              title={t.hint}
              aria-current={tab === t.key ? 'page' : undefined}
              onClick={() => setTab(t.key)}
            >
              <t.icon className="h-[18px] w-[18px]" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-bottom">
          <Link
            href="/"
            target="_blank"
            className="flex items-center justify-between text-xs text-muted-foreground"
          >
            查看公开网站
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <div className="mt-5 flex items-center gap-3 border-t pt-5">
            <span className="admin-avatar">W</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{session.username}</span>
              <span className="mt-1 block text-[11px] text-muted-foreground">站点所有者</span>
            </span>
            <button
              title="退出登录"
              aria-label="退出登录"
              className="admin-icon-button"
              onClick={() => void logout()}
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-main-area">
        <header className="admin-topbar">
          <div className="text-xs text-muted-foreground">
            工作空间<span className="mx-3 opacity-50">/</span>
            <span className="font-medium text-foreground">
              {TABS.find((t) => t.key === tab)?.label}
            </span>
          </div>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            私人后台
            <button
              type="button"
              className="ml-2 underline md:hidden"
              onClick={() => void logout()}
            >
              退出
            </button>
          </span>
        </header>
        <div className="admin-content-area">
          <section className="admin-section-intro">
            <div>
              <p className="text-sm text-primary">让每一次整理，都带来收获</p>
              <h1>{TABS.find((t) => t.key === tab)?.label}</h1>
              <p>{TABS.find((t) => t.key === tab)?.hint}</p>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element -- shared optimized public mascot */}
            <img src="/brand/sprout-hero-v3.webp" width="160" height="160" alt="小芽陪你打理网站" />
          </section>
          {tab === 'dashboard' && <DashboardView onNavigate={setTab} />}
          {tab === 'modules' && <ModulesView />}
          {tab === 'school-accounts' && <SchoolAccountsView />}
          {tab === 'settings' && <SiteSettingsView />}
          {tab === 'builds' && <BuildsView />}
          {tab === 'news' && <NewsView />}
          {tab === 'update-radar' && <UpdateRadarView />}
          {tab === 'schools' && <SchoolModulesView kind="schools" />}
          {tab === 'briefings' && <SchoolModulesView kind="briefings" />}
          {tab === 'content' && <ContentView />}
          {tab === 'feedback' && <FeedbackView />}
          {tab === 'review' && <ReviewView />}
          {tab === 'audit' && <AuditView />}
          {tab === 'account' && <AccountView username={session.username ?? ''} />}
        </div>
      </div>
    </div>
  )
}
