import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { megaNav } from '@/lib/site'

/**
 * 顶栏排版门禁。
 *
 * 背景：顶栏一度被形容为「挤在一起」。量的结果是三个客观问题叠在一起：
 *   1. 一级项间距只有 4px（gap-1），标签几乎贴着
 *   2. 三种控件高度不齐：导航项 24px / 主题组 32px / 搜索 36px，找不到统一的水平线
 *   3. 主题切换用三个并排的 radio（102px），而不是一个控件
 *
 * 修法不是凭感觉调的，而是对着 7 个文档站（MDN / Tailwind / Vercel / Prisma /
 * Pydantic AI / Astro / Zustand）的顶栏实测值对齐的。数值写死在这里，
 * 免得后续重构悄悄改回去 —— 这类调整不会报错，只会让界面慢慢变糟。
 */

/**
 * 7 个文档站量出的一级项间距全部落在 24-32px（Tailwind 24 / Vercel 24 /
 * MDN 26 / Zustand 32 / Pydantic 32）。
 *
 * 本站没有在所有断点都做到 24px —— 中文一级项每项 70-110px，
 * 1024px 处若直接上 24px，整条栏只剩 27px 余量。
 * 所以实际做法是分段：xl 及以上给满 24px，xl 以下给 16px。
 * 这里两条都锁住：24px 不能降（那是对齐研究值的部分），
 * 16px 也不能降回原来的 4px（那正是「挤」的来源）。
 */
const RESEARCHED_GAP_PX = 24
const NARROW_GAP_PX = 16

describe('顶栏排版', () => {
  const mega = readFileSync('components/mega-nav.tsx', 'utf8')
  const header = readFileSync('components/site-header.tsx', 'utf8')
  const theme = readFileSync('components/theme-toggle.tsx', 'utf8')

  it('顶栏保留舒适的点击与留白空间，高度固定为 72px', () => {
    expect(header, '顶栏高度应固定为 72px').toContain('h-[72px]')
  })

  it('一级项间距：xl 段给满研究值 24px，窄段不低于 16px（原来 gap-1 = 4px）', () => {
    const m = mega.match(/<ul className="flex items-center gap-(\d+)(?: xl:gap-(\d+))?"/)
    expect(m, '没找到一级项列表的 gap 设置').toBeTruthy()

    const narrow = Number(m![1]) * 4
    const wide = m![2] ? Number(m![2]) * 4 : narrow

    expect(
      wide,
      `xl 段一级项间距 ${wide}px，低于研究值 ${RESEARCHED_GAP_PX}px`
    ).toBeGreaterThanOrEqual(RESEARCHED_GAP_PX)
    expect(
      narrow,
      `窄段一级项间距 ${narrow}px 太窄 —— 原来的 4px 就是顶栏「挤」的主因`
    ).toBeGreaterThanOrEqual(NARROW_GAP_PX)
  })

  it('一级项与搜索框、主题按钮同高（h-9），不再出现 24/32/36 混排', () => {
    expect(mega).toContain('flex h-9 items-center gap-1.5')
    expect(mega).toContain('rounded-xl')
    expect(mega).not.toContain('rounded-l-lg')
    expect(mega).not.toContain('rounded-r-lg')
    expect(mega).toMatch(/<button[\s\S]*?data-nav-trigger[\s\S]*?\{item.label\}[\s\S]*?<ChevronDown[\s\S]*?<\/button>/)

  })

  it('一级项数量不超过 6（研究结论：建议 ≤6、硬上限 7；MDN 的 9 项不得不做短标签降级）', () => {
    expect(
      megaNav.length,
      `一级项 ${megaNav.length} 个。研究建议 ≤6；中文项每项 70-110px，再多会把搜索框挤没`
    ).toBeLessThanOrEqual(6)
  })

  it('一级标签不超过 5 个汉字（研究给的换算上限；「数据与站点」正好 5 个）', () => {
    for (const item of megaNav) {
      expect(
        [...item.label].length,
        `「${item.label}」超过 5 个字，顶栏会被拉宽`
      ).toBeLessThanOrEqual(5)
    }
  })

  it('主题切换是单个按钮，不是三个并排的 radio（实测占宽 102px → 36px）', () => {
    // 7 个文档站里 6 个用单按钮循环；唯一用分段控件的 Prisma 也只占 88px
    expect(theme, '主题切换不应是 radiogroup').not.toContain('role="radiogroup"')
    expect(theme, '主题切换应是单个 button').not.toContain('role="radio"')
    // 单按钮的代价是「跟随系统」不再一眼可见，用动态 aria-label 补偿
    expect(theme, 'aria-label 必须写明点击后会切到什么').toContain('点击切换到')
  })

  it('「帮我选」是实心 CTA 且在右侧（研究：2/7 站有实心 CTA，全部在最右端）', () => {
    expect(header, '帮我选应使用实心底色 bg-primary').toMatch(/href="\/find"[\s\S]{0,300}bg-primary/)
    // 位置：CTA 容器必须在搜索容器之后（DOM 顺序即视觉从左到右）
    const ctaAt = header.indexOf('href="/find"')
    const searchAt = header.indexOf('<CommandSearch')
    expect(ctaAt, '找不到帮我选入口').toBeGreaterThan(-1)
    expect(searchAt, '找不到搜索框').toBeGreaterThan(-1)
    expect(ctaAt, 'CTA 应该在搜索框右侧').toBeGreaterThan(searchAt)
  })

  it('悬停下拉的关闭延迟不短于 200ms（W3C 示例 1000ms，Baymard 建议 300-500ms；原 160ms 会闪）', () => {
    const m = mega.match(/setTimeout\(\(\) => setOpenKey\(null\), (\d+)\)/)
    expect(m, '没找到关闭延迟设置').toBeTruthy()
    expect(Number(m![1]), '关闭延迟过短，鼠标穿过间隙时面板会闪').toBeGreaterThanOrEqual(200)
  })

  it('键盘可达：Esc 关闭后焦点回到触发按钮（多数自研下拉会漏这一步）', () => {
    expect(mega, 'Esc 处理里应把焦点还给触发按钮').toMatch(/setOpenKey\(null\)[\s\S]{0,200}\.focus\(\)/)
  })

  it('子项多的面板改双列（「学校服务」6 项单列能排到 330px 高）', () => {
    expect(mega, '项数多时应改双列网格').toContain('grid-cols-2')
  })
})
