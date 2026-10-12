'use client'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiSend } from './api-client'
import { ModulesView } from './modules-view'
import type { SchoolAccount } from '@/lib/admin/schools'
const blank = () => ({
  id: '',
  schoolName: '',
  username: '',
  password: '',
  enabled: true,
  version: 0,
})
function newPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(20))
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}
export function SchoolAccountsView() {
  const [accounts, setAccounts] = useState<SchoolAccount[]>([]),
    [credentials, setCredentials] = useState<{
      schoolName: string
      username: string
      password: string
    } | null>(null),
    [draft, setDraft] = useState<ReturnType<typeof blank> | null>(null),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  const load = useCallback(async () => {
    try {
      setAccounts(
        (await apiGet<{ accounts: SchoolAccount[] }>('/api/admin/school-accounts')).accounts,
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '账号加载失败。')
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!draft) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const { id, password, ...rest } = draft
      await apiSend(
        id ? '/api/admin/school-accounts/' + id : '/api/admin/school-accounts',
        id ? 'PATCH' : 'POST',
        { ...rest, ...(password ? { password } : {}) },
      )
      setCredentials(
        password ? { schoolName: draft.schoolName, username: draft.username, password } : null,
      )
      setMessage(
        id
          ? '学校账号已更新；重置密码或停用会立即撤销原有登录。'
          : '学校账号已创建，请将账号和刚设置的密码分配给学校。',
      )
      setDraft(null)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败。')
    } finally {
      setBusy(false)
    }
  }
  async function toggle(account: SchoolAccount) {
    setBusy(true)
    setError('')
    try {
      await apiSend('/api/admin/school-accounts/' + account.id, 'PATCH', {
        enabled: !account.enabled,
        version: account.version,
      })
      setMessage(account.enabled ? '已停用，原有学校会话已失效。' : '账号已启用，学校可重新登录。')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-9">
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">学校端与账号</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              给学校分配账号，管理教师资源；大众与学生端继续免登录。
            </p>
          </div>
          <button
            onClick={() => {
              setDraft({ ...blank(), password: newPassword() })
              setCredentials(null)
              setError('')
              setMessage('')
            }}
            className="admin-primary-button"
          >
            新增学校账号
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <a href="/school/login/" target="_blank" rel="noreferrer" className="admin-card p-5">
            <h2 className="font-semibold">学校教师登录入口 ↗</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              复制这个网址，连同学校账号分配给老师。
            </p>
          </a>
          <a
            href="/edu/?admin-preview=1"
            target="_blank"
            rel="noreferrer"
            className="admin-card p-5"
          >
            <h2 className="font-semibold">预览学校教师端 ↗</h2>
            <p className="mt-2 text-sm text-muted-foreground">检查课程、教案包与学校专属模块。</p>
          </a>
        </div>
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="rounded-xl bg-accent p-4 text-sm">
            {message}
          </p>
        )}
        {credentials && (
          <section
            className="admin-card space-y-3 border-primary/20 p-5"
            aria-label="本次设置的学校登录信息"
          >
            <h2 className="font-semibold">本次设置的登录信息</h2>
            <p className="text-sm">
              {credentials.schoolName} · 账号：<strong>{credentials.username}</strong>
            </p>
            <p className="break-all text-sm">
              密码：<code className="select-all">{credentials.password}</code>
            </p>
            <p className="text-xs text-muted-foreground">
              这份密码只在当前页面暂时显示，收起或离开后不再保留。
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                className="text-sm text-primary underline"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(
                      `学校：${credentials.schoolName}\n登录地址：${location.origin}/school/login/\n账号：${credentials.username}\n密码：${credentials.password}`,
                    )
                    .then(() => setMessage('学校登录信息已复制。'))
                    .catch(() => setError('复制失败，请手动选择并复制登录信息。'))
                }}
              >
                复制分配信息
              </button>
              <button
                className="text-sm text-muted-foreground"
                onClick={() => setCredentials(null)}
              >
                收起登录信息
              </button>
            </div>
          </section>
        )}
        {draft && (
          <form onSubmit={(e) => void save(e)} className="admin-card space-y-5 p-6">
            <h2 className="font-semibold">{draft.id ? '修改学校账号' : '新建学校账号'}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="module-field">
                学校名称
                <input
                  required
                  maxLength={80}
                  value={draft.schoolName}
                  onChange={(e) => setDraft({ ...draft, schoolName: e.target.value })}
                  placeholder="例如：某某中学"
                />
              </label>
              <label className="module-field">
                学校账号
                <input
                  required
                  minLength={4}
                  maxLength={40}
                  pattern="[a-zA-Z0-9_-]+"
                  autoComplete="off"
                  value={draft.username}
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                  placeholder="例如：school01"
                />
              </label>
            </div>
            <label className="module-field">
              {draft.id ? '新密码（留空则保留原密码）' : '初始密码'}
              <input
                aria-label="学校账号密码"
                required={!draft.id}
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                type="text"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, password: newPassword() })}
                className="text-primary underline"
              >
                生成随机密码
              </button>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                />
                允许学校登录
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              密码只在设置时显示。保存后不保留可查看的明文；忘记时可在这里重置。
            </p>
            <div className="flex gap-4">
              <button disabled={busy} className="admin-primary-button">
                {busy ? '正在保存…' : '保存学校账号'}
              </button>
              <button
                type="button"
                className="text-sm text-muted-foreground"
                disabled={busy}
                onClick={() => setDraft(null)}
              >
                取消
              </button>
            </div>
          </form>
        )}
        <div className="admin-card overflow-x-auto">
          <table className="w-full min-w-[650px] text-sm">
            <caption className="sr-only">学校账号列表</caption>
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-4">学校 / 账号</th>
                <th className="p-4">状态</th>
                <th className="p-4">最近登录</th>
                <th className="p-4">操作</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-b last:border-0">
                  <td className="p-4">
                    <span className="block font-medium">{account.schoolName}</span>
                    <span className="text-xs text-muted-foreground">{account.username}</span>
                  </td>
                  <td className="p-4">{account.enabled ? '已启用' : '已停用'}</td>
                  <td className="p-4 text-xs">
                    {account.lastLoginAt
                      ? new Date(account.lastLoginAt).toLocaleString('zh-CN')
                      : '尚未登录'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-4">
                      <button
                        disabled={busy}
                        className="text-primary"
                        onClick={() => {
                          setDraft({
                            id: account.id,
                            schoolName: account.schoolName,
                            username: account.username,
                            password: '',
                            enabled: account.enabled,
                            version: account.version,
                          })
                          setError('')
                        }}
                      >
                        编辑 / 重置密码
                      </button>
                      <button
                        disabled={busy}
                        className="text-primary"
                        onClick={() => void toggle(account)}
                      >
                        {account.enabled ? '停用' : '启用'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!accounts.length && (
                <tr>
                  <td colSpan={4} className="p-7 text-center text-muted-foreground">
                    还没有学校账号，点击“新增学校账号”开始分配。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <ModulesView audience="school" />
    </div>
  )
}
