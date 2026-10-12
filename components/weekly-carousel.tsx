'use client'
import { useState, type ReactNode } from 'react'
export function WeeklyCarousel({ groups }: { groups: ReactNode[] }) {
  const [page, setPage] = useState(0)
  return (
    <>
      <button
        className="weekly-change"
        type="button"
        onClick={() => setPage((value) => (value + 1) % groups.length)}
        aria-label="换一组本周推荐"
      >
        换一换 ↻
      </button>
      <div aria-live="polite" aria-atomic="true">
        {groups[page]}
      </div>
    </>
  )
}
