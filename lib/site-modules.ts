export const MODULE_POLL_MS = 15000
export type ModuleKind = 'builtin' | 'cards' | 'steps' | 'faq' | 'links'
export interface ModuleBlock {
  title: string
  text: string
  href?: string
}
export interface SiteModule {
  id: string
  title: string
  description: string
  kind: ModuleKind
  enabled: boolean
  home: boolean
  navigation: boolean
  order: number
  blocks: ModuleBlock[]
  version: number
  updatedAt: string
}
export interface PublicSiteConfig {
  revision: string
  modules: SiteModule[]
  features: { assistant: boolean; onboarding: boolean }
}
export const builtinModules: SiteModule[] = [
  {
    id: 'saved',
    title: '学习夹',
    description: '本机收藏与最近浏览',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: false,
    order: 85,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
  {
    id: 'knowledge',
    title: '知识库',
    description: '基础概念与术语',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: true,
    order: 10,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
  {
    id: 'advanced',
    title: '模型与 Agent 进阶',
    description: '模型选择、工具调用与工作流',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: false,
    order: 15,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
  {
    id: 'guides',
    title: '教程与学习路径',
    description: '从入门到实操练习',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: true,
    order: 20,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
  {
    id: 'tools',
    title: '工具库',
    description: '工具档案与模型比较',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: true,
    order: 30,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
  {
    id: 'cases',
    title: '案例',
    description: '工作与教学的应用案例',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: true,
    order: 40,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
  {
    id: 'school',
    title: '学校服务',
    description: '课程、教案包与使用规范',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: true,
    order: 50,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
  {
    id: 'news',
    title: 'AI 实时资讯',
    description: '官方新模型与功能动态',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: true,
    order: 60,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
  {
    id: 'finder',
    title: '场景决策与对比',
    description: '按任务选工具',
    kind: 'builtin',
    enabled: true,
    home: false,
    navigation: false,
    order: 70,
    blocks: [],
    version: 1,
    updatedAt: '',
  },
]
export const DEFAULT_SITE_CONFIG: PublicSiteConfig = {
  revision: 'baseline',
  modules: builtinModules,
  features: { assistant: true, onboarding: true },
}
export function moduleForPath(path: string): string | null {
  const clean = path.split('?')[0].replace(/\/+$/, '') || '/'
  if (clean === '/saved') return 'saved'
  if (clean === '/learn/advanced') return 'advanced'
  if (clean === '/learn' || clean.startsWith('/learn/')) return 'knowledge'
  if (
    clean === '/guides' ||
    clean.startsWith('/guides/') ||
    clean === '/paths' ||
    clean.startsWith('/paths/')
  )
    return 'guides'
  if (clean === '/tools' || clean.startsWith('/tools/')) return 'tools'
  if (clean === '/cases' || clean.startsWith('/cases/')) return 'cases'
  if (clean === '/edu' || clean.startsWith('/edu/')) return 'school'
  if (clean === '/updates') return 'news'
  if (['/find', '/compare'].includes(clean)) return 'finder'
  return null
}
export function moduleEnabled(config: PublicSiteConfig, id: string): boolean {
  return config.modules.some((module) => module.id === id && module.enabled)
}
export function pathEnabled(config: PublicSiteConfig, path: string): boolean {
  const id = moduleForPath(path)
  return (
    (!id || moduleEnabled(config, id)) && (id !== 'advanced' || moduleEnabled(config, 'knowledge'))
  )
}
export function moduleHref(module: SiteModule): string {
  const routes: Record<string, string> = {
    saved: '/saved',
    knowledge: '/learn',
    advanced: '/learn/advanced',
    guides: '/guides',
    tools: '/tools',
    cases: '/cases',
    school: '/edu',
    news: '/updates',
    finder: '/find',
  }
  return routes[module.id] ?? `/modules/?id=${encodeURIComponent(module.id)}`
}
export function safeModuleLink(value: string): boolean {
  if (!value) return true
  if (
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !/[\\\u0000-\u0020]/.test(value) &&
    !/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|20)/i.test(value)
  )
    return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}
