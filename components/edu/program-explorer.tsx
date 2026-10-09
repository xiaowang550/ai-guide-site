'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BookOpen, GraduationCap, NotebookPen } from 'lucide-react'

export interface ProgramSummary {
  id: string
  title: string
  tier: string
  stage: string
  lessons: number
  outcome: string
  deliverables: string[]
}
const paths = [
  {
    id: 'junior',
    title: '初中 · 认识 AI',
    icon: BookOpen,
    note: '教师演示 + 纸面观察，不要求学生注册',
    steps: ['观察生活应用', '核查信息来源', '建立安全与诚信意识'],
    programs: ['s1-what-is-ai', 's3-media-literacy', 's3-integrity'],
    stage: '初中',
  },
  {
    id: 'senior',
    title: '高中 · 了解与使用',
    icon: GraduationCap,
    note: '先独立思考，再辅助、核验与修改',
    steps: ['补齐入门认识', '尝试学习辅助', '说明证据与使用过程'],
    programs: ['s1-what-is-ai', 's2-use-well', 's3-integrity'],
    stage: '高中',
  },
  {
    id: 'teacher',
    title: '教师 · 日常教学',
    icon: NotebookPen,
    note: '从本周备课开始，逐步加入课堂与评价',
    steps: ['认识能力与边界', '完成一次备课', '调整作业与评价'],
    programs: ['t1-ai-literacy', 't2-lesson-prep', 't3-homework-redesign'],
    stage: '跨学段',
  },
] as const

export function ProgramExplorer({ programs }: { programs: ProgramSummary[] }) {
  const [selected, setSelected] = useState('junior')
  const path = paths.find((item) => item.id === selected) ?? paths[0]
  const byId = new Map(programs.map((program) => [program.id, program]))
  return (
    <div>
      <figure className="school-illustration">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/illustrations/school-paths-v1.webp"
          alt="初中学生观察教师演示、高中学生在教师指导下核查内容、教师准备日常教案"
          width={1440}
          height={480}
        />
        <figcaption>从观察开始，把方法带进学习与教学。</figcaption>
      </figure>
      <h2 className="mb-4 mt-7 text-xl">先选一条适合你的起步路线</h2>
      <div className="school-path-options" role="group" aria-label="选择学习对象">
        {paths.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={selected === item.id}
            onClick={() => setSelected(item.id)}
            className="school-path-option"
          >
            <item.icon className="h-5 w-5 text-primary" aria-hidden />
            <span>
              <strong>{item.title}</strong>
              <small>{item.note}</small>
            </span>
          </button>
        ))}
      </div>
      <section className="mt-8" aria-live="polite" aria-label={`${path.title}推荐路线`}>
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg">按这个顺序开始</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              先完成第一步，再根据课堂需要继续。每门课程附教学大纲。
            </p>
          </div>
          <Link
            className="section-link"
            href={`/edu/toolkits?stage=${encodeURIComponent(path.stage)}`}
          >
            选这一学段的教案
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <ol className="school-course-flow">
          {path.programs.map((id, index) => {
            const program = byId.get(id)
            if (!program) return null
            return (
              <li key={id}>
                <span className="school-step">{index + 1}</span>
                <p className="mt-4 text-xs font-medium text-primary">{path.steps[index]}</p>
                <h3 className="mt-2 text-base">{program.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{program.outcome}</p>
                <p className="mb-5 mt-3 text-xs text-muted-foreground">
                  {program.lessons} 课时 · 带走{program.deliverables[0]}
                </p>
                <Link href={`/edu/programs/${id}`} className="section-link">
                  看课程与活动
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            )
          })}
        </ol>
      </section>
      <details className="school-details mt-8">
        <summary>查看全部课程与教师进阶方向</summary>
        <div className="grid gap-x-8 sm:grid-cols-2">
          {programs.map((program) => (
            <Link
              href={`/edu/programs/${program.id}`}
              key={program.id}
              className="flex items-start justify-between gap-3 border-b border-hairline py-4 text-sm hover:text-primary"
            >
              <span>
                {program.title}
                <small className="mt-1 block text-xs text-muted-foreground">
                  {program.stage} · {program.lessons} 课时
                </small>
              </span>
              <ArrowRight className="mt-1 h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ))}
        </div>
      </details>
    </div>
  )
}
