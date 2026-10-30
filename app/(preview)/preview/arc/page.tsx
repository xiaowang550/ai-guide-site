import type { Metadata } from 'next'
import { tools, guides, cases } from '@/data'
import { ArcExperience } from '@/components/arc/experience'

export const metadata: Metadata = {
  title: '光的工作室 · 设计预览',
  description: '弦域全新设计预览：与弧灵一起，把问题变成作品。',
  robots: { index: false, follow: false },
}

export default function ArcPreviewPage() {
  const featured = ['chatgpt', 'claude', 'gemini', 'deepseek', 'kimi', 'doubao']
  const categories: Record<string, string> = {
    chatgpt: '创作',
    claude: '写作',
    gemini: '研究',
    deepseek: '编程',
    kimi: '研究',
    doubao: '创作',
  }
  return (
    <ArcExperience
      counts={{ tools: tools.length, guides: guides.length, cases: cases.length }}
      tools={featured.flatMap((id) => {
        const t = tools.find((tool) => tool.id === id)
        return t
          ? [
              {
                id: t.id,
                name: t.name,
                logo: t.logo,
                tagline: t.tagline,
                category: categories[id],
                officialUrl: t.officialUrl,
              },
            ]
          : []
      })}
      guides={guides.slice(0, 3).map((g) => ({
        id: g.id,
        title: g.title,
        summary: g.summary ?? g.outcome,
        duration: g.durationMin,
      }))}
      cases={['weekly-report-ops', 'meeting-action-review', 'teaching-materials'].flatMap((id) => {
        const c = cases.find((item) => item.id === id)
        return c
          ? [{ id: c.id, title: c.title, summary: c.summary ?? c.scenario, industry: c.industry }]
          : []
      })}
    />
  )
}
