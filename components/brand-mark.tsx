export function BrandMark() {
  return (
    <picture className="brand-identity">
      <source media="(min-width: 1280px)" srcSet="/brand/wordmark-v3.webp" />
      {/* picture 按屏幕只加载一个 Logo，首屏优先显示 */}
      <img
        src="/brand/sprout-mark-v3.webp"
        alt="AI 能力图谱"
        width={64}
        height={64}
        fetchPriority="high"
      />
    </picture>
  )
}
