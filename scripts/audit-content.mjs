/**
 * 内容体检 v2：按真实文件格式解析。
 *
 * 目的是找出真正的薄弱环节，而不是凭感觉加内容 ——
 * 加内容不难，难的是加对地方。
 */
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(p, 'utf8')

/** 抓形如 `key:\n  'value'` 或 `key: 'value'` 的单行/换行字符串字段 */
function field(src, key, from = 0) {
  const re = new RegExp(`\\b${key}:\\s*\\n?\\s*'([^']*)'`, 'g')
  re.lastIndex = from
  const m = re.exec(src)
  return m ? { value: m[1], end: re.lastIndex } : null
}

/** 按顶层 `  {` 切分条目 */
function entries(src) {
  const out = []
  let depth = 0
  let start = -1
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (c === '{') {
      if (depth === 0) start = i
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0 && start >= 0) {
        out.push(src.slice(start, i + 1))
        start = -1
      }
    }
  }
  return out
}

// ---------- 1. 概念厚度 ----------
{
  console.log('=== 概念内容厚度 ===')
  const src = read('data/concepts.ts')
  const items = entries(src).filter((s) => /\bid:\s*'[a-z0-9-]+'/.test(s))
  const rows = []
  for (const it of items) {
    const id = it.match(/\bid:\s*'([a-z0-9-]+)'/)?.[1] ?? '?'
    const def = field(it, 'definition')?.value ?? ''
    const why = field(it, 'whyItMatters')?.value ?? ''
    const ana = field(it, 'analogy')?.value ?? ''
    const ex = field(it, 'example')?.value ?? ''
    const mis = (it.match(/misconceptions:\s*\[([\s\S]*?)\]/) || [])[1] || ''
    const misCount = (mis.match(/误解/g) || []).length
    rows.push({ id, def: def.length, why: why.length, ana: ana.length, ex: ex.length, mis: misCount })
  }
  const thin = rows.filter((r) => r.def < 25 || r.ana < 18 || r.ex < 28 || r.mis < 3)
  const avg = (k) => (rows.length ? Math.round(rows.reduce((n, r) => n + r[k], 0) / rows.length) : 0)
  console.log(`  共 ${rows.length} 个概念，偏薄 ${thin.length} 个`)
  for (const r of thin) {
    console.log(`    ${r.id.padEnd(20)} 定义${String(r.def).padStart(3)} 比喻${String(r.ana).padStart(3)} 例子${String(r.ex).padStart(3)} 重要性${String(r.why).padStart(3)} 误解${r.mis}条`)
  }
  console.log(`  平均：定义${avg('def')} 比喻${avg('ana')} 例子${avg('ex')} 重要性${avg('why')} 误解${avg('mis')}条`)
}

// ---------- 2. 工具：各维度强弱分布 ----------
{
  console.log('\n=== 14 个维度的强度分布 ===')
  const src = read('data/tools.ts')
  const dims = ['writing','longform','reasoning','math','coding','research','agent','data','office','imageGen','vision','video','voice','realtime']
  const per = Object.fromEntries(dims.map((d) => [d, []]))
  // 逐工具条目解析 capabilities
  for (const it of entries(src).filter((s) => /\bid:\s*'[a-z0-9-]+'/.test(s) && s.includes('capabilities:'))) {
    const capStart = it.indexOf('capabilities:')
    const capEnd = it.indexOf('alternatives:') > -1 ? it.indexOf('alternatives:') : it.length
    const capSeg = it.slice(capStart, capEnd)
    for (const d of dims) {
      const m = capSeg.match(new RegExp(`${d}:\\s*\\{[\\s\\S]*?score:\\s*([0-5])`))
      if (m) per[d].push(Number(m[1]))
    }
  }
  const noStrong = []
  for (const d of dims) {
    const a = per[d]
    if (!a.length) { console.log(`  ${d.padEnd(10)} 无数据`); continue }
    const strong = a.filter((s) => s >= 4).length
    const max = Math.max(...a)
    console.log(`  ${d.padEnd(10)} n=${String(a.length).padStart(2)} 最高${max} ≥4分工具${strong} 分值分布 ${a.slice().sort((x,y)=>y-x).join(',')}`)
    if (strong === 0) noStrong.push(d)
  }
  if (noStrong.length) console.log(`\n  !! 全站无 4 分的维度（可能是真空白，也可能是评分偏保守）：${noStrong.join(', ')}`)
}

// ---------- 3. 教程厚度 ----------
{
  console.log('\n=== 教程厚度 ===')
  const src = read('data/guides.ts')
  const items = entries(src).filter((s) => /\bid:\s*'[a-z0-9-]+'/.test(s) && s.includes('steps:'))
  for (const it of items) {
    const id = it.match(/\bid:\s*'([a-z0-9-]+)'/)?.[1] ?? '?'
    const type = it.match(/type:\s*'(\w+)'/)?.[1] ?? '?'
    const dur = it.match(/durationMin:\s*(\d+)/)?.[1] ?? '?'
    const outcome = field(it, 'outcome')?.value ?? ''
    const assess = field(it, 'assessment')?.value ?? ''
    const stepsSeg = it.slice(it.indexOf('steps:'), it.indexOf('steps:') + 3000)
    const stepCount = (stepsSeg.match(/\btitle:/g) || []).length
    const tplCount = (it.match(/\bbody:\s*`/g) || []).length
    const misCount = ((it.match(/commonMistakes:\s*\[([\s\S]*?)\]/) || [])[1] || '').split('，').filter((x) => x.trim().length > 6).length
    const flags = []
    if (outcome.length < 60) flags.push('产出<60字')
    if (assess.length < 40) flags.push('自评<40字')
    if (stepCount < 4) flags.push(`步骤${stepCount}`)
    if (!tplCount) flags.push('无模板')
    if (!misCount) flags.push('无易错')
    console.log(`  ${id.padEnd(28)} ${type.padEnd(9)} ${dur.padStart(2)}分 步骤${stepCount} 模板${tplCount} 易错${misCount} 产出${String(outcome.length).padStart(3)} 自评${String(assess.length).padStart(3)} ${flags.length ? '<< ' + flags.join('、') : ''}`)
  }
}

// ---------- 4. 案例行业覆盖 ----------
{
  console.log('\n=== 案例行业覆盖 ===')
  const src = read('data/cases.ts')
  const items = entries(src).filter((s) => /\bid:\s*'[a-z0-9-]+'/.test(s) && s.includes('industry:'))
  const inds = {}
  for (const it of items) {
    const id = it.match(/\bid:\s*'([a-z0-9-]+)'/)?.[1] ?? '?'
    const ind = it.match(/industry:\s*'([^']*)'/)?.[1] ?? '?'
    const tools = ((it.match(/tools:\s*\[([\s\S]*?)\]/) || [])[1] || '').split(',').filter((x) => x.trim()).length
    const result = field(it, 'result')?.value ?? ''
    const pits = ((it.match(/pitfalls:\s*\[([\s\S]*?)\]/) || [])[1] || '').split('，').filter((x) => x.trim().length > 8).length
    inds[ind] = (inds[ind] || 0) + 1
    console.log(`  ${id.padEnd(22)} ${ind.padEnd(8)} 工具${tools} 结果${String(result.length).padStart(3)}字 坑${pits}`)
  }
  console.log(`  行业：${Object.entries(inds).map(([k, v]) => `${k}(${v})`).join('  ')}`)
}