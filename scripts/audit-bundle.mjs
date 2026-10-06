/**
 * 静态资源预算体检（不依赖 Chrome，结果确定可复现）。
 *
 * 关注四件事：
 * 1. 单页首屏要下载多少（HTML + CSS + JS，gzip 后）—— 直接对应 LCP 与 TTI
 * 2. 站点总体积（决定部署与首访成本）
 * 3. 是否存在超大单文件（通常意味着某个页面把整个 data/ 打进客户端包）
 * 4. 图片资源是否都是小图标（SVG）
 *
 * 用法：node scripts/audit-bundle.mjs
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, extname, relative } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'out')
const kb = (n) => `${(n / 1024).toFixed(1)} KB`

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const files = walk(root)
const byExt = new Map()
let total = 0
let totalGzip = 0

for (const f of files) {
  const size = statSync(f).size
  total += size
  const ext = extname(f) || '(none)'
  const gz = f.endsWith('.html') || f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.svg') ? gzipSync(readFileSync(f)).length : size
  totalGzip += gz
  const bucket = byExt.get(ext) ?? { n: 0, raw: 0, gz: 0 }
  bucket.n += 1
  bucket.raw += size
  bucket.gz += gz
  byExt.set(ext, bucket)
}

console.log('=== 站点总体积 ===')
console.log(`文件数        ${files.length}`)
console.log(`原始体积      ${kb(total)}`)
console.log(`gzip 后估算   ${kb(totalGzip)}`)

console.log('\n=== 按类型（gzip 后） ===')
;[...byExt.entries()]
  .sort((a, b) => b[1].gz - a[1].gz)
  .forEach(([ext, b]) => console.log(`${ext.padEnd(8)} ${String(b.n).padStart(4)} 个   ${kb(b.gz).padStart(10)}`))

// ---------- 单页首屏预算 ----------
const sharedChunks = files.filter((f) => f.includes(`${'static'}`) && (f.endsWith('.js') || f.endsWith('.css')))
const sharedGzip = sharedChunks.reduce((s, f) => s + gzipSync(readFileSync(f)).length, 0)

const PAGES = [
  ['/', '首页'],
  ['/tools/', '工具库'],
  ['/tools/claude/', '工具详情'],
  ['/find/', '场景决策器'],
  ['/learn/', '知识库'],
  ['/guides/', '教程列表'],
  ['/cases/', '案例库'],
  ['/edu/', 'AI 教育服务'],
  ['/edu/programs/', '课程体系'],
  ['/compare/', '工具对比'],
]

console.log('\n=== 单页首屏预算（HTML + 全站 CSS/JS，gzip） ===')
const rows = PAGES.map(([route, label]) => {
  const file = join(root, route, 'index.html')
  const html = readFileSync(file)
  const htmlGz = gzipSync(html).length
  const totalGz = htmlGz + sharedGzip
  return { route, label, html: htmlGz, total: totalGz }
})
rows.sort((a, b) => b.total - a.total)
for (const r of rows) {
  const bar = '█'.repeat(Math.max(1, Math.round(r.total / 4000)))
  console.log(
    `${r.label.padEnd(12)} ${kb(r.total).padStart(10)}  (HTML ${kb(r.html).padStart(9)})  ${bar}`
  )
}
const worst = rows[0]
const median = rows[Math.floor(rows.length / 2)]

// ---------- 超大单文件预警 ----------
console.log('\n=== 最大的 8 个文件 ===')
files
  .map((f) => ({ f: relative(root, f), size: statSync(f).size }))
  .sort((a, b) => b.size - a.size)
  .slice(0, 8)
  .forEach((x) => console.log(`${kb(x.size).padStart(10)}  ${x.f}`))

// ---------- 判定 ----------
const BUDGET = 240 * 1024 // 首屏 240KB gzip 视为合格（保守）
console.log('\n=== 判定 ===')
const ok = (label, pass, detail) => console.log(`${pass ? 'PASS' : 'WARN'}  ${label} — ${detail}`)
ok('首屏最重页面', worst.total <= BUDGET, `${worst.label} ${kb(worst.total)}（预算 ${kb(BUDGET)}）`)
ok('首屏中位数', median.total <= BUDGET * 0.8, `${median.label} ${kb(median.total)}`)
const bigJs = files.filter((f) => f.endsWith('.js') && statSync(f).size > 300 * 1024)
ok('无超大 JS 单文件', bigJs.length === 0, bigJs.length === 0 ? '最大 JS 均小于 300KB' : `${bigJs.length} 个文件超过 300KB`)
const bigImg = files.filter((f) => /\.(png|jpe?g|webp|gif)$/i.test(f) && statSync(f).size > 50 * 1024)
ok('无大位图', bigImg.length === 0, bigImg.length === 0 ? '图片资源均为小体积 SVG' : `${bigImg.length} 个位图超过 50KB`)