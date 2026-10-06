import { readFileSync } from 'node:fs'

const rows = []
for (const f of process.argv.slice(2)) {
  const r = JSON.parse(readFileSync(f, 'utf8'))
  const a = r.audits
  rows.push({
    file: f.replace('lh-', '').replace('.json', ''),
    perf: Math.round(r.categories.performance.score * 100),
    a11y: Math.round(r.categories.accessibility.score * 100),
    bp: Math.round(r.categories['best-practices'].score * 100),
    seo: Math.round(r.categories.seo.score * 100),
    lcp: Math.round(a['largest-contentful-paint'].numericValue / 100) / 10,
    tbt: Math.round(a['total-blocking-time'].numericValue),
    cls: a['cumulative-layout-shift'].numericValue,
  })
}

console.log('page'.padEnd(12) + 'perf a11y bp  seo  LCP    TBT      CLS')
for (const r of rows) {
  console.log(
    r.file.padEnd(12) +
      String(r.perf).padStart(3) + '  ' +
      String(r.a11y).padStart(3) + '  ' +
      String(r.bp).padStart(2) + '  ' +
      String(r.seo).padStart(3) + '  ' +
      String(r.lcp).padStart(4) + 's ' +
      String(r.tbt).padStart(5) + 'ms  ' +
      String(r.cls)
  )
}