'use client'

import { useEffect, useState } from 'react'
import { Compass, RotateCcw } from 'lucide-react'
import {
  DEFAULT_SETTINGS,
  readSettings,
  resetSettings,
  subscribeSettings,
  writeSettings,
  type SiteSettings,
} from '@/lib/settings'
import { AiModeSettings } from '@/components/settings/ai-mode-settings'
import { ErrataQueuePanel } from '@/components/errata-queue-panel'
import { cn } from '@/lib/utils'

const DOCK_LABEL: Record<string, string> = {
  'bottom-right': '右下角',
  'bottom-left': '左下角',
  'top-right': '右上角',
  'top-left': '左上角',
}

function Row({
  title,
  description,
  control,
}: {
  title: string
  description: string
  control: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-t border-hairline py-4">
      <div className="min-w-[16rem] flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-1 text-[13px] leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-6 w-11 rounded-full border transition-colors',
        checked ? 'border-primary bg-primary' : 'bg-muted',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 top-0.5 rounded-full bg-white transition-transform',
          checked ? 'translate-x-[21px]' : 'translate-x-0',
        )}
        style={{ height: '18px', width: '18px' }}
      />
    </button>
  )
}

export function SettingsPanel() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setSettings(readSettings())
    setReady(true)
    return subscribeSettings(setSettings)
  }, [])

  function update(patch: Partial<SiteSettings>) {
    setSettings(writeSettings(patch))
  }

  return (
    <div>
      <ErrataQueuePanel />
      <Row
        title="显示站内助手"
        description="右下角的浮动助手，可以拖到任何位置。关闭后本页可以随时重新打开。"
        control={
          <Toggle
            checked={settings.assistant}
            onChange={(v) =>
              update({ assistant: v, assistantPanelOpen: v ? settings.assistantPanelOpen : false })
            }
            label="显示站内助手"
          />
        }
      />
      <AiModeSettings />
      <Row
        title="助手停靠位置"
        description="默认在右下角。你也可以直接在页面上把它拖到顺手的位置，位置会记在这台设备上。"
        control={
          <div className="flex flex-wrap gap-1.5">
            {(['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const).map((dock) => {
              const active = settings.assistantDock === dock
              return (
                <button
                  key={dock}
                  type="button"
                  onClick={() => update({ assistantDock: dock })}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    active
                      ? 'border-primary bg-primary/10 font-medium text-primary'
                      : 'text-muted-foreground hover:border-foreground/25',
                  )}
                >
                  {DOCK_LABEL[dock]}
                </button>
              )
            })}
            {typeof settings.assistantDock !== 'string' ? (
              <span className="self-center text-[11px] text-muted-foreground">
                （当前为拖拽后的自定义位置）
              </span>
            ) : null}
          </div>
        }
      />
      <Row
        title="重新播放新手引导"
        description="一分钟动手体验。可以随时关闭，或选择今天不再提示。"
        control={
          <button
            type="button"
            onClick={() => {
              writeSettings({ onboardingDone: false })
              window.location.assign('/?tour=1')
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors hover:bg-accent"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden />
            重新播放
          </button>
        }
      />
      <Row
        title="恢复默认设置"
        description="清空本设备保存的全部偏好（助手开关、停靠位置、引导状态）。不会影响任何内容数据。"
        control={
          <button
            type="button"
            onClick={() => {
              resetSettings()
              window.location.reload()
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors hover:bg-accent"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            恢复默认
          </button>
        }
      />

      <div className="border-t border-hairline pt-4 text-xs leading-6 text-muted-foreground">
        <p>
          这些设置只保存在你这台设备的浏览器里（
          <code className="rounded bg-muted px-1">localStorage</code>
          ），不涉及账号、不上传服务器、换设备不会同步。
        </p>
        {!ready ? <p className="mt-2 opacity-0">读取中…</p> : null}
      </div>
    </div>
  )
}
