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
      {/* eslint-disable-next-line @next/next/no-img-element -- Original SVG companion, shared with the interactive scene. */}
      <img
        src="/brand/xian/companion.svg"
        width="256"
        height="256"
        alt=""
        draggable={false}
        decoding="async"
      />
    </span>
  )
}
