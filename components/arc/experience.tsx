'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Plus,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { readLibrary, toggleSaved, LIBRARY_EVENT } from '@/lib/learning/library'
import type { ArcWorkbenchTask } from './workbench'
import { ArcStudioViews } from './studio-views'
import './experience.css'

const ArcWorkbench = dynamic(() => import('./workbench').then((m) => m.ArcWorkbench), {
  ssr: false,
})
type View = 'public' | 'teacher' | 'admin'
type Tool = {
  id: string
  name: string
  logo: string
  tagline: string
  category: string
  officialUrl: string
}
type Case = { id: string; title: string; summary: string; industry: string }
export type ArcExperienceData = {
  counts: { tools: number; guides: number; cases: number }
  tools: Tool[]
  guides: { id: string; title: string; summary: string; duration: number }[]
  cases: Case[]
}
const exercises = [
  {
    title: '把一条通知，说清楚。',
    short: '写一条消息',
    note: '适合第一次尝试',
    material: '明天下午三点，在三楼会议室讨论产品发布。请大家带上各自的进展。',
    instruction: '给同事写一条会议提醒，语气自然，80字以内。保留时间、地点和准备事项。',
    result:
      '大家好，明天下午3点在三楼会议室讨论产品发布。请带上各自的最新进展，我们一起对齐下一步安排。',
    mode: 'write' as const,
  },
  {
    title: '把一段记录，理出头绪。',
    short: '整理会议记录',
    note: '适合日常工作',
    material: '示例记录：小林周三交设计，小陈周五给技术排期。预算还没定，下次会议再议。',
    instruction: '整理成行动清单，列出任务、负责人和时间。未确定的事项单独列出，不补写信息。',
    result: '设计稿：小林，周三。\n技术排期：小陈，周五。\n待确认：预算，下次会议讨论。',
    mode: 'read' as const,
  },
  {
    title: '把一个念头，排进日程。',
    short: '做一份计划',
    note: '适合学习与生活',
    material: '想用一周学会用AI写工作消息和整理记录，每天只有20分钟。',
    instruction: '安排一周练习，每天一个能实际完成的小任务，最后留时间检查自己的结果。',
    result:
      '第一步：写一条工作提醒。\n第二步：整理一段短记录。\n接下来：换成自己的材料，再修改一次。',
    mode: 'plan' as const,
  },
]
const caseCaptions = [
  '把零散记录，变成清楚的汇报。',
  '会议结束，下一步才开始。',
  '让一节课，有更多可能。',
]

function ArcMark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? 'arc-brand arc-brand-small' : 'arc-brand'}>
      <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <path
          d="M5 30c10 1 10-18 19-18 7 0 7 17 19 18M9 33c8-1 9-12 15-12s8 11 15 12M17 36c2-4 4-7 7-7s5 3 7 7"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
      <span>
        弦域<small>XIAN</small>
      </span>
    </span>
  )
}

export function ArcExperience({ counts, tools, guides, cases }: ArcExperienceData) {
  const [view, setView] = useState<View>('public'),
    [menu, setMenu] = useState(false),
    [paused, setPaused] = useState(false),
    [greeting, setGreeting] = useState(false)
  const [exercise, setExercise] = useState(0),
    [step, setStep] = useState(0),
    [activeCase, setActiveCase] = useState(0)
  const [category, setCategory] = useState('全部'),
    [query, setQuery] = useState(''),
    [searchOpen, setSearchOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>([]),
    [saved, setSaved] = useState<string[]>([]),
    [notice, setNotice] = useState('')
  const [workOpen, setWorkOpen] = useState(false),
    [task, setTask] = useState<ArcWorkbenchTask | undefined>()
  const root = useRef<HTMLDivElement>(null),
    hero = useRef<HTMLElement>(null),
    spirit = useRef<HTMLButtonElement>(null),
    searchField = useRef<HTMLInputElement>(null),
    lastFocus = useRef<HTMLElement | null>(null)
  const example = exercises[exercise],
    currentCase = cases[activeCase]
  const openWork = useCallback((prompt = '', mode: ArcWorkbenchTask['mode'] = 'write') => {
    setTask(prompt ? { prompt, mode, key: Date.now() } : undefined)
    setWorkOpen(true)
    setGreeting(false)
    setMenu(false)
  }, [])
  useEffect(() => {
    if (!menu) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const trigger = document.querySelector<HTMLButtonElement>('.arc-menu-button')
    const timer = setTimeout(
      () => document.querySelector<HTMLButtonElement>('.arc-mobile-menu button')?.focus(),
      0,
    )
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const elements = [
        trigger,
        ...Array.from(document.querySelectorAll<HTMLButtonElement>('.arc-mobile-menu button')),
      ].filter((el): el is HTMLButtonElement => !!el)
      const first = elements[0],
        last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last?.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first?.focus()
      }
    }
    const resize = () => {
      if (innerWidth > 700) setMenu(false)
    }
    document.addEventListener('keydown', trap)
    window.addEventListener('resize', resize)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('keydown', trap)
      window.removeEventListener('resize', resize)
      document.body.style.overflow = previous
      trigger?.focus()
    }
  }, [menu])
  const closeWork = useCallback(() => setWorkOpen(false), [])
  useEffect(() => {
    root.current?.setAttribute('data-ready', 'true')
    const v = new URLSearchParams(location.search).get('view')
    if (v === 'teacher' || v === 'admin') setView(v)
  }, [])
  useEffect(() => {
    const update = () => setSaved(readLibrary('saved').map((item) => item.href))
    update()
    window.addEventListener(LIBRARY_EVENT, update)
    window.addEventListener('storage', update)
    return () => {
      window.removeEventListener(LIBRARY_EVENT, update)
      window.removeEventListener('storage', update)
    }
  }, [])
  useEffect(() => {
    if (view !== 'public') return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)'),
      fine = matchMedia('(pointer: fine)')
    let frame = 0,
      x = 0,
      y = 0
    const paint = () => {
      frame = 0
      hero.current?.style.setProperty('--arc-px', String(x))
      hero.current?.style.setProperty('--arc-py', String(y))
    }
    const move = (event: PointerEvent) => {
      if (paused || reduced.matches || !fine.matches) return
      const rect = hero.current?.getBoundingClientRect()
      if (!rect) return
      x = (event.clientX - rect.left) / rect.width - 0.5
      y = (event.clientY - rect.top) / rect.height - 0.5
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const leave = () => {
      x = 0
      y = 0
      if (!frame) frame = requestAnimationFrame(paint)
    }
    const el = hero.current
    el?.addEventListener('pointermove', move, { passive: true })
    el?.addEventListener('pointerleave', leave)
    if (paused) leave()
    return () => {
      cancelAnimationFrame(frame)
      el?.removeEventListener('pointermove', move)
      el?.removeEventListener('pointerleave', leave)
    }
  }, [view, paused])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setMenu(false)
        setGreeting(false)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])
  useEffect(() => {
    if (!searchOpen) return
    lastFocus.current = document.activeElement as HTMLElement
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => searchField.current?.focus(), 0)
    return () => {
      clearTimeout(t)
      document.body.style.overflow = before
      lastFocus.current?.focus()
    }
  }, [searchOpen])
  useEffect(() => {
    if (view !== 'public' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('arc-in')
            observer.unobserve(entry.target)
          }
        }),
      { threshold: 0.1 },
    )
    document.querySelectorAll('.arc-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [view])
  const changeView = (next: View) => {
    setView(next)
    setMenu(false)
    setSearchOpen(false)
    const u = new URL(location.href)
    if (next === 'public') u.searchParams.delete('view')
    else u.searchParams.set('view', next)
    history.replaceState(null, '', u)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const filtered = tools.filter(
    (tool) =>
      (category === '全部' || tool.category === category) &&
      `${tool.name} ${tool.tagline} ${tool.category}`
        .toLowerCase()
        .includes(query.toLowerCase().trim()),
  )
  const scroll = (id: string) => {
    changeView('public')
    setTimeout(
      () =>
        document.getElementById(id)?.scrollIntoView({
          behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
        }),
      0,
    )
  }
  const saveTool = (tool: Tool) => {
    const r = toggleSaved({
      kind: 'tool',
      title: tool.name,
      href: `/tools/${tool.id}`,
      summary: tool.tagline,
      at: new Date().toISOString(),
    })
    setNotice(r.message)
  }
  return (
    <div ref={root} className={`arc-site ${paused ? 'arc-paused' : ''}`}>
      <a href="#arc-main" className="arc-skip">
        跳到内容
      </a>
      <header className="arc-header">
        <button
          className="arc-brand-button"
          aria-label="弦域首页"
          onClick={() => {
            changeView('public')
          }}
        >
          <ArcMark />
        </button>
        <nav aria-label="主导航" className="arc-nav">
          <button onClick={() => scroll('arc-discover')}>探索工具</button>
          <button onClick={() => scroll('arc-practice')}>动手练习</button>
          <button onClick={() => scroll('arc-stories')}>工作案例</button>
        </nav>
        <div className="arc-header-actions">
          <button
            className="arc-icon-button"
            aria-label="搜索工具"
            onClick={() => {
              setMenu(false)
              setSearchOpen(true)
            }}
          >
            <Search size={19} />
          </button>
          <button className="arc-start-button" onClick={() => openWork()}>
            开始创造 <ArrowUpRight size={15} />
          </button>
          <button
            className={`arc-menu-button ${menu ? 'is-open' : ''}`}
            aria-label={menu ? '关闭菜单' : '打开菜单'}
            aria-expanded={menu}
            onClick={() => setMenu(!menu)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>
      {menu && (
        <div className="arc-mobile-menu">
          <span>想去哪里？</span>
          {[
            ['探索工具', 'arc-discover'],
            ['动手练习', 'arc-practice'],
            ['工作案例', 'arc-stories'],
          ].map(([label, id], i) => (
            <button key={id} style={{ animationDelay: `${i * 60}ms` }} onClick={() => scroll(id)}>
              {label}
              <ArrowUpRight />
            </button>
          ))}
          <button onClick={() => changeView('teacher')}>
            教师空间 <ArrowUpRight />
          </button>
        </div>
      )}
      <main id="arc-main">
        {view === 'public' ? (
          <>
            <section className="arc-hero" ref={hero} aria-label="弦域，光的工作室">
              <div className="arc-hero-haze" aria-hidden="true" />
              <div className="arc-horizon" aria-hidden="true" />
              <span className="arc-hero-note">AI 工具 · 教程 · 工作练习</span>
              <div className="arc-hero-copy">
                <span className="arc-eyebrow">AI 学习与实践</span>
                <h1>
                  从一个问题，
                  <br />
                  到一份<span>作品。</span>
                </h1>
                <p>
                  找工具，学方法，把想法做出来。
                  <br />
                  不必先懂很多，从今天的一件小事开始。
                </p>
                <button className="arc-primary" onClick={() => scroll('arc-practice')}>
                  做一个小练习 <ArrowUpRight size={19} />
                </button>
                <button className="arc-hero-secondary" onClick={() => openWork()}>
                  我有自己的想法 <ArrowRight size={16} />
                </button>
              </div>
              <div className="arc-spirit-position">
                <div className={`arc-spirit ${greeting ? 'is-awake' : ''}`}>
                  <Image
                    src="/arc/spirit-v1.webp"
                    width={1400}
                    height={933}
                    priority
                    alt="弧灵，一只由半透明流体玻璃构成的科幻星灵，展开柔和的弧形翼"
                  />
                  <span className="arc-spirit-ripple" aria-hidden="true" />
                </div>
              </div>
              <button
                ref={spirit}
                className="arc-spirit-touch"
                aria-label="唤醒弧灵"
                aria-expanded={greeting}
                onClick={() => setGreeting(!greeting)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault()
                    hero.current?.style.setProperty(
                      '--arc-px',
                      event.key === 'ArrowLeft' ? '-.45' : '.45',
                    )
                  }
                }}
              />
              <div className="arc-spirit-caption">
                <span>弧灵</span>
                <small>触碰它，打个招呼。</small>
                <button
                  className="arc-icon-button"
                  aria-label={paused ? '播放动态' : '暂停动态'}
                  aria-pressed={paused}
                  onClick={() => setPaused(!paused)}
                >
                  {paused ? <Play size={15} /> : <Pause size={15} />}
                </button>
              </div>
              {greeting && (
                <aside className="arc-greeting" aria-label="弧灵的问候">
                  <button
                    className="arc-greeting-close"
                    aria-label="关闭问候"
                    onClick={() => setGreeting(false)}
                  >
                    <X size={16} />
                  </button>
                  <Sparkles size={20} />
                  <p>
                    你好，我是弧灵。
                    <br />
                    <span>想从哪件小事开始？</span>
                  </p>
                  <button
                    onClick={() => {
                      setGreeting(false)
                      scroll('arc-practice')
                    }}
                  >
                    带我做一次 <ArrowRight size={16} />
                  </button>
                  <button onClick={() => openWork()}>
                    直接告诉你我的想法 <ArrowUpRight size={16} />
                  </button>
                </aside>
              )}
              <div className="arc-hero-bottom">
                <button onClick={() => scroll('arc-practice')}>
                  <ArrowDown size={16} />
                  继续探索
                </button>
                <span>无需注册，直接开始。</span>
                <small>01 / 04</small>
              </div>
            </section>

            <section className="arc-practice arc-light" id="arc-practice">
              <div className="arc-chapter">
                <span>01 / 亲手试试</span>
                <span>从一个具体的需求开始</span>
              </div>
              <div className="arc-practice-heading arc-reveal">
                <h2>
                  不必先懂 AI。
                  <br />
                  <span>先做一件小事。</span>
                </h2>
                <p>
                  选一个场景，看看材料怎样变成结果。
                  <br />
                  然后换成自己的内容，再试一次。
                </p>
              </div>
              <div className="arc-exercise-layout">
                <div className="arc-exercise-tabs" aria-label="选择练习">
                  {exercises.map((item, i) => (
                    <button
                      key={item.short}
                      aria-pressed={exercise === i}
                      onClick={() => {
                        setExercise(i)
                        setStep(0)
                      }}
                    >
                      <small>0{i + 1}</small>
                      <span>
                        {item.short}
                        <small>{item.note}</small>
                      </span>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                </div>
                <div className="arc-exercise-paper">
                  <div className="arc-paper-top">
                    <span>一个小练习</span>
                    <small>示例演示</small>
                  </div>
                  <h3>{example.title}</h3>
                  <div className="arc-step-labels">
                    {['放入材料', '说清要求', '看看示例'].map((label, i) => (
                      <button key={label} aria-pressed={step === i} onClick={() => setStep(i)}>
                        <span>{i + 1}</span>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="arc-exercise-content" key={`${exercise}-${step}`}>
                    <span>
                      {step === 0
                        ? '你手里的材料'
                        : step === 1
                          ? '告诉 AI 怎么做'
                          : '它可以被整理成这样'}
                    </span>
                    <p>
                      {step === 0
                        ? example.material
                        : step === 1
                          ? example.instruction
                          : example.result}
                    </p>
                  </div>
                  <div className="arc-paper-bottom">
                    <span>演示不是实时生成，亲自试试会打开 AI。</span>
                    {step < 2 ? (
                      <button className="arc-dark-button" onClick={() => setStep(step + 1)}>
                        下一步 <ArrowRight size={16} />
                      </button>
                    ) : (
                      <button
                        className="arc-dark-button"
                        onClick={() =>
                          openWork(
                            `${example.instruction}\n\n材料：${example.material}`,
                            example.mode,
                          )
                        }
                      >
                        亲自试试 <ArrowUpRight size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="arc-type-statement arc-reveal">
                <span>
                  把重复的事，交给工具。
                  <br />把<span>判断与创造</span>，留给自己。
                </span>
                <p>
                  从写一条消息，到完成一份方案。
                  <br />
                  先看懂，再动手，最后做成自己的。
                </p>
              </div>
            </section>

            <section className="arc-discover arc-light" id="arc-discover">
              <div className="arc-chapter">
                <span>02 / 找到你的工具</span>
                <span>{counts.tools} 个工具，按用途探索</span>
              </div>
              <div className="arc-discover-head arc-reveal">
                <h2>
                  想做什么，
                  <br />
                  <span>就从这里找。</span>
                </h2>
                <div className="arc-filter">
                  <div aria-label="按用途筛选">
                    {['全部', '写作', '研究', '编程', '创作'].map((c) => (
                      <button key={c} aria-pressed={category === c} onClick={() => setCategory(c)}>
                        {c}
                      </button>
                    ))}
                  </div>
                  <label>
                    <Search size={17} />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="搜索工具或用途"
                      aria-label="筛选工具"
                    />
                    {query && (
                      <button aria-label="清空搜索" onClick={() => setQuery('')}>
                        <X size={14} />
                      </button>
                    )}
                  </label>
                </div>
              </div>
              <div className="arc-tool-list">
                {filtered.map((tool, i) => (
                  <article className="arc-tool-row" key={tool.id}>
                    <span className="arc-tool-index">0{i + 1}</span>
                    <Image src={tool.logo} width={40} height={40} alt="" />
                    <div>
                      <Link href={`/tools/${tool.id}/`} target="_blank" rel="noreferrer">
                        {tool.name}
                        <ArrowUpRight size={15} />
                      </Link>
                      <p>{tool.tagline}</p>
                    </div>
                    <span className="arc-tool-category">{tool.category}</span>
                    <div className="arc-tool-actions">
                      <button
                        className="arc-icon-button"
                        aria-label={`${saved.includes(`/tools/${tool.id}`) ? '取消收藏' : '收藏'}${tool.name}`}
                        aria-pressed={saved.includes(`/tools/${tool.id}`)}
                        onClick={() => saveTool(tool)}
                      >
                        <Bookmark
                          size={17}
                          fill={saved.includes(`/tools/${tool.id}`) ? 'currentColor' : 'none'}
                        />
                      </button>
                      <button
                        className="arc-compare-add"
                        aria-label={`${selected.includes(tool.id) ? '移出对比' : '加入对比'}${tool.name}`}
                        aria-pressed={selected.includes(tool.id)}
                        disabled={!selected.includes(tool.id) && selected.length >= 3}
                        onClick={() =>
                          setSelected((old) =>
                            old.includes(tool.id)
                              ? old.filter((id) => id !== tool.id)
                              : [...old, tool.id],
                          )
                        }
                      >
                        {selected.includes(tool.id) ? <Check size={15} /> : <Plus size={15} />}
                        <span>对比</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <div className="arc-empty">
                  <p>没找到匹配的工具。</p>
                  <button
                    onClick={() => {
                      setQuery('')
                      setCategory('全部')
                    }}
                  >
                    清空筛选 <ArrowRight size={16} />
                  </button>
                </div>
              )}
              <div className="arc-tool-foot">
                <p role="status">{notice || '先选用途，再比较。合适比“最强”更重要。'}</p>
                <Link href="/tools/" target="_blank">
                  探索全部工具 <ArrowUpRight size={16} />
                </Link>
              </div>
            </section>

            <section className="arc-stories" id="arc-stories">
              <div className="arc-chapter">
                <span>03 / 工作里的可能</span>
                <Link href="/cases/" target="_blank">
                  全部 {counts.cases} 个案例 <ArrowUpRight size={15} />
                </Link>
              </div>
              <div className="arc-story-heading arc-reveal">
                <h2>
                  让想法，
                  <br />
                  <span>落在真实的事里。</span>
                </h2>
                <p>
                  从常见的工作场景出发。
                  <br />
                  材料、步骤和提示词，都可以接着用。
                </p>
              </div>
              <div className="arc-story-stage">
                <div className="arc-story-navigation" aria-label="选择工作案例">
                  {cases.map((item, i) => (
                    <button
                      key={item.id}
                      aria-pressed={i === activeCase}
                      onClick={() => setActiveCase(i)}
                    >
                      <small>0{i + 1}</small>
                      <span>{['一份汇报', '一段会议', '一节课堂'][i]}</span>
                      <ArrowUpRight size={18} />
                    </button>
                  ))}
                  <div className="arc-story-paging">
                    <button
                      className="arc-icon-button"
                      aria-label="上一个案例"
                      onClick={() => setActiveCase((activeCase + cases.length - 1) % cases.length)}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span>
                      0{activeCase + 1} / 0{cases.length}
                    </span>
                    <button
                      className="arc-icon-button"
                      aria-label="下一个案例"
                      onClick={() => setActiveCase((activeCase + 1) % cases.length)}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
                <article
                  className={`arc-story-canvas arc-story-canvas-${activeCase}`}
                  key={activeCase}
                >
                  <span className="arc-story-tag">练习场景 · {currentCase?.industry}</span>
                  <div className="arc-story-document" aria-hidden="true">
                    <div>
                      <span>{['本周工作汇报', '会议行动清单', '课堂活动提纲'][activeCase]}</span>
                      <small>从材料到结果</small>
                    </div>
                    {[0, 1, 2].map((i) => (
                      <span className="arc-story-line" key={i}>
                        <i>
                          {activeCase === 1 ? <Check size={14} /> : String(i + 1).padStart(2, '0')}
                        </i>
                        <span>
                          <b>
                            {
                              (activeCase === 0
                                ? ['已完成的事', '需要协助的事', '下一步计划']
                                : activeCase === 1
                                  ? ['任务明确', '负责人明确', '时间待确认']
                                  : ['学习目标', '课堂活动', '反馈与评价'])[i]
                            }
                          </b>
                          <em />
                          <em />
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="arc-story-description">
                    <h3>{caseCaptions[activeCase]}</h3>
                    <p>{currentCase?.summary}</p>
                    <Link href={`/cases/${currentCase?.id}/`} target="_blank">
                      打开材料，跟着做 <ArrowUpRight size={17} />
                    </Link>
                  </div>
                </article>
              </div>
            </section>

            <section className="arc-learning arc-light">
              <div className="arc-chapter">
                <span>04 / 慢慢学，认真做</span>
                <span>{counts.guides} 篇教程，随时开始</span>
              </div>
              <div className="arc-learning-layout">
                <h2>
                  每一次动手，
                  <br />
                  都算<span>向前一步。</span>
                </h2>
                <div>
                  {guides.map((guide, i) => (
                    <Link href={`/guides/${guide.id}/`} target="_blank" key={guide.id}>
                      <small>0{i + 1}</small>
                      <span>
                        {guide.title}
                        <small>{guide.duration} 分钟阅读</small>
                      </span>
                      <ArrowUpRight size={20} />
                    </Link>
                  ))}
                  <Link className="arc-all-guides" href="/guides/" target="_blank">
                    查看全部教程 <ArrowRight size={17} />
                  </Link>
                </div>
              </div>
            </section>
            <footer className="arc-footer">
              <div className="arc-footer-top">
                <h2>
                  下一份作品，
                  <br />
                  从你<span>开始。</span>
                </h2>
                <button className="arc-primary" onClick={() => openWork()}>
                  写下你的第一个想法 <ArrowUpRight size={19} />
                </button>
              </div>
              <div className="arc-footer-brand" aria-hidden="true">
                XIAN<span>弦域</span>
              </div>
              <div className="arc-footer-bottom">
                <ArcMark small />
                <nav>
                  <button onClick={() => changeView('teacher')}>教师空间</button>
                  <button onClick={() => changeView('admin')}>管理工作台</button>
                  <Link href="/about/" target="_blank">
                    关于
                  </Link>
                  <Link href="/feedback/" target="_blank">
                    反馈
                  </Link>
                </nav>
                <span>© {new Date().getFullYear()} 弦域</span>
              </div>
            </footer>
          </>
        ) : (
          <ArcStudioViews
            view={view}
            counts={counts}
            onTry={(prompt) => openWork(prompt, 'plan')}
          />
        )}
      </main>
      {selected.length > 0 && view === 'public' && (
        <aside className="arc-compare-tray" aria-label="已选择的对比工具">
          <span>{selected.map((id) => tools.find((t) => t.id === id)?.name).join(' · ')}</span>
          {selected.length >= 2 ? (
            <Link href={`/compare/?ids=${selected.join(',')}`} target="_blank">
              并排比较 <ArrowUpRight size={16} />
            </Link>
          ) : (
            <span>再选一个工具</span>
          )}
          <button className="arc-icon-button" aria-label="清空对比" onClick={() => setSelected([])}>
            <X size={17} />
          </button>
        </aside>
      )}
      <div className="arc-preview-switch" aria-label="选择设计预览端">
        <span>设计预览</span>
        {(['public', 'teacher', 'admin'] as View[]).map((v, i) => (
          <button key={v} aria-pressed={view === v} onClick={() => changeView(v)}>
            {['网站', '教师端', '后台'][i]}
          </button>
        ))}
      </div>
      {searchOpen && (
        <div className="arc-search-backdrop" onClick={() => setSearchOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="搜索工具"
            className="arc-search"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Tab') {
                const items = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>('button,a,input'),
                )
                const first = items[0],
                  last = items[items.length - 1]
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault()
                  last?.focus()
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault()
                  first?.focus()
                }
              }
            }}
          >
            <div>
              <Search size={21} />
              <input
                ref={searchField}
                aria-label="搜索工具名称或用途"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="你想做什么？"
              />
              <button
                className="arc-icon-button"
                aria-label="关闭搜索"
                onClick={() => setSearchOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <p>找到适合这件事的工具</p>
            {tools
              .filter((t) =>
                `${t.name} ${t.tagline} ${t.category}`
                  .toLowerCase()
                  .includes(query.trim().toLowerCase()),
              )
              .map((tool) => (
                <Link href={`/tools/${tool.id}/`} target="_blank" key={tool.id}>
                  <Image src={tool.logo} width={32} height={32} alt="" />
                  <span>
                    {tool.name}
                    <small>{tool.tagline}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </Link>
              ))}
            {!tools.some((t) =>
              `${t.name} ${t.tagline} ${t.category}`
                .toLowerCase()
                .includes(query.trim().toLowerCase()),
            ) && <p>暂时没有匹配结果。试试“写作”或“研究”。</p>}
            <button
              className="arc-search-try"
              onClick={() => {
                setSearchOpen(false)
                openWork(query)
              }}
            >
              也可以直接把这个问题交给 AI <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
      <ArcWorkbench open={workOpen} onClose={closeWork} task={task} />
    </div>
  )
}
