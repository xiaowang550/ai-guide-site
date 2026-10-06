// 精确找出「描述数据规模」但写死的文案（数据一变就会说谎）
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, extname } from 'node:path'

const ROOT = process.cwd()
// --strict：CI 里发现问题就失败。本地默认只报告，避免打断日常写作
const STRICT = process.argv.includes('--strict')
const dirs = ['app', 'components', 'lib', 'data', 'docs']

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

// 这些规模是可变的（来自 data/），写死就会失真
const RISKY = [
  { re: /(\d+)\s*个工具/g, what: '工具数' },
  { re: /(\d+)\s*个概念/g, what: '概念数' },
  { re: /(\d+)\s*篇(?:教程|方法课|场景课)/g, what: '教程数' },
  { re: /(\d+)\s*个案例/g, what: '案例数' },
  { re: /(\d+)\s*所学校/g, what: '学校数' },
  { re: /(\d+)\s*套(?:教案包|材料)/g, what: '教案包数' },
  { re: /(\d+)\s*条(?:术语|问答|简报|内容)/g, what: '条目数' },
  { re: /(\d+)\s*个?场景/g, what: '场景数' },
]


/**
 * 显式豁免：这些位置出现规模数字是**正确的**，不能改成推导值。
 *
 * 原因要写清楚，否则过半年没人知道为什么放过。
 */
const ALLOW = [
  {
    file: 'data/updates.ts',
    // 更新日志记录的是「当时改了什么」，18 个工具、6 个工具都是那一次改动的
    // 客观事实。改成 tools.length 会让日志变成「永远写 22 个」，等于篡改历史。
    reason: '更新日志是历史记录，数字描述的是当时的状态',
  },
]

const rows = []
for (const d of dirs) {
  for (const f of walk(join(ROOT, d))) {
    if (!['.ts', '.tsx', '.md', '.mjs'].includes(extname(f))) continue
    if (f.includes('__tests__')) continue
    const text = readFileSync(f, 'utf8')
    text.split('\n').forEach((line, i) => {
      for (const r of RISKY) {
        const m = line.match(r.re)
        if (!m) continue
        // 同句里若已用数据推导（如 tools.length）则跳过
        const usesData = /\.length|\$\{[^}]*\}/.test(line)
        if (usesData) continue
        // 显式豁免：历史记录里的规模数字是客观事实，不能推导
        const rel = relative(ROOT, f)
        // Windows 上 relative() 用反斜杠，统一成 / 再比，否则豁免永远不生效
        const relNorm = rel.replace(/\\/g, '/')
        if (ALLOW.some((a) => relNorm === a.file || relNorm.endsWith('/' + a.file))) continue
        rows.push({
          file: relative(ROOT, f),
          line: i + 1,
          what: r.what,
          text: line.trim().slice(0, 100),
        })
      }
    })
  }
}

console.log('=== 写死的「数据规模」文案（应改为从 data/ 推导）===')
if (!rows.length) console.log('  无')
const grouped = {}
for (const r of rows) (grouped[r.file] ||= []).push(r)
for (const [file, list] of Object.entries(grouped)) {
  console.log(`\n${file}`)
  list.forEach((r) => console.log(`  L${r.line} [${r.what}] ${r.text}`))
}
console.log(`\n合计 ${rows.length} 处`)

if (rows.length > 0 && STRICT) {
  console.error(`\n[硬编码审计] 发现 ${rows.length} 处写死的规模数字。`)
  console.error('  这些数字会随数据变化而失真，请改为从 data/ 推导（如 tools.length）。')
  process.exit(1)
}
if (rows.length === 0 && STRICT) console.log('[硬编码审计] --strict 通过：无写死的规模数字。')