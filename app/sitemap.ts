import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'
import { cases, concepts, guides, paths, tools } from '@/data'
import { eduPrograms } from '@/data/edu-programs'
import { eduToolkits } from '@/data/edu-toolkits'
import { eduBriefings } from '@/data/edu-briefings'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url
  const now = new Date()

  const staticRoutes = [
    '',
    '/tools',
    '/find',
    '/compare',
    '/learn',
    '/learn/glossary',
    '/guides',
    '/paths',
    '/cases',
    '/updates',
    '/about',
    '/search',
    '/edu',
    '/edu/programs',
    '/edu/toolkits',
    '/edu/policy',
    '/edu/schools',
    '/edu/briefings',
    '/edu/support',
  ]

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route}`,
      lastModified: now,
      changeFrequency:
        route === '' || route === '/updates' || route.startsWith('/edu/briefings')
          ? ('weekly' as const)
          : ('monthly' as const),
      priority: route === '' ? 1 : route === '/edu' || route === '/find' || route === '/tools' ? 0.9 : 0.7,
    })),
    ...tools.map((t) => ({
      url: `${base}/tools/${t.id}`,
      lastModified: new Date(t.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...concepts.map((c) => ({
      url: `${base}/learn/${c.id}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...guides.map((g) => ({
      url: `${base}/guides/${g.id}`,
      lastModified: new Date(g.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...cases.map((c) => ({
      url: `${base}/cases/${c.id}`,
      lastModified: new Date(c.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    ...paths.map((p) => ({
      url: `${base}/paths/${p.id}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
    // ---------- AI 教育供给 ----------
    ...eduPrograms.map((p) => ({
      url: `${base}/edu/programs/${p.id}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...eduToolkits.map((t) => ({
      url: `${base}/edu/toolkits/${t.id}`,
      lastModified: new Date(t.updatedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...eduBriefings.map((b) => ({
      url: `${base}/edu/briefings/${b.id}`,
      lastModified: new Date(b.date),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ]
}