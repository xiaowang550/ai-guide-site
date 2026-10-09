'use client'
import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
const Links = dynamic(() => import('./site-footer-links').then((module) => module.FooterLinks), {
  ssr: false,
})
/** 长页面先加载正文与主导航，滚动接近页脚时再加载次级入口。 */
export function FooterNavigation() {
  const element = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const target = element.current
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '300px' },
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={element} className="grid min-h-48 gap-8 sm:grid-cols-2 md:col-span-2">
      {visible && <Links />}
    </div>
  )
}
