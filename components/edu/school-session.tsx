'use client'
import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { LogOut } from 'lucide-react'
import Link from 'next/link'
type Identity = {
  authenticated: boolean
  schoolName?: string
  username?: string
  role?: 'school' | 'owner'
}
export function SchoolSessionHeader() {
  const [identity, setIdentity] = useState<Identity | null>(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    void fetch('/api/school/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((s: Identity) => {
        if (active) {
          setIdentity(s)
          if (!s.authenticated)
            location.replace(
              '/school/login/?next=' + encodeURIComponent(location.pathname + location.search),
            )
        }
      })
      .catch(() => {
        if (active) setError('暂时无法确认登录状态，请刷新重试。')
      })
    return () => {
      active = false
    }
  }, [])
  async function logout() {
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/school/logout', { method: 'POST', credentials: 'same-origin' })
      if (!r.ok) throw Error('退出失败，请重试。')
      location.replace('/school/login/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络暂时不可用。')
      setBusy(false)
    }
  }
  return (
    <header className="school-session-header border-b bg-card">
      <div className="container flex flex-wrap items-center justify-between gap-4 py-5">
        <a href="/edu/" className="inline-flex items-center gap-3 font-semibold">
          <BrandMark />
          <span className="text-sm font-normal text-muted-foreground">学校教师端</span>
        </a>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>{identity?.schoolName ?? '正在确认学校身份…'}</span>
          <Link href="/" prefetch={false} className="text-primary hover:underline">
            大众 / 学生端 ↗
          </Link>
          {identity?.role === 'owner' ? (
            <a href="/admin/" className="text-primary">
              返回管理后台
            </a>
          ) : (
            <button
              onClick={() => void logout()}
              disabled={busy}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border px-3"
            >
              <LogOut className="h-4 w-4" />
              {busy ? '正在退出…' : '退出登录'}
            </button>
          )}
        </div>
        {error && (
          <p role="alert" className="w-full text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </header>
  )
}
