'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { CaseExercise } from '@/data/daily-cases'
const Workbench = dynamic(() => import('./case-practice').then((m) => m.CasePractice), {
  loading: () => <p role="status">正在打开练习工作台…</p>,
  ssr: false,
})
export function CasePracticeLoader({ exercise, title }: { exercise: CaseExercise; title: string }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="case-practice-entry">
      <h2>照着做一次，带走你的成果</h2>
      <p>
        用虚构材料练习：修改输入 → 获取草稿 →
        对照原文核对。模型不可用时，也能在其他工具完成并带回结果。
      </p>
      {open ? (
        <Workbench exercise={exercise} title={title} />
      ) : (
        <button onClick={() => setOpen(true)}>开始这个案例的动手练习 →</button>
      )}
    </section>
  )
}
