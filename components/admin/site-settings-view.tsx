'use client'
import { useEffect, useState } from 'react'
import { apiGet, apiSend } from './api-client'
import type { PublicSiteConfig } from '@/lib/site-modules'
import { SettingsPanel } from '@/components/settings/settings-panel'
export function SiteSettingsView() {
  const [config, setConfig] = useState<PublicSiteConfig | null>(null),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false)
  useEffect(() => {
    void apiGet<PublicSiteConfig>('/api/admin/modules')
      .then(setConfig)
      .catch((e) => setMessage(e.message))
  }, [])
  async function toggle(key: 'assistant' | 'onboarding') {
    if (!config) return
    setBusy(true)
    try {
      const features = await apiSend<PublicSiteConfig['features']>(
        '/api/admin/site-settings',
        'PATCH',
        { [key]: !config.features[key] },
      )
      setConfig({ ...config, features })
      setMessage('已更新全站设置，访客刷新后生效。')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '更新失败')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-7">
      <div>
        <h1 className="text-2xl font-semibold">站点设置</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          公开页面不再提供设置入口；浏览、搜索和练习都无需注册登录。
        </p>
      </div>
      <section className="admin-card p-6">
        <h2 className="font-semibold">全站功能</h2>
        <div className="mt-5 space-y-5">
          {(
            [
              ['assistant', '站内学习助手', '查询本站资料，无需 AI 账号或接口密钥。'],
              ['onboarding', '首次访问引导', '让第一次使用的人快速找到入口。'],
            ] as const
          ).map(([key, title, description]) => (
            <div key={key} className="flex items-center gap-4">
              <button
                role="switch"
                aria-checked={config?.features[key] ?? false}
                aria-label={title}
                className="module-switch"
                disabled={busy || !config}
                onClick={() => void toggle(key)}
              >
                <span />
              </button>
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          ))}
        </div>
        {message && (
          <p className="mt-5 text-sm" role="status">
            {message}
          </p>
        )}
      </section>
      <details className="admin-card p-6">
        <summary className="cursor-pointer font-semibold">管理员本机偏好与接口设置</summary>
        <p className="mb-5 mt-3 text-xs leading-6 text-muted-foreground">
          以下设置仅作用于你的浏览器，不会向访客共享密钥，也不会改变全站功能开关。
        </p>
        <SettingsPanel />
      </details>
    </div>
  )
}
