import type { NewsItem } from '../lib/news/types.ts'

export type NewsSeed = Pick<
  NewsItem,
  'title' | 'summary' | 'takeaway' | 'category' | 'sourceId' | 'url' | 'publishedAt' | 'toolIds'
>
/** 2026-10-08 核对的一手消息。获取时间由采集服务记录，不伪装成发布时间。 */
export const newsSeed: NewsSeed[] = [
  {
    title: 'ChatGPT 加入 GPT-6 与交互式回答',
    summary:
      '回答可结合文字、图解和可操作组件。官方从 10 月 7 日开始分批开放，具体可用性取决于套餐与工作区。',
    takeaway: '适合关注可视化学习、任务规划和日常工作的读者。',
    category: '模型发布',
    sourceId: 'openai',
    url: 'https://openai.com/index/gpt-6-for-everyone',
    publishedAt: '2026-10-07T00:00:00Z',
    toolIds: ['chatgpt'],
  },
  {
    title: 'Claude Haiku 5.5 发布',
    summary:
      'Anthropic 发布新一代小模型，同时调整 Sonnet 5.5 缓存读取价格。模型 API 与 Claude 订阅是不同的计费入口。',
    takeaway: '做批量摘要、分类和智能体开发时，可核对新模型的成本与开放范围。',
    category: '模型发布',
    sourceId: 'anthropic',
    url: 'https://www.anthropic.com/claude-haiku-5-5',
    publishedAt: '2026-10-07T00:00:00Z',
    toolIds: ['claude'],
  },
  {
    title: 'GitHub Copilot 接入 Claude Haiku 5.5',
    summary: '官方公布 Copilot 的新模型接入消息；可用范围与启用方式请查看发布说明。',
    takeaway: '使用 Copilot 的读者可检查模型选择器和组织设置。',
    category: '编程工具',
    sourceId: 'copilot',
    url: 'https://github.blog/changelog/2026-10-07-claude-haiku-5-5-in-github-copilot/',
    publishedAt: '2026-10-07T20:12:18Z',
    toolIds: ['copilot'],
  },
  {
    title: 'Cursor 可从手机查看和回复本地代理',
    summary: 'Cursor 推出本地代理远程控制。任务仍在原电脑执行，需要电脑保持开机联网。',
    takeaway: '外出跟进编程任务时可关注；先确认企业设置与配对权限。',
    category: '编程工具',
    sourceId: 'cursor',
    url: 'https://cursor.com/changelog/remote-control-local-agents',
    publishedAt: '2026-10-06T00:00:00Z',
    toolIds: ['cursor'],
  },
  {
    title: 'Gemini 4 Argon 发布动态',
    summary: 'Google 发布 Gemini 4 Argon，官方页面说明新模型的能力与开放方式。',
    takeaway: '关注 Gemini 新版本时，区分模型发布与自己账号已经可用。',
    category: '模型发布',
    sourceId: 'google',
    url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/',
    publishedAt: '2026-09-30T20:00:00Z',
    toolIds: ['gemini'],
  },
  {
    title: 'Claude Sonnet 5.5：日常任务与代码工作更新',
    summary: 'Sonnet 5.5 于 9 月 28 日发布，官方介绍了速度、成本及编程和文档工作方面的变化。',
    takeaway: '可用自己的同一份任务比较结果；官方基准不等于每个场景的表现。',
    category: '模型发布',
    sourceId: 'anthropic',
    url: 'https://www.anthropic.com/claude-sonnet-5-5',
    publishedAt: '2026-09-28T00:00:00Z',
    toolIds: ['claude'],
  },
  {
    title: 'DeepSeek V4.1 Flash 带来原生视觉理解',
    summary:
      'DeepSeek 于 9 月 10 日发布 V4.1 Flash。网页产品与 API 的模型、价格及迁移安排需分别核对。',
    takeaway: '处理图片与文档、或迁移旧 API 时，先确认当前端点和官方变更记录。',
    category: '模型发布',
    sourceId: 'deepseek',
    url: 'https://www.deepseek.com/news/deepseek-v4-1-flash/',
    publishedAt: '2026-09-10T00:00:00Z',
    toolIds: ['deepseek'],
  },
]
