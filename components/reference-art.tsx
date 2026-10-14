import Link from 'next/link'
import { BookOpen, FileText, GraduationCap, LayoutGrid } from 'lucide-react'

/** 图像仅负责插画；标签和按钮仍然是可访问、可操作的页面元素。 */
export function ReferenceArt({ home = false, small = false }: { home?: boolean; small?: boolean }) {
  return (
    <div
      className={['reference-art', home && 'reference-art-home', small && 'reference-art-small']
        .filter(Boolean)
        .join(' ')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 已压缩的站内静态 WebP，无需在所有导航页加载图片运行时 */}
      <img
        src="/brand/sprout-hero-v3.webp"
        alt=""
        width={640}
        height={640}
        fetchPriority={home ? 'high' : 'auto'}
        sizes={home ? '(min-width: 1100px) 32vw, 80vw' : '(min-width: 1024px) 26vw, 45vw'}
      />
      {home && (
        <>
          <Link prefetch={false} href="/paths" className="art-chip art-chip-one">
            <GraduationCap size={22} />
            学习路径
          </Link>
          <Link prefetch={false} href="/tools" className="art-chip art-chip-two">
            <LayoutGrid size={22} />
            工具推荐
          </Link>
          <Link prefetch={false} href="/guides" className="art-chip art-chip-three">
            <FileText size={22} />
            内容整理
          </Link>
        </>
      )}
    </div>
  )
}

export function LearningEntries() {
  return (
    <div className="hero-entry-list">
      {[
        ['/start/', '我想快速上手 AI', '从对话、作图到看图与语音'],
        ['/paths/workplace-30d', '我想提升工作效率', '写作、表格、汇报和日常办公'],
        ['/learn/advanced', '我想深入学习与实践', '模型、Agent 与自动化工作流'],
      ].map(([href, title, description]) => (
        <Link prefetch={false} key={href} href={href}>
          <BookOpen size={22} />
          <span>
            <strong>{title}</strong>
            <small>{description}</small>
          </span>
          <span aria-hidden>↗</span>
        </Link>
      ))}
    </div>
  )
}
