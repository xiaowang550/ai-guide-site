export type MascotState =
  'welcome' | 'flying' | 'reading' | 'guiding' | 'confused' | 'working' | 'success' | 'resting'
export const MASCOT_STATES: Record<MascotState, { image: string; label: string }> = {
  welcome: { image: '/assistant/xiaoya-welcome-v1.webp', label: '小芽向你打招呼' },
  flying: { image: '/assistant/xiaoya-flying-v1.webp', label: '小芽正在帮你查找' },
  reading: { image: '/assistant/xiaoya-reading-v1.webp', label: '小芽陪你学习' },
  guiding: { image: '/assistant/xiaoya-guiding-v1.webp', label: '小芽有个小提示' },
  confused: { image: '/assistant/xiaoya-confused-v1.webp', label: '小芽需要再确认一下' },
  working: { image: '/assistant/xiaoya-working-v1.webp', label: '小芽正在整理回答' },
  success: { image: '/assistant/xiaoya-success-v1.webp', label: '小芽为你完成这一步而高兴' },
  resting: { image: '/assistant/xiaoya-resting-v1.webp', label: '小芽安静地等你' },
}
export function mascotState(context: {
  error?: boolean
  busy?: boolean
  searching?: boolean
  success?: boolean
  greeting?: boolean
  hint?: boolean
  dragging?: boolean
  reading?: boolean
  resting?: boolean
}): MascotState {
  if (context.busy) return context.searching ? 'flying' : 'working'
  if (context.error) return 'confused'
  if (context.success) return 'success'
  if (context.dragging || context.searching) return 'flying'
  if (context.greeting) return 'welcome'
  if (context.hint) return 'guiding'
  if (context.resting) return 'resting'
  return context.reading ? 'reading' : 'welcome'
}
