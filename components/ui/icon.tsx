import {
  BarChart3,
  Code2,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Network,
  PenLine,
  Presentation,
  Search,
  Video,
} from 'lucide-react'

/** 场景决策器图标名 -> 图标组件（与 data/scenarios.ts 的 icon 字段一一对应） */
const ICONS = {
  pen: PenLine,
  'file-text': FileText,
  presentation: Presentation,
  code: Code2,
  search: Search,
  image: ImageIcon,
  video: Video,
  'bar-chart': BarChart3,
  workflow: Network,
  'graduation-cap': GraduationCap,
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, className }: { name: string; className?: string }) {
  const Cmp = ICONS[name as IconName] ?? PenLine
  return <Cmp className={className} aria-hidden />
}