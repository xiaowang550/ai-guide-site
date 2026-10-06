import type { Difficulty, Platform, ToolCategory, UpdateType } from '@/data/types'

/** 站点基础配置：改品牌信息只动这里 */
export const siteConfig = {
  name: 'AI 能力地图',
  shortName: '能力地图',
  tagline: '中文优先的 AI 入门与实战指南',
  description:
    '把每个 AI 工具的能力量化成 14 个维度，用场景决策器告诉你「现在该用哪个、为什么、怎么问」。不吹不黑：强项、弱项、别用它做，全部写清楚。',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://example.com',
  locale: 'zh-CN',
  /**
   * 勘误反馈的 GitHub 仓库，格式 owner/repo。
   *
   * 用途（纯静态站、零后端下的可行方案）：
   * 1) 一键打开「预填好的 Issue」—— 不需要 token，Issue 即结构化反馈记录
   * 2) 读取公开 Issues 数量做统计 —— GitHub API 允许匿名读
   *
   * 为什么这里有默认值：`NEXT_PUBLIC_*` 是**构建期**内联的，静态站部署到
   * 任何托管都可能没有这个环境变量，于是反馈入口会静默消失。
   * 默认值让功能开箱可用，环境变量仍可在自建部署里覆盖成别的仓库。
   *
   * 留空（设成空字符串）则相关入口自动隐藏，复制与邮件两个出口始终可用。
   */
  feedbackRepo: process.env.NEXT_PUBLIC_FEEDBACK_REPO ?? 'xiaowang550/ai-guide-site',
  /** 收件邮箱：勘误与反馈的人工兜底通道 */
  feedbackEmail: '1302582367@qq.com',
  keywords: ['AI 工具', 'AI 提示词', 'AI 教程', '工具对比', '大模型', '场景选型'],
} as const

/** 一级导航：严格 6 项 */
export const primaryNav = [
  { href: '/', label: '首页', hint: '从这里开始' },
  { href: '/learn', label: '知识库', hint: 'AI 是什么' },
  { href: '/guides', label: '教程', hint: 'AI 怎么用' },
  { href: '/tools', label: '工具库', hint: '哪个更强' },
  { href: '/paths', label: '学习路径', hint: '按顺序学' },
  { href: '/cases', label: '案例', hint: '别人怎么做' },
] as const

/** 次级入口（页脚 / 搜索提示里出现，不占一级导航） */
export const secondaryNav = [
  { href: '/find', label: '场景决策器', hint: '帮我选工具' },
  { href: '/compare', label: '工具对比', hint: '并排比较' },
  { href: '/learn/glossary', label: '术语表', hint: '中英对照' },
  { href: '/freshness', label: '数据保鲜看板', hint: '哪些该复核了' },
  { href: '/updates', label: '更新雷达', hint: '数据变更日志' },
  { href: '/edu', label: '学校服务', hint: '课程 / 教案包 / 规范' },
  { href: '/settings', label: '设置', hint: '助手 / 引导' },
  { href: '/about', label: '关于', hint: '我们怎么打分' },
] as const

/** AI 教育专区（面向本地学校）的子导航，与主导航分开 */
export const eduNav = [
  { href: '/edu/programs', label: '课程体系' },
  { href: '/edu/toolkits', label: '课程与教案包' },
  { href: '/edu/policy', label: 'AI 使用规范' },
  { href: '/edu/schools', label: '试点与推广' },
  { href: '/edu/briefings', label: '定期简报' },
  { href: '/edu/support', label: '答疑与反馈' },
] as const

export const CATEGORY_LABELS: Record<ToolCategory, string> = {
  chat: '通用对话',
  coding: '编程开发',
  image: '图像生成',
  video: '视频生成',
  audio: '语音音乐',
  research: '研究检索',
  agent: '智能体',
  office: '办公文档',
  data: '数据分析',
  'open-source': '开源本地',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '深入',
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  web: '网页',
  ios: 'iOS',
  android: 'Android',
  windows: 'Windows',
  mac: 'macOS',
  api: 'API',
  plugin: '插件',
  cli: '命令行',
}

export const RISK_LABELS = {
  low: '较低',
  medium: '中等',
  high: '较高',
} as const

export const LATENCY_LABELS = {
  fast: '快',
  medium: '中等',
  slow: '慢',
} as const

export const STABILITY_LABELS = {
  high: '高',
  medium: '中等',
  low: '偏低',
} as const

export const PRICING_MODEL_LABELS = {
  free: '完全免费',
  freemium: '免费增值',
  paid: '付费为主',
  'open-source': '开源免费',
} as const

export const UPDATE_TYPE_LABELS: Record<UpdateType, string> = {
  'new-tool': '新增工具',
  removed: '下架/移除',
  'price-change': '价格变动',
  'capability-change': '能力变更',
  'new-concept': '新增概念',
  'new-guide': '新增教程',
  'data-fix': '数据修正',
}

export const REUSABILITY_LABELS: Record<'high' | 'medium' | 'low', string> = {
  high: '高',
  medium: '中',
  low: '低',
}