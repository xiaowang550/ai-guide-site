import { SchoolProvider } from '@/components/edu/school-provider'
import { SchoolSessionHeader } from '@/components/edu/school-session'
import { AnalyticsBeacon } from '@/components/analytics-beacon'
import { ModuleGate } from '@/components/module-visibility'
export const metadata = { robots: { index: false, follow: false } }
export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchoolProvider>
      <AnalyticsBeacon />
      <SchoolSessionHeader />
      <main className="flex-1">
        <ModuleGate>{children}</ModuleGate>
      </main>
      <footer className="container mt-12 border-t py-7 text-sm text-muted-foreground">
        学校教师端 · 课程与教案可按实际教学需要借鉴和调整。
      </footer>
    </SchoolProvider>
  )
}
