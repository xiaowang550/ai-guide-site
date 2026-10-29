'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ClipboardCheck,
  Copy,
  Files,
  Layers3,
  ShieldCheck,
} from 'lucide-react'
import { copyText } from '@/lib/copy-text'

const missions = [
  {
    id: 'prepare',
    label: '备课',
    number: '01',
    title: '从教学目标，推到一堂课。',
    intro: '把材料交给 AI，把判断留给自己。',
    action: '打开教案工具箱',
    href: '/edu/toolkits/',
    steps: [
      {
        title: '确定本节课要解决的问题',
        body: '写下学段、课题和一个可观察的学习目标。先明确学生最后能做什么。',
      },
      {
        title: '整理材料，生成活动草稿',
        body: '用课文、练习或公开资料提出要求。让 AI 先给活动结构，再补充具体问题。',
      },
      {
        title: '核对答案与课堂可行性',
        body: '检查知识点、时间和材料出处。用你熟悉的班级情况调整难度。',
      },
    ],
    prompt:
      '请基于我提供的教材材料，设计一份课堂活动草稿。先列出一个可观察的学习目标，再按“教师提问—学生活动—检查理解”组织。不要编造教材原文；缺失材料请列出。',
  },
  {
    id: 'classroom',
    label: '课堂',
    number: '02',
    title: '让学生参与，而不是只看演示。',
    intro: '一次对照、一次讨论、一次亲手核验。',
    action: '查看课程路线',
    href: '/edu/programs/',
    steps: [
      {
        title: '带着具体问题进入课堂',
        body: '给学生同一份公开材料，用两种不同问法提问，观察回答发生了什么变化。',
      },
      {
        title: '先作判断，再揭示 AI 回答',
        body: '让学生先独立记录答案，再与 AI 的结果对照。讨论哪些内容有依据，哪些需要补查。',
      },
      {
        title: '留下一份可检查的成果',
        body: '收集问题、修改过程和资料出处。评价学生如何判断与修改，不只看最终文字。',
      },
    ],
    prompt:
      '请把这个课题改成一个学生可以参与的课堂活动。包括独立思考、两种问法对照、小组核验和成果记录。提供教师追问，避免直接替学生完成全部答案。',
  },
  {
    id: 'review',
    label: '评价',
    number: '03',
    title: '看见过程，才知道学会了什么。',
    intro: '用清楚的标准，评估真实的学习表现。',
    action: '整理评价与使用规范',
    href: '/edu/policy/',
    steps: [
      {
        title: '先定评价标准',
        body: '把学习目标转成能观察到的表现，例如能否解释依据、发现错误或改进提问。',
      },
      {
        title: '记录使用过程',
        body: '保留使用了哪些材料、怎样提问和哪些地方做过人工修改。不上传学生姓名与个人信息。',
      },
      {
        title: '给出可行动的反馈',
        body: '指出一处做得好的地方和一个可以继续改进的动作。AI 建议由教师核对后使用。',
      },
    ],
    prompt:
      '请为这个课题设计一份简明的过程评价表，包含“资料依据、独立判断、修改过程”三个维度。每个维度给出可观察的表现和反馈建议，不对真实学生作自动评分。',
  },
] as const

const resources = [
  {
    code: '01',
    title: '课程路线',
    text: '按学段选择学习起点',
    href: '/edu/programs/',
    icon: BookOpen,
    art: 'paths',
  },
  {
    code: '02',
    title: '教案工具箱',
    text: '材料、活动与工作单',
    href: '/edu/toolkits/',
    icon: Files,
    art: 'sheets',
  },
  {
    code: '03',
    title: '使用规范',
    text: '把规则写成具体行动',
    href: '/edu/policy/',
    icon: ShieldCheck,
    art: 'shield',
  },
  {
    code: '04',
    title: '教学支持',
    text: '查问题，提交使用反馈',
    href: '/edu/support/',
    icon: ClipboardCheck,
    art: 'signals',
  },
] as const

export function TeacherHome() {
  const [selected, setSelected] = useState(0)
  const [expanded, setExpanded] = useState<number | null>(0)
  const [topic, setTopic] = useState('一节关于“识别 AI 回答中的错误”的活动课')
  const [copied, setCopied] = useState('')
  const mission = missions[selected]
  const prompt = `课题：${topic.trim() || '请填写你的课题'}\n\n${mission.prompt}`

  return (
    <div className="xian-teacher">
      <header className="xt-intro">
        <div>
          <p className="xt-eyebrow">
            <span /> TEACHING SPACE <i> / </i> 教学工作台
          </p>
          <h1>
            下一节课，
            <br />
            <span>从这里开始。</span>
          </h1>
          <p className="xt-description">选课、备课、带进课堂。让 AI 参与教学的每一步都有依据。</p>
        </div>
        <a href="#teaching-workflow" className="xt-enter">
          开始备课 <ArrowDownRight size={23} aria-hidden />
        </a>
        <div className="xt-orbit" aria-hidden="true">
          <svg viewBox="0 0 320 240" fill="none">
            <path d="M18 121H302M160 10V230" stroke="currentColor" opacity=".14" />
            <ellipse
              cx="160"
              cy="120"
              rx="118"
              ry="66"
              stroke="currentColor"
              opacity=".35"
              transform="rotate(-24 160 120)"
            />
            <ellipse
              cx="160"
              cy="120"
              rx="118"
              ry="66"
              stroke="currentColor"
              opacity=".6"
              transform="rotate(46 160 120)"
            />
            <path d="M160 59L219 94V161L160 194L101 161V94L160 59Z" stroke="currentColor" />
            <path
              d="M160 59V127L219 161M160 127L101 161M101 94L160 127L219 94"
              stroke="currentColor"
              opacity=".6"
            />
            <circle cx="160" cy="127" r="7" fill="currentColor" />
            <circle cx="51" cy="151" r="4" fill="currentColor" />
            <circle cx="254" cy="83" r="3" fill="currentColor" />
          </svg>
          <span>IDEA → CLASSROOM</span>
        </div>
      </header>

      <nav className="xt-resources" aria-label="教学资源">
        {resources.map(({ title, text, href, icon: Icon, code, art }) => (
          <Link prefetch={false} href={href} className="xt-resource" key={code}>
            <div className="xt-resource-top">
              <Icon size={21} aria-hidden />
              <span>{code}</span>
              <ArrowUpRight size={18} aria-hidden />
            </div>
            <div className={`xt-resource-art xt-art-${art}`} aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </div>
            <h2>{title}</h2>
            <p>{text}</p>
          </Link>
        ))}
      </nav>

      <section
        id="teaching-workflow"
        className="xt-workflow"
        aria-labelledby="teaching-workflow-title"
      >
        <div className="xt-section-heading">
          <span>01 / 工作流</span>
          <h2 id="teaching-workflow-title">现在，准备哪一步？</h2>
          <Layers3 size={21} aria-hidden />
        </div>
        <div className="xt-workflow-grid">
          <div className="xt-plan">
            <div className="xt-tabs" aria-label="教学阶段">
              {missions.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  aria-pressed={selected === index}
                  onClick={() => {
                    setSelected(index)
                    setExpanded(0)
                    setCopied('')
                  }}
                >
                  <span>{item.number}</span>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="xt-plan-copy" key={mission.id}>
              <h3>{mission.title}</h3>
              <p>{mission.intro}</p>
              <ol className="xt-steps">
                {mission.steps.map((step, index) => (
                  <li key={step.title}>
                    <button
                      type="button"
                      aria-expanded={expanded === index}
                      aria-controls={`xt-step-${index}`}
                      onClick={() => setExpanded(expanded === index ? null : index)}
                    >
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <strong>{step.title}</strong>
                      <ChevronDown size={17} aria-hidden />
                    </button>
                    {expanded === index && <p id={`xt-step-${index}`}>{step.body}</p>}
                  </li>
                ))}
              </ol>
              <Link prefetch={false} className="xt-primary" href={mission.href}>
                {mission.action}
                <ArrowUpRight size={18} aria-hidden />
              </Link>
            </div>
          </div>
          <aside className="xt-brief" aria-labelledby="xt-brief-title">
            <div className="xt-brief-top">
              <span>LESSON BRIEF</span>
              <span className="xt-live-dot" />
            </div>
            <h3 id="xt-brief-title">把你的课题带进来。</h3>
            <label htmlFor="xt-topic">这次想教什么？</label>
            <textarea
              id="xt-topic"
              rows={3}
              maxLength={300}
              value={topic}
              onChange={(event) => {
                setTopic(event.target.value)
                setCopied('')
              }}
            />
            <div className="xt-prompt-preview">
              <span>为「{mission.label}」准备的要求</span>
              <p>{mission.prompt}</p>
            </div>
            <button
              className="xt-copy"
              type="button"
              disabled={!topic.trim()}
              onClick={async () =>
                setCopied(
                  (await copyText(prompt))
                    ? '已复制，可以粘贴给 AI。'
                    : '复制未成功，请手动选择上方文字。',
                )
              }
            >
              {copied.startsWith('已复制') ? (
                <Check size={17} aria-hidden />
              ) : (
                <Copy size={17} aria-hidden />
              )}
              复制完整要求
              <ArrowRight size={16} aria-hidden />
            </button>
            <p className="xt-copy-status" role="status">
              {copied || '修改课题后，复制到你正在使用的 AI 工具。'}
            </p>
          </aside>
        </div>
      </section>

      <div className="xt-bottom-note">
        <ShieldCheck size={19} aria-hidden />
        <p>课堂材料先去除个人信息。生成的知识点、答案与评价，由教师核对后使用。</p>
        <Link prefetch={false} href="/edu/policy/">
          查看规范
          <ArrowUpRight size={16} aria-hidden />
        </Link>
      </div>
    </div>
  )
}
