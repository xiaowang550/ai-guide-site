/**
 * 解析 Lighthouse 报告：四项分数 + 核心指标 + 该修的问题。
 * 用法：node scripts/read-lighthouse.mjs lh-home.json [lh-tools.json ...]
 */
import { readFileSync } from 'node:fs'

const files = process.argv.slice(2)
if (files.length === 0) {
  console.error('用法：node scripts/read-lighthouse.mjs <report.json> [...]')
  process.exit(1)
}

const SCORE = (v) => Math.round((v ?? 0) * 100)

for (const file of files) {
  let r
  try {
    r = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    console.error(`无法读取 ${file}`)
    continue
  }

  const c = r.categories ?? {}
  const a = r.audits ?? {}

  console.log(`\n================ ${r.finalDisplayedUrl ?? file} ================`)
  console.log(
    `性能 ${SCORE(c.performance?.score)}   无障碍 ${SCORE(c.accessibility?.score)}   ` +
      `最佳实践 ${SCORE(c['best-practices']?.score)}   SEO ${SCORE(c.seo?.score)}`
  )

  const metric = (key, label, unit) => {
    const audit = a[key]
    if (!audit) return
    const v = audit.displayValue ?? audit.numericValue
    console.log(`  ${label.padEnd(14)} ${String(v).padStart(10)}${unit ? ' ' + unit : ''}   (score ${audit.score ?? '-'})`)
  }
  console.log('\n--- 核心指标 ---')
  metric('first-contentful-paint', 'FCP 首屏内容')
  metric('largest-contentful-paint', 'LCP 最大内容')
  metric('total-blocking-time', 'TBT 总阻塞', 'ms')
  metric('cumulative-layout-shift', 'CLS 布局抖动')
  metric('speed-index', 'SI 视觉完成')

  // 需要修的问题：score < 1 且有诊断信息
  const problems = Object.values(a).filter(
    (x) =>
      x && typeof x.score === 'number' && x.score < 1 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'notApplicable'
  )

  const perf = problems.filter((x) => ['error', 'warning'].includes(x.scoreDisplayMode) && /metric|numeric/.test(x.id))
  const real = problems.filter((x) => !perf.includes(x))

  if (perf.length > 0) {
    console.log('\n--- 未达标的指标 ---')
    perf.forEach((p) => console.log(`  ${p.id.padEnd(38)} ${p.displayValue ?? p.score}`))
  }

  console.log('\n--- 可修的问题（前 12 条） ---')
  real
    .filter((x) => x.score !== null)
    .slice(0, 12)
    .forEach((x) => {
      const title = x.title ?? x.id
      const save = x.details?.overallSavingsMs ?? x.details?.overallSavingsBytes ?? null
      const extra = save ? `  ≈ 省 ${Math.round(save)}${x.details?.overallSavingsBytes ? 'B' : 'ms'}` : ''
      console.log(`  [${x.score}] ${title}${extra}`)
    })
}