import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cases, toolsById } from '@/data'
import { REUSABILITY_LABELS } from '@/lib/site'
import { PageHeader } from '@/components/page-header'
import { CoverArt } from '@/components/cover-art'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: '案例库',
  description:
    '真实场景的 AI 应用案例：原来的痛点、用了什么工具、完整提示词原文、实际结果、花了多久、踩过的坑。按行业与角色筛选。',
  alternates: { canonical: '/cases' },
}

export default function CasesPage() {
  const industries = Array.from(new Set(cases.map((c) => c.industry)))

  return (
    <>
      <PageHeader
        title="案例库：别人到底怎么用的"
        description="每个案例都包含可复制的提示词原文，这是这个页面最有价值的部分。看案例不如看别人具体怎么问。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '案例' }]}
      />

      <div className="container py-8">
        <p className="mb-6 text-sm text-muted-foreground">
          共 {cases.length} 个案例，覆盖 {industries.length} 个行业。案例由典型场景改编整理而成，
          提示词可原样复现；结果描述是编辑判断而非本站逐案实测，不同团队实际效果会有差异。
        </p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cases.map((c, i) => {
            const used = c.tools
              .map((id) => toolsById[id])
              .filter((t): t is NonNullable<typeof t> => Boolean(t))
            return (
              <Link
                key={c.id}
                href={`/cases/${c.id}`}
                className="media-card spotlight reveal group"
                style={{ ['--d' as string]: `${Math.min(i, 8) * 45}ms` }}
              >
                <CoverArt
                  id={c.id}
                  eyebrow={`${c.industry} · ${c.role}`}
                  index={i + 1}
                  tools={used}
                />
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="text-[15px] font-semibold leading-snug">{c.title}</h2>
                  <p className="mt-2 line-clamp-3 flex-1 text-[13px] leading-6 text-muted-foreground">
                    {c.summary ?? c.scenario}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                    <Badge
                      variant={
                        c.reusability === 'high'
                          ? 'success'
                          : c.reusability === 'medium'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      可复用 {REUSABILITY_LABELS[c.reusability]}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{c.timeSpent}</span>
                  </div>
                  <span className="mt-3 inline-flex items-center gap-1 border-t border-hairline pt-2.5 text-[11px] text-foreground/70 transition-colors group-hover:text-primary">
                    看完整提示词原文
                    <ArrowRight
                      className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}