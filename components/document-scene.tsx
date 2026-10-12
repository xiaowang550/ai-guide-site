/** 可缩放的文档场景图，呼应案例中的材料整理、通知和数据任务。 */
export function DocumentScene() {
  return (
    <div className="reference-art case-hero-art" aria-hidden="true">
      <svg viewBox="0 0 520 280" fill="none">
        <defs>
          <linearGradient
            id="case-sheet"
            x1="100"
            y1="0"
            x2="250"
            y2="260"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#abcdbc" />
            <stop offset="1" stopColor="#e0f0e4" />
          </linearGradient>
        </defs>
        <ellipse
          cx="275"
          cy="159"
          rx="225"
          ry="65"
          stroke="#d9eddf"
          strokeWidth="10"
          transform="rotate(-15 275 159)"
        />
        <g transform="rotate(8 290 115)">
          <rect x="205" y="28" width="173" height="170" rx="23" fill="url(#case-sheet)" />
          <rect x="228" y="53" width="116" height="12" rx="6" fill="white" />
          <rect x="228" y="82" width="90" height="10" rx="5" fill="white" opacity=".8" />
          <rect x="228" y="108" width="103" height="10" rx="5" fill="white" opacity=".6" />
        </g>
        <g transform="rotate(-10 130 80)">
          <rect x="86" y="31" width="107" height="130" rx="18" fill="white" />
          <path
            d="M108 58h60M108 82h43M108 105h52"
            stroke="#d1e7da"
            strokeWidth="10"
            strokeLinecap="round"
          />
        </g>
        <g transform="rotate(9 420 89)">
          <rect x="386" y="38" width="98" height="108" rx="17" fill="white" />
          <path
            d="M410 113V91m21 22V79m21 34V65"
            stroke="#75b598"
            strokeWidth="9"
            strokeLinecap="round"
          />
        </g>
        <g transform="rotate(-4 215 210)">
          <rect x="163" y="135" width="112" height="123" rx="19" fill="#fffcf2" />
          <path
            d="M188 159h43m-43 25h61m-61 25h49"
            stroke="#eee5ca"
            strokeWidth="11"
            strokeLinecap="round"
          />
        </g>
        <g transform="rotate(7 380 210)">
          <rect x="313" y="160" width="151" height="99" rx="20" fill="white" />
          <path d="m388 180 7 17 18 2-13 13 3 18-15-9-16 9 3-18-13-13 19-2 7-17Z" fill="#74b597" />
        </g>
        <path
          d="M479 17c0 14-6 22-18 26 12 4 18 12 18 26 4-14 11-22 23-26-12-4-19-12-23-26Z"
          fill="#a4cdb5"
        />
        <rect
          x="14"
          y="132"
          width="90"
          height="57"
          rx="16"
          fill="#a4cdb5"
          transform="rotate(-9 14 132)"
        />
        <path d="M34 147h49m-49 17h36" stroke="white" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  )
}
