import type { CapabilityKey, CapabilityScore, Tool } from './types.ts'

/** 人工核对一手发布说明。采集时间不能冒充资料复核时间。 */
export const TOOL_REVIEW_DATE = '2026-10-08'
type Review = Omit<Partial<Tool>, 'capabilities' | 'sources'> & {
  capabilities?: Partial<Record<CapabilityKey, CapabilityScore>>
  sources: Tool['sources']
}
const reviews: Record<string, Review> = {
  chatgpt: {
    tagline: '写作、资料整理与日常工作助手',
    description:
      '把任务、材料和交付格式一起告诉它，用来起草文档、分析表格和解释问题。GPT-6 Intelligent UI 正在分批开放；ChatGPT 与 Work、Codex 的模型和额度分别看待。',
    weaknesses: [
      '模型、文件与研究功能有套餐和额度限制。',
      '搜索结果和生成内容都需要核对原始来源。',
      '长任务要保留材料和验收要求，避免多轮对话丢失条件。',
    ],
    avoidFor: [
      '未经核验就提交正式研究结论。',
      '上传组织不允许外传的敏感资料。',
      '把生成的文档、公式或代码直接当作最终成品。',
    ],
    contextWindow: '随模型、套餐与入口变化，以当前模型说明为准',
    pricing: {
      model: 'freemium',
      freeTier: '有免费版，模型和工具使用受额度限制。',
      paidFrom: 'Go、Plus、Pro 等套餐；价格按地区与结算方式查看官方页面',
      note: '订阅、API 与部分工作入口分别计费，不能用一项额度推断全部功能。',
    },
    capabilities: {
      reasoning: {
        score: 4,
        basis: 'GPT-6 系列提供复杂任务处理；实际效果取决于模型、任务与所给材料。',
      },
      research: { score: 3, basis: '支持搜索与研究功能；必须检查引用是否真正支持结论。' },
      data: { score: 3, basis: '支持文件与数据分析；结果需复核表头、计算口径和公式。' },
      office: {
        score: 3,
        basis: '官方提供文档及办公文件工作能力，入口和可用性取决于账户；成品需检查排版与内容。',
      },
    },
    sources: [
      {
        label: 'GPT-6 与 Intelligent UI 发布说明',
        url: 'https://openai.com/index/gpt-6-for-everyone/',
      },
      {
        label: 'ChatGPT 当前发布记录',
        url: 'https://help.openai.com/en/articles/6825453-chatgpt-release-notes',
      },
      { label: 'ChatGPT 当前套餐', url: 'https://chatgpt.com/pricing/' },
    ],
  },
  claude: {
    description:
      '适合长材料整理、文档写作和代码协作。当前官方发布包括 Haiku 5.5、Sonnet 5.5 和 Opus 5.5；产品已支持网络搜索与办公文件创建，不再是只能输出文本的助手。',
    weaknesses: [
      '搜索与长文件处理会消耗使用额度。',
      '办公文件生成后仍要检查排版、公式和引用。',
      '模型和功能的可用范围受套餐、地区与组织设置影响。',
    ],
    avoidFor: [
      '不读原文就采用搜索回答的结论。',
      '忽略组织权限，让代理执行外部操作。',
      '需要本地离线处理且资料不能上传的任务。',
    ],
    contextWindow: '按当前模型与套餐核对，不统一写成固定窗口',
    pricing: {
      model: 'freemium',
      freeTier: '有免费版，使用额度会按周期恢复；长文件和搜索消耗额度。',
      paidFrom: 'Pro 月付 $20；年付折合约 $17/月（预付 $200）',
      note: 'Max、Team、Enterprise 与 API 另有计费方式；价格未含可能适用的税费。',
    },
    capabilities: {
      research: { score: 3, basis: 'Claude 产品支持网络搜索和来源引用，组织可控制是否启用。' },
      office: { score: 3, basis: '支持创建文档、表格、演示与 PDF；生成后仍需人工检查。' },
    },
    sources: [
      { label: 'Haiku 5.5 官方发布', url: 'https://www.anthropic.com/claude-haiku-5-5' },
      {
        label: '网络搜索说明',
        url: 'https://support.claude.com/en/articles/10684626-enable-and-use-web-search',
      },
      { label: '创建与编辑办公文件', url: 'https://claude.com/resources/articles/create-files' },
      { label: '当前套餐', url: 'https://claude.com/pricing' },
    ],
  },
  gemini: {
    description:
      '适合结合长材料、图像与 Google 工作环境完成任务。官方最新发布为 Gemini 4 Argon；模型发布与个人账号实际可用功能需要分别核对。',
    weaknesses: [
      '功能受地区、年龄、套餐和组织权限影响。',
      '长材料回答仍可能遗漏条件，需要回到原文核对。',
      '连接邮件、文档等服务前应检查授权范围。',
    ],
    avoidFor: [
      '未复核就发布研究结论。',
      '在组织未授权时连接工作资料。',
      '要求模型仅凭截图准确读取所有细小数字的任务。',
    ],
    contextWindow: '随模型与使用入口变化，以官方模型说明为准',
    pricing: {
      model: 'freemium',
      freeTier: '有免费入口，高级模型和功能有使用限制。',
      paidFrom: 'Google AI 套餐按地区与结算方式定价',
      note: '个人订阅、Workspace 与开发者 API 的额度和费用分别核对。',
    },
    sources: [
      {
        label: 'Gemini 4 Argon 官方发布',
        url: 'https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/',
      },
      { label: 'Google AI 当前套餐', url: 'https://one.google.com/about/google-ai-plans/' },
    ],
  },
  kimi: {
    tagline: '长材料、研究与办公任务协作',
    description:
      '从长材料阅读扩展到研究、办公产出与代码协作。Kimi K3 已发布，Kimi Code Desktop 也有独立工作入口；不同功能共用的额度和可用范围需看会员说明。',
    weaknesses: [
      '复杂任务、研究和代码工作会消耗共享额度。',
      '长材料摘要仍可能遗漏限定词，需要核对原文。',
      '生成的演示、表格和代码需要人工验收。',
    ],
    avoidFor: [
      '把研究报告中的引用当作已经验证的证据。',
      '不检查权限就执行代理建议的操作。',
      '把百万 token 模型能力等同于所有账号都可无上限上传。',
    ],
    contextWindow: 'K3 模型支持百万 token；产品实际容量按会员与入口核对',
    pricing: {
      model: 'freemium',
      freeTier: '有免费额度；高阶任务和更高容量有会员限制。',
      paidFrom: '会员套餐以当前购买页为准',
      note: '研究、Slides、Code、Work 等功能按会员规则共享额度；API 独立计费。',
    },
    capabilities: {
      coding: { score: 3, basis: 'K3 与 Kimi Code 提供代码和代理工作入口，复杂项目仍需测试。' },
      office: { score: 3, basis: '会员功能包含 Slides 和 Work 等办公入口，成品需检查内容与格式。' },
    },
    sources: [
      { label: 'K3 官方发布', url: 'https://www.kimi.com/news/kimi-k3' },
      { label: 'Code Desktop 官方发布', url: 'https://www.kimi.com/news/kimi-code-desktop' },
      { label: '会员套餐', url: 'https://www.kimi.com/membership/pricing' },
      { label: '会员额度说明', url: 'https://www.kimi.ai/help/membership/membership-overview' },
    ],
  },
  qwen: {
    description:
      '中文模型、开源模型与多模态工具并行发展。官方近期发布涵盖 Qwen3.8 Omni Flash 与 Qwen Image 2.1；Qwen 网页产品、通义应用、云 API 和自部署需要分别判断。',
    weaknesses: [
      '不同模型、产品和部署方式的能力差异很大。',
      '自部署仍有硬件、运行维护与模型许可成本。',
      '搜索引用和生成文件需要核对内容与格式。',
    ],
    avoidFor: [
      '把一个模型的功能套用到所有 Qwen 产品。',
      '未核对许可就把开源模型用于商业项目。',
      '没有本地硬件准备就直接部署大型模型。',
    ],
    contextWindow: '按所选模型、云服务或本地配置核对',
    pricing: {
      model: 'freemium',
      freeTier: '网页或应用可提供免费额度；云 API 免费试用按模型和活动核对。',
      paidFrom: '云 API 按模型及输入、输出、缓存等分别计费',
      note: '自部署不收云 API 调用费，但仍有硬件、电费和维护成本。',
    },
    sources: [
      { label: 'Qwen 官方实时发布', url: 'https://qwen.ai/blog' },
      { label: '阿里云模型与价格', url: 'https://help.aliyun.com/zh/model-studio/models' },
    ],
  },
  deepseek: {
    tagline: '推理、代码与视觉输入',
    description:
      'DeepSeek V4.1 Flash 已发布，官方新增原生视觉输入。网页、应用与 API 的功能和价格分别核对，不能继续把全部 DeepSeek 产品描述为纯文本、无搜索的工具。',
    weaknesses: [
      '识图与视觉输入不等于生成图片或视频。',
      '不同客户端与 API 的工具、搜索和文件能力有差异。',
      '代理、文件交付和业务集成需要按具体入口验证。',
    ],
    avoidFor: [
      '把图像理解当作图像生成工具。',
      '直接使用未经核对的搜索引用或推理结论。',
      '把历史促销单价当作当前所有模型的价格。',
    ],
    contextWindow: '按当前 API 模型或产品入口核对',
    multimodal: { text: true, image: true, audio: false, video: false, file: true },
    pricing: {
      model: 'freemium',
      freeTier: '网页和应用提供免费使用入口；API 独立计费。',
      paidFrom: 'API 按模型、缓存命中与输入输出用量计费',
      note: '已移除旧促销单价；购买前查看官方价格页及最新 API 公告。自部署仍有硬件成本。',
    },
    capabilities: {
      vision: {
        score: 3,
        basis: 'V4.1 Flash 官方新增原生视觉输入，实际可用性按客户端或 API 核对。',
      },
      research: {
        score: 2,
        basis: '搜索取决于产品入口；模型 API 本身不能等同于具备完整的联网研究流程。',
      },
    },
    sources: [
      { label: 'V4.1 Flash 官方发布', url: 'https://www.deepseek.com/news/deepseek-v4-1-flash/' },
      { label: '最新 API 公告', url: 'https://api-docs.deepseek.com/updates' },
      { label: '当前 API 计费', url: 'https://api-docs.deepseek.com/quick_start/pricing' },
    ],
  },
  cursor: {
    description:
      '在编辑器里理解项目、修改多个文件并运行验证。近期增加了本地代理远程控制：可从手机继续任务，但本地电脑仍需保持在线；云代理是另一种运行方式。',
    pricing: {
      model: 'freemium',
      freeTier: 'Hobby 免费，Agent 请求受限。',
      paidFrom: 'Individual Pro 月付 $20；其他档位和团队版另计',
      note: '模型用量、代理、Bugbot 等计费分别按官方说明核对。',
    },
    sources: [
      {
        label: '本地代理远程控制',
        url: 'https://cursor.com/changelog/remote-control-local-agents',
      },
      { label: '当前套餐', url: 'https://cursor.com/pricing' },
    ],
  },
  copilot: {
    description:
      '在代码编辑器和 GitHub 工作流中辅助编程、评审与代理任务。官方已开始提供 Claude Haiku 5.5，实际模型选项取决于套餐、客户端和组织设置。',
    pricing: {
      model: 'freemium',
      freeTier: '有 Free 方案，聊天、代理和模型使用有额度限制。',
      paidFrom: 'Pro、Pro+、Business、Enterprise 等方案按官方购买页核对',
      note: '可用模型和计费倍率随套餐与版本变化，不能把一个模型的额度套用到全部模型。',
    },
    sources: [
      {
        label: 'Haiku 5.5 进入 Copilot',
        url: 'https://github.blog/changelog/2026-10-07-claude-haiku-5-5-in-github-copilot/',
      },
      { label: '当前方案', url: 'https://github.com/features/copilot/plans' },
    ],
  },
  ollama: {
    description:
      '下载模型在自己的电脑运行，也可选择 Ollama Cloud。需要资料留在本机时，要明确使用本地模型并关闭云功能；最新版本信息可在下方官方动态查看。',
    weaknesses: [
      '本地速度和可运行模型受内存、显存与硬件影响。',
      '云模型需要联网和账号，并受云服务额度及计费限制。',
      '运行器不等于完整办公工作流，检索和文件交付要按集成验证。',
    ],
    avoidFor: [
      '把 Cloud 模型当作离线、仅本机处理。',
      '在未核对模型许可时进行商用。',
      '没有合适硬件就预期大型本地模型能流畅运行。',
    ],
    pricing: {
      model: 'open-source',
      freeTier: '本地运行没有云调用费；Cloud 免费账号有起始额度。',
      note: '本地承担硬件、电费和维护成本；Cloud 有付费套餐和用量计费，按官方价格页核对。模型各有许可。',
    },
    platforms: ['windows', 'mac', 'cli', 'api'],
    capabilities: {
      research: {
        score: 2,
        basis: '可通过集成使用搜索能力；仅运行本地模型本身不等于已接入网络检索。',
      },
    },
    sources: [
      { label: '官方版本发布', url: 'https://github.com/ollama/ollama/releases' },
      { label: '本地与云功能', url: 'https://docs.ollama.com/cloud' },
      { label: '云端当前计费', url: 'https://ollama.com/pricing' },
    ],
  },
}

/** 新的人工编辑优先，避免历史后台快照恢复已纠正的过时信息。 */
export function applyToolReview(tool: Tool): Tool {
  const review = reviews[tool.id]
  if (!review || tool.updatedAt >= TOOL_REVIEW_DATE) return tool
  return {
    ...tool,
    ...review,
    capabilities: { ...tool.capabilities, ...review.capabilities },
    sources: [
      ...review.sources,
      ...tool.sources.filter((source) => !review.sources.some((item) => item.url === source.url)),
    ],
    evidence:
      '根据官方发布说明与产品文档整理。评分是编辑对功能和使用边界的判断，本站不做自建评测；新版模型、套餐、地区和入口变化后需要复核。',
    updatedAt: TOOL_REVIEW_DATE,
  }
}
