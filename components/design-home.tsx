import Link from 'next/link'
import { ArrowUpRight, ArrowRight, Search, Play, Layers, BookOpen } from 'lucide-react'
import { ModuleSection } from './module-visibility'

/** Shared functional destinations; the two editions give them different hierarchy. */
export function DesignHome() {
  return (
    <section className="design-new-home container" aria-label="开始使用知芽AI">
      <div className="edition-lead">
        <p className="edition-kicker">
          <span />
          知芽AI · 学习与工具
        </p>
        <h1>
          <span className="studio-only">找工具，学方法。</span>
          <span className="editorial-only">
            学一点 AI。
            <br />
            <em>用在每一天。</em>
          </span>
        </h1>
        <p className="edition-summary">选工具，学方法，完成手头的工作。</p>
        <ModuleSection id="beginner">
          <Link href="/start/" className="edition-primary">
            开始一个练习
            <ArrowRight size={18} />
          </Link>
        </ModuleSection>
        <ModuleSection id="tools">
          <Link href="/tools/" className="edition-secondary">
            直接找工具
            <ArrowUpRight size={16} />
          </Link>
        </ModuleSection>
      </div>
      <div className="edition-art" aria-hidden="true">
        <div className="edition-art-image" />
        <span className="edition-art-caption">小芽，陪你学会。</span>
      </div>
      <div className="edition-actions">
        <p className="edition-section-label">选一个入口</p>
        {[
          {
            id: 'beginner',
            href: '/start/',
            title: '第一次用 AI',
            note: '从一条消息开始',
            icon: Play,
          },
          {
            id: 'tools',
            href: '/tools/',
            title: '找一个工具',
            note: '按任务比较与筛选',
            icon: Layers,
          },
          {
            id: 'cases',
            href: '/cases/',
            title: '参考工作案例',
            note: '通知、表格、教案与汇报',
            icon: BookOpen,
          },
        ].map(({ id, href, title, note, icon: Icon }, i) => (
          <ModuleSection key={id} id={id}>
            <Link href={href} className="edition-entry">
              <span className="edition-entry-number">0{i + 1}</span>
              <Icon size={22} />
              <span>
                <strong>{title}</strong>
                <small>{note}</small>
              </span>
              <ArrowUpRight size={18} />
            </Link>
          </ModuleSection>
        ))}
        <ModuleSection id="finder">
          <Link className="edition-find" href="/find/">
            <Search size={17} />
            不确定选哪个？帮我选
            <ArrowRight size={16} />
          </Link>
        </ModuleSection>
      </div>
    </section>
  )
}
