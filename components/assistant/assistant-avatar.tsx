export function AssistantAvatar({ thinking = false }: { thinking?: boolean }) {
  return (
    <svg
      width="44"
      height="44"
      viewBox="0 0 48 48"
      fill="none"
      className={thinking ? 'assistant-avatar is-thinking' : 'assistant-avatar'}
      aria-hidden="true"
    >
      <circle cx="24" cy="25" r="21" fill="#E2EFE7" />
      <path d="M24 17C16 17 12 12 13 6C21 6 25 10 24 17Z" fill="#83B499" />
      <path d="M24 17C23 9 29 5 36 5C37 12 31 17 24 17Z" fill="#416F5B" />
      <path d="M24 13V20" stroke="#416F5B" strokeWidth="2" strokeLinecap="round" />
      <rect x="10" y="18" width="28" height="22" rx="10" fill="#FFFDF7" />
      <g className="assistant-avatar-eyes" fill="#315446">
        <circle cx="18" cy="27" r="2" />
        <circle cx="30" cy="27" r="2" />
      </g>
      <path d="M21 32Q24 35 27 32" stroke="#416F5B" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="14" cy="31" r="2.5" fill="#E8BEAE" opacity=".6" />
      <circle cx="34" cy="31" r="2.5" fill="#E8BEAE" opacity=".6" />
    </svg>
  )
}
