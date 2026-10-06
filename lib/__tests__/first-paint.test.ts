import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

/**
 * 首屏可见性门禁。
 *
 * 背景：`.reveal` 入场动画的初始状态是隐藏的，靠 client 组件（MotionLayer）
 * 在挂载后加 `.is-in`。client 组件要等 JS 下载 + hydration 才跑，
 * 于是首屏内容在慢设备上白着几百毫秒 —— Lighthouse 实测 /tools 的 LCP
 * 曾有 2.9 s 全是 Render Delay。
 *
 * 修复：在 `</body>` 末尾放一段内联脚本，HTML 一解析完就把首屏元素点亮。
 * 这个测试确保那��脚本不会被后续重构不小心删掉或挪位置。
 */
describe('首屏内容不依赖 hydration 才可见', () => {
  const layout = readFileSync('app/layout.tsx', 'utf8')

  it('layout 里存在首屏立即入场的内联脚本', () => {
    expect(layout, '缺少 REVEAL_EAGER 常量').toContain('REVEAL_EAGER')
  })

  it('脚本渲染在 body 内、且在 children 之后（此时才能扫到元素）', () => {
    const scriptAt = layout.indexOf('__html: REVEAL_EAGER')
    expect(scriptAt, 'REVEAL_EAGER 未被渲染').toBeGreaterThan(-1)

    const footerAt = layout.indexOf('<SiteFooter />')
    const bodyCloseAt = layout.indexOf('</body>')
    expect(scriptAt, '脚本必须排在 SiteFooter 之后').toBeGreaterThan(footerAt)
    expect(scriptAt, '脚本必须排在 </body> 之前').toBeLessThan(bodyCloseAt)
  })

  it('脚本内容会为视口内元素加 .is-in（而不是只做别的）', () => {
    const start = layout.indexOf('const REVEAL_EAGER')
    const end = layout.indexOf('`', layout.indexOf('`', start) + 1)
    const code = layout.slice(start, end)
    expect(code).toContain('is-in')
    expect(code).toContain('getBoundingClientRect')
  })

  it('脚本包在 try/catch 里（失败也不能影响页面）', () => {
    const start = layout.indexOf('const REVEAL_EAGER')
    expect(layout.slice(start, start + 400)).toContain('try')
  })
})