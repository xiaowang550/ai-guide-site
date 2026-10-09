'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { readSettings } from '@/lib/settings'
import {
  introDue,
  INTRO_KEY,
  INTRO_SESSION,
  localDay,
  readLocal,
  finishIntro,
} from '@/lib/onboarding-state'
import { FirstVisitExperience } from './first-visit-experience'
export function GuidedTour() {
  const pathname = usePathname(),
    [active, setActive] = useState(false),
    initialized = useRef(false)
  useEffect(() => {
    if (initialized.current || pathname.startsWith('/admin') || pathname.startsWith('/start'))
      return
    initialized.current = true
    let seen = false
    try {
      seen = sessionStorage.getItem(INTRO_SESSION) === localDay()
    } catch {}
    const force = new URLSearchParams(location.search).get('tour') === '1'
    if (
      introDue(readLocal(INTRO_KEY, {}), localDay(), seen, readSettings().onboardingDone, force)
    ) {
      try {
        sessionStorage.setItem(INTRO_SESSION, localDay())
      } catch {}
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
      onClose={(today, completed) => {
        finishIntro(today, completed)
        setActive(false)
      }}
    />
  )
}
export function replayOnboarding() {
  window.location.assign('/?tour=1')
}
