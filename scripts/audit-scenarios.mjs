/**
 * 决策器场景覆盖体检。
 *
 * 关注三个问题：
 * 1. 每个场景的权重加总是否正常（归一化前的原始和）
 * 2. 权重最高的三个维度，与工具实际得分对照 ——
 *    如果某个场景最看重的维度全站都没人做得好，那这个场景就该配提示
 * 3. 场景之间是否高度重复（权重几乎一样 = 其实是一个场景）
 */
import { readFileSync } from 'node:fs'

const src = readFileSync('data/scenarios.ts', 'utf8')
const toolsSrc = readFileSync('data/tools.ts', 'utf8')

// ---------- 1. 解析场景 ----------
const scenarios = []
{
  const parts = src.split(/\n  \{\n/).slice(1)
  for (const p of parts) {
    const id = p.match(/id:\s*'([^']+)'/)?.[1]
    const label = p.match(/label:\s*'([^']+)'/)?.[1]
    if (!id) continue
    const wSeg = p.slice(p.indexOf('weights:'), p.indexOf('weights:') + 900)
    const weights = {}
    for (const m of wSeg.matchAll(/([a-zA-Z]+):\s*([0-9.]+)/g)) weights[m[1]] = Number(m[2])
    scenarios.push({ id, label, weights })
  }
}

console.log(`场景数：${scenarios.length}\n`)

// ---------- 2. 解析工具各维度得分 ----------
const dims = ['writing','longform','reasoning','math','coding','research','agent','data','office','imageGen','vision','video','voice','realtime']
const perDim = Object.fromEntries(dims.map((d) => [d, []]))
{
  // 逐工具条目切分，再在条目内找 `维度: { ... score: N`
  // 早先用非贪婪的 capabilities 块匹配，结果只吃到第一个维度就停了 ——
  // 所以改成不依赖块边界，直接扫「维度 + score」这对相邻结构。
  const toolBlocks = toolsSrc.split(/\n  \{\n/).slice(1).filter((s) => s.includes('capabilities:'))
  for (const blk of toolBlocks) {
    const capStart = blk.indexOf('capabilities:')
    // capabilities 段结束于下一个同级字段（alternatives / updatedAt 之类）
    const rest = blk.slice(capStart + 13)
    const endMatch = rest.match(/\n\s{4}\},/)
    const capSeg = endMatch ? rest.slice(0, endMatch.index) : rest
    for (const m of capSeg.matchAll(/([a-zA-Z]+):\s*\{\s*(?:\/\/[^\n]*\n\s*)?score:\s*([0-5])/g)) {
      const key = m[1]
      if (perDim[key]) perDim[key].push(Number(m[2]))
    }
  }
}

const dimStats = {}
for (const d of dims) {
  const a = perDim[d]
  dimStats[d] = {
    n: a.length,
    max: a.length ? Math.max(...a) : 0,
    strong: a.filter((s) => s >= 4).length,
    avg: a.length ? a.reduce((n, x) => n + x, 0) / a.length : 0,
  }
}

console.log('=== 各维度全站水平 ===')
for (const d of dims) {
  const s = dimStats[d]
  const bar = '#'.repeat(s.strong) + '.'.repeat(Math.max(0, 6 - s.strong))
  console.log(`  ${d.padEnd(10)} 最高${s.max} ≥4分${String(s.strong).padStart(2)}个 均分${s.avg.toFixed(1)}  ${bar}`)
}

// ---------- 3. 场景权重与工具水平的匹配 ----------
console.log('\n=== 各场景最看重的维度，以及这些维度全站有没有强项 ===')
const problems = []
for (const s of scenarios) {
  const entries = Object.entries(s.weights).filter(([k]) => dims.includes(k))
  const total = entries.reduce((n, [, v]) => n + v, 0)
  const sorted = entries.sort((a, b) => b[1] - a[1])
  const top3 = sorted.slice(0, 3)
  const weakTop = top3.filter(([d]) => dimStats[d].strong === 0)
  const flag = weakTop.length ? '  << 重点维度全站无人达标' : ''
  if (weakTop.length) problems.push({ id: s.id, label: s.label, weak: weakTop.map(([d]) => d) })
  console.log(
    `  ${(s.label || s.id).padEnd(12)} 权重和=${total.toFixed(2)}  重点: ` +
      top3.map(([d, v]) => `${d}(${v.toFixed(2)})${dimStats[d].strong === 0 ? '←弱' : ''}`).join(' ')
  )
  if (flag) console.log(flag)
}

// ---------- 4. 场景之间的相似度 ----------
console.log('\n=== 场景两两相似度（权重归一后余弦相似度）===')
function cos(a, b) {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => dims.includes(k))
  let dot = 0, na = 0, nb = 0
  for (const k of keys) {
    const x = a[k] || 0, y = b[k] || 0
    dot += x * y; na += x * x; nb += y * y
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1)
}
const pairs = []
for (let i = 0; i < scenarios.length; i++) {
  for (let j = i + 1; j < scenarios.length; j++) {
    pairs.push([scenarios[i].label, scenarios[j].label, cos(scenarios[i].weights, scenarios[j].weights)])
  }
}
pairs.sort((a, b) => b[2] - a[2])
for (const [a, b, v] of pairs.slice(0, 5)) {
  console.log(`  ${a} ↔ ${b}  相似度 ${v.toFixed(3)}${v > 0.9 ? '  << 几乎是一个场景' : ''}`)
}

// ---------- 5. 场景覆盖的工具类型 ----------
console.log('\n=== 结论 ===')
console.log(`  场景数: ${scenarios.length}`)
console.log(`  重点维度全站无人达标的问题场景: ${problems.length ? problems.map(p => `${p.label}(${p.weak.join(',')})`).join('; ') : '无'}`)
console.log(`  高相似度场景对: ${pairs.filter(p => p[2] > 0.9).length}`)