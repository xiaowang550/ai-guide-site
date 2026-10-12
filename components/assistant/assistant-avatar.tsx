export function AssistantAvatar({
  thinking = false,
  full = false,
}: {
  thinking?: boolean
  full?: boolean
}) {
  return (
    <span
      aria-hidden="true"
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
        src="/assistant/sprout-companion-v2.webp"
        width="256"
        height="256"
        alt=""
        draggable={false}
        decoding="async"
      />
    </span>
  )
}
