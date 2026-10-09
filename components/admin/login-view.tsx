'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Compass, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { ApiError, apiSend } from './api-client'

/**
 * 登录表单。
 *
 * 两处刻意的设计：
 *
 * 1) **不用浏览器表单提交**（不走 `<form action>`），而是用 fetch 发 JSON。
 *    后端要求写操作校验 Origin，表单提交在部分场景下不带 Origin 头，
 *    会被自己的 CSRF 防线挡下 —— 那会变成一个很难理解的「密码明明对却登不上」。
 *
 * 2) **失败文案照后端原样显示**。后端已经统一处理了「不区分账号不存在与密码错误」，
 *    前端不要再加工，否则很容易在显示时又漏出账号是否存在。
 */
export function LoginView({ onSuccess }: { onSuccess: () => void }) {
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      await apiSend('/api/admin/login', 'POST', { username, password })
      onSuccess()
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        const r = err.meta?.remaining
        if (typeof r === 'number') setRemaining(r)
      } else {
        setError('网络异常，请稍后重试。')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="admin-login">
      <div className="admin-login-story">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Compass className="h-5 w-5" />
          </span>
          AI 能力图谱
        </Link>
        <div className="login-intro mt-20">
          <p className="admin-eyebrow">YOUR PRIVATE WORKSPACE</p>
          <h2 className="mt-5 text-4xl font-semibold leading-relaxed tracking-tight">
            每一次整理，
            <br />
            都让好内容走得更远。
          </h2>
          <p className="mt-6 max-w-sm text-sm leading-8 text-muted-foreground">
            看看网站的浏览趋势，更新值得分享的方法，把读者的反馈变成下一次改进。
          </p>
          <div className="mt-12 flex items-center gap-2 text-xs text-primary">
            <ShieldCheck className="h-4 w-4" />
            仅供站点所有者使用
          </div>
        </div>
      </div>
      <div className="admin-login-form">
        <div>
          <p className="admin-eyebrow">WELCOME BACK</p>
          <h1 className="mt-3 text-2xl font-semibold">登录管理工作台</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            用你的管理员账号，继续打理网站。
          </p>
          <form onSubmit={submit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="u" className="mb-2 block text-xs font-medium">
                管理员账号
              </label>
              <input
                id="u"
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="admin-input"
                placeholder="输入管理员账号"
              />
            </div>
            <div>
              <label htmlFor="p" className="mb-2 block text-xs font-medium">
                密码
              </label>
              <div className="relative">
                <input
                  id="p"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="admin-input pr-12"
                  placeholder="输入密码"
                />
                <button
                  type="button"
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-3 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <div role="alert" className="admin-error">
                {error}
                {remaining !== null && <p className="mt-1">还可尝试 {remaining} 次。</p>}
              </div>
            )}
            <button
              type="submit"
              disabled={busy}
              className="home-button w-full disabled:opacity-50"
            >
              {busy ? '正在登录…' : '进入工作台'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-6 text-center text-[11px] leading-6 text-muted-foreground">
            后台不开放注册，只有管理员可以访问管理数据。
          </p>
          <Link
            href="/"
            className="mt-10 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            返回公开网站
          </Link>
        </div>
      </div>
    </div>
  )
}
