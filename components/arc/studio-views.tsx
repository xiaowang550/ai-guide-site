'use client'

import { useId, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BookOpen,
  Check,
  Copy,
  Layers3,
  Plus,
  RotateCcw,
  Search,
} from 'lucide-react'
import { copyText } from '@/lib/copy-text'
import './studio-views.css'

type Counts = { tools: number; guides: number; cases: number }
type StudioProps = {
  view: 'teacher' | 'admin'
  counts: Counts
  onTry: (prompt: string) => void
}

const teachingStages = [
  {
    title: '备课',
    action: '把一节课，准备得更清楚。',
    note: '先定目标，再安排活动；让每一步都能看见学生的思考。',
    outcome: '一份可继续修改的课堂活动提纲',
    steps: [
      {
        title: '确定学生要学会什么',
        text: '把课题写成可以观察的学习目标。例如：学生能从一段材料中找出三条信息，并说明依据。',
      },
      {
        title: '安排一次具体的活动',
        text: '准备一小段适合学生的材料，安排独立思考、对照与修订。AI 可以帮助起草，材料和难度仍由教师确认。',
      },
      {
        title: '想好怎样检查结果',
        text: '写两条清楚的检查标准，让学生知道要交出什么，也让你能判断哪里需要再讲一次。',
      },
    ],
    instruction:
      '帮我准备一份课堂活动提纲。先给出两个可观察的学习目标，再安排独立思考、交流和修订三个环节，最后给出两条检查标准。请指出还需要我补充的年级、课时和已有基础，不替我编造。',
  },
  {
    title: '课堂',
    action: '给思考，留一点空间。',
    note: '让学生先做一次，再对照 AI 的结果，最后说出自己的判断。',
    outcome: '一组能直接带进课堂的活动说明',
    steps: [
      {
        title: '先让学生自己试一次',
        text: '展示任务，给学生一段独立思考的时间。先保留原来的答案，后面的比较才有依据。',
      },
      {
        title: '把差异放到一起看',
        text: '将学生的思路与一份 AI 草稿并列，找出相同点、遗漏与需要核对的信息，而不急着决定哪份更好。',
      },
      {
        title: '带着理由再改一次',
        text: '请学生改进自己的结果，并记录一条修改理由。课堂关注的是判断过程，而不只是最后的文字。',
      },
    ],
    instruction:
      '为这个课题设计一组课堂活动说明，包含“学生先独立尝试—对照一份AI草稿—说明理由并修订”三个环节。每个环节给一句教师引导语和一个学生动作。年级和时长尚未确定，请标为待确认，不生成学生的真实表现。',
  },
  {
    title: '评价',
    action: '把反馈，说到具体的地方。',
    note: '先有标准，再找证据。让反馈告诉学生下一步可以怎样改。',
    outcome: '一份有依据、能修改的评价框架',
    steps: [
      {
        title: '把标准写得看得见',
        text: '用“是否包含、能否说明、有没有依据”等可检查的表述，代替只写“优秀、一般”。',
      },
      {
        title: '在作品里找到证据',
        text: '将评价对应到学生作品中的具体片段。缺少作品时只设计框架，不推测学生的能力或表现。',
      },
      {
        title: '只给一个明确的下一步',
        text: '指出一项已经做好的地方，再提出一个可以完成的修改动作。涉及分数和结论时由教师确认。',
      },
    ],
    instruction:
      '请为这个课题设计一个简洁的评价框架：三个可检查的标准、每条标准需要查看的作品证据、以及一句具体的改进反馈句式。我没有提供学生作品，请只给框架，不打分、不推断学生表现。',
  },
]

function TeacherStudio({ onTry }: Pick<StudioProps, 'onTry'>) {
  const [stage, setStage] = useState(0)
  const [topic, setTopic] = useState('从一段材料中提取信息，并说明依据')
  const [expanded, setExpanded] = useState(0)
  const [copyStatus, setCopyStatus] = useState('')
  const panelId = useId()
  const current = teachingStages[stage]
  const prompt = `我正在准备一节课。课题：${topic.trim()}。\n\n${current.instruction}`
  const canTry = topic.trim().length > 0

  return (
    <div className="arcs-shell arcs-teacher">
      <div className="arcs-topline">
        <span>
          <span className="arcs-dot" />
          教师空间 · 设计预览
        </span>
        <a href="/edu/" target="_blank" rel="noreferrer">
          进入正式教师空间
          <ArrowUpRight size={15} />
        </a>
      </div>
      <header className="arcs-intro">
        <div>
          <span className="arcs-kicker">为下一节课做准备</span>
          <h1>
            好的课堂，
            <br />
            <span>从一个清楚的想法开始。</span>
          </h1>
        </div>
        <p>
          围绕你的课题，安排活动、组织思考，
          <br />把 AI 用在真正需要的地方。
        </p>
      </header>

      <div className="arcs-teaching-layout">
        <nav className="arcs-stage-nav" aria-label="教学阶段">
          {teachingStages.map((item, index) => (
            <button
              key={item.title}
              type="button"
              aria-pressed={stage === index}
              onClick={() => {
                setStage(index)
                setExpanded(0)
                setCopyStatus('')
              }}
            >
              <span className="arcs-stage-index">0{index + 1}</span>
              <span>{item.title}</span>
              <ArrowRight size={17} />
            </button>
          ))}
          <div className="arcs-stage-note">
            <BookOpen size={20} />
            <p>
              你来决定教学目标，
              <br />
              AI 帮忙把想法展开。
            </p>
          </div>
        </nav>

        <div className="arcs-lesson-sheet">
          <div className="arcs-sheet-heading">
            <span>
              0{stage + 1} / {current.title}
            </span>
            <span className="arcs-sheet-mark" aria-hidden="true">
              ⌁
            </span>
          </div>
          <h2>{current.action}</h2>
          <p className="arcs-sheet-note">{current.note}</p>
          <label className="arcs-topic-label" htmlFor={`${panelId}-topic`}>
            这次的课题
          </label>
          <div className="arcs-topic-field">
            <input
              id={`${panelId}-topic`}
              value={topic}
              maxLength={160}
              onChange={(event) => {
                setTopic(event.target.value)
                setCopyStatus('')
              }}
              placeholder="例如：从新闻材料里分辨事实与观点"
            />
            <span>{Array.from(topic).length}/160</span>
          </div>
          {!canTry && (
            <p className="arcs-topic-empty" role="status">
              写一个课题，就可以继续练习。
            </p>
          )}
          <div className="arcs-lesson-steps">
            {current.steps.map((item, index) => (
              <div
                key={`${stage}-${item.title}`}
                className={expanded === index ? 'arcs-step is-open' : 'arcs-step'}
              >
                <button
                  type="button"
                  aria-expanded={expanded === index}
                  aria-controls={`${panelId}-step-${index}`}
                  onClick={() => setExpanded(expanded === index ? -1 : index)}
                >
                  <span>0{index + 1}</span>
                  <h3>{item.title}</h3>
                  <Plus size={18} />
                </button>
                <div id={`${panelId}-step-${index}`} hidden={expanded !== index}>
                  <p>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="arcs-lesson-footer">
            <div>
              <span>这次可以得到</span>
              <p>{current.outcome}</p>
            </div>
            <div className="arcs-lesson-actions">
              <button
                className="arcs-copy"
                type="button"
                disabled={!canTry}
                onClick={async () =>
                  setCopyStatus(
                    (await copyText(prompt))
                      ? '需求已复制。'
                      : '复制未成功，可展开下方需求后手动选择。',
                  )
                }
              >
                <Copy size={15} />
                复制需求
              </button>
              <button
                className="arcs-primary"
                type="button"
                disabled={!canTry}
                onClick={() => onTry(prompt)}
              >
                带到 AI 练习
                <ArrowUpRight size={16} />
              </button>
            </div>
          </div>
          {copyStatus && (
            <p className="arcs-feedback" role="status">
              {copyStatus}
            </p>
          )}
          <details className="arcs-prompt-details">
            <summary>查看完整需求</summary>
            <p>{prompt}</p>
          </details>
        </div>
      </div>
    </div>
  )
}

type ModuleItem = {
  id: string
  title: string
  description: string
  visible: boolean
  count?: keyof Counts
}
const previewModules: ModuleItem[] = [
  {
    id: 'tools',
    title: '工具目录',
    description: '按用途查找和比较工具',
    visible: true,
    count: 'tools',
  },
  {
    id: 'guides',
    title: '学习教程',
    description: '有材料、有步骤的学习路径',
    visible: true,
    count: 'guides',
  },
  {
    id: 'cases',
    title: '实践案例',
    description: '从日常工作里找到做法',
    visible: true,
    count: 'cases',
  },
  { id: 'updates', title: 'AI 动态', description: '查看官方与权威来源的消息', visible: true },
  { id: 'assistant', title: 'AI 助手', description: '提问、整理材料与亲手练习', visible: true },
]

function AdminStudio({ counts }: Pick<StudioProps, 'counts'>) {
  const [modules, setModules] = useState(() => previewModules.map((item) => ({ ...item })))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all')
  const [notice, setNotice] = useState('')
  const filtered = useMemo(
    () =>
      modules.filter(
        (item) =>
          `${item.title} ${item.description}`.includes(query.trim()) &&
          (filter === 'all' || (filter === 'visible' ? item.visible : !item.visible)),
      ),
    [modules, query, filter],
  )
  const visible = modules.filter((item) => item.visible)

  function move(id: string, direction: -1 | 1) {
    const index = filtered.findIndex((item) => item.id === id)
    const neighbor = filtered[index + direction]
    const current = filtered[index]
    if (!current || !neighbor) return
    setModules((previous) => {
      const next = [...previous]
      const from = next.findIndex((item) => item.id === id),
        to = next.findIndex((item) => item.id === neighbor.id)
      ;[next[from], next[to]] = [next[to], next[from]]
      return next
    })
    setNotice(`已在本地预览中将“${current.title}”${direction < 0 ? '上移' : '下移'}。`)
  }

  return (
    <div className="arcs-shell arcs-admin">
      <div className="arcs-topline">
        <span>
          <span className="arcs-dot" />
          管理工作台 · 设计预览
        </span>
        <a href="/admin/" target="_blank" rel="noreferrer">
          进入正式管理后台
          <ArrowUpRight size={15} />
        </a>
      </div>
      <header className="arcs-intro">
        <div>
          <h1>内容管理</h1>
        </div>
        <p>
          在这里试着调整模块顺序与显示状态。
          <br />
          只改变这份预览，刷新后恢复。
        </p>
      </header>
      <div className="arcs-content-counts" aria-label="当前内容规模">
        <span>当前内容规模</span>
        {(['tools', 'guides', 'cases'] as const).map((key) => (
          <div key={key}>
            <strong>{counts[key].toLocaleString()}</strong>
            <span>{key === 'tools' ? '个工具' : key === 'guides' ? '篇教程' : '个案例'}</span>
          </div>
        ))}
      </div>
      <div className="arcs-admin-layout">
        <section className="arcs-module-editor" aria-labelledby="arcs-module-title">
          <div className="arcs-editor-heading">
            <div>
              <h2 id="arcs-module-title">页面模块</h2>
            </div>
            <button
              className="arcs-reset"
              type="button"
              onClick={() => {
                setModules(previewModules.map((item) => ({ ...item })))
                setFilter('all')
                setQuery('')
                setNotice('预览顺序与开关已重置，正式配置未改变。')
              }}
            >
              <RotateCcw size={14} />
              重置预览
            </button>
          </div>
          <div className="arcs-editor-toolbar">
            <div className="arcs-list-filters" aria-label="筛选预览模块">
              {(['all', 'visible', 'hidden'] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                >
                  {value === 'all' ? '全部' : value === 'visible' ? '显示中' : '已隐藏'}
                </button>
              ))}
            </div>
            <label className="arcs-search">
              <Search size={15} />
              <input
                aria-label="搜索预览模块"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索模块"
              />
            </label>
          </div>
          <div className="arcs-module-list" aria-label="预览模块清单">
            {filtered.map((item, index) => (
              <div key={item.id} className={`arcs-module-row ${item.visible ? '' : 'is-hidden'}`}>
                <span className="arcs-module-number">
                  {String(modules.findIndex((entry) => entry.id === item.id) + 1).padStart(2, '0')}
                </span>
                <div className="arcs-module-title">
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <span className="arcs-module-count">
                  {item.count ? `${counts[item.count].toLocaleString()} 项内容` : '功能入口'}
                </span>
                <button
                  className="arcs-switch"
                  role="switch"
                  aria-checked={item.visible}
                  aria-label={`在预览中显示${item.title}`}
                  type="button"
                  onClick={() => {
                    setModules((previous) =>
                      previous.map((entry) =>
                        entry.id === item.id ? { ...entry, visible: !entry.visible } : entry,
                      ),
                    )
                    setNotice(`已在本地预览中${item.visible ? '隐藏' : '显示'}“${item.title}”。`)
                  }}
                >
                  <span />
                </button>
                <div className="arcs-order-actions">
                  <button
                    type="button"
                    aria-label={`上移${item.title}`}
                    disabled={index === 0}
                    onClick={() => move(item.id, -1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label={`下移${item.title}`}
                    disabled={index === filtered.length - 1}
                    onClick={() => move(item.id, 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {!filtered.length && (
            <div className="arcs-empty">
              <Search size={24} />
              <p>没有符合条件的模块。</p>
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setFilter('all')
                }}
              >
                查看全部
              </button>
            </div>
          )}
          <p className="arcs-editor-note">所有开关与排序仅在预览中生效，不会保存到网站。</p>
          {notice && (
            <p className="arcs-feedback" role="status">
              {notice}
            </p>
          )}
        </section>
        <aside className="arcs-layout-outline" aria-label="调整后的本地页面预览">
          <div className="arcs-outline-caption">
            <Layers3 size={18} />
            <span>页面预览</span>
            <small>仅本地</small>
          </div>
          <div className="arcs-outline-window">
            <div className="arcs-outline-top">
              <span /> <span /> <span />
            </div>
            <div className="arcs-outline-hero">
              <span>弦域</span>
              <strong>
                从一个问题，
                <br />
                到一份作品。
              </strong>
              <i />
            </div>
            <ol>
              {visible.map((item) => (
                <li key={item.id}>
                  <span>{item.title}</span>
                  <ArrowRight size={12} />
                </li>
              ))}
            </ol>
            {!visible.length && <p className="arcs-outline-empty">全部模块已在预览中隐藏。</p>}
            <div className="arcs-outline-footer">
              <Check size={12} />
              <span>{visible.length} 个模块显示</span>
            </div>
          </div>
          <p>
            左边的调整会同步到这里。
            <br />
            这是布局演示，不代表正式网站当前的配置。
          </p>
        </aside>
      </div>
    </div>
  )
}

export function ArcStudioViews({ view, counts, onTry }: StudioProps) {
  return view === 'teacher' ? <TeacherStudio onTry={onTry} /> : <AdminStudio counts={counts} />
}
