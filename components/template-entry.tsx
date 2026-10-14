'use client'
import { lazy, Suspense, useEffect, useState } from 'react'
export type TemplateHomeData = {
  tools: { id: string; name: string; logo: string; tagline: string }[]
  guides: { id: string; title: string; durationMin: number }[]
  cases: { id: string; title: string; industry: string }[]
}
const Navigation = lazy(() =>
  import('./template-navigation').then((m) => ({ default: m.TemplateNavigation })),
)
const Home = lazy(() =>
  import('./design-home-content').then((m) => ({ default: m.DesignHomeContent })),
)
const School = lazy(() =>
  import('./template-school-home').then((m) => ({ default: m.TemplateSchoolHome })),
)
function useTemplateEnabled() {
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    const update = () =>
      setEnabled(['studio', 'editorial'].includes(document.documentElement.dataset.design ?? ''))
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-design'],
    })
    return () => observer.disconnect()
  }, [])
  return enabled
}
export function TemplateNavigationEntry({ school = false }: { school?: boolean }) {
  return useTemplateEnabled() ? (
    <Suspense fallback={null}>
      <Navigation school={school} />
    </Suspense>
  ) : null
}
export function TemplateHomeEntry(props: TemplateHomeData) {
  return useTemplateEnabled() ? (
    <Suspense fallback={null}>
      <Home {...props} />
    </Suspense>
  ) : null
}
export function TemplateSchoolEntry() {
  return useTemplateEnabled() ? (
    <Suspense fallback={null}>
      <School />
    </Suspense>
  ) : null
}
