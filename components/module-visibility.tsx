'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { pathEnabled } from '@/lib/site-modules'
import { useSiteModules } from './site-module-context'
export function ModuleGate({ children }: { children: React.ReactNode }) {
  const { config, preview } = useSiteModules(),
    pathname = usePathname()
  if (!preview && !pathEnabled(config, pathname))
    return (
      <section className="container py-20">
        <p className="text-sm text-muted-foreground">这个栏目暂时关闭</p>
        <h1 className="mt-3 text-2xl font-semibold">去看看其他学习内容</h1>
        <Link className="mt-6 inline-flex text-primary" href="/">
          返回首页 →
        </Link>
      </section>
    )
  return <>{children}</>
}
export function ModuleSection({ id, children }: { id: string; children: React.ReactNode }) {
  const { config, preview } = useSiteModules()
  return preview || config.modules.some((module) => module.id === id && module.enabled) ? (
    <>{children}</>
  ) : null
}
