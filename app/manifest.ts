import type { MetadataRoute } from 'next'

/** PWA 清单：允许「添加到主屏」，离线可用 */
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI 能力地图 —— 中文 AI 学习与工具指南',
    short_name: 'AI 能力地图',
    description:
      '把每个 AI 工具的能力量化成 14 个维度，并用纯规则决策器回答「该用哪个、为什么、怎么问」。面向本地教师与学生。',
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