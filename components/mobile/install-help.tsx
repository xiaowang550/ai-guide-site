'use client'

import { useEffect, useState } from 'react'

type InstallEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: string }>
}
export function InstallHelp() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    setPrompt((window as Window & { zhiyaInstallPrompt?: InstallEvent }).zhiyaInstallPrompt ?? null)
    setInstalled(
      matchMedia('(display-mode: standalone)').matches ||
        !!(navigator as Navigator & { standalone?: boolean }).standalone,
    )
    const capture = (event: Event) => {
      event.preventDefault()
      setPrompt(event as InstallEvent)
    }
    const complete = () => {
      setInstalled(true)
      setPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', capture)
    window.addEventListener('appinstalled', complete)
    return () => {
      window.removeEventListener('beforeinstallprompt', capture)
      window.removeEventListener('appinstalled', complete)
    }
  }, [])
  if (installed) return <p className="install-help">已从主屏幕打开，可以直接使用。</p>
  return (
    <div className="install-help">
      <strong>像 App 一样打开</strong>
      {prompt ? (
        <button
          type="button"
          onClick={async () => {
            try {
              await prompt.prompt()
              const choice = await prompt.userChoice
              setMessage(
                choice.outcome === 'accepted'
                  ? '请按浏览器提示完成安装。'
                  : '你可以随时从浏览器菜单添加到主屏幕。',
              )
            } catch {
              setMessage('请从浏览器菜单添加到主屏幕。')
            }
            setPrompt(null)
            delete (window as Window & { zhiyaInstallPrompt?: Event }).zhiyaInstallPrompt
          }}
        >
          添加到主屏幕
        </button>
      ) : (
        <p>
          iPhone / iPad：在 Safari
          的分享菜单中选择“添加到主屏幕”。安卓：打开浏览器菜单，选择“安装应用”或“添加到主屏幕”。电脑：使用浏览器地址栏的安装入口。
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <small>联网打开过的公开页面可尝试离线阅读。登录、反馈提交和实时资讯需要网络。</small>
    </div>
  )
}
