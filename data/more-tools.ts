import type { CapabilityKey, CapabilityScore, Tool } from './types'

// 2026-10-09 官方文档复核；分数描述功能匹配，不是跨模型跑分。
const keys: CapabilityKey[] = [
  'writing',
  'longform',
  'reasoning',
  'math',
  'coding',
  'research',
  'agent',
  'data',
  'office',
  'imageGen',
  'vision',
  'video',
  'voice',
  'realtime',
]
function scores(
  overrides: Partial<Record<CapabilityKey, CapabilityScore>>,
  framework = false,
): Tool['capabilities'] {
  return Object.fromEntries(
    keys.map((key) => [
      key,
      overrides[key] ?? {
        score: framework ? 0 : 3,
        basis: framework
          ? '这是流程框架，不是基础模型；此项由接入的模型或工具决定。'
          : '官方支持文本任务；本站未做横向评测，请用自己的样例核验。',
      },
    ]),
  ) as Tool['capabilities']
}
const common = {
  overallScore: 0,
  chineseQuality: 3 as const,
  updatedAt: '2026-10-09',
  hallucinationRisk: 'medium' as const,
  latency: 'medium' as const,
  stability: 'medium' as const,
  evidence:
    '依据官方文档整理功能边界，本站不做自建评测。框架的流程能力不能等同于基础模型的知识与推理能力；模型、资料质量、权限及版本变化均会影响结果。建议保留一组任务样例，核对引用、字段、失败处理和实际调用成本。',
}
export const moreTools: Tool[] = [
  {
    ...common,
    id: 'gemma',
    name: 'Gemma',
    nameEn: 'Gemma',
    vendor: 'Google DeepMind',
    logo: '/logos/gemma.svg',
    tagline: '从本地小模型到多模态，先选硬件能承受的版本',
    description:
      'Gemma 是可自行部署的模型家族。当前主系列为 Gemma 4，按大小与版本选择文本、图像及部分音频输入；EmbeddingGemma 2 是检索向量模型，不能当聊天模型使用。适合了解本地模型、资料检索与部署取舍。',
    categories: ['chat', 'open-source'],
    tags: ['本地模型', 'Gemma 4', '开放权重', 'EmbeddingGemma 2', '进阶'],
    capabilities: scores({
      imageGen: { score: 0, basis: 'Gemma 4 输出文本，不提供原生图像生成。' },
      video: { score: 1, basis: '按具体模型与部署入口支持视觉输入，不能生成视频。' },
      voice: { score: 2, basis: '部分 Gemma 4 版本接受音频输入；这里不把音频理解计为语音合成。' },
      realtime: { score: 1, basis: '实时性能取决于本地硬件、量化与服务实现。' },
    }),
    strengths: [
      '可以本地部署，明确选择模型版本与推理环境',
      '提供多个尺寸，适合练习速度、内存与质量的取舍',
      '配合嵌入模型搭建可回查来源的资料检索',
    ],
    weaknesses: [
      '下载权重和安装运行环境需要技术准备',
      '同一个家族的不同尺寸、量化和模态能力不相同',
      '硬件不足时响应可能慢，输出仍可能编造事实',
    ],
    avoidFor: [
      '零配置、打开网页就能完成的首次体验',
      '未经验证就处理敏感资料或承诺数据绝不外传',
      '把嵌入模型当聊天模型，或默认小模型等同大模型',
    ],
    bestFor: [
      '在许可范围内练习本地模型部署',
      '用公开资料比较模型的字段提取表现',
      '学习检索向量与聊天模型的不同职责',
    ],
    chinaAccessible: true,
    contextWindow: 'Gemma 4 最高 256K；具体尺寸与部署参数不同',
    multimodal: { text: true, image: true, audio: true, video: false, file: false },
    hasApi: true,
    pricing: {
      model: 'open-source',
      freeTier: 'Gemma 4 权重采用 Apache 2.0；运行硬件与托管另计',
      note: '这里描述 Gemma 4；其他家族版本请单独核对许可。下载源与硬件条件影响能否运行。',
    },
    platforms: ['cli', 'api'],
    alternatives: ['qwen', 'deepseek', 'ollama'],
    officialUrl: 'https://ai.google.dev/gemma',
    docsUrl: 'https://ai.google.dev/gemma/docs/core/model_card_4',
    sources: [
      { label: 'Gemma 4 模型卡', url: 'https://ai.google.dev/gemma/docs/core/model_card_4' },
      { label: 'Gemma 家族发布记录', url: 'https://ai.google.dev/gemma/docs/releases' },
    ],
  },
  {
    ...common,
    id: 'mistral',
    name: 'Mistral',
    nameEn: 'Mistral',
    vendor: 'Mistral AI',
    logo: '/logos/mistral.svg',
    tagline: '模型、结构化输出与文档处理，按具体型号选择',
    description:
      'Mistral 提供多种文本、多模态和文档处理模型。Mistral Large 4 已于 10 月 6 日进入公开预览，权重尚待发布；其他型号的部署方式、上下文与许可需要分别核对。适合比较结构化提取和工具调用。',
    categories: ['chat', 'coding', 'agent'],
    tags: ['Mistral Large 4', '公开预览', '结构化输出', '函数调用', '进阶'],
    capabilities: scores({
      agent: { score: 4, basis: '官方提供函数调用、Agents 与工具接口；流程是否可靠仍需自行验收。' },
      imageGen: {
        score: 0,
        basis: '这里是模型 API 档案，不将第三方图像生成功能算作基础模型能力。',
      },
      video: { score: 0, basis: '本档案不提供视频生成能力。' },
      voice: { score: 2, basis: '音频任务需选 Voxtral 等专门型号，不是 Large 4 默认能力。' },
      realtime: { score: 2, basis: '实时音频需单独型号与接口，不能由 Large 4 的长上下文推断。' },
    }),
    strengths: [
      '结构化输出与函数调用有官方接口说明',
      '模型、OCR 与音频产品分工清楚，可按任务选型',
      '发布记录标明预览、替代型号和弃用时间',
    ],
    weaknesses: [
      '公开预览的接口与表现可能继续调整',
      '不同型号的模态、费用和开放许可不能混用',
      'API 请求与工具执行都需要自行处理异常及成本',
    ],
    avoidFor: [
      '把即将发布的权重描述为已经能下载部署',
      '依靠默认模型名长期运行而不检查弃用通知',
      '未经核对就引用文档中的金额、日期与责任人',
    ],
    bestFor: [
      '用脱敏文本练习 JSON 字段提取',
      '比较多模态文档问答与 OCR 的不同职责',
      '让工具调用生成待审批的任务清单',
    ],
    chinaAccessible: false,
    access: {
      reality:
        '在线 API、控制台与模型下载源的可达性、账号资格需要在实际网络环境确认；本站不保证大陆直连。',
      alternatives: ['qwen', 'deepseek'],
    },
    contextWindow: 'Large 4：1M；其他型号以各自模型卡为准',
    multimodal: { text: true, image: true, audio: false, video: false, file: true },
    hasApi: true,
    pricing: {
      model: 'freemium',
      freeTier: '开发者测试方案与额度以控制台为准',
      paidFrom: 'API 按型号与用量计费',
      note: '公开预览的临时优惠不会作为长期价格；正式使用前查看模型卡和账单。',
    },
    platforms: ['api', 'web', 'cli'],
    alternatives: ['qwen', 'deepseek', 'gemini'],
    officialUrl: 'https://mistral.ai',
    docsUrl: 'https://docs.mistral.ai/models/mistral-large-4-0',
    sources: [
      { label: 'Mistral Large 4 模型卡', url: 'https://docs.mistral.ai/models/mistral-large-4-0' },
      { label: 'Mistral 发布与弃用记录', url: 'https://docs.mistral.ai/resources/changelogs' },
    ],
  },
  {
    ...common,
    id: 'dify',
    name: 'Dify',
    nameEn: 'Dify',
    vendor: 'LangGenius',
    logo: '/logos/dify.svg',
    tagline: '把资料检索与 Agent 流程搭成看得见的节点',
    description:
      'Dify 用可视化方式组织模型、知识检索、工具与流程。适合先搭一个小范围资料问答或任务草稿；Agent 节点的新旧模式不同，试用时应按当前文档确认能力和执行环境。它本身不是一个大模型。',
    categories: ['agent', 'data'],
    tags: ['知识库', '可视化流程', 'Agent', '自托管', '进阶'],
    capabilities: scores(
      {
        agent: { score: 4, basis: '官方 Agent 节点和工作流提供工具配置、执行控制与结果输出。' },
        research: { score: 3, basis: '可配置知识检索；引用是否可靠取决于资料、检索与模型。' },
      },
      true,
    ),
    strengths: [
      '把检索、模型与输出节点放在一条可检查流程里',
      '适合从少量公开资料搭建问答原型',
      '支持配置模型供应商与工具权限，能逐步测试',
    ],
    weaknesses: [
      '自托管需要维护数据库、访问权限与版本',
      '模型密钥和调用费用需要另行配置',
      '资料上传并不保证检索命中，也不保证回答有依据',
    ],
    avoidFor: [
      '把默认流程当成已经通过验收的学校系统',
      '上传学生名单和成绩后直接向所有访客开放',
      '未经许可搭建多租户商业服务',
    ],
    bestFor: [
      '公开制度资料的带来源问答',
      '把表单内容整理成待审核摘要',
      '练习检索不足时明确拒答与转人工',
    ],
    chinaAccessible: true,
    multimodal: { text: true, image: false, audio: false, video: false, file: true },
    hasApi: true,
    pricing: {
      model: 'freemium',
      freeTier: '可自行部署源码；许可有附加条件，模型与服务器另计',
      paidFrom: '云服务与商业授权以官方方案为准',
      note: 'Dify 许可对多租户服务等有附加条件，不等于无限制的 Apache 2.0。',
    },
    platforms: ['web', 'api'],
    alternatives: ['n8n', 'langgraph'],
    officialUrl: 'https://dify.ai',
    docsUrl: 'https://docs.dify.ai/en/cloud/use-dify/nodes/agent',
    sources: [
      { label: 'Dify Agent 节点文档', url: 'https://docs.dify.ai/en/cloud/use-dify/nodes/agent' },
      { label: 'Dify 源码许可', url: 'https://github.com/langgenius/dify/blob/main/LICENSE' },
    ],
  },
  {
    ...common,
    id: 'n8n',
    name: 'n8n',
    nameEn: 'n8n',
    vendor: 'n8n',
    logo: '/logos/n8n.svg',
    tagline: '连接表单、模型与待办，把重复工作变成可检查的流程',
    description:
      'n8n 是流程自动化平台，可以把触发器、数据处理、模型与服务节点串起来。适合练习表单分类、资料整理与人工审批。AI 能力来自接入的模型，外部系统权限来自你配置的凭据。',
    categories: ['agent', 'office', 'data'],
    tags: ['流程自动化', 'AI 节点', '自托管', '人工审批', '进阶'],
    capabilities: scores(
      {
        agent: { score: 4, basis: '官方提供 AI Agent 与工具集成节点，可构建多步自动化。' },
        data: { score: 3, basis: '可编排字段处理与外部服务，但数据质量需自行验证。' },
        office: { score: 3, basis: '连接办公服务进行流程编排，不等同直接生成最终办公文件。' },
      },
      true,
    ),
    strengths: [
      '明确展示每一步的数据输入和执行结果',
      '连接重复事务时可先用固定流程，必要时再加入 Agent',
      '适合对失败、重复触发和人工审批进行演练',
    ],
    weaknesses: [
      '连接器能执行真实写操作，权限配置错误会影响原系统',
      '失败重试可能重复创建记录，需设计去重规则',
      '自托管维护与第三方模型费用需要额外预算',
    ],
    avoidFor: [
      '未经确认自动群发通知或覆盖原始数据',
      '把重试次数无限放开，反复执行付费调用',
      '把源码可获取误认为允许任意托管转售',
    ],
    bestFor: [
      '表单工单分类后生成待审核清单',
      '定时汇总公开数据并提示人工核对',
      '把会议行动项整理成草稿待办',
    ],
    chinaAccessible: true,
    multimodal: { text: true, image: false, audio: false, video: false, file: true },
    hasApi: true,
    pricing: {
      model: 'freemium',
      freeTier: '自托管 Community 版可用于许可允许的用途',
      paidFrom: '云托管与商业功能按官方套餐收费',
      note: '采用 Sustainable Use License 等许可，存在使用范围限制；模型与服务器费用另计。',
    },
    platforms: ['web', 'api'],
    alternatives: ['dify', 'langgraph'],
    officialUrl: 'https://n8n.io',
    docsUrl: 'https://docs.n8n.io/advanced-ai/',
    sources: [
      { label: 'n8n AI 集成文档', url: 'https://docs.n8n.io/advanced-ai/' },
      { label: 'n8n 定价与社区版说明', url: 'https://n8n.io/pricing/' },
      { label: 'n8n 许可说明', url: 'https://docs.n8n.io/sustainable-use-license/' },
    ],
  },
  {
    ...common,
    id: 'langgraph',
    name: 'LangGraph',
    nameEn: 'LangGraph',
    vendor: 'LangChain',
    logo: '/logos/langgraph.svg',
    tagline: '用代码控制状态、暂停与恢复，适合需要精细流程的 Agent',
    description:
      'LangGraph 是面向开发者的 Agent 编排框架，用状态图描述流程，可以设计持久化、人工介入和恢复执行。适合已经能读写代码、希望追踪中间状态的人。它不自带模型，也不是免配置的聊天产品。',
    categories: ['agent', 'coding', 'open-source'],
    tags: ['Agent 编排', '状态图', '开发者', '人工介入', '进阶'],
    capabilities: scores(
      {
        agent: { score: 4, basis: '官方文档提供状态编排、持久化、人工介入与长期运行能力。' },
        coding: { score: 2, basis: '这是编排 SDK，不是自动写代码模型；需要开发者编写节点。' },
      },
      true,
    ),
    strengths: [
      '用明确状态与节点控制流程，便于回查中间结果',
      '能设计人工暂停点和恢复条件',
      '适合将确定性规则与模型步骤放在同一工作流',
    ],
    weaknesses: [
      '需要代码、存储和运行环境的维护能力',
      '持久化和恢复并不会自动消除重复写入',
      '模型、工具、权限与评估集均需自行设计',
    ],
    avoidFor: [
      '不熟悉代码时直接搭复杂生产系统',
      '依靠自动恢复无限重试收费或写入动作',
      '把 SDK 许可与托管产品的价格混为一谈',
    ],
    bestFor: [
      '会议行动项的多步核对与人工确认',
      '带暂停、失败分支和恢复的 Agent 练习',
      '对同一任务保留版本、日志与回归样例',
    ],
    chinaAccessible: true,
    multimodal: { text: true, image: false, audio: false, video: false, file: false },
    hasApi: true,
    pricing: {
      model: 'open-source',
      freeTier: '编排 SDK 采用 MIT 许可；模型和基础设施另计',
      note: 'LangSmith 等托管产品单独计费；SDK 免费不代表运行零成本。',
    },
    platforms: ['api', 'cli'],
    alternatives: ['dify', 'n8n'],
    officialUrl: 'https://www.langchain.com/langgraph',
    docsUrl: 'https://docs.langchain.com/oss/javascript/langgraph/overview',
    sources: [
      {
        label: 'LangGraph 官方概览',
        url: 'https://docs.langchain.com/oss/javascript/langgraph/overview',
      },
      {
        label: 'LangGraph SDK 许可',
        url: 'https://github.com/langchain-ai/langgraph/blob/main/LICENSE',
      },
    ],
  },
]
