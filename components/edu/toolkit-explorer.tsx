'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, GraduationCap, NotebookPen } from 'lucide-react'

export interface ToolkitSummary {
  id: string
  title: string
  stage: string
  subject: string
  programId: string
  mode: string
  lessons: number
  goal: string
  output: string
}
const stages = ['初中', '高中', '跨学段']
const notes: Record<string, string> = {
  初中: '先观察，再判断。教师演示配合课本与纸面活动，不要求学生注册工具。',
  高中: '先认识，再在教师允许范围内使用；保留初稿、核验与独立完成的证据。',
  跨学段: '围绕正在发生的教学任务：备课、错因、练习、评价、沟通与教研。',
}
export function ToolkitExplorer({
  toolkits,
  programs,
}: {
  toolkits: ToolkitSummary[]
  programs: { id: string; title: string }[]
}) {
  const [stage, setStage] = useState('初中')
  const [program, setProgram] = useState('')
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requested = params.get('stage')
    const course = params.get('program') ?? ''
    if (course) {
      setProgram(course)
      setStage(requested && stages.includes(requested) ? requested : '全部')
    } else if (requested && stages.includes(requested)) setStage(requested)
    setHydrated(true)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    const params = new URLSearchParams()
    if (stage !== '全部') params.set('stage', stage)
    if (program) params.set('program', program)
    window.history.replaceState(null, '', `/edu/toolkits/${params.size ? `?${params}` : ''}`)
  }, [stage, program, hydrated])
  const visible = toolkits.filter(
    (item) =>
      (stage === '全部' || item.stage === stage) && (!program || item.programId === program),
  )
  const Icon = stage === '高中' ? GraduationCap : stage === '跨学段' ? NotebookPen : BookOpen
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="school-stage-tabs" role="group" aria-label="按学段选择教案">
          {[...stages, '全部'].map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={stage === item}
              onClick={() => setStage(item)}
            >
              {item === '跨学段' ? '跨学段 · 教师' : item}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          配套课程
          <select
            value={program}
            onChange={(event) => setProgram(event.target.value)}
            className="max-w-[220px] rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="">不限课程</option>
            {programs.map((item) => (
              <option value={item.id} key={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="my-6 flex items-start gap-2 text-sm leading-6 text-muted-foreground">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        {notes[stage] ?? '按当前课堂需要选择，每套提供材料、流程与可复制的学习单。'}
      </p>
      <p aria-live="polite" className="mb-4 text-xs text-muted-foreground">
        找到 {visible.length} 套教案
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((item) => (
          <Link href={`/edu/toolkits/${item.id}`} key={item.id} className="school-kit-card">
            <p className="flex items-center gap-2 text-xs text-primary">
              <Icon className="h-4 w-4" aria-hidden />
              {item.stage} · {item.subject}
            </p>
            <h2 className="mt-4 text-lg leading-7">{item.title}</h2>
            <p className="mb-5 mt-3 flex-1 text-sm leading-6 text-muted-foreground">{item.goal}</p>
            <p className="text-xs leading-6 text-muted-foreground">
              <span className="font-medium text-foreground">带走：</span>
              {item.output}
            </p>
            <span className="mt-5 flex items-center justify-between text-xs font-medium text-primary">
              {item.lessons} 课时 · {item.mode}
              <span className="inline-flex items-center gap-1">
                看材料与流程
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </span>
          </Link>
        ))}
      </div>
      {!visible.length && (
        <div className="rounded-xl bg-muted/50 p-8 text-sm">
          <p>这个组合暂时没有教案。可以切换学段，或清除课程筛选。</p>
          <button
            className="mt-4 text-primary underline"
            onClick={() => {
              setProgram('')
              setStage('全部')
            }}
          >
            查看全部教案
          </button>
        </div>
      )}
      <p className="mt-8 text-xs leading-6 text-muted-foreground">
        课前按本校教材、课时和学情调整；所有教案均准备纸面或教师演示替代方式。
        <Link href="/edu/support" className="ml-2 text-primary underline">
          提交教学反馈
        </Link>
      </p>
    </div>
  )
}
