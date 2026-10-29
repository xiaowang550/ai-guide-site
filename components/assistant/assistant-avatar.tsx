import { type MascotState } from '@/lib/assistant-mascot'
export function AssistantAvatar({
  thinking = false,
  full = false,
  state = 'welcome',
}: {
  thinking?: boolean
  full?: boolean
  state?: MascotState
}) {
  return (
    <span
      aria-hidden="true"
      data-state={thinking ? 'working' : state}
      className={[
        'assistant-avatar',
        full ? 'assistant-avatar-full' : 'assistant-avatar-portrait',
        thinking ? 'is-thinking' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 小型透明 WebP，静态导出直接加载站内素材 */}
      <img
        src="/brand/xian/mark.svg"
        width="256"
        height="256"
        alt=""
        draggable={false}
        decoding="async"
      />
    </span>
  )
}
