import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

/** PWA 清单：允许「添加到主屏」，离线可用 */
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: siteConfig.name,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#fdfdfc',
    theme_color: '#3e6b59',
    lang: 'zh-CN',
    categories: ['education', 'productivity', 'reference'],
    icons: [
      {
        src: '/brand/app-icon-192-v3.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      { src: '/brand/app-icon-512-v3.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/brand/app-icon-maskable-v1.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: '场景决策器', url: '/find' },
      { name: '工具库', url: '/tools' },
      { name: '数据保鲜看板', url: '/freshness' },
    ],
  }
}
