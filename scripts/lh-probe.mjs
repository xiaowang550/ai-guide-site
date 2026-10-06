// 针对具体问题的明细排查
import { readFileSync } from 'node:fs'

const file = process.argv[2] ?? 'lh-tools.json'
const r = JSON.parse(readFileSync(file, 'utf8'))
const a = r.audits ?? {}

const targets = process.argv.slice(3)
const ids = targets.length
  ? targets
  : [
      'heading-order',
      'uses-long-cache-ttl',
      'cache-insight',
      'forced-reflow',
      'legacy-javascript',
      'render-blocking-insight',
      'largest-contentful-paint-element',
      'network-dependency-tree-insight',
    ]

for (const id of ids) {
  const audit = a[id]
  if (!audit) {
    console.log(`\n[${id}] 不存在`)
    continue
  }
  console.log(`\n===== ${id} :: ${audit.title} ===== score=${audit.score} ${audit.displayValue ?? ''}`)
  const items = audit.details?.items ?? []
  if (!items.length) {
    console.log('  (无明细)')
    continue
  }
  for (const it of items.slice(0, 6)) {
    if (it.node) {
      console.log(`  - ${it.node.snippet ?? it.node.selector ?? ''}`)
      if (it.node.nodeLabel) console.log(`      label: ${it.node.nodeLabel}`)
    } else if (it.url) {
      console.log(`  - ${it.url.slice(-70)}  ttl=${it.cacheLifetimeMs ?? it.ttl ?? '?'}  size=${it.totalBytes ?? ''}`)
    } else if (it.source) {
      console.log(`  - source: ${it.source}  ${(it.description ?? '').slice(0, 120)}`)
    } else {
      console.log(`  - ${JSON.stringify(it).slice(0, 300)}`)
    }
  }
  // requestDetails 常见于 cache / legacy 类
  if (audit.details?.requestHeaders || audit.details?.responseHeaders) {
    console.log('  (含请求/响应头明细)')
  }
}