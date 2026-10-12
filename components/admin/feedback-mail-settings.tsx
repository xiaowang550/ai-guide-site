'use client'
import { useCallback, useEffect, useState } from 'react'
import { apiGet, apiSend } from './api-client'

interface MailStatus {
  recipient: string
  sender: string
  configured: boolean
  encryptedStorageReady: boolean
  counts: Record<string, number>
}
export function FeedbackMailSettings({ onChange }: { onChange: () => Promise<void> }) {
  const [status, setStatus] = useState<MailStatus | null>(null)
  const [sender, setSender] = useState('onboarding@resend.dev'),
    [key, setKey] = useState('')
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('')
  const load = useCallback(async () => {
    try {
      const result = await apiGet<MailStatus>('/api/admin/feedback-mail')
      setStatus(result)
      setSender(result.sender)
    } catch (e) {
      setError(e instanceof Error ? e.message : '邮件配置读取失败。')
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  async function action(kind: 'save' | 'test' | 'retry' | 'clear') {
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (kind === 'save' || kind === 'clear' || kind === 'test') {
        await apiSend('/api/admin/feedback-mail', 'PUT', {
          sender,
          ...(key && kind !== 'clear' ? { key } : {}),
          ...(kind === 'clear' ? { clearKey: true } : {}),
        })
        setKey('')
      }
      if (kind === 'test') {
        const result = await apiSend<{ message: string }>(
          '/api/admin/feedback-mail/test',
          'POST',
          {},
        )
        setMessage(result.message)
      } else if (kind === 'retry') {
        const result = await apiSend<{ processed: number }>(
          '/api/admin/feedback-mail/retry',
          'POST',
          {},
        )
        setMessage(
          result.processed
            ? `已尝试补发 ${result.processed} 条，可在下方查看每条结果。`
            : '当前没有可补发的通知，或邮件服务尚未配置。',
        )
      } else
        setMessage(
          kind === 'clear'
            ? '已移除发信 Key，反馈仍保存在后台。'
            : '已保存。点击“发送测试邮件”核验配置，再补发积压反馈。',
        )
      await load()
      await onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : '操作失败，请重试。')
    } finally {
      setBusy(false)
    }
  }
  const pending = status
    ? Object.entries(status.counts)
        .filter(([name]) => name !== 'sent')
        .reduce((sum, [, n]) => sum + n, 0)
    : 0
  return (
    <details className="mb-6 rounded-2xl border bg-card p-4 sm:p-5" open={!status?.configured}>
      <summary className="cursor-pointer font-semibold">
        邮件通知设置{' '}
        <span className="ml-2 text-sm font-normal text-muted-foreground">
          {status?.configured ? '已配置' : '尚未配置'}
          {pending ? ` · ${pending} 条待发送` : ''}
        </span>
      </summary>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        收件邮箱：<strong className="text-foreground">1987215931@qq.com</strong>
        。新反馈含文字、相关页面和截图附件；发信失败也不会丢失后台记录。
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="text-sm">
          <span className="mb-2 block font-medium">Resend 发件邮箱</span>
          <input
            type="email"
            value={sender}
            disabled={busy}
            onChange={(e) => setSender(e.target.value)}
            className="h-12 w-full rounded-xl border bg-background px-3"
          />
        </label>
        <label className="text-sm">
          <span className="mb-2 block font-medium">Resend API Key</span>
          <input
            type="password"
            value={key}
            autoComplete="off"
            disabled={busy || !status?.encryptedStorageReady}
            onChange={(e) => setKey(e.target.value)}
            placeholder={status?.configured ? '已保存，留空则保留原 Key' : 're_…'}
            className="h-12 w-full rounded-xl border bg-background px-3"
          />
        </label>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">
        Key 在服务端加密保存，前台和后台接口都不会返回完整 Key。
        {status && !status.encryptedStorageReady && '当前服务端密钥加密未就绪，暂不能保存 Key。'}
      </p>
      <ol className="mt-3 list-inside list-decimal space-y-1 text-sm leading-7 text-muted-foreground">
        <li>
          在{' '}
          <a
            href="https://resend.com/"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Resend
          </a>{' '}
          注册并创建仅发送权限的 Key。
        </li>
        <li>
          无自有域名时，用收件邮箱注册账号，保留
          onboarding@resend.dev；该测试发件地址只能发给账号邮箱。已有域名则填写已验证域名下的发件邮箱。
        </li>
        <li>保存并发送测试邮件，检查收件箱和垃圾邮件；通过后补发待发送反馈。</li>
      </ol>
      <div className="mt-4 flex flex-wrap gap-3">
        {[
          ['save', '保存配置'],
          ['test', '发送测试邮件'],
          ['retry', '补发待发送通知'],
          ...(status?.configured ? [['clear', '移除已保存 Key']] : []),
        ].map(([kind, label]) => (
          <button
            key={kind}
            type="button"
            disabled={busy}
            onClick={() => void action(kind as 'save' | 'test' | 'retry' | 'clear')}
            className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-50"
          >
            {busy ? '处理中…' : label}
          </button>
        ))}
      </div>
      {message && (
        <p role="status" className="mt-3 rounded-xl bg-accent p-3 text-sm">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-danger/30 p-3 text-sm">
          {error}
        </p>
      )}
    </details>
  )
}
