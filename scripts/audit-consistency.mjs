/**
 * 静态审计：找视觉不一致、硬编码数据、常见隐患。
 *
 * 这些不是"审美"问题，而是会在后续迭代里不断制造麻烦的一致性问题，
 * 所以用脚本固定下来，改坏了能被测出来。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = process.cwd()
const SRC_DIRS = ['app', 'components', 'lib', 'data']
const CODE_EXT = new Set(['.ts', '.tsx'])

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = SRC_DIRS.flatMap((d) => (readdirSync(d).length ? walk(join(ROOT, d)) : []))
const codeFiles = files.filter((f) => CODE_EXT.has(extname(f)))
const read = (f) => readFileSync(f, 'utf8')

const issues = { hardcodedCounts: [], radiusMix: [], badgePills: [], rawButtons: [], oldCardStyle: [] }

// ---- 1) 文案里硬编码的数量（数据一变就会说谎）----
const COUNT_WORDS = /(个工具|个概念|篇教程|个案例|所学校|套教案包|条内容|条术语)/g
for (const f of [...codeFiles, join(ROOT, 'README.md')]) {
  const text = read(f)
  const lines = text.split('\n')
  lines.forEach((line, i) => {
    // 跳过测试与脚本注释
    if (f.includes('__tests__') || f.includes('scripts')) return
    const matches = line.match(COUNT_WORDS)
    if (matches && /\d/.test(line)) {
      // 是否用了数据推导（例如 tools.length）
      const dynamic = /\.length|\$\{.*\}/.test(line)
      if (!dynamic) {
        issues.hardcodedCounts.push(`${relative(ROOT, f)}:${i + 1}  ${line.trim().slice(0, 90)}`)
      }
    }
  })
}

// ---- 2) 圆角混用：核心组件应统一走 CSS 变量定义的 --radius 体系 ----
for (const f of codeFiles) {
  const text = read(f)
  const radii = [...text.matchAll(/\brounded-(sm|md|lg|xl|2xl|3xl|\[\d+px\])\b/g)].map((m) => m[1])
  const counts = radii.reduce((acc, r) => ({ ...acc, [r]: (acc[r] || 0) + 1 }), {})
  const distinct = Object.keys(counts)
  // 允许 1-2 种（大卡用 20px、控件用 rounded 等），超过就说明在混用
  if (distinct.length >= 3) {
    issues.radiusMix.push(`${relative(ROOT, f)}  ${JSON.stringify(counts)}`)
  }
}

// ---- 3) 旧的描边卡片写法是否还有残留 ----
for (const f of codeFiles) {
  const text = read(f)
  const legacy = text.match(/rounded-xl border bg-card p-\d/g)
  if (legacy && legacy.length > 0) {
    issues.oldCardStyle.push(`${relative(ROOT, f)}  ×${legacy.length}`)
  }
}

// ---- 4) 直接用 <button> 而不是 Button 组件的地方（应为交互态例外）----
const BUTTON_OK = /aria-label|role="switch"|type="submit"|onClick.*set(Open|Show|Index|Active|Step)|封/ // 允许：开关、提交、纯状态切换
for (const f of codeFiles) {
  const text = read(f)
  const raw = [...text.matchAll(/<button\b/g)].length
  if (raw > 0 && !f.includes('ui/button')) {
    const usesComponent = /from '@\/components\/ui\/button'/.test(text)
    if (!usesComponent) {
      issues.rawButtons.push(`${relative(ROOT, f)}  <button>×${raw}（未引 Button）`)
    }
  }
}

function report(title, list, limit = 12) {
  console.log(`\n=== ${title}（${list.length}）===`)
  if (list.length === 0) {
    console.log('  无')
    return
  }
  list.slice(0, limit).forEach((x) => console.log('  ' + x))
  if (list.length > limit) console.log(`  …… 另有 ${list.length - limit} 条`)
}

console.log(`审计范围：${codeFiles.length} 个代码文件 + README`)
report('文案里硬编码的数量（数据变后会失真）', issues.hardcodedCounts, 10)
report('圆角混用（同一文件出现 3 种以上）', issues.radiusMix, 8)
report('旧描边卡片写法残留', issues.oldCardStyle, 8)
report('直接用 <button> 未引 UI 组件', issues.rawButtons, 8)