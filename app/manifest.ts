import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

/** PWA 清单：允许「添加到主屏」，离线可用 */
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${siteConfig.name} —— ${siteConfig.description.slice(0, 20)}…`,
    short_name: siteConfig.shortName,
    description:
      siteConfig.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fdfdfc',
    theme_color: '#3b3ba8',
    lang: 'zh-CN',
    categories: ['education', 'productivity', 'reference'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
    shortcuts: [
      { name: '场景决策器', url: '/find' },
      { name: '工具库', url: '/tools' },
      { name: '数据保鲜看板', url: '/freshness' },
    ],
  }
}