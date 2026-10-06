/**
 * 生产构建包装脚本。
 *
 * 作用有两个：
 * 1. 显式设置 NODE_ENV=production，避免不同 shell 下的行为差异。
 * 2. 构建后做产物校验：如果 out/index.html 不存在就直接报错退出 ——
 *    `output: 'export'` 在自定义 distDir 时会把产物写进 distDir 而不是 out/，
 *    这种情况如果静默通过，就会出现「改了样式却没生效」的诡异问题。
 *
 * 用法：npm run build
 */
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const outDir = join(projectRoot, 'out')

const nextBin = join(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next')

const child = spawn(process.execPath, [nextBin, 'build'], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
})

child.on('exit', (code) => {
  if ((code ?? 0) !== 0) process.exit(code ?? 1)

  // 产物校验：out/ 必须存在且包含首页
  if (!existsSync(join(outDir, 'index.html'))) {
    console.error('\n[build] 校验失败：out/index.html 不存在。')
    console.error('[build] 静态导出目录可能发生了变化（检查 next.config.ts 的 distDir / output 设置）。')
    process.exit(1)
  }
  const htmlCount = readdirSync(outDir, { recursive: true })
    .filter((f) => typeof f === 'string' && f.endsWith('.html')).length
  console.log(`[build] 产物校验通过：out/ 共 ${htmlCount} 个 HTML 文件，npm run serve 可直接预览`)
})