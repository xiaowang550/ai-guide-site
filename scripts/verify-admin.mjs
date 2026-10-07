/**
 * 后台部署验证：配完之后跑一条命令，逐项检查。
 *
 *   node scripts/verify-admin.mjs
 *   node scripts/verify-admin.mjs https://ai-guide-site.pages.dev
 *
 * 为什么要有这个脚本：后台上线要经过 8 个手动步骤，
 * 出问题时靠「打开页面看一眼」很难区分是绑定没生效、Secret 没设、
 * 还是 Functions 没被识别。这个脚本把每一项都变成明确的通过/失败。
 *
 * 它**只读不写**，不涉及任何凭据，只发公开请求 + 一个登录请求
 * （登录会用你现场输入的密码，仅用于确认 Secret 生效）。
 */

const base = (process.argv[2] || process.env.SITE_URL || 'https://ai-guide-site.pages.dev')
  .replace(/\/+$/, '')

const C = { ok: '✓', bad: '✗', warn: '!', info: '·' }
const results = []

function record(name, status, detail) {
  results.push({ name, status, detail })
  const icon = status === 'pass' ? C.ok : status === 'fail' ? C.bad : C.warn
  console.log(`${icon} ${name}\n    ${detail}`)
}

async function get(path, headers = {}) {
  try {
    const res = await fetch(base + path, {
      headers,
      signal: AbortSignal.timeout(20000),
    })
    const text = await res.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      /* 不是 JSON 就算文本 */
    }
    return { status: res.status, text, json, headers: res.headers }
  } catch (e) {
    return { status: 0, text: '', json: null, error: e instanceof Error ? e.message : String(e) }
  }
}

console.log(`\n验证目标：${base}\n${'='.repeat(60)}\n`)

// ── 1. 公开内容接口（证明 Functions 已被识别 + D1 已绑定 + 已迁移数据）──
const snap = await get('/api/content/published')
if (snap.status === 0) {
  record('1. Functions 是否被 Cloudflare 识别', 'fail',
    `连不上 ${base}。先确认域名能访问，排除本机网络问题。`)
} else if (snap.status === 404) {
  record('1. Functions 是否被 Cloudflare 识别', 'fail',
    '返回 404 —— Pages 没有编译 functions/ 目录。' +
    '检查仓库根目录有没有 functions/api/[[path]].ts（双层方括号），' +
    '然后到 Pages 项目 → Functions 标签页确认有没有 /api 路由。')
} else if (snap.status === 500 && String(snap.text).includes('数据库未绑定')) {
  record('1. Functions 是否被 Cloudflare 识别', 'pass',
    'Functions 已生效（返回了 D1 未绑定的提示）。')
  record('2. D1 绑定', 'fail',
    'Pages 项目 → Settings → Bindings → 添加 D1 数据库，' +
    '变量名必须正好是 DB（对应 wrangler.toml 里的 binding）。')
} else if (snap.status === 200 && snap.json && Array.isArray(snap.json.items)) {
  const n = snap.json.items.length
  record('1. Functions 是否被 Cloudflare 识别', 'pass',
    '/api/content/published 返回 200。')
  if (n === 0) {
    record('3. 内容是否已迁移', 'fail',
      '返回 0 条内容。执行：node --experimental-strip-types scripts/seed-content.mjs --remote')
  } else {
    record('3. 内容是否已迁移', 'pass', `库里有 ${n} 条已发布内容。`)
  }
} else {
  record('1. Functions 是否被 Cloudflare 识别', 'warn',
    `状态 ${snap.status}，返回内容不是预期结构。前 120 字：${snap.text.slice(0, 120)}`)
}

// ── 2. 权限：未登录时管理接口必须 401 ──
const dash = await get('/api/admin/dashboard')
if (dash.status === 401) {
  record('4. 管理接口的权限校验', 'pass',
    '未登录访问 /api/admin/dashboard 返回 401 —— 服务端确实在拦。')
} else if (dash.status === 404) {
  record('4. 管理接口的权限校验', 'fail',
    '返回 404，后台接口没有被识别。见第 1 项。')
} else if (dash.status === 200) {
  record('4. 管理接口的权限校验', 'fail',
    '**未登录也能拿到仪表盘数据 —— 这是严重问题，请立刻告诉我。**')
} else {
  record('4. 管理接口的权限校验', 'warn', `状态 ${dash.status}，期望 401。`)
}

// ── 3. CSRF：写操作必须校验 Origin ──
const noOrigin = await get('/api/admin/login', { 'X-Requested-With': 'XMLHttpRequest' })
if (noOrigin.status === 403) {
  record('5. 写操作的同源校验', 'pass',
    '不带 Origin 的登录请求被 403 拒绝 —— CSRF 防线在生效。')
} else {
  record('5. 写操作的同源校验', 'warn',
    `状态 ${noOrigin.status}（期望 403）。浏览器发起的请求总会带 Origin，这条只作参考。`)
}

// ── 4. 公开接口的 ETag（构建时同步靠它省流量）──
if (snap.status === 200) {
  const etag = snap.headers.get('etag')
  const reval = await get('/api/content/published', etag ? { 'If-None-Match': etag } : {})
  if (etag && reval.status === 304) {
    record('6. 内容接口的 ETag / 304', 'pass',
      `内容未变时返回 304（${etag}），构建时同步能省流量。`)
  } else if (etag) {
    record('6. 内容接口的 ETag / 304', 'warn',
      `带了 If-None-Match 却返回 ${reval.status}，期望 304。不影响正确性，只是少了优化。`)
  } else {
    record('6. 内容接口的 ETag / 304', 'fail', '响应里没有 ETag 头。')
  }
}

// ── 5. /admin/ 页面本身 ──
const page = await get('/admin/')
if (page.status === 200) {
  const noindex = /noindex/i.test(page.text)
  const leaks = /Kimi|Claude|Gemini|Ollama/.test(page.text.replace(/<[^>]+>/g, ''))
  record('7. 后台页面', noindex && !leaks ? 'pass' : 'warn',
    `状态 200${noindex ? '，已设 noindex' : '，**缺少 noindex**（会被搜索引擎收录）'}` +
    `${leaks ? '，**HTML 里出现了工具名 —— 说明有数据没走鉴权**' : '，HTML 里无业务数据'}`)
} else {
  record('7. 后台页面', 'fail', `状态 ${page.status}，期望 200。`)
}

// ── 6. 公开站本身没被影响 ──
const home = await get('/')
record('8. 公开站', home.status === 200 ? 'pass' : 'warn',
  `首页状态 ${home.status}，长度 ${home.text.length}。`)

// ── 7. 登录（需要密码，只用来确认 Secret 生效）──
const hasPassword = process.env.ADMIN_PASSWORD
if (hasPassword) {
  try {
    const res = await fetch(base + '/api/admin/login', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Origin: base,
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ username: process.env.ADMIN_USERNAME || 'admin', password: hasPassword }),
      signal: AbortSignal.timeout(20000),
    })
    const body = await res.json().catch(() => null)
    if (res.status === 200) {
      record('9. 管理员登录', 'pass',
        `登录成功（${body?.username}, ${body?.role}）。Secret 生效。`)
      console.log(`    提示：Cookie 已丢弃（只验证不保留）。`)
    } else if (res.status === 401) {
      record('9. 管理员登录', 'fail',
        '密码不正确。检查 ADMIN_PASSWORD 是否设成了 **Secret**（不是普通变量），' +
        '且是否在首次登录**之前**就设好了 —— 如果 admins 表里已有账号，Secret 不再被读取。')
    } else if (res.status === 429) {
      record('9. 管理员登录', 'fail',
        `被限流锁定：${body?.error ?? ''} 等 15 分钟再试。`)
    } else {
      record('9. 管理员登录', 'warn', `状态 ${res.status}：${body?.error ?? ''}`)
    }
  } catch (e) {
    record('9. 管理员登录', 'warn', e instanceof Error ? e.message : String(e))
  }
} else {
  console.log(`\n${C.info} 跳过「管理员登录」检查：未设置 ADMIN_PASSWORD 环境变量。`)
  console.log(`    $env:ADMIN_PASSWORD="你的密码"; node scripts/verify-admin.mjs ${base}`)
}

console.log(`\n${'='.repeat(60)}`)
const failed = results.filter((r) => r.status === 'fail')
const warned = results.filter((r) => r.status === 'warn')
console.log(
  `合计 ${results.length} 项：通过 ${results.length - failed.length - warned.length}` +
  `，警告 ${warned.length}，失败 ${failed.length}`
)
if (failed.length > 0) {
  console.log('\n失败项按顺序处理：')
  failed.forEach((r, i) => console.log(`  ${i + 1}. ${r.name}`))
}
console.log()
