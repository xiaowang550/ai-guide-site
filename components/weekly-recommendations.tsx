import Link from 'next/link'
import { ArrowRight, BookOpen, Lightbulb, Sparkles } from 'lucide-react'
import { ToolLogo } from './tool-logo'
import { BenchmarkTag } from './benchmark-evidence'
import { toolBenchmark } from '@/data/tool-benchmarks'
import { LiveHotBadge, LiveTrendSource } from './tool-trends'
import { ModuleSection } from './module-visibility'
import { WeeklyCarousel } from './weekly-carousel'
export interface WeeklyEntry {
  id: string
  kind: '工具' | '教程' | '案例'
  href: string
  title: string
  description: string
  logo?: string
  score?: number
  tags: string[]
}
export function WeeklyRecommendations({ entries }: { entries: WeeklyEntry[] }) {
  const groups = [0, 1].map((page) => (
    <div key={page} className="weekly-grid">
      {entries.slice(page * 3, page * 3 + 3).map((entry) => (
        <ModuleSection
          key={entry.href}
          id={entry.kind === '工具' ? 'tools' : entry.kind === '教程' ? 'guides' : 'cases'}
        >
          <article className="weekly-card">
            <span className="weekly-icon">
              {entry.logo ? (
                <ToolLogo src={entry.logo} alt="" size={52} />
              ) : entry.kind === '教程' ? (
                <BookOpen size={30} />
              ) : (
                <Lightbulb size={30} />
              )}
            </span>
            <div className="weekly-copy">
              <div className="weekly-meta">
                <span>{entry.kind}</span>
                {entry.kind === '工具' && <LiveHotBadge id={entry.id} />}
              </div>
              <h3>
                <Link prefetch={false} href={entry.href}>
                  {entry.title}
                  <span className="absolute inset-0" aria-hidden />
                </Link>
              </h3>
              <p>{entry.description}</p>
              <ul>
                {entry.tags.slice(0, 3).map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </div>
            {entry.kind === '工具' && (
              <span className="weekly-score">
                <BenchmarkTag evidence={toolBenchmark(entry.id)} />
              </span>
            )}
            <ArrowRight className="weekly-arrow" size={18} aria-hidden />
          </article>
        </ModuleSection>
      ))}
    </div>
  ))
  return (
    <section className="weekly-recommendations" aria-labelledby="weekly-heading">
      <div className="weekly-heading">
        <div>
          <h2 id="weekly-heading">
            <Sparkles size={22} aria-hidden />
            本周推荐
          </h2>
          <p>先试热门工具，再学方法、看案例。</p>
        </div>
      </div>
      <WeeklyCarousel groups={groups} />
      <LiveTrendSource />
      <p className="weekly-footnote">
        推荐为本站编辑精选；工具实测注明榜单，热门标记仅表示使用热度。
        <Link prefetch={false} href="/tools">
          查看全部工具 →
        </Link>
      </p>
    </section>
  )
}
