'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Compass,
  Layers,
  Pause,
  Play,
  Plus,
  Search,
  Workflow,
  X,
} from 'lucide-react'
import { OrbitalCore } from './orbital-core'
import { XianWorkbench } from './workbench'
import { ToolLogo } from '@/components/tool-logo'
import { readLibrary, toggleSaved, LIBRARY_EVENT } from '@/lib/learning/library'
import { PageRegions } from '@/components/page-regions'
import { ModuleSection } from '@/components/module-visibility'
import { useSiteModules } from '@/components/site-module-context'
import { moduleEnabled, pathEnabled } from '@/lib/site-modules'
import { hasNativeHomeRegion } from './regions'

export interface XianHomeData {
  totals: { tools: number; guides: number; cases: number }
  tools: { id: string; name: string; logo: string; tagline: string; category: string }[]
  cases: { id: string; title: string; summary: string; industry: string }[]
  guides: { id: string; title: string; summary: string; duration: number }[]
}
const tasks = ['帮我把一段想法写清楚', '从会议记录里提取行动项', '给我一个能运行的代码例子']
const routes = [
  {
    n: '01',
    title: '第一次接触 AI',
    text: '从一句提问开始，亲手做出第一份结果。',
    href: '/start/',
    icon: Compass,
    meta: '零基础 · 互动练习',
  },
  {
    n: '02',
    title: '让工作更顺手',
    text: '写作、读文档、整理数据。找到今天就能用的方法。',
    href: '/paths/workplace-30d/',
    icon: Layers,
    meta: '工作场景 · 学习路径',
  },
  {
    n: '03',
    title: '构建自己的工作流',
    text: '理解模型和 Agent，把重复任务连成流程。',
    href: '/learn/advanced/',
    icon: Workflow,
    meta: '进阶 · 模型与 Agent',
  },
]
export function XianHome({ tools, cases, guides, totals }: XianHomeData) {
  const { config, preview } = useSiteModules()
  const [paused, setPaused] = useState(false),
    [category, setCategory] = useState('全部'),
    [query, setQuery] = useState('')
  const [saved, setSaved] = useState<string[]>([]),
    [compare, setCompare] = useState<string[]>([]),
    [expanded, setExpanded] = useState('')
  const [notice, setNotice] = useState(''),
    [activeRoute, setActiveRoute] = useState(0)
  const root = useRef<HTMLDivElement>(null)
  const workspaceVisible = hasNativeHomeRegion(config, 'workspace')
  const fallbackHref =
    ['/start/', '/tools/', '/guides/', '/learn/'].find((href) => pathEnabled(config, href)) ?? '/'
  const workspaceHref = workspaceVisible ? '#workspace' : fallbackHref
  const exploreHref =
    moduleEnabled(config, 'tools') && hasNativeHomeRegion(config, 'tools')
      ? '#explore'
      : fallbackHref
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
  function launch(text: string) {
    window.dispatchEvent(new CustomEvent('xian:prompt', { detail: text }))
    document.getElementById('workspace')?.scrollIntoView({
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    })
  }
  const filtered = tools.filter(
    (tool) =>
      (category === '全部' || tool.category === category) &&
      `${tool.name} ${tool.tagline}`.toLowerCase().includes(query.trim().toLowerCase()),
  )
  return (
    <div
      className="x-home"
      ref={root}
      onPointerMove={(e) => {
        const card = (e.target as HTMLElement).closest<HTMLElement>('[data-spotlight]')
        if (card) {
          const r = card.getBoundingClientRect()
          card.style.setProperty('--mx', `${e.clientX - r.left}px`)
          card.style.setProperty('--my', `${e.clientY - r.top}px`)
        }
      }}
    >
      <PageRegions
        moduleId="home"
        sections={[
          {
            id: 'hero',
            content: (
              <section className="x-hero" id="origin">
                <div className="x-hero-grid" aria-hidden="true" />
                <div className="x-hero-topline">
                  <span>
                    <i className="x-status-dot" /> HUMAN × ARTIFICIAL INTELLIGENCE
                  </span>
                  <span>
                    一处入口，无限可能 <Plus size={12} />
                  </span>
                </div>
                <div className="x-hero-layout">
                  <div className="x-hero-copy">
                    <div className="x-kicker">
                      <span>THE NEXT WAY TO CREATE</span>
                      <span>↗ VOL. 01</span>
                    </div>
                    <h1>
                      把想法，
                      <br />
                      接入
                      <span className="x-headline-accent">
                        下一维
                        <span className="x-title-star" aria-hidden="true">
                          ✳
                        </span>
                      </span>
                    </h1>
                    <p>
                      与 AI 一起探索、创造、解决问题。
                      <br />
                      从一个好奇，走到一个真正的作品。
                    </p>
                    <div className="x-hero-actions">
                      <a className="x-button x-button-large" href={workspaceHref}>
                        开始创造 <ArrowUpRight size={19} />
                      </a>
                      <ModuleSection id="beginner">
                        <Link className="x-text-link" href="/start/">
                          第一次来？跟着做一次 <ArrowRight size={15} />
                        </Link>
                      </ModuleSection>
                    </div>
                    <div className="x-hero-caption">
                      <span className="x-caption-rule" />
                      <span>你的想象力，是唯一的起点。</span>
                    </div>
                  </div>
                  <div className={'x-core ' + (paused ? 'is-paused' : '')}>
                    <div className="x-core-corner x-core-corner-a" />
                    <div className="x-core-corner x-core-corner-b" />
                    <span className="x-core-label">XIAN / GENERATIVE CORE</span>
                    <span className="x-core-coordinates">
                      X 0.83
                      <br />Y 1.24
                      <br />Z 0.62
                    </span>
                    <OrbitalCore paused={paused} />
                    <div className="x-core-glow" />
                    <div className="x-core-bottom">
                      <span>
                        <i className="x-status-dot" />
                        {paused ? 'MOTION PAUSED' : 'MOVE TO EXPLORE'}
                      </span>
                      <button
                        type="button"
                        aria-label={paused ? '播放主视觉动画' : '暂停主视觉动画'}
                        aria-pressed={paused}
                        onClick={() => setPaused(!paused)}
                      >
                        {paused ? <Play size={15} /> : <Pause size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="x-hero-bottom">
                  <a href={exploreHref}>
                    <ArrowDown size={16} /> 向下探索 <span>SCROLL TO DISCOVER</span>
                  </a>
                  <div>
                    EXPLORE <span>↔</span> EXPERIMENT <span>↔</span> CREATE
                  </div>
                  <span className="x-index">001—∞</span>
                </div>
              </section>
            ),
          },
          {
            id: 'tasks',
            content: workspaceVisible ? (
              <section className="x-starter-strip" aria-label="快速开始">
                <span className="x-eyebrow">
                  你的第一个指令 <ChevronRight size={13} />
                </span>
                {tasks.map((task, i) => (
                  <button key={task} onClick={() => launch(task)}>
                    <span>0{i + 1}</span>
                    {task}
                    <ArrowUpRight size={15} />
                  </button>
                ))}
              </section>
            ) : null,
          },
          {
            id: 'metrics',
            content: (
              <section className="x-metrics" aria-label="资源概览">
                <ModuleSection id="tools">
                  <Link href="/tools/">
                    <strong>{totals.tools}</strong>
                    <span>个工具</span>
                  </Link>
                </ModuleSection>
                <ModuleSection id="guides">
                  <Link href="/guides/">
                    <strong>{totals.guides}</strong>
                    <span>篇教程</span>
                  </Link>
                </ModuleSection>
                <ModuleSection id="cases">
                  <Link href="/cases/">
                    <strong>{totals.cases}</strong>
                    <span>个实践案例</span>
                  </Link>
                </ModuleSection>
              </section>
            ),
          },
          {
            id: 'tools',
            content: (
              <ModuleSection id="tools">
                <section className="x-section x-explore" id="explore">
                  <div className="x-section-heading">
                    <div>
                      <span className="x-eyebrow">01 / DISCOVER YOUR TOOLS</span>
                      <h2>
                        找到你的创造引擎<span>。</span>
                      </h2>
                    </div>
                    <Link className="x-text-link" href="/tools/">
                      进入完整工具库 <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <div className="x-filterbar">
                    <div className="x-filter-tabs" aria-label="筛选工具">
                      {['全部', '写作', '研究', '编程', '创作'].map((item) => (
                        <button
                          key={item}
                          aria-pressed={item === category}
                          onClick={() => setCategory(item)}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <label className="x-tool-search">
                      <Search size={15} />
                      <input
                        aria-label="搜索创造工具"
                        placeholder="搜索你需要的能力"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <kbd>/</kbd>
                    </label>
                  </div>
                  <div className="x-tool-grid">
                    {filtered.map((tool, i) => (
                      <article key={tool.id} className="x-tool-card" data-spotlight>
                        <div className="x-tool-card-top">
                          <ToolLogo src={tool.logo} alt={tool.name} size={42} />
                          <span className="x-tool-category">{tool.category}</span>
                          <button
                            aria-label={`${saved.includes(`/tools/${tool.id}`) ? '取消收藏' : '收藏'}${tool.name}`}
                            aria-pressed={saved.includes(`/tools/${tool.id}`)}
                            onClick={() => {
                              const r = toggleSaved({
                                kind: 'tool',
                                title: tool.name,
                                href: `/tools/${tool.id}`,
                                summary: tool.tagline.slice(0, 300),
                                at: new Date().toISOString(),
                              })
                              setNotice(r.message)
                            }}
                          >
                            <Bookmark
                              size={16}
                              fill={saved.includes(`/tools/${tool.id}`) ? 'currentColor' : 'none'}
                            />
                          </button>
                        </div>
                        <Link href={`/tools/${tool.id}/`} className="x-tool-title">
                          <h3>{tool.name}</h3>
                          <ArrowUpRight size={18} />
                        </Link>
                        <p>{tool.tagline}</p>
                        <div className="x-tool-bottom">
                          <span>MODEL / {String(i + 1).padStart(2, '0')}</span>
                          <button
                            aria-pressed={compare.includes(tool.id)}
                            disabled={!compare.includes(tool.id) && compare.length >= 3}
                            onClick={() =>
                              setCompare((old) =>
                                old.includes(tool.id)
                                  ? old.filter((id) => id !== tool.id)
                                  : [...old, tool.id],
                              )
                            }
                          >
                            {compare.includes(tool.id) ? <Check size={13} /> : <Plus size={13} />}
                            加入对比
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!filtered.length && (
                    <div className="x-empty-state">
                      没有找到这个工具。
                      <button
                        onClick={() => {
                          setQuery('')
                          setCategory('全部')
                        }}
                      >
                        清空筛选
                      </button>
                    </div>
                  )}
                  {notice && (
                    <p className="x-library-notice" role="status">
                      {notice}
                    </p>
                  )}
                  {compare.length > 0 && (
                    <div className="x-compare-tray">
                      <span>已选择 {compare.length} 个工具</span>
                      {compare.length >= 2 ? (
                        <Link className="x-button" href={`/compare/?ids=${compare.join(',')}`}>
                          并排对比 <ArrowRight size={15} />
                        </Link>
                      ) : (
                        <span>再选一个工具</span>
                      )}
                      <button aria-label="清空对比" onClick={() => setCompare([])}>
                        <X size={17} />
                      </button>
                    </div>
                  )}
                </section>
              </ModuleSection>
            ),
          },
          { id: 'workspace', content: <XianWorkbench /> },
          {
            id: 'guides',
            content: (
              <ModuleSection id="guides">
                <section className="x-section x-learning" id="learning">
                  <div className="x-learning-intro">
                    <span className="x-eyebrow">03 / FIND YOUR ORBIT</span>
                    <h2>
                      不必懂很多，
                      <br />
                      <span>先往前一步。</span>
                    </h2>
                    <p>
                      选一条适合自己的路线。
                      <br />
                      每一步，都有可以亲手完成的事。
                    </p>
                    <Link className="x-text-link" href="/guides/">
                      查看全部教程 <ArrowUpRight size={16} />
                    </Link>
                    <div className="x-orbit-mini" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <span>✳</span>
                    </div>
                  </div>
                  <div className="x-route-list">
                    {routes
                      .filter((route) => preview || pathEnabled(config, route.href))
                      .map((route, i) => (
                        <article key={route.n} className={activeRoute === i ? 'is-active' : ''}>
                          <button
                            className="x-route-trigger"
                            aria-expanded={activeRoute === i}
                            onClick={() => setActiveRoute(activeRoute === i ? -1 : i)}
                          >
                            <span className="x-route-number">{route.n}</span>
                            <div>
                              <h3>{route.title}</h3>
                              <span>{route.meta}</span>
                            </div>
                            <ChevronDown size={18} />
                          </button>
                          {activeRoute === i && (
                            <div className="x-route-details">
                              <p>{route.text}</p>
                              <Link className="x-button" href={route.href}>
                                进入这条路线 <ArrowUpRight size={15} />
                              </Link>
                            </div>
                          )}
                        </article>
                      ))}
                    <div className="x-reading-list">
                      <span className="x-eyebrow">也可以从一篇短教程开始</span>
                      {guides.map((guide) => (
                        <Link key={guide.id} href={`/guides/${guide.id}/`}>
                          <span>{guide.title}</span>
                          <small>
                            {guide.duration} MIN <ArrowUpRight size={13} />
                          </small>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              </ModuleSection>
            ),
          },
          {
            id: 'start',
            content: (
              <ModuleSection id="cases">
                <section className="x-section x-case-section" id="missions">
                  <div className="x-section-heading">
                    <div>
                      <span className="x-eyebrow">04 / FROM IDEA TO IMPACT</span>
                      <h2>灵感，落在真实的事里。</h2>
                    </div>
                    <Link className="x-text-link" href="/cases/">
                      浏览更多实践 <ArrowUpRight size={15} />
                    </Link>
                  </div>
                  <div className="x-case-grid">
                    {cases.map((item, i) => (
                      <article key={item.id} className="x-case-card" data-spotlight>
                        <button
                          className="x-case-toggle"
                          aria-expanded={expanded === item.id}
                          onClick={() => setExpanded(expanded === item.id ? '' : item.id)}
                        >
                          <div className={`x-case-art x-case-art-${i}`} aria-hidden="true">
                            {i === 0 ? (
                              <>
                                <span className="x-art-doc">
                                  <i />
                                  <i />
                                  <i />
                                  <i />
                                </span>
                                <ArrowRight size={28} />
                                <span className="x-art-output">
                                  <Check size={16} />
                                  <i />
                                  <i />
                                  <i />
                                </span>
                              </>
                            ) : i === 1 ? (
                              <>
                                <span className="x-art-window">
                                  <Code2 size={40} />
                                  <i />
                                  <i />
                                </span>
                                <span className="x-art-orbit" />
                              </>
                            ) : (
                              <>
                                <span className="x-art-nodes">
                                  <i />
                                  <i />
                                  <i />
                                  <i />
                                  <i />
                                </span>
                                <Workflow size={50} />
                              </>
                            )}
                            <span className="x-art-cross">+</span>
                            <small>FIELD NOTES / 0{i + 1}</small>
                          </div>
                          <div className="x-case-info">
                            <span className="x-tool-category">{item.industry}</span>
                            <h3>{item.title}</h3>
                            <span className="x-case-open">
                              {expanded === item.id ? '收起任务' : '展开任务'}
                              <Plus size={16} />
                            </span>
                          </div>
                        </button>
                        {expanded === item.id && (
                          <div className="x-case-details">
                            <p>{item.summary}</p>
                            <Link className="x-text-link" href={`/cases/${item.id}/`}>
                              打开材料，跟着实践 <ArrowUpRight size={15} />
                            </Link>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </section>
              </ModuleSection>
            ),
          },
          {
            id: 'news',
            content: (
              <ModuleSection id="news">
                <section className="x-section" id="signals">
                  <div className="x-section-heading">
                    <div>
                      <span className="x-eyebrow">05 / SIGNALS</span>
                      <h2>变化很快，消息看官方。</h2>
                    </div>
                    <Link className="x-text-link" href="/updates/">
                      查看 AI 动态 <ArrowUpRight size={15} />
                    </Link>
                  </div>
                </section>
              </ModuleSection>
            ),
          },
          {
            id: 'final',
            content: (
              <section className="x-final">
                <div className="x-final-grid" />
                <span className="x-eyebrow">THE FUTURE IS SOMETHING YOU MAKE</span>
                <h2>
                  下一种可能，
                  <br />
                  由你<span>开启。</span>
                </h2>
                <a className="x-button x-button-large" href={workspaceHref}>
                  从一个想法开始 <ArrowUpRight size={18} />
                </a>
                <span className="x-final-stamp" aria-hidden="true">
                  ✳
                </span>
              </section>
            ),
          },
        ].filter((section) => {
          const required: Record<string, string> = {
            tools: 'tools',
            guides: 'guides',
            start: 'cases',
            news: 'news',
          }
          return preview || !required[section.id] || moduleEnabled(config, required[section.id])
        })}
      />
    </div>
  )
}
