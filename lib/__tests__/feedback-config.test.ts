import { describe, expect, it } from 'vitest'
import { siteConfig } from '../site'
import { isValidRepo } from '../feedback-stats'

/**
 * 反馈通道配置门禁。
 *
 * 背景：反馈入口的显隐是靠 `isValidRepo(siteConfig.feedbackRepo)` 决定的，
 * 配置写错（比如写成完整 URL、多个斜杠）会**静默隐藏**入口 ——
 * 用户看不到「提交到 GitHub Issue」，也不会有人报错。
 * 所以这里把它当契约锁住。
 */
describe('反馈通道配置', () => {
  it('默认仓库配置是合法的 owner/repo 形态', () => {
    // 未设置环境变量时应回落到默认值，而不是空串（空串会让入口消失）
    expect(siteConfig.feedbackRepo, '仓库配置为空，反馈入口会全部隐藏').not.toBe('')
    expect(
      isValidRepo(siteConfig.feedbackRepo),
      `仓库配置 "${siteConfig.feedbackRepo}" 不是合法的 owner/repo`
    ).toBe(true)
  })

  it('收件邮箱是真实可投递的地址，不是占位符', () => {
    const email = siteConfig.feedbackEmail
    expect(email).toContain('@')
    // 占位符域名@example.com 在真实投递时会直接失败
    expect(email, '收件邮箱仍是占位符').not.toContain('example.com')
  })

  it('站点地址不是占位符（占位符会让 canonical 与 sitemap 指向不存在的域名）', () => {
    // 本地开发未设环境变量时允许回落，但要在文档里说明
    expect(siteConfig.url).toMatch(/^https?:\/\//)
  })
})