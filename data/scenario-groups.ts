import type { ScenarioGroupId } from '@/data/types'

/**
 * 场景分组。
 *
 * 为什么分组：第 1 步原来把所有场景平铺成一张网格。数量少时还能扫，
 * 再加就变成一堵墙，而用户其实只在四类任务里挑东西：
 * 写东西的、做多媒体的、搞技术的、学东西的。
 * 分组后每组有标题和一句说明，选的时候有参照，而不是逐个读卡片。
 *
 * 这个字段只影响界面摆法，不参与任何计算 —— 权重仍然只由场景本身决定。
 */
export interface ScenarioGroup {
  id: ScenarioGroupId
  label: string
  hint: string
}

export const SCENARIO_GROUPS: ScenarioGroup[] = [
  {
    id: 'writing',
    label: '写作与内容',
    hint: '产出文字。瓶颈通常在结构与取材，不在模型懂多少',
  },
  {
    id: 'visual',
    label: '设计与多媒体',
    hint: '产出图、视频、成品文件。这几类对能力是硬门槛，权重弥补不了',
  },
  {
    id: 'technical',
    label: '技术与数据',
    hint: '写代码、跑流程、算数看数据。需要可执行、可验证，不只是能聊',
  },
  {
    id: 'learning',
    label: '学习与教学',
    hint: '讲懂一个概念、备一节课。看重能不能按你的水平调整讲法',
  },
]

/** 分组标题里的图标（用 emoji 之外的字符，避免字体差异） */
export const GROUP_LABEL: Record<ScenarioGroupId, string> = SCENARIO_GROUPS.reduce(
  (acc, g) => ({ ...acc, [g.id]: g.label }),
  {} as Record<ScenarioGroupId, string>
)

export function groupOf(id: ScenarioGroupId): ScenarioGroup {
  return SCENARIO_GROUPS.find((g) => g.id === id) ?? SCENARIO_GROUPS[0]
}
