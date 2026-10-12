'use client'

import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, ImagePlus, Loader2, Send, X } from 'lucide-react'
import { Button } from './ui/button'
import { Input, Textarea } from './ui/input'

type Shot = { id: string; data: string }
const TYPES = ['使用问题', '内容纠错', '改进建议', '使用感受'] as const
async function screenshot(file: File): Promise<Shot> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type))
    throw new Error('请选择 PNG、JPG 或 WebP 图片。')
  if (file.size > 5 * 1024 * 1024) throw new Error('原始图片请控制在 5 MB 以内。')
  // 部署策略允许 data: 图片；直接读取文件，避免 blob: URL 被 CSP 拦截。
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('图片读取失败。'))
    reader.onerror = () => reject(new Error('图片读取失败，请重新选择。'))
    reader.readAsDataURL(file)
  })
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('这张图片无法读取，请换一张截图。'))
    img.src = url
  })
  const canvas = document.createElement('canvas')
  let scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight))
  for (let attempt = 0; attempt < 4; attempt++) {
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('当前浏览器无法处理截图，请先使用文字反馈。')
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const data = canvas.toDataURL('image/jpeg', 0.86 - attempt * 0.06)
    if (data.length < (300 * 1024 * 4) / 3) return { id: crypto.randomUUID(), data }
    scale *= 0.8
  }
  throw new Error('截图内容过大，请裁剪后再上传。')
}
export function FeedbackForm() {
  const [type, setType] = useState<(typeof TYPES)[number]>('使用问题')
  const [message, setMessage] = useState(''),
    [contact, setContact] = useState(''),
    [page, setPage] = useState('')
  const [shots, setShots] = useState<Shot[]>([])
  const [preparing, setPreparing] = useState(false),
    [busy, setBusy] = useState(false)
  const [error, setError] = useState(''),
    [receipt, setReceipt] = useState('')
  const requestId = useRef(''),
    input = useRef<HTMLInputElement>(null),
    uploadBusy = useRef(false)
  const changed = () => {
    requestId.current = ''
    setError('')
  }
  useEffect(() => {
    const from = new URL(window.location.href).searchParams.get('from')
    if (from && from.startsWith('/') && !from.startsWith('//') && !/[\\\u0000-\u0020]/.test(from))
      setPage(from.slice(0, 300))
  }, [])
  async function add(files: File[]) {
    if (!files.length || uploadBusy.current || busy) return
    if (shots.length + files.length > 3) {
      setError('最多上传 3 张截图，请先移除一张。')
      return
    }
    uploadBusy.current = true
    setPreparing(true)
    setError('')
    try {
      const images: Shot[] = []
      for (const file of files) images.push(await screenshot(file))
      setShots((old) => [...old, ...images])
      changed()
    } catch (e) {
      setError(e instanceof Error ? e.message : '截图读取失败，请重试。')
    } finally {
      uploadBusy.current = false
      setPreparing(false)
      if (input.current) input.current.value = ''
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy || preparing) return
    if (message.trim().length < 5) {
      setError('请至少写 5 个字，告诉我们发生了什么。')
      return
    }
    if (
      page &&
      (!page.startsWith('/') || page.startsWith('//') || /[\\\u0000-\u0020]/.test(page))
    ) {
      setError('相关页面请填写站内路径，例如 /tools/chatgpt/。')
      return
    }
    setBusy(true)
    setError('')
    if (!requestId.current) requestId.current = crypto.randomUUID()
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(25000),
        body: JSON.stringify({
          kind: type === '内容纠错' ? 'errata' : type === '使用问题' ? 'question' : 'suggestion',
          message: type === '使用感受' ? '【使用感受】\n' + message.trim() : message.trim(),
          contact,
          pageUrl: page,
          screenshots: shots.map((shot) => ({ data: shot.data })),
          requestId: requestId.current,
        }),
      })
      const result = (await response.json()) as { ok?: boolean; id?: string; error?: string }
      if (!response.ok || !result.ok || !result.id)
        throw new Error(result.error || '提交失败，请稍后再试。')
      setReceipt(result.id)
      setMessage('')
      setContact('')
      setShots([])
    } catch (e) {
      setError(
        e instanceof Error && e.name !== 'TimeoutError' && e.name !== 'TypeError'
          ? e.message
          : '连接暂时失败，填写内容已保留，可以再次提交。',
      )
    } finally {
      setBusy(false)
    }
  }
  if (receipt)
    return (
      <div className="rounded-3xl border bg-card p-6 sm:p-10" role="status">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <h2 className="mt-5 text-2xl font-semibold">谢谢，你的反馈已收到</h2>
        <p className="mt-3 leading-7 text-muted-foreground">
          我们会结合使用规范评估，优先解决影响学习和使用的问题。希望下次来，你能用得更顺手，也有所收获。
        </p>
        <p className="mt-4 text-sm text-muted-foreground">反馈编号：{receipt.slice(0, 8)}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <a href={page || '/'}>返回继续学习</a>
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() => {
              setReceipt('')
              changed()
            }}
          >
            再提一条反馈
          </Button>
        </div>
      </div>
    )
  return (
    <form
      onSubmit={submit}
      className="space-y-6 rounded-3xl border bg-card p-5 sm:p-8"
      onPaste={(e) => {
        const files = Array.from(e.clipboardData.files)
        if (files.length) {
          e.preventDefault()
          void add(files)
        }
      }}
    >
      <fieldset disabled={busy}>
        <legend className="mb-3 font-semibold">你想反馈什么？</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TYPES.map((value) => (
            <label
              key={value}
              className={`flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border px-2 text-sm ${value === type ? 'border-primary bg-accent text-primary' : 'hover:bg-muted'}`}
            >
              <input
                type="radio"
                name="feedback-type"
                value={value}
                checked={value === type}
                onChange={() => {
                  setType(value)
                  changed()
                }}
                className="accent-primary"
              />
              {value}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-2 block font-semibold">
          说说具体情况 <span className="text-sm font-normal text-muted-foreground">必填</span>
        </span>
        <Textarea
          value={message}
          onChange={(e) => {
            setMessage(e.target.value)
            changed()
          }}
          disabled={busy}
          maxLength={1980}
          required
          rows={4}
          aria-describedby="feedback-tip"
          placeholder="请说明遇到的问题、建议或使用感受…"
          className="min-h-44 text-base leading-7"
        />
        <span
          id="feedback-tip"
          className="mt-2 flex justify-between gap-3 text-xs text-muted-foreground"
        >
          <span>写清发生了什么，截图可帮助我们更快定位。</span>
          <span className="shrink-0">{message.length}/1980</span>
        </span>
      </label>
      <div>
        <p className="mb-2 font-semibold">
          补充截图{' '}
          <span className="text-sm font-normal text-muted-foreground">选填 · 最多 3 张</span>
        </p>
        <div
          className="rounded-2xl border border-dashed p-4 sm:p-5"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            void add(Array.from(e.dataTransfer.files))
          }}
        >
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="sr-only"
            aria-label="上传反馈截图"
            disabled={busy || preparing}
            onChange={(e) => void add(Array.from(e.target.files ?? []))}
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            disabled={busy || preparing || shots.length >= 3}
            onClick={() => input.current?.click()}
          >
            {preparing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            {preparing ? '正在处理截图…' : '选择截图'}
          </Button>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            支持点选、拖入或粘贴。PNG / JPG / WebP，原图不超过 5
            MB，会自动压缩。请遮盖姓名、账号等私人信息。
          </p>
          {shots.length > 0 && (
            <ul className="mt-4 grid grid-cols-3 gap-3">
              {shots.map((shot, index) => (
                <li key={shot.id} className="relative min-w-0 rounded-xl border bg-muted p-1">
                  {/* eslint-disable-next-line @next/next/no-img-element -- 用户本地截图，不发往图片优化服务 */}
                  <img
                    src={shot.data}
                    alt={`待提交截图 ${index + 1}`}
                    className="aspect-[4/3] w-full rounded-lg object-contain"
                  />
                  <button
                    type="button"
                    aria-label={`移除截图 ${index + 1}`}
                    disabled={busy || preparing}
                    className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-sm"
                    onClick={() => {
                      setShots((old) => old.filter((s) => s.id !== shot.id))
                      changed()
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-2 block font-medium">
            相关页面 <span className="font-normal text-muted-foreground">选填</span>
          </span>
          <Input
            value={page}
            maxLength={300}
            disabled={busy}
            placeholder="例如 /tools/chatgpt/"
            onChange={(e) => {
              setPage(e.target.value)
              changed()
            }}
            className="h-12"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-2 block font-medium">
            联系邮箱 <span className="font-normal text-muted-foreground">选填</span>
          </span>
          <Input
            type="email"
            value={contact}
            maxLength={120}
            disabled={busy}
            placeholder="需要回复时，可留下邮箱"
            autoComplete="email"
            onChange={(e) => {
              setContact(e.target.value)
              changed()
            }}
            className="h-12"
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger/5 p-3 text-sm">
          {error}
        </p>
      )}
      <p className="text-sm leading-7 text-muted-foreground">
        反馈和截图仅供管理员查看。无需注册或登录，也不必留下邮箱。
      </p>
      <Button type="submit" size="lg" disabled={busy || preparing} className="w-full sm:w-auto">
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        {busy ? '正在发送…' : '发送反馈'}
      </Button>
    </form>
  )
}
