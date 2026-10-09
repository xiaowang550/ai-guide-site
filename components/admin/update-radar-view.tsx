'use client'

import { useEffect, useState } from 'react'
import type { UpdateRecord } from '@/data/types'
import { apiGet } from './api-client'

export function UpdateRadarView() {
  const [items, setItems] = useState<UpdateRecord[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    apiGet<{ updates: UpdateRecord[] }>('/api/admin/update-radar')
      .then((data) => {
        if (active) setItems(data.updates)
      })
      .catch(() => {
        if (active) setError('读取保留记录失败，请切换分区后重试。')
      })
    return () => {
      active = false
    }
  }, [])
  return (
    <div>
      <p className="text-xs text-primary">保留模块 · 暂不公开</p>
      <h1 className="mt-2 text-2xl">更新雷达</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        原站内变更日志保留在这里。公开入口现在展示 AI 实时资讯，需要时再恢复原有功能。
      </p>
      {error && (
        <p role="alert" className="mt-5 text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="mt-6 space-y-4">
        {items.map((item) => (
          <li key={item.id} className="rounded-2xl border bg-card p-5">
            <time className="text-xs text-muted-foreground">{item.date}</time>
            <p className="mt-3 text-sm leading-7">{item.summary}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              相关页面：{item.affected.join('、')}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
