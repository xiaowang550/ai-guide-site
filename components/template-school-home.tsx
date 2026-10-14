'use client'
import Link from 'next/link'
import { ArrowUpRight, BookOpen, ClipboardList, ShieldCheck } from 'lucide-react'
const routes = [
  {
    id: 'prepare',
    name: '我要备课',
    title: '从一份教案开始',
    note: '选择学科，查看材料、课堂流程和工作单。',
    href: '/edu/toolkits/',
    action: '选择课程与教案',
    icon: ClipboardList,
    steps: ['选择学科与课题', '调整课堂活动', '带走工作单'],
  },
  {
    id: 'learn',
    name: '安排课程',
    title: '给学生一条学习路线',
    note: '根据初中、高中或教师场景，安排学习内容。',
    href: '/edu/programs/',
    action: '查看课程路线',
    icon: BookOpen,
    steps: ['确定学习对象', '选择课程路线', '逐节开展练习'],
  },
  {
    id: 'policy',
    name: '制定规范',
    title: '先说明怎样使用 AI',
    note: '用课堂场景讨论边界，整理学校的使用规范。',
    href: '/edu/policy/',
    action: '整理使用规范',
    icon: ShieldCheck,
    steps: ['讨论课堂场景', '选择适用规则', '生成规范草稿'],
  },
]
export function TemplateSchoolHome() {
  return (
    <section className="template-school template-only">
      <header>
        <div>
          <p className="template-overline">备课 · 课堂 · 复核</p>
          <h1>
            下一节课，
            <br />
            <em>准备好了。</em>
          </h1>
          <p>从你正在做的教学任务开始。</p>
        </div>
        <div className="template-mascot" aria-hidden="true" />
      </header>
      <section data-task-workspace className="template-school-planner">
        <div role="tablist" className="template-tabs" aria-label="教学任务">
          {routes.map((r, i) => (
            <button
              key={r.id}
              role="tab"
              type="button"
              id={`school-${r.id}-tab`}
              aria-controls={`school-${r.id}`}
              aria-selected={i === 0}
              tabIndex={i === 0 ? 0 : -1}
              data-template-tab={r.id}
            >
              <r.icon size={19} />
              {r.name}
            </button>
          ))}
        </div>
        {routes.map((r, i) => (
          <div
            role="tabpanel"
            tabIndex={0}
            id={`school-${r.id}`}
            aria-labelledby={`school-${r.id}-tab`}
            key={r.id}
            data-template-panel={r.id}
            hidden={i !== 0}
            className="template-school-panel"
          >
            <div>
              <p className="template-overline">本次任务</p>
              <h2>{r.title}</h2>
              <p>{r.note}</p>
              <Link href={r.href} className="template-action">
                {r.action}
                <ArrowUpRight size={18} />
              </Link>
            </div>
            <ol>
              {r.steps.map((s, n) => (
                <li key={s}>
                  <span>0{n + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </section>
      <div className="template-school-resources">
        {routes.map((r) => (
          <Link key={r.id} href={r.href}>
            <r.icon />
            <h3>{r.name}</h3>
            <p>{r.note}</p>
            <ArrowUpRight />
          </Link>
        ))}
      </div>
      <Link className="template-news-link" href="/edu/support/">
        <span>课堂遇到问题？</span>
        <strong>提交教学反馈</strong>
        <ArrowUpRight />
      </Link>
    </section>
  )
}
