import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { MotionLayer } from '@/components/motion/motion-layer'
import { ServiceWorkerRegistrar } from '@/components/motion/service-worker-registrar'
import { AnalyticsBeacon } from '@/components/analytics-beacon'
import { SiteModulesProvider } from '@/components/site-modules'
import { ModuleGate } from '@/components/module-visibility'
import { MobileTabs } from '@/components/mobile/mobile-tabs'
import { TemplateNavigationEntry } from '@/components/template-entry'
import '@/app/styles/reference-base.css'
import '@/app/styles/benchmarks.css'

/** 公开站外壳。后台具有独立布局，新增公开页面放在此分组即可。 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-site flex flex-1 flex-col">
      <SiteModulesProvider>
        <MotionLayer />
        <ServiceWorkerRegistrar />
        <AnalyticsBeacon />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          跳到主要内容
        </a>
        <SiteHeader />
        <TemplateNavigationEntry />
        <main id="main" className="flex-1">
          <ModuleGate>{children}</ModuleGate>
        </main>
        <SiteFooter />
        <MobileTabs />
      </SiteModulesProvider>
    </div>
  )
}
