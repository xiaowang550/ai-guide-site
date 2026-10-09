import type { Difficulty, Platform, ToolCategory, UpdateType } from '@/data/types'

/** 站点基础配置：改品牌信息只动这里 */
export const siteConfig = {
  name: 'AI 能力图谱',
  shortName: '能力图谱',
  /**
   * 标语：留空表示「首页标题只用站点名」。
   *
   * 用它拼标题而不是反过来，是因为标语经常变（活动、口号），
   * 而站点名是身份、几乎不改。留空时不要拼出「AI 能力图谱 —— 」这种尾巴。
   */
  tagline: '',
  description:
    '把每个 AI 工具的能力量化成 14 个维度，用场景决策器告诉你「现在该用哪个、为什么、怎么问」。不吹不黑：强项、弱项、别用它做，全部写清楚。',
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-guide-site.pages.dev',
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

/**
 * 首页标题：标语为空时只用站点名，避免拼出「AI 能力图谱—— 」这种尾巴。
 * 这个函数也是 page-titles 测试的断言对象。
 */
/**
 * 站点标题。
 *
 * 参数只声明实际用到的两个字段，不写成整个 siteConfig ——
 * 否则测试想构造「带标语的假配置」时会因为缺一堆无关字段而通不过类型检查。
 */
export function siteTitle(site: { name: string; tagline: string } = siteConfig): string {
  const tagline = site.tagline.trim()
  return tagline ? `${site.name} —— ${tagline}` : site.name
}

export interface NavChild {
  href: string
  label: string
  /** 一句话说清「点进去能拿到什么」，悬停面板里显示 */
  hint: string
}

export interface NavItem {
  href: string
  label: string
  hint: string
  /**
   * 下拉面板里的子项。
   *
   * 只放「分区页之外的兄弟页面」。分区自己的首页由一级标签直接链接，
   * 如果面板里再列一遍同一个路径，用户会看到两个一模一样的入口，
   * 反而不知道该点哪个。所以这里的 href 不能等于所属分区的 href。
   *
   * 没有兄弟页面的分区（教程、案例…）就不给 children，
   * 组件会渲染成普通链接而不是带箭头的按钮。
   */
  children?: NavChild[]
}

/**
 * 一级导航：分区 + 兄弟页，桌面端悬停展开面板。
 *
 * 分区划分原则：一个面板里放的是「同一件事的不同切面」，
 * 而不是把无关页面堆进去。分区太多会让顶栏挤爆，所以合并了语义相近的：
 *   - 决策器/对比 合进「工具库」分区（都是「选工具」）
 *   - 更新/关于 合进「数据与站点」分区（都是「关于这个站本身」）
 */
export const schoolNavigation: NavItem = {
  href: '/edu',
  label: '学校服务',
  hint: '课程 / 教案包 / 规范',
  children: [
    { href: '/edu/programs', label: '课程体系', hint: '初中认识、高中实践、教师教学' },
    { href: '/edu/toolkits', label: '课程与教案包', hint: '选场景，取材料，按流程上课' },
    { href: '/edu/policy', label: 'AI 使用规范', hint: '看懂使用边界，带走规范与记录' },
    { href: '/edu/support', label: '答疑与反馈', hint: '高频问题与反馈入口' },
  ],
}

export const megaNav: readonly NavItem[] = [
  { href: '/', label: '首页', hint: '回到网站首页' },
  {
    href: '/guides',
    label: '教程',
    hint: 'AI 怎么用',
    children: [
      { href: '/start', label: '零基础一对一', hint: '从对话、作图到看图与语音，手把手练习' },
      { href: '/learn/access', label: '海外工具打不开', hint: '看懂原因，选择适合自己的替代工具' },
      // 「学习路径」原来占一个一级项，收进教程面板。
      // 原因是对齐 7 个文档站的实测：一级项之间普遍留 24-32px，
      // 而 7 个中文项每项要 70-110px，留到这个间距后中间那段搜索框
      // 在 1024px 断点处只剩一百多像素，等于没有。
      // 路径本身是「按顺序学的教程」，放进教程面板语义也说得通。
      { href: '/paths', label: '学习路径', hint: '按顺序学，每一节都有产出物' },
    ],
  },
  {
    href: '/cases',
    label: '案例',
    hint: '别人怎么做',
  },
  {
    href: '/tools',
    label: '工具库',
    hint: '哪个更强',
    children: [
      { href: '/find', label: '场景决策器', hint: '描述需求，纯规则算出该用哪个' },
      { href: '/compare', label: '工具对比', hint: '并排比较，链接可直接分享' },
    ],
  },
  {
    href: '/learn',
    label: '知识库',
    hint: 'AI 是什么',
    children: [
      {
        href: '/learn/advanced',
        label: '模型与 Agent 进阶',
        hint: '选模型、接资料、试流程，学会验收',
      },
      { href: '/learn/glossary', label: '术语表', hint: '中英对照速查，搜一个词就能查到' },
    ],
  },
  {
    href: '/updates',
    label: 'AI 资讯',
    hint: '新模型、新功能与最新消息',
    children: [
      { href: '/freshness', label: '内容复核状态', hint: '资料更新时间与待复核内容' },
      { href: '/saved', label: '我的学习夹', hint: '收藏实用方法，回到最近看过的内容' },
      { href: '/about', label: '我们怎么打分', hint: '评分方法、可信度、以及我们不做的事' },
    ],
  },
]

/** 移动端与页脚用的扁平列表：由 megaNav 拍平而来，避免两处各写一遍而漏项 */
export const primaryNav: readonly NavChild[] = megaNav.map(({ href, label, hint }) => ({
  href,
  label,
  hint,
}))

export const secondaryNav: readonly NavChild[] = [
  schoolNavigation,
  ...(schoolNavigation.children ?? []),
  ...megaNav.flatMap((g) => g.children ?? []),
]

/**
 * AI 教育专区内部导航。
 * 顶层已经有「学校服务」分区了，所以这里只列子页，不再重复总览页。
 */
export const eduNav = [
  { href: '/edu/programs', label: '课程体系' },
  { href: '/edu/toolkits', label: '课程与教案包' },
  { href: '/edu/policy', label: 'AI 使用规范' },
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
