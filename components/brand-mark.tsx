export function BrandMark({ wordmark = false }: { wordmark?: boolean }) {
  return wordmark ? (
    <span className="brand-wordmark">
      {/* eslint-disable-next-line @next/next/no-img-element -- 已压缩字标，仅可见时加载，移动端不下载隐藏字标 */}
      <img
        src="/brand/wordmark-v3.webp"
        alt="AI 能力图谱"
        width={870}
        height={290}
        loading="lazy"
      />
    </span>
  ) : (
    /* eslint-disable-next-line @next/next/no-img-element -- 小型站内 WebP，静态导出直接加载 */
    <img
      src="/brand/sprout-mark-v3.webp"
      alt=""
      width={64}
      height={64}
      loading="lazy"
      className="brand-symbol"
    />
  )
}
