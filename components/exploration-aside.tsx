import { ScrollSidebar } from '@/components/scroll-sidebar'
import Link from 'next/link'
import { ArrowRight, BookOpen, Lightbulb, Map, Sparkles } from 'lucide-react'

export function ExplorationAside({ tools = false }: { tools?: boolean }) {
  return (
    <ScrollSidebar className="exploration-aside">
      <section className="reference-panel">
        <h2>
          <Lightbulb size={24} />
          {tools ? '如何选工具' : '从这里继续学习'}
        </h2>
        {tools ? (
          <ol className="selection-steps">
            {[
              ['明确你的目标', '先选任务：写作、作图、资料整理或编程。'],
              ['看看关键能力', '只比较与你的任务有关的维度。'],
              ['确认使用条件', '核对免费额度、平台与地区限制。'],
              ['试用，再组合', '用一份小材料验证，别急着一次选定。'],
            ].map(([title, text], i) => (
              <li key={title}>
                <b>{i + 1}</b>
                <span>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">学习进度保存在当前浏览器，随时接着学。</p>
            <Link href="/saved" className="aside-link">
              <BookOpen size={22} />
              打开我的学习夹
              <ArrowRight size={18} />
            </Link>
            <Link href="/paths" className="aside-link">
              <Map size={22} />
              选择学习路径
              <ArrowRight size={18} />
            </Link>
          </>
        )}
      </section>
      <section className="reference-panel">
        <h2>
          <Sparkles size={24} />
          {tools ? '不确定怎么选？' : '推荐你先试一次'}
        </h2>
        <p className="text-sm leading-7 text-muted-foreground">
          {tools
            ? '告诉决策器你要做什么，推荐理由一眼看懂。'
            : '同一个任务，比较简单提问与详细要求的效果。'}
        </p>
        <Link className="home-button mt-4 w-full" href={tools ? '/find' : '/guides/prompt-basics'}>
          {tools ? '打开场景决策器' : '学习提示词方法'}
          <ArrowRight size={18} />
        </Link>
      </section>
      {!tools && (
        <section className="reference-panel">
          <h2>
            <Map size={24} />
            相关学习路径
          </h2>
          {[
            ['/paths/zero-to-pro', 'AI 新手入门路径'],
            ['/paths/workplace-30d', '职场提效路径'],
            ['/learn/advanced', '模型与 Agent 进阶'],
          ].map(([href, title]) => (
            <Link href={href} key={href} className="aside-link">
              {title}
              <ArrowRight size={18} />
            </Link>
          ))}
        </section>
      )}
    </ScrollSidebar>
  )
}
