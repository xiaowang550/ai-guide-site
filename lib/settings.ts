'use client'

/**
 * 本地偏好设置（localStorage）。
 *
 * 只存「用户在这台设备上的选择」，不涉及任何账号与隐私数据：
 * - assistant：助手浮窗是否显示
 * - assistantDock：助手停靠位置（四个角 + 自定义坐标）
 * - onboarding：新手引导是否已完成 / 被跳过
 *
 * 站点是纯静态的，没有账号体系，所以设置跟着浏览器走；换设备不会同步，
 * 这一点在 /settings 页面上对用户说明。
 */
export type AssistantDock =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left'
  | { x: number; y: number }

export interface SiteSettings {
  /** 助手浮窗是否可见（用户关闭后可在 /settings 重新打开） */
  assistant: boolean
  /** 助手停靠位置：预设方位或拖拽后的自定义坐标 */
  assistantDock: AssistantDock
  /** 是否已经看过（或主动跳过）新手引导 */
  onboardingDone: boolean
  /** 用户是否手动折叠过助手面板 */
  assistantPanelOpen: boolean
}

export const DEFAULT_SETTINGS: SiteSettings = {
  assistant: true,
  assistantDock: 'bottom-right',
  onboardingDone: false,
  assistantPanelOpen: false,
}

const KEY = 'ai-map:settings:v1'
const EVENT = 'ai-map:settings-change'

function isDock(value: unknown): value is AssistantDock {
  if (typeof value === 'string') {
    return ['bottom-right', 'bottom-left', 'top-right', 'top-left'].includes(value)
  }
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { x?: unknown }).x === 'number' &&
    typeof (value as { y?: unknown }).y === 'number'
  )
}

/** 读取设置（带容错：数据损坏时回退默认值而不是崩掉） */
export function readSettings(): SiteSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<SiteSettings>
    return {
      assistant: typeof parsed.assistant === 'boolean' ? parsed.assistant : DEFAULT_SETTINGS.assistant,
      assistantPanelOpen:
        typeof parsed.assistantPanelOpen === 'boolean'
          ? parsed.assistantPanelOpen
          : DEFAULT_SETTINGS.assistantPanelOpen,
      onboardingDone:
        typeof parsed.onboardingDone === 'boolean'
          ? parsed.onboardingDone
          : DEFAULT_SETTINGS.onboardingDone,
      assistantDock: isDock(parsed.assistantDock) ? parsed.assistantDock : DEFAULT_SETTINGS.assistantDock,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** 写入设置并广播（同一页面内的多个组件靠事件保持同步） */
export function writeSettings(patch: Partial<SiteSettings>): SiteSettings {
  const next = { ...readSettings(), ...patch }
  if (typeof window === 'undefined') return next
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* 隐私模式 / 配额满：忽略，功能降级但不影响使用 */
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  return next
}

/** 重置全部本地设置（「恢复默认」用） */
export function resetSettings(): SiteSettings {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* 忽略 */
    }
  }
  return writeSettings(DEFAULT_SETTINGS)
}

export function subscribeSettings(cb: (s: SiteSettings) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: Event) => cb((e as CustomEvent<SiteSettings>).detail)
  window.addEventListener(EVENT, handler)
  // 另一个标签页改了设置，也要同步
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export const SETTINGS_STORAGE_KEY = KEY