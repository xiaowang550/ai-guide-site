import Link from 'next/link'
import { ArrowRight, BookOpen, Clock, Code2, Layers, Workflow } from 'lucide-react'
import type { LearningPath } from '@/data/types'
import { formatDate } from '@/lib/score'
import { ReferenceArt } from './reference-art'

export function PathCard({
  path,
  index = 0,
  compact = false,
}: {
  path: LearningPath
  index?: number
  compact?: boolean
}) {
  const Icon = [Workflow, BookOpen, Layers, Code2][index % 4]
  return (
    <Link
      href={`/paths/${path.id}`}
      className={['path-card', `path-tone-${index % 4}`, compact && 'path-card-compact']
        .filter(Boolean)
        .join(' ')}
    >
      <div className="path-card-art">
        {path.id === 'zero-to-pro' ? (
          <ReferenceArt small />
        ) : (
          <>
            <Icon size={80} strokeWidth={1.3} />
            <span className="path-art-sheet">
              <Icon size={32} />
              <i />
              <i />
              <i />
            </span>
          </>
        )}
      </div>
      <div className="path-card-body">
        <p className="eyebrow">
          {path.id === 'zero-to-pro' ? '零基础入门' : index === 2 ? '职场应用' : '进阶实践'}
        </p>
        <h2>{path.title}</h2>
        <p className="path-card-summary">{path.summary}</p>
        <div className="path-card-meta">
          <span>
            <Clock size={17} />
            {path.estHours} 小时
          </span>
          <span>
            <Layers size={17} />
            {path.phases.length} 个阶段
          </span>
        </div>
        {!compact && (
          <p className="text-xs text-muted-foreground">最近更新：{formatDate(path.updatedAt)}</p>
        )}
        <span className="path-card-action">
          开始这条路径
          <ArrowRight size={18} />
        </span>
      </div>
    </Link>
  )
}
