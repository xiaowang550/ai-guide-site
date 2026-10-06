/**
 * 客户端包内容体检：检查 data/ 里的长文本有没有被打进浏览器端。
 * 背景：任何 'use client' 组件 import '@/data'（聚合出口）都会把整个数据图
 * 拖进客户端包，而且常常进入「所有页面都加载」的共享 chunk —— 等于全站为它付费。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'out')
const kb = (n) => `${(n / 1024).toFixed(1)} KB`

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

const js = walk(join(root, '_next', 'static', 'chunks')).filter((f) => f.endsWith('.js'))

// 从 data/ 里取几个足够独特的「长文本指纹」
const probes = [
  ['tools 弱项长句', '长对话后半段会压缩早期内容'],
  ['tools 强项长句', '能力覆盖最全'],
  ['cases 提示词原文', '你是有十年经验的'],
  ['concepts 比喻', '像一个读过很多书但记不清出处'],
  ['guides 大纲正文', '先别急'],
  ['scenarios 权重表说明', '场景权重最高的三个维度'],
]

console.log('=== 客户端 chunk 中的数据指纹 ===')
let polluted = 0
for (const file of js) {
  const content = readFileSync(file, 'utf8')
  const hits = probes.filter(([, needle]) => content.includes(needle)).map(([name]) => name)
  if (hits.length > 0) {
    polluted++
    console.log(
      `  ${relative(root, file).padEnd(48)} ${kb(gzipSync(content).length).padStart(9)}  ${hits.join('、')}`
    )
  }
}
if (polluted === 0) console.log('  （无）')

// 每个 chunk 被哪些页面引用
const pages = walk(root).filter((f) => f.endsWith('index.html') || f === join(root, '404.html'))
const refCount = new Map()
for (const page of pages) {
  const html = readFileSync(page, 'utf8')
  const refs = [...new Set([...html.matchAll(/(?:src|href)="(\/_next\/[^"]+\.js)"/g)].map((m) => m[1]))]
  for (const r of refs) {
    const abs = join(root, r.replace(/^\//, ''))
    if (!abs.endsWith('.js')) continue
    if (refCount.has(abs)) refCount.set(abs, refCount.get(abs) + 1)
    else refCount.set(abs, 1)
  }
}

const worstPolluted = js
  .map((f) => {
    const content = readFileSync(f, 'utf8')
    const hits = probes.filter(([, n]) => content.includes(n)).length
    return { f, hits, gz: gzipSync(content).length, pages: refCount.get(f) ?? 0 }
  })
  .filter((x) => x.hits > 0)
  .sort((a, b) => b.pages - a.pages)

if (worstPolluted.length > 0) {
  console.log('\n=== 含数据的 chunk 被多少页面引用 ===')
  worstPolluted.forEach((x) => {
    console.log(
      `  ${relative(root, x.f).padEnd(48)} ${kb(x.gz).padStart(9)}  被 ${x.pages} 个页面引用`
    )
  })
  console.log('\n判读：被多页引用 = 全站都在为这段数据付出下载成本，应改为服务端传精简 props。')

  /*
   * --strict 的判据（与上面那句判读保持一致）：
   *
   * 只有「**被多个页面引用**」才算真问题 —— 那种情况下全站每个访客都要
   * 为这段数据付一次下载成本。
   *
   * 只被 1 个页面引用的不算泄漏：像 /find、/tools 这种页面，
   * 决策器本来就需要在浏览器里算分，数据按页面加载是合理成本。
   * 被 0 个页面引用的通常是按需加载的 chunk（打开面板才下载），
   * 更不是问题。
   */
  const globalPolluted = worstPolluted.filter((x) => x.pages > 1)
  if (process.argv.includes('--strict')) {
    if (globalPolluted.length === 0) {
      console.log(
        `\n[客户端数据审计] --strict 通过：无被多页共享的数据 chunk` +
          (worstPolluted.length > 0
            ? `（另有 ${worstPolluted.length} 个按页面加载或按需加载的 chunk 包含数据，属预期成本）。`
            : '。')
      )
      process.exit(0)
    }
    console.error(
      `\n[客户端数据审计] ${globalPolluted.length} 个含 data/ 长文本的 chunk 被多个页面共享，CI 中止：`
    )
    for (const x of globalPolluted) {
      console.error(`  ${relative(root, x.f)} —— 被 ${x.pages} 个页面引用（${kb(x.gz)}）`)
    }
    console.error('  修法：把长文本移出客户端组件，改由服务端渲染或传精简 props。')
    process.exit(1)
  }
} else {
  console.log('\n结论：客户端包内没有任何 data/ 长文本，数据没有泄漏到浏览器端。')
  if (process.argv.includes('--strict')) {
    console.log('[客户端数据审计] --strict 通过：数据未泄漏到浏览器端。')
    process.exit(0)
  }
}