import type { Metadata } from 'next'
import Link from 'next/link'
import { updates } from '@/data'
import { UPDATE_TYPE_LABELS } from '@/lib/site'
import { formatDate } from '@/lib/score'
import { PageHeader, EmptyState } from '@/components/page-header'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: '更新雷达',
  description: '本站数据变更日志：新增工具、下架、价格变动、能力变更、新增概念与教程。AI 领域每月都在变，我们把变更记下来。',
  alternates: { canonical: '/updates' },
}

const TYPE_VARIANT: Record<string, 'default' | 'success' | 'warning' | 'danger' | 'secondary'> = {
  'new-tool': 'success',
  'new-concept': 'secondary',
  'new-guide': 'secondary',
  'price-change': 'warning',
  'capability-change': 'warning',
  removed: 'danger',
  'data-fix': 'default',
}

export default function UpdatesPage() {
  const grouped = updates.reduce<Record<string, typeof updates>>((acc, u) => {
    const month = u.date.slice(0, 7)
    ;(acc[month] ||= []).push(u)
    return acc
  }, {})

  return (
    <>
      <PageHeader
        title="更新雷达"
        description="本站不追新闻热点，只维护结构性知识。但结构性数据也会过时 —— 所有变更都记在这里，包括我们自己的勘误。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '更新雷达' }]}
      />

      <div className="container py-8">
        {updates.length === 0 ? (
          <EmptyState title="还没有更新记录" description="数据第一次复核后会在这里留下记录。" />
        ) : (
          <div className="space-y-10">
            {Object.entries(grouped).map(([month, items]) => (
              <section key={month}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {month.replace('-', ' 年 ')} 月
                </h2>
                <ul className="divide-y border-t border-hairline pt-5">
                  {items.map((u) => (
                    <li key={u.id} className="px-5 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <time dateTime={u.date} className="text-xs tabular-nums text-muted-foreground">
                          {formatDate(u.date)}
                        </time>
                        <Badge variant={TYPE_VARIANT[u.type] ?? 'secondary'}>
                          {UPDATE_TYPE_LABELS[u.type]}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-foreground/90">{u.summary}</p>
                      {u.affected.length > 0 ? (
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          影响页面：
                          {u.affected.map((href) => (
                            <Link
                              key={href}
                              href={href}
                              className="rounded border px-1.5 py-0.5 hover:border-primary/50 hover:text-primary"
                            >
                              {href}
                            </Link>
                          ))}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        <p className="mt-8 rounded-xl border bg-muted/40 p-5 text-xs leading-6 text-muted-foreground">
          说明：更新雷达记录的是「本站数据发生了什么变化」，不是厂商的产品新闻。
          我们只在复核数据时追加记录，并同步刷新对应页面的更新时间。
          如果你发现某条记录与页面数据不一致，欢迎在{' '}
          <Link href="/about#errata" className="text-primary underline underline-offset-4">
            勘误入口
          </Link>{' '}
          反馈。
        </p>
      </div>
    </>
  )
}