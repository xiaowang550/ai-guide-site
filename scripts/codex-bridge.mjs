import { spawn } from 'node:child_process'
import { readdir, readFile, writeFile, mkdir, lstat, copyFile } from 'node:fs/promises'
import { join, resolve, relative, extname, sep, isAbsolute } from 'node:path'
import { ensureModules } from '../lib/admin/modules.ts'

const roots = [
  'app',
  'components',
  'data',
  'lib',
  'public',
  'functions',
  'workers',
  'db',
  'scripts',
  'docs',
  'content',
]
const rootFiles = [
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'next.config.ts',
  'next.config.mjs',
  'postcss.config.mjs',
  'tailwind.config.ts',
  'vitest.config.ts',
  'wrangler.toml',
  'wrangler.news.toml',
  'README.md',
  'AGENTS.md',
]
const sourceExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.json',
  '.md',
  '.mdx',
  '.css',
  '.sql',
  '.toml',
  '.svg',
  '.txt',
])
const ignored = new Set([
  'node_modules',
  '.git',
  '.data',
  '.next',
  'out',
  '.env',
  '.codex',
  '.agents',
  '.aws',
])
function within(root, path) {
  const part = relative(resolve(root), resolve(path))
  return !part.startsWith(`..${sep}`) && part !== '..' && !isAbsolute(part)
}
async function files(root, current = root) {
  const result = []
  for (const item of await readdir(current, { withFileTypes: true })) {
    if (item.isSymbolicLink() || ignored.has(item.name) || item.name.startsWith('.env')) continue
    const path = join(current, item.name)
    if (item.isDirectory()) result.push(...(await files(root, path)))
    else if (item.isFile()) result.push(relative(root, path).replaceAll('\\', '/'))
  }
  return result
}
export async function copyDraftWorkspace(projectRoot, workspace) {
  await mkdir(workspace, { recursive: true })
  const candidates = []
  for (const name of roots) {
    try {
      if ((await lstat(join(projectRoot, name))).isDirectory())
        candidates.push(...(await files(join(projectRoot, name))).map((path) => `${name}/${path}`))
    } catch {}
  }
  for (const name of rootFiles) {
    try {
      if ((await lstat(join(projectRoot, name))).isFile()) candidates.push(name)
    } catch {}
  }
  const baseline = {}
  for (const name of candidates) {
    const source = join(projectRoot, name),
      target = join(workspace, name)
    if (!within(workspace, target) || (await lstat(source)).isSymbolicLink()) continue
    await mkdir(resolve(target, '..'), { recursive: true })
    await copyFile(source, target)
    if (sourceExtensions.has(extname(name)) && (await lstat(source)).size <= 300000)
      baseline[name] = await readFile(source, 'utf8')
  }
  return baseline
}
export async function readDraftChanges(workspace, baseline) {
  const current = await files(workspace),
    names = [...new Set([...Object.keys(baseline), ...current])].sort(),
    changes = []
  for (const name of names) {
    if (!sourceExtensions.has(extname(name)) || ignored.has(name.split('/')[0])) continue
    const path = join(workspace, name)
    if (!within(workspace, path)) continue
    let after = null
    try {
      const stat = await lstat(path)
      if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 300000) continue
      after = await readFile(path, 'utf8')
    } catch {}
    const before = baseline[name] ?? null
    if (before !== after) changes.push({ path: name, before, after })
    if (changes.length >= 100) break
  }
  return changes
}
export function codexExecArgs(workspace, output) {
  return [
    'exec',
    '--sandbox',
    'workspace-write',
    '--json',
    '--skip-git-repo-check',
    '-C',
    workspace,
    '-o',
    output,
    '-',
  ]
}
async function findCodex() {
  if (process.env.CODEX_CLI_PATH) {
    const path = resolve(process.env.CODEX_CLI_PATH)
    if ((await lstat(path)).isFile()) return path
  }
  const bin = join(process.env.LOCALAPPDATA ?? '', 'OpenAI', 'Codex', 'bin')
  try {
    const versions = await readdir(bin, { withFileTypes: true })
    const candidates = []
    for (const version of versions) {
      if (!version.isDirectory() || version.isSymbolicLink()) continue
      const path = join(bin, version.name, 'codex.exe')
      try {
        const stat = await lstat(path)
        if (stat.isFile()) candidates.push({ path, time: stat.mtimeMs })
      } catch {}
    }
    return candidates.sort((a, b) => b.time - a.time)[0]?.path ?? null
  } catch {
    return null
  }
}
function environment() {
  return Object.fromEntries(
    [
      'PATH',
      'Path',
      'SystemRoot',
      'WINDIR',
      'ComSpec',
      'TEMP',
      'TMP',
      'APPDATA',
      'LOCALAPPDATA',
      'USERPROFILE',
      'HOME',
    ]
      .filter((key) => process.env[key])
      .map((key) => [key, process.env[key]]),
  )
}
function command(exe, args, timeout = 12000) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(exe, args, {
      windowsHide: true,
      env: environment(),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('执行器响应超时。'))
    }, timeout)
    child.stdout.on('data', (data) => {
      if (output.length < 30000) output += data.toString()
    })
    child.stderr.on('data', (data) => {
      if (output.length < 30000) output += data.toString()
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolveResult({ code, output })
    })
  })
}
export async function createCodexBridge(projectRoot, db) {
  await ensureModules(db)
  await db.run(
    "UPDATE feature_requests SET status='failed',result='本地执行器重启，任务未完成。可重新生成草稿。',updated_at=? WHERE status IN ('queued','running')",
    [new Date().toISOString()],
  )
  const jobRoot = join(projectRoot, '.data', 'codex-jobs')
  let cachedStatus = null,
    statusAt = 0
  return {
    async status() {
      if (cachedStatus && Date.now() - statusAt < 60000) return cachedStatus
      try {
        const exe = await findCodex()
        if (!exe)
          return { available: false, message: '未找到本地 Codex CLI，可先复制需求到 Codex。' }
        const [version, auth] = await Promise.all([
          command(exe, ['--version']),
          command(exe, ['login', 'status']),
        ])
        cachedStatus = {
          available: auth.code === 0 && /logged in/i.test(auth.output),
          message:
            auth.code === 0
              ? '使用本机已登录的 Codex，在独立项目副本中构建。'
              : '请先在本机登录 Codex，后台不会收集登录凭据。',
          version: version.output.match(/codex[^\r\n]*/i)?.[0] ?? 'Codex CLI',
        }
        statusAt = Date.now()
        return cachedStatus
      } catch {
        return { available: false, message: '本地 Codex 暂不可用，可复制需求继续构建。' }
      }
    },
    async run(id, request) {
      if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('任务编号无效。')
      const directory = join(jobRoot, id),
        workspace = join(directory, `workspace-${crypto.randomUUID()}`)
      if (!within(jobRoot, workspace)) throw new Error('工作目录无效。')
      try {
        await db.run("UPDATE feature_requests SET status='running',updated_at=? WHERE id=?", [
          new Date().toISOString(),
          id,
        ])
        const baseline = await copyDraftWorkspace(projectRoot, workspace)
        await writeFile(join(directory, 'baseline.json'), JSON.stringify(baseline))
        const exe = await findCodex()
        if (!exe) throw new Error('未找到 Codex CLI。')
        const output = join(directory, 'result.txt')
        const prompt = `你正在 AI 能力图谱的独立代码草稿副本中工作。用户已授权生成新功能草稿。\n需求：\n${request}\n\n先查看 README、项目说明与现有组件。只修改当前副本中的网站源码，保留访客无需注册登录、后台所有写操作需要 owner 登录和同源校验。不要访问原项目、修改其他目录、读写凭据、部署、推送或发送消息。这里没有复制 node_modules，可使用父项目已有依赖进行验证。不要在副本创建新执行器或启动长驻服务。新增交互需使用清晰、柔和、匹配现有风格的布局。完成后说明具体改动、验证结果与未验证事项；代码草稿将由管理员检查后纳入网站。`
        const result = await new Promise((resolveResult, reject) => {
          const child = spawn(exe, codexExecArgs(workspace, output), {
            cwd: workspace,
            windowsHide: true,
            env: environment(),
            stdio: ['pipe', 'pipe', 'pipe'],
          })
          let finalError = '',
            buffer = '',
            timedOut = false
          const timer = setTimeout(
            () => {
              timedOut = true
              child.kill()
            },
            15 * 60 * 1000,
          )
          child.stdout.on('data', (data) => {
            buffer += data.toString()
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''
            for (const line of lines) {
              try {
                const event = JSON.parse(line)
                if (event.type === 'turn.failed') finalError = 'Codex 未完成本次任务。'
              } catch {}
            }
            if (buffer.length > 1000000) buffer = ''
          })
          child.stderr.resume()
          child.on('error', (e) => {
            clearTimeout(timer)
            reject(e)
          })
          child.on('close', async (code) => {
            clearTimeout(timer)
            if (timedOut) return reject(new Error('任务运行超过 15 分钟，已停止。'))
            if (code !== 0)
              return reject(new Error(finalError || 'Codex 任务未完成，请检查本机登录与服务状态。'))
            try {
              resolveResult((await readFile(output, 'utf8')).slice(0, 16000))
            } catch {
              resolveResult('代码草稿已生成，请查看文件改动。')
            }
          })
          child.stdin.end(prompt)
        })
        const changes = await readDraftChanges(workspace, baseline)
        await writeFile(join(directory, 'changes.json'), JSON.stringify(changes))
        await db.run(
          "UPDATE feature_requests SET status='ready',result=?,workspace=?,updated_at=? WHERE id=?",
          [
            `${result}\n\n共 ${changes.length} 个可查看的源码改动；未自动应用到公开网站。`,
            directory,
            new Date().toISOString(),
            id,
          ],
        )
      } catch (error) {
        await db.run(
          "UPDATE feature_requests SET status='failed',result=?,updated_at=? WHERE id=?",
          [
            error instanceof Error ? error.message : '代码草稿生成失败。',
            new Date().toISOString(),
            id,
          ],
        )
      }
    },
    async changes(id) {
      if (!/^[a-f0-9-]{36}$/.test(id)) return []
      const path = join(jobRoot, id, 'changes.json')
      if (!within(jobRoot, path)) return []
      try {
        return JSON.parse(await readFile(path, 'utf8'))
      } catch {
        return []
      }
    },
  }
}
