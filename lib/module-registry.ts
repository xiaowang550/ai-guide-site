import type { ModuleBlock, PageRegion } from './site-modules.ts'
export interface RegionDefinition {
  id: string
  title: string
  items?: ModuleBlock[]
  nested?: boolean
  kind?: 'cards' | 'steps' | 'links'
}
const items = (values: string[][]): ModuleBlock[] =>
  values.map(([title, text, href], i) => ({
    id: `item-${i + 1}`,
    title,
    text,
    ...(href ? { href } : {}),
    enabled: true,
  }))
export const PAGE_REGIONS: Record<string, RegionDefinition[]> = {
  home: [
    { id: 'hero', title: '轨道主视觉' },
    {
      id: 'start',
      title: '实践档案',
      items: items([
        ['系统教程', '照着步骤，练习对话、写作和资料整理。', '/guides'],
        ['精选案例', '看看周报、会议记录和教学材料怎么做。', '/cases'],
        ['实用工具库', '比较功能、费用和使用条件。', '/tools'],
      ]),
    },
    { id: 'metrics', title: '内容数量' },
    { id: 'tools', title: '创造工具' },
    { id: 'workspace', title: 'AI 任务终端' },
    { id: 'guides', title: '学习路线' },
    { id: 'final', title: '开始创造' },
    { id: 'news', title: 'AI 实时资讯' },
    {
      id: 'tasks',
      title: '按任务选工具',
      items: items([
        ['写一篇文章', '写作表达、提示词方法', '/find?s=write'],
        ['读懂长文档', '长文理解、信息整理', '/find?s=read-long-doc'],
        ['做一份汇报', '办公产出、内容组织', '/find?s=make-office'],
      ]),
    },
  ],
  tools: [
    { id: 'header', nested: true, title: '页面标题与入口' },
    {
      id: 'benchmark',
      title: '榜单说明',
      items: items([
        [
          '参考公开榜单选工具',
          'AA 看模型能力，Arena 看盲测偏好。应用与模型分别看。',
          '/about#benchmarks',
        ],
      ]),
    },
    { id: 'library', title: '工具筛选与列表' },
    {
      id: 'selection',
      title: '如何选工具',
      nested: true,
      kind: 'steps',
      items: items([
        ['明确你的目标', '先选任务：写作、作图、资料整理或编程。'],
        ['看看关键能力', '只比较与你的任务有关的维度。'],
        ['确认使用条件', '核对免费额度、平台与地区限制。'],
        ['试用，再组合', '用一份小材料验证，别急着一次选定。'],
      ]),
    },
    {
      id: 'notes',
      title: '选工具提示',
      items: items([
        ['核对来源', '每个工具附官方来源和复核日期。', '/about'],
        ['核对费用', '价格和免费额度以工具官方页面为准。', '/compare'],
        ['反馈问题', '发现资料过时，可以提交反馈。', '/feedback'],
      ]),
    },
  ],
  guides: [
    { id: 'header', nested: true, title: '页面标题与推荐入口' },
    {
      id: 'entries',
      title: '教程分类入口',
      kind: 'links',
      items: items([
        ['零基础入门', '手把手练习', '/start'],
        ['提示词方法', '说清要求，获得更好的结果', '/guides/prompt-basics'],
        ['长文理解', '读懂、整理和核对长文档', '/guides/long-pdf-summary'],
        ['办公提效', '写作、表格、汇报与沟通', '/paths/workplace-30d'],
        ['Agent 进阶', '选模型、搭流程、检查结果', '/learn/advanced'],
      ]),
    },
    { id: 'beginner', title: '继续零基础练习' },
    { id: 'paths', title: '精选学习路径' },
    {
      id: 'help',
      title: '使用帮助',
      kind: 'links',
      items: items([
        ['工具访问帮助', '打不开海外工具时查看', '/learn/access'],
        ['新手引导', '重新体验第一次动手', '/?tour=1'],
      ]),
    },
    { id: 'practice', title: '提示词练习' },
    { id: 'library', title: '教程筛选与列表' },
  ],
  cases: [
    { id: 'header', nested: true, title: '页面标题' },
    {
      id: 'notes',
      title: '案例阅读说明',
      items: items([['阅读说明', '案例按典型任务整理，提示词可复制。请核对实际效果。']]),
    },
    { id: 'library', title: '案例筛选与列表' },
  ],
  knowledge: [
    { id: 'header', nested: true, title: '页面标题' },
    { id: 'content', title: '概念与学习路线' },
  ],
  beginner: [
    { id: 'header', nested: true, title: '页面标题' },
    { id: 'practice', title: '一对一练习' },
  ],
  news: [{ id: 'content', title: '资讯筛选、列表与侧栏' }],
  finder: [{ id: 'content', title: '场景选择与推荐结果' }],
  advanced: [{ id: 'content', title: '进阶内容与练习' }],
  saved: [{ id: 'content', title: '学习夹与最近浏览' }],
  school: [{ id: 'content', title: '学校首页与资源入口' }],
}
export function regionDefaults(moduleId: string): PageRegion[] {
  return (PAGE_REGIONS[moduleId] ?? []).map(({ id, title }) => ({
    id,
    title,
    description: '',
    kind: 'native',
    enabled: true,
  }))
}
export function mergedRegions(moduleId: string, configured: PageRegion[] = []): PageRegion[] {
  return [
    ...configured,
    ...regionDefaults(moduleId).filter(
      (item) => !configured.some((region) => region.id === item.id),
    ),
  ]
}
