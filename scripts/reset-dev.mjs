/**
 * 重置开发服务器（干净重启）。
 *
 * 处理两个真实踩过的坑：
 * 1. 多进程残留：只杀父进程没用，真正服务的是子进程 `start-server.js`；
 *    旧进程残留会让新实例自动换端口（3001/3002…），多个实例共用同一个 .next 互相写坏，
 *    表现为「CSS 变成 0 条规则 + 资源 404 + 500」。
 * 2. 端口探测误判：Next 监听的是 IPv6 全地址 :::3000，只用 IPv4 探测会误以为端口已释放。
 *
 * 两件事都由 scripts/kill-dev.ps1 处理（PowerShell 在 Windows 上判断端口最可靠），
 * 这里只负责编排：结束进程 → 确认端口空 → 清 .next → 启动 dev。
 *
 * 用法：npm run dev:reset     （可用 DEV_PORT=3005 指定端口）
 */
import { execSync, spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const isWindows = process.platform === 'win32'
const PORT = Number(process.env.DEV_PORT ?? 3000)
const PROJECT_NAME = 'ai-guide-site'

function killViaPowerShell() {
  const script = join(projectRoot, 'scripts', 'kill-dev.ps1')
  const out = execSync(
    `powershell -NoProfile -ExecutionPolicy Bypass -File "${script}" -Port ${PORT} -ProjectName "${PROJECT_NAME}"`,
    { encoding: 'utf8' }
  )
  const lines = out.split(/\r?\n/).filter(Boolean)
  lines.forEach((l) => console.log(l))
  return lines.some((l) => l.trim() === 'port-free')
}

function killViaPkill() {
  execSync('pkill -f "next dev" || true; pkill -f "start-server" || true; pkill -f "serve-out" || true', {
    stdio: 'ignore',
    shell: '/bin/sh',
  })
  console.log('已结束 dev 进程')
  return true
}

const portFree = isWindows ? killViaPowerShell() : killViaPkill()

if (!portFree) {
  console.error(
    `\n端口 ${PORT} 仍被占用，已中止（不会删除 .next，避免把运行中的服务写坏）。\n` +
      `请手动处理后重试，或换一个端口：DEV_PORT=3005 npm run dev:reset\n`
  )
  process.exit(1)
}

rmSync(join(projectRoot, '.next'), { recursive: true, force: true })
console.log('已清空 .next')

const nextBin = join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next')
console.log(`启动 next dev（端口 ${PORT}）…`)
const child = spawn(process.execPath, [nextBin, 'dev', '--port', String(PORT)], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env },
})
child.on('exit', (code) => process.exit(code ?? 1))