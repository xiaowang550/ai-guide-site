'use client'

import { useEffect, useState } from 'react'
import type { EduBriefing, EduSchool } from '@/data/types'
import { apiGet } from './api-client'

interface SchoolArchive {
  publicEnabled: false
  schools: EduSchool[]
  briefings: EduBriefing[]
  toolkitNames: Record<string, string>
  programNames: Record<string, string>
}

/** 内容只通过登录后的接口读取，避免将保留模块的数据写进公开 HTML / JS。 */
export function SchoolModulesView({ kind }: { kind: 'schools' | 'briefings' }) {
  const [data, setData] = useState<SchoolArchive | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setError('')
    apiGet<SchoolArchive>('/api/admin/school-modules')
      .then((value) => {
        if (active) setData(value)
      })
      .catch(() => {
        if (active) setError('读取保留内容失败，请重试。')
      })
    return () => {
      active = false
    }
  }, [retry])
  return (
    <div>
      <p className="text-xs text-primary">保留模块</p>
      <h1 className="mt-2 text-2xl">{kind === 'schools' ? '试点与推广' : '定期简报'}</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        公开站已关闭此模块。原有内容保留在私人后台，后续需要时再恢复公开入口。
      </p>
      {error ? (
        <div role="alert" className="mt-6 rounded-xl bg-danger/5 p-5 text-sm">
          {error}
          <button onClick={() => setRetry((value) => value + 1)} className="ml-3 underline">
            重新读取
          </button>
        </div>
      ) : !data ? (
        <p className="mt-6 text-sm text-muted-foreground">正在读取保留内容…</p>
      ) : (
        <div className="mt-7 space-y-4">
          {kind === 'schools' ? (
            <>
              <p className="rounded-xl bg-amber-500/10 p-4 text-sm leading-6">
                现有学校记录含演示数据。标为“示例”的学校与人数用于展示结构，不代表实际覆盖成果。
              </p>
              {data.schools.map((school) => (
                <details className="rounded-2xl border bg-card p-5" key={school.id}>
                  <summary className="cursor-pointer text-sm font-medium">
                    {school.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {school.isSample ? '示例 · ' : ''}
                      {school.stage} · {school.phase}
                    </span>
                  </summary>
                  <dl className="mt-4 space-y-3 text-sm leading-6">
                    <div>
                      <dt className="font-medium">交付课程</dt>
                      <dd className="text-muted-foreground">
                        {school.deliveredPrograms
                          .map((id) => data.programNames[id] ?? id)
                          .join('、')}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">历史教案包</dt>
                      <dd className="text-muted-foreground">
                        {school.deliveredToolkits
                          .map((id) => data.toolkitNames[id] ?? id)
                          .join('、')}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">覆盖教师 / 种子教师</dt>
                      <dd>
                        {school.teachersReached} / {school.seedTeachers}
                        {school.isSample ? '（示例）' : ''}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">下一步</dt>
                      <dd className="text-muted-foreground">{school.nextStep}</dd>
                    </div>
                    <div>
                      <dt className="font-medium">校本安排</dt>
                      <dd className="text-muted-foreground">{school.customization}</dd>
                    </div>
                  </dl>
                </details>
              ))}
            </>
          ) : (
            data.briefings.map((briefing) => (
              <details className="rounded-2xl border bg-card p-5" key={briefing.id}>
                <summary className="cursor-pointer text-sm font-medium">
                  {briefing.issue}
                  <span className="ml-3 text-xs text-muted-foreground">
                    {briefing.date} · 未公开
                  </span>
                </summary>
                <p className="mt-4 text-sm leading-7">{briefing.summary}</p>
                <ul className="mt-4 space-y-4">
                  {briefing.changes.map((change) => (
                    <li key={change.title}>
                      <h2 className="text-sm font-semibold">{change.title}</h2>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        {change.detail}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-primary">建议：{change.action}</p>
                    </li>
                  ))}
                </ul>
                <h2 className="mb-2 mt-5 text-sm font-semibold">对学校的影响</h2>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {briefing.implications.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h2 className="mb-2 mt-5 text-sm font-semibold">后续动作</h2>
                <ul className="space-y-2 text-sm leading-6 text-muted-foreground">
                  {briefing.actions.map((action) => (
                    <li key={action.title}>
                      {action.owner} · {action.title}：{action.detail}
                    </li>
                  ))}
                </ul>
                {briefing.editorNote && (
                  <p className="mt-5 text-xs leading-6 text-muted-foreground">
                    编辑备注：{briefing.editorNote}
                  </p>
                )}
              </details>
            ))
          )}
        </div>
      )}
    </div>
  )
}
