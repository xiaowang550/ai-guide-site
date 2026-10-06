/**
 * 通过 GitHub Data API 推送（绕过 git push）。
 *
 * 为什么需要这个：这台机器的网络对 github.com 的连接极不稳定 ——
 * git push 反复失败于 "RPC failed / Connection was reset / Could not connect"。
 * 但 api.github.com 一直通畅，而 Git Data API 走的正是后者。
 *
 * 流程与 git push 等价：
 *   1. 每个文件建一个 blob（内容 base64）
 *   2. 用这些 blob 的 sha 建一棵 tree
 *   3. 用这棵 tree 建 commit
 *   4. 把 main 指向这个 commit
 *
 * token 从 gh 的凭据存储里取（`gh auth token`），不落盘、不打印。
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'

const REPO = 'xiaowang550/ai-guide-site'
const API = `https://api.github.com/repos/${REPO}`
const CONCURRENCY = 6

const token = process.env.GH_TOKEN
if (!token) {
  console.error('缺少 GH_TOKEN 环境变量')
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'ai-guide-site-push',
}

let apiCalls = 0

async function api(path, opts = {}) {
  apiCalls++
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { ...headers, ...(opts.headers || {}) },
  })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) {
    const msg = json?.message ?? text.slice(0, 200)
    const err = new Error(`HTTP ${res.status}: ${msg}`)
    err.status = res.status
    throw err
  }
  return json
}

/** 带重试：网络抖动是这个环境的主要敌人 */
async function apiRetry(path, opts = {}, tries = 4) {
  let last
  for (let i = 1; i <= tries; i++) {
    try {
      return await api(path, opts)
    } catch (e) {
      last = e
      if (e.status && e.status !== 429 && e.status < 500) throw e
      const wait = i * 1500
      console.log(`  重试 ${i}/${tries}（${wait}ms 后）：${e.message.slice(0, 70)}`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw last
}

// ---------- 1. 取 git 追踪的文件列表 ----------
const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split('\0')
  .filter(Boolean)

console.log(`待推送文件：${files.length} 个`)

/**
 * GitHub 不允许在空仓库里创建 blob（返回 409 "Git Repository is empty"）。
 * 所以先用 Contents API 放一个占位文件，把仓库「叫醒」。
 *
 * 这个占位文件不会留在最终结果里：下面的 tree 由 `git ls-files` 生成，
 * 不含它，所以把 main 指过去之后它就消失了，历史保持线性。
 */
async function bootstrapRepo() {
  const head = await api('/git/ref/heads/main').catch(() => null)
  if (head) {
    console.log('远程已有提交，跳过引导')
    return head.object.sha
  }
  const res = await apiRetry('/contents/.bootstrap', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'chore: 初始化仓库',
      content: Buffer.from('此文件为推送引导占位，稍后即被移除。\n').toString('base64'),
      branch: 'main',
    }),
  })
  console.log('已引导空仓库（占位提交）')
  return res.commit.sha
}

const bootstrapSha = await bootstrapRepo()

// ---------- 2. 建 blob（并发受限，避免触发限流）----------

/**
 * blob 是内容寻址的：同样的内容永远得到同样的 sha。
 * 所以缓存下来，重跑时不必重新上传上百个请求。
 *
 * **键必须是「路径 + 内容哈希」，不能只用路径。**
 * 早期版本按路径缓存，结果文件内容改了以后仍返回旧 sha，
 * 推上去的是上一版的文件 —— 而且不报错，很难发现。
 */
const CACHE_PATH = '.git/blob-sha-cache.json'
let cache = {}
try {
  cache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'))
} catch {
  cache = {}
}

const entries = []
let done = 0
let reused = 0

async function pushFile(path) {
  const buf = readFileSync(path)
  const contentHash = createHash('sha1').update(buf).digest('hex')
  const cacheKey = `${contentHash}:${buf.length}`

  let sha = cache[cacheKey]
  if (sha) {
    reused++
  } else {
    const blob = await apiRetry('/git/blobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: buf.toString('base64'), encoding: 'base64' }),
    })
    sha = blob.sha
    cache[cacheKey] = sha
  }
  done++
  if (done % 50 === 0 || done === files.length) {
    console.log(`  blob 进度 ${done}/${files.length}（复用 ${reused}）`)
  }
  // 100644 = 普通文件；可执行位在这里不重要（站点里没有 .sh 需要执行）
  entries.push({ path, mode: '100644', type: 'blob', sha })
}

let cursor = 0
async function worker() {
  while (cursor < files.length) {
    const i = cursor++
    await pushFile(files[i])
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker))
writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0), 'utf8')

console.log(`blob 全部完成（${apiCalls} 次 API 调用，复用 ${reused} 个）`)

// ---------- 3. 建 tree ----------
let tree
try {
  tree = await apiRetry('/git/trees', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tree: entries }),
  })
} catch (e) {
  // tree 403/422 时把可疑文件名列出来：路径编码或权限问题通常只出在个别条目上
  console.error(`\ntree 创建失败：${e.message}`)
  const odd = entries.filter((x) => /[^\x20-\x7e/.-]/.test(x.path) || x.path.length > 100)
  console.error(`条目总数 ${entries.length}，其中路径含非 ASCII 字符的 ${odd.length} 个：`)
  for (const o of odd.slice(0, 10)) console.error(`  ${o.path}`)
  const missing = entries.filter((x) => !x.sha || !/^[0-9a-f]{40}$/.test(x.sha))
  console.error(`sha 异常的 ${missing.length} 个`)
  throw e
}
console.log(`tree: ${tree.sha.slice(0, 8)}（含 ${tree.tree.length} 项）`)

// ---------- 4. 建 commit ----------
const message = readFileSync('.git/SOURCE_COMMIT_MSG', 'utf8')
const commit = await apiRetry('/git/commits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message,
    tree: tree.sha,
    // 父提交 = 引导占位提交，保证是快进而不是改写历史
    parents: [bootstrapSha],
    author: { name: 'xiaowang550', email: '1302582367@qq.com' },
  }),
})
console.log(`commit: ${commit.sha.slice(0, 8)}`)

// ---------- 5. 更新 main 引用 ----------
const remoteHead = await api('/git/ref/heads/main').catch(() => null)

if (!remoteHead) {
  await api('/git/refs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: 'refs/heads/main', sha: commit.sha }),
  })
  console.log('已创建 refs/heads/main')
} else {
  await api('/git/refs/heads/main', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sha: commit.sha, force: false }),
  })
  console.log('已更新 refs/heads/main')
}

console.log(`\n完成。总计 ${apiCalls} 次 API 调用。`)
console.log(`仓库地址：https://github.com/${REPO}`)

// ---------- 6. 校验：远程内容必须与本地逐字节一致 ----------
//
// 为什么要这一步：曾经出过一次 bug —— blob 缓存按「路径」做键而不是
// 「内容哈希」，文件改了以后仍复用旧sha，于是推上去的是上一版内容。
// 全程没有任何报错，只有逐字节对比才能发现。
const remoteCommit = await api(`/git/commits/${commit.sha}`)
if (!remoteCommit.tree) throw new Error('拿不到新提交的 tree')
const remoteTree = await api(`/git/trees/${remoteCommit.tree.sha}?recursive=1`)

const remotePaths = new Map()
for (const node of remoteTree.tree || []) {
  if (node.type === 'blob') remotePaths.set(node.path, node.sha)
}

const localPaths = new Map(entries.map((e) => [e.path, e.sha]))

const missing = [...localPaths.keys()].filter((p) => !remotePaths.has(p))
const extra = [...remotePaths.keys()].filter((p) => !localPaths.has(p))
const mismatched = [...localPaths.entries()]
  .filter(([p, sha]) => remotePaths.get(p) && remotePaths.get(p) !== sha)
  .map(([p]) => p)

if (missing.length || extra.length || mismatched.length) {
  console.error('\n[校验失败] 远程内容与本地不一致：')
  if (missing.length) console.error(`  远程缺少 ${missing.length} 个：${missing.slice(0, 5).join(', ')}`)
  if (extra.length) console.error(`  远程多出 ${extra.length} 个：${extra.slice(0, 5).join(', ')}`)
  if (mismatched.length)
    console.error(`  内容不一致 ${mismatched.length} 个：${mismatched.slice(0, 5).join(', ')}`)
  process.exit(1)
}

console.log(`[校验通过] 远程 ${remotePaths.size} 个文件与本地逐字节一致。`)