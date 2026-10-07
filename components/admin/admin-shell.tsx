'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet, setUnauthorizedHandler, type SessionInfo } from './api-client'
import { LoginView } from './login-view'
import { DashboardView } from './dashboard-view'
import { ContentView } from './content-view'
import { FeedbackView } from './feedback-view'
import { ReviewView } from './review-view'
import { AuditView } from './audit-view'

type TabKey = 'dashboard' | 'content' | 'feedback' | 'review' | 'audit'

const TABS: { key: TabKey; label: string; hint: string }[] = [
  { key: 'dashboard', label: '总览', hint: '内容状态、反馈、待办、访问统计' },
  { key: 'content', label: '内容', hint: '编辑工具资料、预览、发布、回滚' },
  { key: 'feedback', label: '反馈', hint: '处理访客提交的纠错与提问' },
  { key: 'review', label: '复核待办', hint: '按新鲜度与依据完整度自动生成' },
  { key: 'audit', label: '操作记录', hint: '谁在什么时候做了什么，含备份导出' },
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
    return () => setUnauthorizedHandler(null)
  }, [checkSession])

  if (checking) {
    return <p className="container py-16 text-sm text-muted-foreground">正在检查登录状态…</p>
  }

  if (!session?.authenticated) {
    return <LoginView onSuccess={() => void checkSession()} />
  }

  return (
    <div className="container py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
        <div>
          <p className="text-sm">
            已登录：<span className="font-medium">{session.username}</span>
            <span className="ml-2 rounded border border-hairline px-1.5 py-0.5 text-xs text-muted-foreground">
              {session.role}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            权限在服务端逐接口校验；登出或会话过期后所有接口立即返回 401。
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-hairline px-3 py-1.5 text-sm hover:bg-muted"
          onClick={async () => {
            await fetch('/api/admin/logout', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'X-Requested-With': 'XMLHttpRequest' },
            })
            setSession({ authenticated: false })
          }}
        >
          退出登录
        </button>
      </div>

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-hairline" aria-label="后台分区">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            title={t.hint}
            aria-current={tab === t.key ? 'page' : undefined}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium text-foreground'
                : 'border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="py-6">
        {tab === 'dashboard' && <DashboardView onNavigate={setTab} />}
        {tab === 'content' && <ContentView />}
        {tab === 'feedback' && <FeedbackView />}
        {tab === 'review' && <ReviewView />}
        {tab === 'audit' && <AuditView />}
      </div>
    </div>
  )
}
