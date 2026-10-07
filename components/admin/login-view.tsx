'use client'

import { useState } from 'react'
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
    <div className="container py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-xl font-semibold">管理员登录</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          这里的每一次操作都会记入审计日志，内容改动只有「发布」之后才会出现在公开站。
        </p>

        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label htmlFor="u" className="block text-sm font-medium">
              用户名
            </label>
            <input
              id="u"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="p" className="block text-sm font-medium">
              密码
            </label>
            <input
              id="p"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-hairline bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <button
            type="submit"
            disabled={busy || !username || !password}
            className="w-full rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {busy ? '登录中…' : '登录'}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm leading-6">
            {error}
            {remaining !== null && remaining > 0 ? (
              <span className="mt-1 block text-xs text-muted-foreground">
                还可以尝试 {remaining} 次，超过后会临时锁定。
              </span>
            ) : null}
          </p>
        ) : null}

        <div className="mt-8 rounded border border-hairline bg-muted/30 px-3 py-2.5 text-xs leading-6 text-muted-foreground">
          <p className="font-medium text-foreground">首次登录前需要完成一次性设置</p>
          <p className="mt-1">
            在 Cloudflare Pages 项目里配置 <code>ADMIN_PASSWORD</code> 与{' '}
            <code>SITE_SALT</code> 两个 Secret，然后首次登录会自动创建管理员账号。
            详见 <code>docs/admin-backend.md</code>。
          </p>
          <p className="mt-1">
            连续 5 次失败会临时锁定 15 分钟。限流按「账号 + IP 的 /24 网段」计算，
            换 IP 可以绕过 —— 本站没有引入更重的反滥用设施，这一点如实说明。
          </p>
        </div>
      </div>
    </div>
  )
}
