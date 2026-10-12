/** 已读取官方标题的中文整理；不推断套餐、参数或未说明的功能。 */
export const newsTitleEdits: Record<string, string> = {
  'https://github.com/ollama/ollama/releases/tag/v0.40.1': 'Ollama 发布 v0.40.1',
  'https://github.blog/changelog/2026-10-07-purpose-built-model-for-leaked-secret-detection':
    'GitHub 推出用于检测泄露密钥的专用模型',
  'https://github.blog/changelog/2026-10-07-local-sandboxing-for-github-copilot-now-generally-available':
    'GitHub Copilot 本地沙箱正式开放',
  'https://github.blog/changelog/2026-10-07-discover-local-models-in-github-copilot-cli':
    'Copilot CLI 新增本地模型发现功能',
  'https://openai.com/index/teens-learn-and-plan': 'OpenAI 分享面向青少年的学习与规划支持',
  'https://openai.com/index/radisson': 'Radisson 将酒店发现体验接入 ChatGPT',
  'https://github.blog/changelog/2026-10-06-update-your-ide-to-restore-agent-activity-in-copilot-usage-metrics':
    '更新 IDE，可恢复 Copilot 用量统计中的代理活动记录',
  'https://openai.com/index/atlassian-partnership': 'Atlassian 与 OpenAI 扩大企业知识协作',
  'https://openai.com/index/jump-trading': 'Jump Trading 分享用 ChatGPT 扩展量化研究的经验',
  'https://openai.com/index/sharing-ai-progress-in-mathematics': 'OpenAI 分享 AI 数学研究进展',
  'https://openai.com/index/advancing-computer-use-with-ironclad':
    'OpenAI 与 Ironclad 推进计算机使用能力',
  'https://www.anthropic.com/news/cyber-verification-program': 'Anthropic 扩展网络安全验证计划',
  'https://openai.com/index/eu-text-provenance': 'OpenAI 说明对欧盟文本来源规则的处理方式',
  'https://openai.com/index/new-chatgpt-ads-format-and-measurement':
    'OpenAI 介绍 ChatGPT 广告形式与衡量方式的更新',
  'https://github.blog/changelog/2026-10-02-copilot-code-review-api-support-and-new-default-effort-level':
    'Copilot 代码评审新增 API 支持，调整默认处理强度',
  'https://github.blog/changelog/2026-10-02-selected-models-in-github-copilot-deprecated':
    'GitHub Copilot 公告部分模型弃用',
  'https://openai.com/index/practical-guide-building-gpt-6': 'OpenAI 发布 GPT-6 系列模型选择指南',
  'https://blog.google/innovation-and-ai/technology/ai/google-ai-updates-september-2026':
    'Google 汇总 2026 年 9 月的 AI 更新',
}

/** 2026-10-13 读取各条官方原文后整理。URL 是证据键；不改写原文的发布时间。 */
export const newsBriefEdits: Record<string, { title: string; summary: string; takeaway: string }> =
  {
    'https://github.com/ollama/ollama/releases/tag/v0.40.3': {
      title: 'Ollama v0.40.3：调整启动提示与后台升级',
      summary:
        '移除启动 Claude、Codex 时的两类提示；暂停后台模型升级，以改善嵌入及其他请求的性能。',
      takeaway: '本地运行模型的用户可查看变更记录，再决定是否升级现有环境。',
    },
    'https://github.blog/changelog/2026-10-10-new-controls-and-chat-improvements-in-copilot-for-jetbrains':
      {
        title: 'JetBrains 版 Copilot：模型控制与聊天体验更新',
        summary: '新增企业默认模型控制、诊断快速修复和 MCP 启动设置，并改进账号与对话导航。',
        takeaway: '插件要求 JetBrains IDE 2025.2 或以上；升级前先确认自己的 IDE 版本。',
      },
    'https://github.blog/changelog/2026-10-09-github-copilot-weekly-releases-october-5': {
      title: 'Copilot 周报：Haiku 5.5、本地沙箱与账号管理',
      summary:
        '官方汇总本周更新：Haiku 5.5 接入多个 Copilot 套餐，本地沙箱正式开放，应用与 CLI 也有调整。',
      takeaway: '常用 Copilot 的开发者可按自己的编辑器与套餐查看对应更新。',
    },
    'https://openai.com/index/sophos': {
      title: 'Sophos 分享用 OpenAI Daybreak 加快安全调查的案例',
      summary: 'OpenAI 发布 Sophos 的安全运营案例：AI 代理整理线索、规划调查并提出响应建议。',
      takeaway: '适合了解 AI 在安全团队的应用。案例仍设置人工判断与客户授权边界。',
    },
    'https://openai.com/index/asana-browser-agent': {
      title: 'Asana 分享 GPT-6.1 Sol 浏览器代理优化方法',
      summary:
        '官方案例介绍 Asana 如何调整缓存、历史记录和截图策略，降低浏览器代理的模型调用成本。',
      takeaway: '构建自动化流程时可借鉴优化思路；案例中的节省幅度依赖其测试条件。',
    },
    'https://github.blog/changelog/2026-10-08-copilot-code-review-new-organization-billing-options-and-controls':
      {
        title: 'Copilot 代码评审新增组织计费与权限控制',
        summary: '组织可选择评审费用由成员额度或组织承担，也可限制哪些许可证持有者能发起评审。',
        takeaway: '组织付费模式需启用 AI Credits 付费用量；管理员可同时设置预算。',
      },
    'https://github.com/ollama/ollama/releases/tag/v0.40.2': {
      title: 'Ollama 发布 v0.40.2',
      summary: 'Ollama 官方仓库发布新的正式版本，更新项目以官方版本记录为准。',
      takeaway: '在本地模型环境更新前，先阅读变更记录并保留当前配置。',
    },
    'https://openai.com/index/oracle': {
      title: 'Oracle 分享 ChatGPT 与 Codex 在工作中的应用',
      summary: 'OpenAI 发布 Oracle 的企业案例，介绍用 ChatGPT 和 Codex 辅助日常工作与开发的方式。',
      takeaway: '可参考企业任务的拆解方式，再结合自己的资料、权限和工作流程。',
    },
    'https://openai.com/index/pollo-ai': {
      title: 'Pollo AI 分享将创意变为营销内容的应用案例',
      summary: 'OpenAI 发布 Pollo AI 的创作案例，介绍如何把创意用于营销内容制作。',
      takeaway: '做内容或设计时可了解协作流程，实际输出仍需核对质量与素材使用条件。',
    },
    'https://openai.com/index/legalon-halves-codex-costs': {
      title: 'LegalOn 分享降低 Codex 开发成本的经验',
      summary: '官方案例介绍 LegalOn 在维持开发速度的同时，调整 Codex 工作流程以降低调用成本。',
      takeaway: '适合开发团队参考成本管理思路，案例结果不能直接视为所有团队的效果。',
    },
    'https://openai.com/index/disrupting-ai-enabled-false-front-operations': {
      title: 'OpenAI 发布对 AI 虚假掩护行动的调查',
      summary: '官方发布有关 AI 被用于虚假掩护行动的调查消息，详细发现与处置见原文。',
      takeaway: '阅读网上内容时，留意来源、身份与证据，避免仅凭外观判断可信度。',
    },
    'https://www.anthropic.com/news/2026-usage-policy-update': {
      title: 'Anthropic 更新 2026 年使用政策',
      summary: '新政策进一步说明欺骗活动、高风险用途及自主物理行动等规则，将于 11 月 12 日生效。',
      takeaway: '使用 Claude 的团队应核对新规则与现有任务的关系，尤其是高风险应用。',
    },
    'https://www.anthropic.com/news/genesis-mission-commitment': {
      title: 'Anthropic 公布对美国科学研究的新承诺',
      summary: 'Anthropic 发表支持美国科学研究的官方公告，具体合作安排与适用范围见原文。',
      takeaway: '适合关注 AI 科研合作的读者；这条合作公告不代表普通账号新增功能。',
    },
    'https://www.anthropic.com/news/anthropic-cyber-mission': {
      title: 'Anthropic 发布 Cyber Mission 网络安全计划',
      summary: 'Anthropic 公布面向网络安全的官方计划，参与方式和服务范围以公告为准。',
      takeaway: '网络安全团队可关注计划的具体参与条件；普通用户可了解行业变化。',
    },
  }
