'use client'
import { useEffect, useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { BookOpen, ShieldCheck, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import '@/app/styles/reference-base.css'
import '@/app/styles/school.css'
function destination() {
  try {
    const u = new URL(new URLSearchParams(location.search).get('next') ?? '/edu/', location.origin)
    return u.origin === location.origin && (u.pathname === '/edu' || u.pathname.startsWith('/edu/'))
      ? u.pathname + u.search
      : '/edu/'
  } catch {
    return '/edu/'
  }
}
export function SchoolLogin() {
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [owner, setOwner] = useState(false),
    [showPassword, setShowPassword] = useState(false)
  useEffect(() => {
    void fetch('/api/school/session', { cache: 'no-store', credentials: 'same-origin' })
      .then((r) => r.json())
      .then((s) => {
        if (s.authenticated && s.role === 'school') location.replace(destination())
        else if (s.role === 'owner') setOwner(true)
      })
      .catch(() => {})
  }, [])
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const r = await fetch('/api/school/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      })
      const b = await r.json()
      if (!r.ok) throw Error(b.error ?? '登录失败，请重试。')
      setPassword('')
      location.replace(destination())
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络暂时不可用，请重试。')
      setBusy(false)
    }
  }
  return (
    <main className="public-site school-site school-login flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-sm md:grid-cols-2">
        <section className="school-login-story bg-accent/50 p-7 sm:p-10">
          <Link
            href="/"
            prefetch={false}
            className="inline-flex items-center gap-3 text-sm font-semibold"
          >
            <BrandMark full />
            <span className="whitespace-nowrap text-xs text-primary sm:text-sm">学校教师端</span>
          </Link>
          <p className="mt-10 text-sm text-primary">学校教师工作空间</p>
          <h2 className="mt-3 text-3xl font-semibold leading-tight">
            <span className="design-original">
              从一节课开始，
              <br />把 AI 用进教学。
            </span>
            <span className="design-brief">教师工作台</span>
          </h2>
          <p className="mt-5 text-base text-muted-foreground">
            登录后，选课程、借鉴教案，准备能带进课堂的活动。
          </p>
          <ul className="mt-7 space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              课程体系与课程、教案包
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              AI 使用规范与后续学校资源
            </li>
          </ul>
          {/* eslint-disable-next-line @next/next/no-img-element -- shared optimized public mascot */}
          <img
            className="school-login-mascot"
            src="/brand/sprout-hero-v3.webp"
            width="240"
            height="240"
            alt="小芽陪你备好一节课"
          />
          <p className="mt-5 text-xs text-muted-foreground">
            大众与学生无需账号，可直接浏览公开学习内容。
          </p>
        </section>
        <section className="p-7 sm:p-10">
          <Link
            href="/"
            prefetch={false}
            className="mb-7 hidden items-center gap-2 text-sm font-semibold"
          >
            <BrandMark full />
            <span>学校教师端</span>
          </Link>
          <h1 className="text-xl font-semibold">学校账号登录</h1>
          <p className="mt-3 text-sm text-muted-foreground">使用管理员分配给学校的账号和密码。</p>
          <form onSubmit={(e) => void submit(e)} className="mt-7 space-y-5">
            <label className="block text-sm font-medium">
              学校账号
              <input
                name="username"
                autoComplete="username"
                maxLength={40}
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border bg-background px-4 text-sm"
                placeholder="输入学校账号"
              />
            </label>
            <label className="block text-sm font-medium">
              密码
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                maxLength={128}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 min-h-12 w-full rounded-xl border bg-background px-4 text-sm"
                placeholder="输入密码"
              />
            </label>
            <button
              type="button"
              className="inline-flex min-h-11 items-center gap-2 text-sm text-primary"
              onClick={() => setShowPassword((v) => !v)}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              {showPassword ? '隐藏密码' : '显示密码'}
            </button>
            {error && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              className="min-h-12 w-full rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
              disabled={busy}
            >
              {busy ? '正在登录…' : '进入学校教师端'}
            </button>
          </form>
          {owner && (
            <a href="/edu/?admin-preview=1" className="mt-5 block text-sm text-primary underline">
              以管理员身份预览学校端 →
            </a>
          )}
          <p className="mt-5 text-xs text-muted-foreground">
            没有账号或忘记密码？请联系网站管理员分配或重置。
          </p>
          <Link
            href="/"
            prefetch={false}
            className="mt-8 inline-block text-sm text-primary hover:underline"
          >
            ← 返回大众 / 学生端
          </Link>
        </section>
      </div>
    </main>
  )
}
