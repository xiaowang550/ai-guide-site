// 提取 Lighthouse 报告里的具体问题细节
import { readFileSync } from 'node:fs'

const r = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const a = r.audits ?? {}

function show(id, limit = 6) {
  const audit = a[id]
  if (!audit) {
    console.log(`\n[${id}] 无该审计项`)
    return
  }
  console.log(`\n===== ${id} :: ${audit.title} =====`)
  console.log(`score=${audit.score}  display=${audit.displayValue ?? '-'}`)
  const items = audit.details?.items ?? []
  if (items.length === 0) {
    console.log('  (无明细)')
  }
  for (const item of items.slice(0, limit)) {
    if (item.node) {
      console.log(`  - ${item.node.snippet ?? item.node.selector ?? ''}`)
      if (item.node.explanation) console.log(`      ${item.node.explanation}`)
    } else if (item.url) {
      console.log(`  - ${item.url}  ${item.totalBytes ?? ''}${item.wastedBytes ? '  浪费 ' + item.wastedBytes + 'B' : ''}`)
    } else {
      console.log(`  - ${JSON.stringify(item).slice(0, 260)}`)
    }
  }
}

show('largest-contentful-paint-element', 3)
show('errors-in-console', 6)
show('links-do-not-have-discernible-name', 8)
show('render-blocking-resources', 4)
show('lcp-lazy-loaded', 3)
show('uses-responsive-images', 3)