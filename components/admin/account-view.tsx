'use client'
import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { apiSend } from './api-client'

export function AccountView({ username }: { username: string }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (newPassword !== confirm) {
      setError('两次输入的新密码不一致。')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await apiSend('/api/admin/password', 'POST', { oldPassword, newPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirm('')
      setMessage('密码已更新，其他设备上的登录已退出。')
    } catch (e) {
      setError(e instanceof Error ? e.message : '修改失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="admin-eyebrow">ACCOUNT</p>
        <h1 className="mt-2 text-2xl">账号与安全</h1>
        <p className="mt-2 text-sm text-muted-foreground">这里是你的私人管理空间。</p>
      </div>
      <section className="admin-panel">
        <div className="flex items-start gap-4">
          <span className="admin-metric-icon">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">站点所有者</h2>
            <p className="mt-2 text-sm">{username}</p>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              后台不开放注册。浏览统计、内容管理和操作记录仅在管理员登录后可见。
            </p>
          </div>
        </div>
      </section>
      <section className="admin-panel">
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4 text-primary" />
          修改密码
        </h2>
        <form onSubmit={submit} className="mt-6 max-w-md space-y-4">
          {[
            {
              id: 'old-password',
              label: '当前密码',
              value: oldPassword,
              set: setOldPassword,
              complete: 'current-password',
            },
            {
              id: 'new-password',
              label: '新密码',
              value: newPassword,
              set: setNewPassword,
              complete: 'new-password',
            },
            {
              id: 'confirm-password',
              label: '再次输入新密码',
              value: confirm,
              set: setConfirm,
              complete: 'new-password',
            },
          ].map((field) => (
            <div key={field.id}>
              <label htmlFor={field.id} className="mb-2 block text-xs font-medium">
                {field.label}
              </label>
              <input
                id={field.id}
                type="password"
                autoComplete={field.complete}
                required
                minLength={field.id === 'old-password' ? undefined : 8}
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                className="admin-input"
              />
            </div>
          ))}
          {error && (
            <p role="alert" className="admin-error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="rounded-lg bg-accent p-3 text-xs text-primary">
              {message}
            </p>
          )}
          <button disabled={busy} className="home-button" type="submit">
            {busy ? '正在更新…' : '保存新密码'}
          </button>
        </form>
      </section>
    </div>
  )
}
