'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { introDue, INTRO_KEY, localDay, readLocal, finishIntro } from '@/lib/onboarding-state'
import { FirstVisitExperience } from './first-visit-experience'
export function GuidedTour() {
  const pathname = usePathname(),
    [active, setActive] = useState(false),
    initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || pathname.startsWith('/admin') || pathname.startsWith('/start'))
      return
    initialized.current = true
    const force = new URLSearchParams(location.search).get('tour') === '1'
    if (introDue(readLocal(INTRO_KEY, {}), localDay(), force)) {
      if (force) {
        const url = new URL(location.href)
        url.searchParams.delete('tour')
        history.replaceState(history.state, '', url.href)
      }
      setActive(true)
    }
  }, [pathname])
  useEffect(() => {
    if (pathname.startsWith('/admin') || pathname.startsWith('/start')) setActive(false)
  }, [pathname])
  if (!active) return null
  return (
    <FirstVisitExperience
      onClose={(today) => {
        finishIntro(today)
        setActive(false)
      }}
    />
  )
}
export function replayOnboarding() {
  window.location.assign('/?tour=1')
}
