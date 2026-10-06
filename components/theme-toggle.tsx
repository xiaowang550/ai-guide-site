'use client'

import { useEffect, useState } from 'react'
import { Monitor, Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'ai-map-theme'

function apply(theme: Theme) {
  const root = document.documentElement
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  root.classList.toggle('dark', dark)
  root.style.colorScheme = dark ? 'dark' : 'light'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? 'system'
    setTheme(saved)
    apply(saved)
    setMounted(true)
  }, [])

  function update(next: Theme) {
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    apply(next)
  }

  const options: { key: Theme; label: string; icon: React.ReactNode }[] = [
    { key: 'light', label: '浅色', icon: <Sun className="h-3.5 w-3.5" aria-hidden /> },
    { key: 'dark', label: '深色', icon: <Moon className="h-3.5 w-3.5" aria-hidden /> },
    { key: 'system', label: '跟随系统', icon: <Monitor className="h-3.5 w-3.5" aria-hidden /> },
  ]

  return (
    <div
      className="flex items-center rounded-lg border bg-background p-0.5"
      role="radiogroup"
      aria-label="主题模式"
      title="深色模式"
    >
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          role="radio"
          aria-checked={mounted && theme === opt.key}
          aria-label={opt.label}
          onClick={() => update(opt.key)}
          className={cn(
            'inline-flex h-7 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors',
            mounted && theme === opt.key && 'bg-accent text-accent-foreground'
          )}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  )
}

/** 注入在 <head> 里的防闪烁脚本 */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var e=document.documentElement;e.classList.toggle('dark',d);e.style.colorScheme=d?'dark':'light';}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: script }} />
}