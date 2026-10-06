import Link from 'next/link'
import type { ReactNode } from 'react'
import { eduNav } from '@/lib/site'
import { cn } from '@/lib/utils'

/** AI 教育专区的子导航：与主站的 6 个一级导航互相独立 */
export default function EduLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b bg-primary/[0.04]">
        <div className="container">
          <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-6">
            <Link href="/edu" className="shrink-0 text-sm font-semibold">
              AI 教育服务
              <span className="ml-2 hidden text-xs font-normal text-muted-foreground sm:inline">
                面向本地学校
              </span>
            </Link>
            <nav aria-label="教育服务导航" className="-mx-1 overflow-x-auto no-scrollbar">
              <ul className="flex items-center gap-1 px-1">
                {eduNav.map((item) => (
                  <li key={item.href} className="shrink-0">
                    <EduNavLink href={item.href}>{item.label}</EduNavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </div>
      {children}
    </>
  )
}

function EduNavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'block whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition-colors',
        'text-muted-foreground hover:bg-accent hover:text-foreground'
      )}
    >
      {children}
    </Link>
  )
}