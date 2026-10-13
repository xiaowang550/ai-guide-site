'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
const Tabs = dynamic(
  () =>
    import('./mobile-tabs-view')
      .then((module) => module.MobileTabsView)
      .catch(
        () =>
          function OfflineTabs() {
            return null
          },
      ),
  {
    ssr: false,
  },
)
/** Desktop visitors do not download the phone navigation's icons and catalog. */
export function MobileTabs({ school = false }: { school?: boolean }) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const media = matchMedia('(max-width: 1023px)')
    const change = () => setMobile(media.matches)
    change()
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return mobile ? <Tabs school={school} /> : null
}
