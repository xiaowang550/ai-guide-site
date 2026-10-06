import type { NextConfig } from 'next'
import createMDX from '@next/mdx'

const withMDX = createMDX({
  extension: /\.mdx?$/,
})

/**
 * 注意：不要给 build 设置自定义 distDir。
 *
 * `output: 'export'` 会把静态产物写进 distDir 内部（例如 .next-build/），
 * 而预览服务器和部署读的是 out/ —— 两者一旦不一致，
 * 就会出现「代码改了、样式却完全没生效」这种极难排查的问题。
 *
 * 开发与构建相互干扰的真正原因是 next build 会重写根目录的 next-env.d.ts，
 * 触发正在运行的 next dev 全量重编译并撞上 Next 15.5 的 DevTools 缺陷。
 * 解决办法是不要并行跑（详见 README），而不是换产物目录。
 */
const nextConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // 关闭开发指示器 / DevTools 覆盖层。
  // Next 15.5 的 segment explorer 在 Windows + 中文路径下会抛
  // "Could not find the module ... segment-explorer-node.js in the React Client Manifest"，
  // 导致客户端清单损坏、CSS 变成空文件、页面 500。开发环境关掉它最稳。
  devIndicators: false,
}

export default withMDX(nextConfig)