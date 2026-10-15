'use client'
import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { introDue, INTRO_KEY, localDay, readLocal, finishIntro } from '@/lib/onboarding-state'
import { FirstVisitExperience } from './first-visit-experience'
const ExperiencedGuide = dynamic(() =>
  import('./experienced-guide').then((m) => m.ExperiencedGuide),
)
export function GuidedTour() {
  const pathname = usePathname(),
    [active, setActive] = useState(false),
    [experienced, setExperienced] = useState(false),
    initialized = useRef(false)
  useEffect(() => {
    const open = () => {
      setActive(false)
      setExperienced(true)
    }
    window.addEventListener('zhiya:experienced-guide', open)
    if (new URLSearchParams(location.search).get('guide') === 'experienced') {
      initialized.current = true
      open()
      const url = new URL(location.href)
      url.searchParams.delete('guide')
      history.replaceState(history.state, '', url.href)
    }
    return () => window.removeEventListener('zhiya:experienced-guide', open)
  }, [])
  useEffect(() => {
    if (
      initialized.current ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/start') ||
      pathname.startsWith('/feedback')
    )
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
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/start') ||
      pathname.startsWith('/feedback')
    )
      setActive(false)
  }, [pathname])
  if (experienced && pathname === '/')
    return <ExperiencedGuide onClose={() => setExperienced(false)} />
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
