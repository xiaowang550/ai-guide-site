'use client'
import Link from 'next/link'
import { secondaryNav } from '@/lib/site'
import { siteNavigation } from '@/lib/site-navigation'
import { pathEnabled } from '@/lib/site-modules'
import { writeSettings } from '@/lib/settings'
import { useSiteModules } from './site-module-context'
export function FooterLinks() {
  const { config } = useSiteModules()
  return (
    <>
      {[
        siteNavigation(config),
        [
          ...secondaryNav,
          ...(config.modules.some(
            (module) => module.kind !== 'builtin' && module.enabled && module.navigation,
          )
            ? [{ href: '/modules/', label: '学习与实践模块', hint: '' }]
            : []),
        ],
      ].map((list, i) => (
        <nav key={i} aria-label={i ? '页脚次级导航' : '页脚主导航'}>
          <p className="text-xs font-semibold text-muted-foreground">{i ? '更多' : '主导航'}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {list
              .filter((item) => pathEnabled(config, item.href))
              .map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-muted-foreground hover:text-foreground">
                    {item.label}
                  </Link>
                </li>
              ))}
            {i === 1 && config.features.assistant && (
              <li>
                <button
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => writeSettings({ assistant: true, assistantPanelOpen: true })}
                >
                  打开站内学习助手
                </button>
              </li>
            )}
          </ul>
        </nav>
      ))}
    </>
  )
}
