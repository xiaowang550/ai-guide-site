import type { CapabilityKey, ToolCategory } from '@/data/types'

/** 首页「决策器能回答什么」清单：纯展示文案，不含具体工具名 */
export const PRIMARY_ENTRY: { label: string; desc: string; href: string }[] = [
  { label: '把一段话改得更像人写的', desc: '写作能力 + 中文语感 + 是否要长版本', href: '/find?s=write' },
  { label: '读完一份 300 页的 PDF 并出摘要', desc: '长文理解 + 文件处理 + 溯源要求', href: '/find?s=read-long-doc' },
  { label: '这周该用什么工具做 PPT', desc: '办公产出 + 成品文件能力', href: '/find?s=make-office' },
  { label: '这份数据怎么分析、公式怎么写', desc: '数据分析 + 表格交付能力', href: '/find?s=data' },
]

/** 一级导航里被强调的三个入口顺序（首页三卡片用） */
export const HIGHLIGHT_ENTRIES: { href: string; label: string; question: string }[] = [
  { href: '/learn', label: '知识库', question: 'AI 是什么' },
  { href: '/guides', label: '教程', question: 'AI 怎么用' },
  { href: '/tools', label: '工具库', question: '哪个更强' },
]

/** 工具库筛选器的默认排序说明（展示用） */
export const SORT_HINTS: { value: string; label: string }[] = [
  { value: 'overall', label: '综合分（默认加权口径）' },
  { value: 'updated', label: '最近更新（数据越新越可信）' },
  { value: 'chinese', label: '中文能力' },
]

export const CATEGORY_ORDER: ToolCategory[] = [
  'chat',
  'coding',
  'office',
  'research',
  'agent',
  'image',
  'video',
  'audio',
  'data',
  'open-source',
]

export const DEFAULT_CAPABILITY_ORDER: CapabilityKey[] = [
  'writing',
  'longform',
  'reasoning',
  'coding',
  'research',
  'agent',
  'data',
  'office',
]