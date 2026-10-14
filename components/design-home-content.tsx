'use client'
import Link from 'next/link'
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Play,
  FileText,
  Layers,
  BookOpen,
  Check,
  Compass,
} from 'lucide-react'
import { ModuleSection } from './module-visibility'
import type { TemplateHomeData } from './template-entry'
import { ToolLogo } from './tool-logo'

const tasks = [
  {
    id: 'write',
    name: '写作',
    title: '把想法写成一份初稿',
    description: '通知、邮件、周报，从现有材料开始。',
    steps: ['准备原始材料', '说明对象与格式', '检查并修改初稿'],
    href: '/find?s=write',
    action: '选择写作工具',
  },
  {
    id: 'read-long-doc',
    name: '读资料',
    title: '从长文档中找到重点',
    description: '先提取问题，再回到原文核对。',
    steps: ['上传或粘贴资料', '列出要回答的问题', '核对引用与结论'],
    href: '/find?s=read-long-doc',
    action: '选择阅读工具',
  },
  {
    id: 'make-office',
    name: '做汇报',
    title: '把零散记录整理成汇报',
    description: '理清结论、数据与接下来的行动。',
    steps: ['收集记录与数据', '确定汇报结构', '整理成表格或提纲'],
    href: '/find?s=make-office',
    action: '选择办公工具',
  },
]
function TaskPicker({ prefix }: { prefix: string }) {
  return (
    <section className="template-task-picker" data-task-workspace aria-label="选择任务">
      <div className="template-tabs" role="tablist" aria-label="任务类型">
        {tasks.map((task, i) => (
          <button
            key={task.id}
            type="button"
            role="tab"
            id={`${prefix}-${task.id}-tab`}
            aria-controls={`${prefix}-${task.id}`}
            aria-selected={i === 0}
            tabIndex={i === 0 ? 0 : -1}
            data-template-tab={task.id}
          >
            {task.name}
          </button>
        ))}
      </div>
      {tasks.map((task, i) => (
        <div
          key={task.id}
          className="template-task-panel"
          role="tabpanel"
          id={`${prefix}-${task.id}`}
          aria-labelledby={`${prefix}-${task.id}-tab`}
          data-template-panel={task.id}
          hidden={i !== 0}
          tabIndex={0}
        >
          <div>
            <p className="template-overline">这次要完成</p>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
          </div>
          <ol>
            {task.steps.map((step, index) => (
              <li key={step}>
                <span>{index + 1}</span>
                {step}
              </li>
            ))}
          </ol>
          <ModuleSection id="finder">
            <Link prefetch={false} href={task.href} className="template-action">
              {task.action}
              <ArrowUpRight size={18} />
            </Link>
          </ModuleSection>
        </div>
      ))}
    </section>
  )
}
function ResourceList({
  kind,
  tools,
  guides,
}: { kind: 'tools' | 'guides' } & Pick<TemplateHomeData, 'tools' | 'guides'>) {
  return (
    <ModuleSection id={kind}>
      <section className="template-resource-list">
        <div className="template-section-title">
          <h2>{kind === 'tools' ? '工具速览' : '从这些练习开始'}</h2>
          <Link prefetch={false} href={`/${kind}/`}>
            全部
            <ArrowUpRight size={15} />
          </Link>
        </div>
        {kind === 'tools'
          ? tools
              .filter((t) => ['chatgpt', 'deepseek', 'kimi', 'doubao'].includes(t.id))
              .map((tool) => (
                <Link
                  prefetch={false}
                  className="template-resource-row"
                  href={`/tools/${tool.id}/`}
                  key={tool.id}
                >
                  <ToolLogo src={tool.logo} alt="" size={38} />
                  <span>
                    <strong>{tool.name}</strong>
                    <small>{tool.tagline}</small>
                  </span>
                  <ArrowUpRight size={17} />
                </Link>
              ))
          : guides.slice(0, 3).map((guide, i) => (
              <Link
                prefetch={false}
                className="template-resource-row"
                href={`/guides/${guide.id}/`}
                key={guide.id}
              >
                <span className="template-index">0{i + 1}</span>
                <span>
                  <strong>{guide.title}</strong>
                  <small>{guide.durationMin} 分钟 · 动手练习</small>
                </span>
                <ArrowUpRight size={17} />
              </Link>
            ))}
      </section>
    </ModuleSection>
  )
}
function SearchBox() {
  return (
    <form className="template-home-search" action="/search/" role="search">
      <Search size={22} />
      <label className="sr-only" htmlFor="template-home-query">
        搜索工具、教程、案例
      </label>
      <input
        id="template-home-query"
        name="q"
        placeholder="搜索工具、教程或工作案例"
        required
        autoComplete="off"
      />
      <button type="submit" aria-label="搜索">
        <ArrowRight size={20} />
      </button>
    </form>
  )
}
export function DesignHomeContent({ tools, guides, cases }: TemplateHomeData) {
  return (
    <div className="template-home template-only">
      <section className="desk-home studio-only">
        <header className="desk-welcome">
          <div>
            <p className="template-overline">你的 AI 工作空间</p>
            <h1>今天，做点什么？</h1>
            <p>写作、读资料、做汇报，按任务找工具。</p>
          </div>
          <span className="desk-status">
            <i /> 随时开始
          </span>
        </header>
        <SearchBox />
        <div className="desk-grid">
          <div className="desk-task">
            <div className="template-section-title">
              <h2>从任务开始</h2>
              <Compass size={20} />
            </div>
            <TaskPicker prefix="desk" />
          </div>
          <ModuleSection id="beginner">
            <Link prefetch={false} href="/start/" className="desk-practice">
              <span className="template-overline">第一次用 AI</span>
              <h2>
                跟小芽
                <br />
                练一遍。
              </h2>
              <div className="template-mascot" aria-hidden="true" />
              <span className="template-action">
                开始练习
                <Play size={17} />
              </span>
              <small>改材料 · 做草稿 · 检查结果</small>
            </Link>
          </ModuleSection>
          <ResourceList kind="tools" tools={tools} guides={guides} />
          <ResourceList kind="guides" tools={tools} guides={guides} />
        </div>
      </section>
      <section className="orbit-home editorial-only">
        <header className="orbit-hero">
          <p className="template-overline">
            <span /> 知芽探索
          </p>
          <h1>
            选好工具，
            <br />
            <em>开始动手。</em>
          </h1>
          <p>写作、读资料、做汇报。</p>
          <div className="orbit-hero-links">
            <ModuleSection id="beginner">
              <Link prefetch={false} href="/start/" className="template-action">
                跟小芽练习
                <ArrowUpRight size={18} />
              </Link>
            </ModuleSection>
            <ModuleSection id="tools">
              <Link prefetch={false} href="/tools/">
                探索工具库
                <ArrowRight size={17} />
              </Link>
            </ModuleSection>
          </div>
          <div className="orbit-scene" aria-hidden="true">
            <div className="orbit-ring" />
            <div className="template-mascot" />
            <span className="orbit-coordinate">✦</span>
          </div>
        </header>
        <div className="orbit-workspace">
          <div className="orbit-workspace-heading">
            <span>01 / 开始行动</span>
            <h2>你想完成什么？</h2>
          </div>
          <TaskPicker prefix="orbit" />
        </div>
        <div className="orbit-library">
          <ResourceList kind="tools" tools={tools} guides={guides} />
          <ResourceList kind="guides" tools={tools} guides={guides} />
        </div>
      </section>
      <ModuleSection id="cases">
        <section className="template-case-shelf">
          <div className="template-section-title">
            <div>
              <h2>工作案例</h2>
            </div>
            <Link prefetch={false} href="/cases/">
              浏览案例
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="template-case-links">
            {cases.slice(0, 3).map((item, i) => (
              <Link prefetch={false} href={`/cases/${item.id}/`} key={item.id}>
                <span className="template-case-symbol">
                  {i === 0 ? <FileText /> : i === 1 ? <Layers /> : <BookOpen />}
                </span>
                <span className="template-overline">{item.industry}</span>
                <h3>{item.title}</h3>
                <span className="template-case-open">
                  打开案例
                  <ArrowUpRight size={18} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      </ModuleSection>
      <ModuleSection id="news">
        <Link prefetch={false} href="/updates/" className="template-news-link">
          <span>
            <Check size={17} /> 关注 AI 新变化
          </span>
          <strong>查看官方消息</strong>
          <ArrowUpRight size={22} />
        </Link>
      </ModuleSection>
    </div>
  )
}
