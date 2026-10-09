'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { eduNav } from '@/lib/site'
import { cn } from '@/lib/utils'

export function SchoolNav() {
  const pathname = usePathname()
  return (
    <div className="border-b border-hairline bg-background">
      <div className="container flex flex-col sm:flex-row sm:items-center sm:gap-8">
        <Link href="/edu" className="py-3 text-sm font-semibold">
          学校服务
        </Link>
        <nav aria-label="教育服务导航" className="no-scrollbar overflow-x-auto">
          <ul className="flex gap-5">
            {eduNav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block border-b-2 py-3 text-sm transition-colors',
                      active
                        ? 'border-primary font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
