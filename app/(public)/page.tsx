import type { Metadata } from 'next'
import { tools, guides, cases } from '@/data'
import { XianHome } from '@/components/xian/home'
import '@/public/design/xian-observatory.css'
import '@/public/design/xian-lab.css'

export const metadata: Metadata = {
  description: '弦域 XIAN：探索 AI 工具、运行真实任务、跟着案例实践。把想法接入下一维。',
  alternates: { canonical: '/' },
}
export default function HomePage() {
  const ids = ['chatgpt', 'claude', 'gemini', 'deepseek', 'kimi', 'doubao']
  const categories: Record<string, string> = {
    chatgpt: '创作',
    claude: '写作',
    gemini: '研究',
    deepseek: '编程',
    kimi: '研究',
    doubao: '创作',
  }
  return (
    <XianHome
      totals={{ tools: tools.length, guides: guides.length, cases: cases.length }}
      tools={ids.flatMap((id) => {
        const tool = tools.find((t) => t.id === id)
        return tool
          ? [
              {
                id: tool.id,
                name: tool.name,
                logo: tool.logo,
                tagline: tool.tagline,
                category: categories[id],
              },
            ]
          : []
      })}
      cases={cases
        .filter((item) =>
          ['weekly-report-ops', 'meeting-action-items', 'teaching-materials'].includes(item.id),
        )
        .concat(
          cases.filter(
            (item) =>
              !['weekly-report-ops', 'meeting-action-items', 'teaching-materials'].includes(
                item.id,
              ),
          ),
        )
        .slice(0, 3)
        .map((item) => ({
          id: item.id,
          title: item.title,
          summary: item.summary ?? item.scenario,
          industry: item.industry,
        }))}
      guides={['prompt-basics', 'long-pdf-summary', 'structured-handoff'].flatMap((id) => {
        const guide = guides.find((g) => g.id === id)
        return guide
          ? [
              {
                id: guide.id,
                title: guide.title,
                summary: guide.summary ?? guide.outcome,
                duration: guide.durationMin,
              },
            ]
          : []
      })}
    />
  )
}
