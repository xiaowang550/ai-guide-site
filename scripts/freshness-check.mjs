/**
 * 数据保鲜门禁。
 *
 * 目标：让「内容过期」变成一个**会挡住发布**的问题，而不是靠自觉。
 * 超过各内容类型的 stale 阈值即判定超期，直接 exit 1，让 `npm run build` 失败。
 *
 * 之所以要有这道门禁：方案里明确写了「把内容会不会过时这件事，从依赖个人自觉，
 * 变成部门必须完成的固定动作」。工具可以帮你算，但不能替你更新；
 * 但它能保证「过期内容一定被看见」。
 *
 * 用法：
 *   node scripts/freshness-check.mjs                    # 只报告
 *   node scripts/freshness-check.mjs --strict            # 有超期就失败（build 里用这个）
 *   node scripts/freshness-check.mjs --report=github     # 输出 Markdown 报告，始终 exit 0
 *
 * `--report=github` 给 CI 用：内容过期不应该让自动任务直接失败，
 * 而应该变成一条「待办 Issue」。所以这个模式只报告不拦截，由 workflow 决定怎么提醒。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// 直接复用 lib/freshness.ts 的逻辑：这里用 vite 之外的方式加载比较麻烦，
// 所以改为从产物 out/ 读取静态页面的更新时间？不行 —— 更新时间是数据字段。
// 最简单可靠的做法：让 build 之后的检查脚本读取 data/*.ts 的 updatedAt 正则。
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const strict = process.argv.includes('--strict')
const reportMode = process.argv.includes('--report=github')

const THRESHOLDS = {
  tool: { label: '工具能力与价格', stale: 180, file: 'data/tools.ts' },
  guide: { label: '教程与提示词', stale: 210, files: ['data/guides.ts', 'data/prompts.ts'] },
  edu: {
    label: '课程与教案包',
    stale: 365,
    files: ['data/edu-programs.ts', 'data/edu-toolkits.ts', 'data/edu-schools.ts', 'data/edu-faq.ts'],
  },
  concept: { label: '概念与术语', stale: 730, files: ['data/concepts.ts', 'data/glossary.ts'] },
}

const DAY = 86_400_000
const now = Date.now()

function ageDays(iso) {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY
  return Math.max(0, Math.floor((now - t) / DAY))
}

function collectDates(relPath) {
  const text = readFileSync(join(projectRoot, relPath), 'utf8')
  const dates = [...text.matchAll(/\bupdatedAt:\s*'([0-9]{4}-[0-9]{2}-[0-9]{2})'/g)].map((m) => m[1])
  const validDates = [...text.matchAll(/\bdate:\s*'([0-9]{4}-[0-9]{2}-[0-9]{2})'/g)].map((m) => m[1])
  return [...dates, ...validDates]
}

let stale = 0
let checked = 0
const reportRows = []

console.log('=== 数据保鲜检查 ===')
console.log(`检查时间：${new Date().toISOString().slice(0, 10)}\n`)

for (const [kind, cfg] of Object.entries(THRESHOLDS)) {
  const files = cfg.files ?? [cfg.file]
  const dates = files.flatMap((f) => {
    try {
      return collectDates(f)
    } catch {
      return []
    }
  })
  if (dates.length === 0) {
    console.log(`  ?  ${cfg.label.padEnd(16)} 未读到更新时间字段，跳过`)
    reportRows.push({ label: cfg.label, count: 0, worst: 0, threshold: cfg.stale, over: 0, staleDates: [] })
    continue
  }
  const ages = dates.map(ageDays)
  const worst = Math.max(...ages)
  const staleDates = [...new Set(dates.filter((d) => ageDays(d) > cfg.stale))].sort()
  const over = dates.filter((d) => ageDays(d) > cfg.stale).length
  checked += dates.length
  stale += over

  const mark = over > 0 ? 'FAIL' : 'PASS'
  console.log(
    `  ${mark}  ${cfg.label.padEnd(16)} ${dates.length} 条 | 最旧 ${worst} 天 | 阈值 ${cfg.stale} 天 | 超期 ${over} 条`
  )
  if (over > 0) {
    // 列出超期的具体日期，方便定位
    const worstDates = dates.filter((d) => ageDays(d) > cfg.stale).slice(0, 6)
    worstDates.forEach((d) => console.log(`        超期条目日期：${d}（${ageDays(d)} 天前）`))
  }
  reportRows.push({
    label: cfg.label,
    count: dates.length,
    worst,
    threshold: cfg.stale,
    over,
    staleDates: staleDates.map((d) => ({ date: d, age: ageDays(d) })),
  })
}

console.log(`\n合计检查 ${checked} 条内容，其中超期 ${stale} 条。`)

if (reportMode) {
  // Markdown 报告：可直接作为 GitHub Issue 正文
  const today = new Date().toISOString().slice(0, 10)
  const lines = []
  lines.push(`## 数据保鲜检查 · ${today}`)
  lines.push('')
  lines.push(
    stale === 0
      ? `自动检查 ${checked} 条内容，全部在有效期内。`
      : `自动检查 ${checked} 条内容，其中 **${stale} 条已超过保鲜阈值**，需要人工核对。`
  )
  lines.push('')
  lines.push('| 内容类型 | 条数 | 最旧 | 阈值 | 超期 |')
  lines.push('|---|---|---|---|---|')
  for (const r of reportRows) {
    lines.push(
      `| ${r.label} | ${r.count} | ${r.worst} 天 | ${r.threshold} 天 | ${r.over > 0 ? `**${r.over}** |` : '0 |'}`
    )
  }
  if (stale > 0) {
    lines.push('')
    lines.push('### 需要处理的条目')
    for (const r of reportRows.filter((x) => x.over > 0)) {
      lines.push('')
      lines.push(`**${r.label}**（阈值 ${r.threshold} 天）`)
      for (const d of r.staleDates) {
        lines.push(`- \`${d.date}\` —— 已 ${d.age} 天未复核`)
      }
    }
    lines.push('')
    lines.push('### 处理方式')
    lines.push('1. 内容确实变了 → 更新 `data/` 对应条目的 `updatedAt`，同时修订内容')
    lines.push('2. 内容没变 → 只更新 `updatedAt`，并在 `/updates` 追加一条说明为什么复核后确认无需修改')
    lines.push('')
    lines.push('详见站内 `/freshness` 看板。')
  }
  lines.push('')
  lines.push('---')
  lines.push('<sub>由 GitHub Actions 定时任务自动生成，详见 `.github/workflows/freshness.yml`。</sub>')
  console.log('\n' + lines.join('\n'))
  // 报告模式永远成功：过期这件事由 Issue 承载，不该让自动任务变红
  process.exit(0)
}

if (stale > 0) {
  console.error('\n[保鲜门禁] 存在超期内容。')
  console.error('  处理方式二选一：')
  console.error('  1) 去 data/ 里更新对应条目（updatedAt + 必要的内容修订）')
  console.error('  2) 确实没变化 → 在该条目上更新 updatedAt 并在 /updates 追加一条说明')
  console.error('  详见 /freshness 看板与 README「数据规范」章节。')
  if (strict) {
    console.error('[保鲜门禁] --strict 模式：构建中止。')
    process.exit(1)
  }
} else {
  console.log('\n[保鲜门禁] 全部内容在有效期内。')
}