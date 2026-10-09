'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'

export function PracticeCheck({ id, checks }: { id: string; checks: string[] }) {
  const [done, setDone] = useState<boolean[]>(checks.map(() => false))
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(`lesson-check:${id}`) ?? '[]')
      if (Array.isArray(saved)) setDone(checks.map((_, i) => saved[i] === true))
    } catch {
      /* 保留初始状态 */
    }
  }, [id, checks])
  function toggle(index: number) {
    setDone((previous) => {
      const next = checks.map((_, i) => (i === index ? !previous[i] : previous[i] === true))
      try {
        localStorage.setItem(`lesson-check:${id}`, JSON.stringify(next))
      } catch {
        /* 不影响勾选 */
      }
      return next
    })
  }
  return (
    <section id="practice-check" className="practice-check">
      <h2 className="flex items-center gap-2 text-lg">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        做完了吗？检查这几项
      </h2>
      <p className="mt-2 text-xs text-muted-foreground">
        用自己的产出核对，再勾选。进度保存在这台设备上。
      </p>
      <div className="mt-5 space-y-3">
        {checks.map((check, i) => (
          <label key={check} className="flex cursor-pointer items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[hsl(var(--primary))]"
              checked={done[i] ?? false}
              onChange={() => toggle(i)}
            />
            <span>{check}</span>
          </label>
        ))}
      </div>
      <p role="status" className="mt-4 text-xs font-medium text-primary">
        {done.filter(Boolean).length} / {checks.length} 项已核对
      </p>
    </section>
  )
}
