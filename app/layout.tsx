import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { siteConfig, siteTitle } from '@/lib/site'
import { SiteHeader } from '@/components/site-header'
import { SiteFooter } from '@/components/site-footer'
import { ThemeScript } from '@/components/theme-toggle'
import { MotionLayer } from '@/components/motion/motion-layer'
import { ServiceWorkerRegistrar } from '@/components/motion/service-worker-registrar'
import { AssistantDock } from '@/components/assistant/assistant-dock'
import { AnalyticsBeacon } from '@/components/analytics-beacon'
import { GuidedTour } from '@/components/onboarding/guided-tour'

/**
 * 进场淡入的开关：只有确认 JS 可用时才给 <html> 加 .js-reveal，
 * 这样 CSS 里的初始隐藏状态不会在 JS 失效时把内容永久藏起来。
 */
const REVEAL_BOOTSTRAP = "document.documentElement.classList.add('js-reveal')"

/** noscript 兜底：禁用 JS 时不让 .reveal 停在 opacity:0 */
const NO_JS_REVEAL_FIX = '.js-reveal .reveal{opacity:1 !important;transform:none !important}'

/**
 * 首屏内容立刻入场，不等 hydration。
 *
 * 问题：`.reveal` 的初始状态是隐藏的，靠 MotionLayer（一个 client 组件）
 * 在挂载后加 `.is-in`。而 client 组件要等 JS 下载 + hydration 完才跑，
 * 于是首屏卡片和文字在慢设备上会白着好几百毫秒 —— Lighthouse 实测
 * /tools 的 LCP 有 2.9 s 全是 Render Delay。
 *
 * 这段脚本放在 body 末尾，HTML 一解析完就同步执行：
 * 首屏及刚进入视口的元素马上点亮，滚动入场只留给真正的下方内容。
 * MotionLayer 之后接管时用 `.reveal:not(.is-in)` 扫描，两者不会打架。
 */
const REVEAL_EAGER = `(function(){try{var vh=window.innerHeight||800;var els=document.querySelectorAll('.js-reveal .reveal:not(.is-in)');for(var i=0;i<els.length;i++){if(els[i].getBoundingClientRect().top<vh*1.05){els[i].classList.add('is-in')}}}catch(e){}})()`

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  // 标语为空时只输出站点名，不拼出「站点名—— 」这种带尾巴的标题
  title: {
    default: siteTitle(),
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  openGraph: {
    type: 'website',
    locale: 'zh-CN',
    siteName: siteConfig.name,
    title: siteTitle(),
    description: siteConfig.description,
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <ThemeScript />
        <script dangerouslySetInnerHTML={{ __html: REVEAL_BOOTSTRAP }} />
        {/* 禁用 JS 时撤销进场动画的初始隐藏状态，确保内容永远可见 */}
        <noscript>
          <style>{NO_JS_REVEAL_FIX}</style>
        </noscript>
      </head>
      <body className="flex min-h-screen flex-col">
        <MotionLayer />
        {/* 离线能力：仅生产构建注册，失败不影响使用 */}
        <ServiceWorkerRegistrar />
        {/*
          访问统计采集：只上报页面路径与事件名，不发 Cookie、不发指纹、不发 UA。
          后端据此按「天 × 路径」聚合，算不出独立访客数 —— 对外承诺的
          「不做用户画像」不能在统计口开后门。
        */}
        <AnalyticsBeacon />
        {/* 站内助手浮窗：可拖动、可隐藏，在设置页可重新打开 */}
        <AssistantDock />
        {/* 首次进入的新手引导：任何一步都能跳过 */}
        <GuidedTour />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          跳到主要内容
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        {/*
          必须在 body 末尾：HTML 一解析完就跑，抢在 hydration 之前把首屏点亮。
          放在 <head> 里此时 body 还不存在，元素一个都扫不到。
        */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_EAGER }} />
      </body>
    </html>
  )
}