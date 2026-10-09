import type { SiteModule } from './site-modules.ts'
export { DEFAULT_LAYOUT, orderedIds, layoutOf, type SiteLayout } from './site-modules.ts'
export const HOME_SECTIONS = [
  { id: 'hero', title: '首页欢迎区' },
  { id: 'metrics', title: '内容数量概览' },
  { id: 'start', title: '学习与任务入口' },
  { id: 'tools', title: '推荐工具' },
  { id: 'guides', title: '学习路径' },
  { id: 'school', title: '学校服务' },
  { id: 'news', title: 'AI 实时资讯' },
] as const
export function navigationCandidates(modules: SiteModule[]) {
  return [
    { id: 'home', title: '首页' },
    ...modules
      .filter((module) => module.kind === 'builtin' || module.navigation)
      .map((module) => ({
        id: module.id,
        title: module.id === 'guides' ? '教程' : module.id === 'news' ? 'AI 资讯' : module.title,
      })),
  ]
}
export function homeCandidates(modules: SiteModule[]) {
  return [
    ...HOME_SECTIONS,
    ...modules
      .filter((module) => module.kind !== 'builtin' && module.home)
      .map((module) => ({ id: module.id, title: module.title })),
  ]
}
