'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Layers, CheckCircle2, Link2 } from 'lucide-react'
import { moduleHref, type SiteModule } from '@/lib/site-modules'
import { useSiteModules } from './site-module-context'
export function CustomModuleContent({ module }: { module: SiteModule }) {
  const Icon = module.kind === 'steps' ? CheckCircle2 : module.kind === 'links' ? Link2 : Layers
  return (
    <section className="custom-module">
      <div className="mb-7 flex items-start gap-4">
        <span className="rounded-2xl bg-accent p-3 text-primary">
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold">{module.title}</h2>
          {module.description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {module.description}
            </p>
          )}
        </div>
      </div>
      <div
        className={
          module.kind === 'cards' || module.kind === 'links'
            ? 'grid gap-4 md:grid-cols-2'
            : 'space-y-3'
        }
      >
        {module.blocks.map((block, i) =>
          module.kind === 'faq' ? (
            <details className="rounded-2xl border bg-card p-5" key={i}>
              <summary className="cursor-pointer font-medium">{block.title}</summary>
              <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                {block.text}
              </p>
              {block.href && (
                <Link href={block.href} className="mt-3 inline-flex text-sm text-primary">
                  查看资料 →
                </Link>
              )}
            </details>
          ) : (
            <article className="rounded-2xl border bg-card p-6" key={i}>
              <div className="flex items-start gap-3">
                {module.kind === 'steps' && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                )}
                <div>
                  <h3 className="font-semibold">{block.title}</h3>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">
                    {block.text}
                  </p>
                  {block.href && (
                    <Link
                      href={block.href}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary"
                    >
                      查看资料 <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          ),
        )}
      </div>
    </section>
  )
}
export function HomeModules() {
  const { config, preview } = useSiteModules()
  return (
    <div className="container space-y-14 py-8">
      {config.modules
        .filter((module) => module.kind !== 'builtin' && module.home && (preview || module.enabled))
        .map((module) => (
          <CustomModuleContent key={module.id} module={module} />
        ))}
    </div>
  )
}
export function ModulesExplorer() {
  const { config, ready, preview } = useSiteModules(),
    [id, setId] = useState<string | null>(null)
  useEffect(() => {
    setId(new URLSearchParams(location.search).get('id'))
  }, [])
  const modules = config.modules.filter(
      (module) => module.kind !== 'builtin' && (preview || module.enabled),
    ),
    selected = modules.find((module) => module.id === id)
  return (
    <div className="container py-12">
      {selected ? (
        <>
          <a className="mb-8 inline-block text-sm text-muted-foreground" href="/modules/">
            ← 全部模块
          </a>
          <CustomModuleContent module={selected} />
          {!selected.enabled && (
            <p className="mt-6 text-sm text-muted-foreground">仅管理员预览可见，尚未向访客公开。</p>
          )}
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold">学习与实践模块</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            按你的需要，打开一份资料或开始一次练习。
          </p>
          {id && (
            <p className="mt-8 text-sm" role="status">
              {ready ? '这个模块暂未公开或已移除。' : '正在加载模块…'}
            </p>
          )}
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {modules.map((module) => (
              <a
                href={moduleHref(module)}
                key={module.id}
                className="rounded-2xl border bg-card p-6"
              >
                <h2 className="font-semibold">{module.title}</h2>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{module.description}</p>
                <span className="mt-5 inline-block text-sm text-primary">打开模块 →</span>
              </a>
            ))}
          </div>
          {ready && !modules.length && (
            <p className="mt-8 text-sm text-muted-foreground">
              目前没有额外模块，先到知识库或教程开始学习。
            </p>
          )}
        </>
      )}
    </div>
  )
}
