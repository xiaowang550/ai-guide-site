import type { Metadata } from 'next'

/**
 * 后台的分区布局。
 *
 * ── 这里刻意没有 <html> / <body> ──
 *
 * Next.js 的 App Router **只允许根布局渲染 `<html>` 与 `<body>`**。
 * 第一版这里写了完整的 html/body 结构，结果浏览器把嵌套的 html/body 标签
 * 提升（hoist）到文档外层，实际效果是：
 *   · 后台页面被塞进了公开站根布局的 `<main id="main">` 里
 *   · 于是站点顶栏、命令搜索、助手浮窗、新手引导全都出现在后台界面里
 *     —— 甚至新手引导会弹出「第 1/4 步」这种只对公开站有意义的浮层
 *
 * 正确做法见下方说明：这一层只负责 meta，不再输出任何文档级标签。
 * 真正需要「后台完全独立于公开站外壳」的话，要把公开站的根布局挪进
 * `app/(site)/layout.tsx`，让 `app/(admin)/` 拥有自己的根布局 ——
 * 那是结构性改动，涉及全部 140 个路由的目录归属，本轮不做。
 * 折中方案是让公开站专属组件在 /admin 下自行隐藏（见下）。
 */

export const metadata: Metadata = {
  title: '内容管理后台',
  // 明确禁止收录。后台是需要登录的页面，被搜索引擎抓到只会产生无意义的 401 页面。
  robots: { index: false, follow: false, nocache: true },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="-mt-10">{children}</div>
}
