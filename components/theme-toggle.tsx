'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ai-map-theme'

/** 点击一次的推进顺序：从当前状态走向下一个 */
const NEXT: Record<Theme, Theme> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
}

const META: Record<Theme, { label: string; next: string; Icon: typeof Sun }> = {
  light: { label: '浅色', next: '深色', Icon: Sun },
  dark: { label: '深色', next: '跟随系统', Icon: Moon },
  system: { label: '跟随系统', next: '浅色', Icon: Monitor },
}

function apply(theme: Theme) {
  const root = document.documentElement
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

/**
 * 主题切换：单按钮循环，而不是三个并排的 radio。
 *
 * 为什么改：三选一的 segmented control 占 102px（实测 h-7 w-8 ×3 + 边框内边距），
 * 而顶栏横向空间本来就紧 —— 实测 912px 视口下整条顶栏只剩 27px 余量。
 * 改成单按钮后是 36px，省下 66px，而且视觉上从「三个不知道是什么的图标」
 * 变成「一个控件」。
 *
 * 代价是「跟随系统」不再一眼可见。用两点补偿：
 *   - 图标始终反映**当前**状态，aria-label 与 title 说明**点击后**会变成什么
 *   - 顺序 light → dark → system → light，「跟随系统」放在最后一档，
 *     符合「手动设置优先、自动跟随兜底」的直觉
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'light'
    setTheme(saved)
    apply(saved)
    setMounted(true)
  }, [])

  function cycle() {
    const next = NEXT[theme]
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    apply(next)
  }

  const { label, next, Icon } = META[theme]

  return (
    <button
      type="button"
      onClick={cycle}
      // 未挂载时先不报状态：SSR 阶段不知道用户存的是什么，报错了会闪一下
      aria-label={mounted ? `主题：${label}，点击切换到${next}` : '切换主题'}
      title={`主题：${label} → ${next}`}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border bg-background',
        'text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </button>
  )
}

/** 注入在 <head> 里的防闪烁脚本 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}