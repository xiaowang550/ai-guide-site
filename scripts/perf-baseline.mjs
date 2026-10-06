/**
 * 保存当前性能基线，供后续改动对比。
 * 用法：node scripts/perf-baseline.mjs            # 打印当前数据
 *      node scripts/perf-baseline.mjs --save     # 写入 perf-baseline.json
 *      node scripts/perf-baseline.mjs --check    # 与基线对比，超过阈值则 exit 1
 *
 * 采集内容（只看真实首屏：排除 noModule 的 polyfills，现代浏览器不会下载它）
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(projectRoot, 'out')
const baselinePath = join(projectRoot, 'perf-baseline.json')

const PAGES = [
  ['/', '首页'],
  ['/tools/', '工具库'],
  ['/tools/claude/', '工具详情'],
  ['/find/', '场景决策器'],
  ['/learn/', '知识库'],
  ['/cases/', '案例库'],
  ['/edu/', 'AI 教育服务'],
  ['/compare/', '工具对比'],
]

function gzFile(file) {
  const buf = readFileSync(file)
  return /\.(js|css|html|svg)$/.test(file) ? gzipSync(buf).length : buf.length
}

/** HTML 里的资源路径是 URL 编码的（[slug] -> %5Bslug%5D），取文件前必须解码 */
function resolveAsset(ref) {
  const clean = ref.replace(/^\//, '').split('?')[0]
  const decoded = decodeURIComponent(clean)
  return join(outDir, decoded)
}

function measure(route) {
  const html = readFileSync(join(outDir, route, 'index.html'), 'utf8')
  const tags = [...html.matchAll(/<(script|link)[^>]*>/g)].map((m) => m[0])
  let htmlGz = gzipSync(html, 'utf8').length
  let app = 0
  let framework = 0
  let skipped = 0
  for (const tag of tags) {
    const ref = tag.match(/(?:src|href)="(\/_next\/[^"]+)"/)?.[1]
    if (!ref) continue
    const size = gzFile(resolveAsset(ref))
    if (/noModule/i.test(tag)) {
      skipped += size
      continue
    }
    if (/\/app\//.test(ref)) app += size
    else framework += size
  }
  return { html: htmlGz, app, framework, total: htmlGz + app + framework, skippedNoModule: skipped }
}

const current = {}
for (const [route, label] of PAGES) current[route] = { label, ...measure(route) }

const kb = (n) => `${(n / 1024).toFixed(1)} KB`
console.log('=== 性能基线（gzip，真实首屏，不含 noModule polyfills） ===')
let worst = 0
for (const [route, m] of Object.entries(current)) {
  worst = Math.max(worst, m.total)
  console.log(
    `${m.label.padEnd(14)} ${kb(m.total).padStart(9)}  = HTML ${kb(m.html).padStart(8)} + 框架 ${kb(m.framework).padStart(8)} + 本页 ${kb(m.app).padStart(8)}`
  )
}
console.log(`最重页面 ${kb(worst)}`)

const args = process.argv.slice(2)

if (args.includes('--save')) {
  writeFileSync(baselinePath, JSON.stringify({ at: new Date().toISOString(), pages: current }, null, 2), 'utf8')
  console.log('\n已写入 perf-baseline.json')
} else if (args.includes('--check')) {
  if (!existsSync(baselinePath)) {
    console.log('\n没有基线文件，跳过对比（先跑一次 --save）')
    process.exit(0)
  }
  const base = JSON.parse(readFileSync(baselinePath, 'utf8')).pages
  const TOLERANCE = 1.05 // 允许 5% 波动
  let regressed = false
  console.log('\n=== 与基线对比 ===')
  for (const [route, m] of Object.entries(current)) {
    const b = base[route]
    if (!b) continue
    const delta = m.total / b.total
    const mark = delta > TOLERANCE ? 'REGRESS' : 'ok'
    if (delta > TOLERANCE) regressed = true
    console.log(`${m.label.padEnd(14)} ${kb(b.total)} -> ${kb(m.total)}  ${delta >= 1 ? '+' : ''}${((delta - 1) * 100).toFixed(1)}%  ${mark}`)
  }
  if (regressed) {
    console.error('\n体积超出基线 5%，请检查是否有数据被打进客户端包（node scripts/audit-client-data.mjs）')
    process.exit(1)
  }
}