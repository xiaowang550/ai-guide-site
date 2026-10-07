import type { Tool } from './types'

/**
 * 工具库（站点唯一工具数据源）
 *
 * 编写约定：
 * - 每条记录都必须诚实写出弱项与「别用它做」，不做营销文案。
 * - `capabilities` 14 个维度必须全部填写，score ≥ 4 或 ≤ 2 的维度必须写 `basis`（打分依据）。
 * - `overallScore` 一律写 0，由 `lib/score.ts` 的 `computeOverallScore` 加权计算后覆盖。
 * - `alternatives` 只能填本文件里存在的 id。
 * - 价格、额度、上下文窗口等易变信息用 `// TODO: verify` 标注，需要按季度复核。
 * - `updatedAt` 为最近一次人工复核日期，`sources` 至少两条一手来源。
 */

/** 定价备注统一口径：价格随时可能调整，落地前以官方定价页为准。 */
export const tools: Tool[] = [
  // ------------------------------------------------------------------
  // 1. ChatGPT
  // ------------------------------------------------------------------
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    nameEn: 'ChatGPT',
    vendor: 'OpenAI',
    logo: '/logos/chatgpt.svg',
    tagline: '最通用的基线，生态最厚',
    description:
      '通用能力的基线产品：对话、写作、代码、识图、语音、图像生成都做到了「够用且不挑人」。真正的价值在于它是最被广泛验证过的默认选项，换模型的成本最低。缺点是免费额度容易被高频使用撞墙，且同样一件事它不一定是最强的那个。',
    categories: ['chat'],
    tags: ['免费额度高', '生态成熟', '多模态', '适合写作', '适合入门', '插件生态'],
    capabilities: {
      writing: {
        score: 4,
        basis: '官方模型卡说明 + 社区长期反馈：改写、润色、结构化输出稳定，长文一致性偶有下滑',
      },
      longform: {
        score: 4,
        basis: '支持文件上传与长上下文总结，压缩策略成熟，超长文本后段会变钝',
      },
      reasoning: {
        score: 4,
        basis: 'o 系列推理模型在官方逻辑与科学基准上明显领先普通对话模式',
      },
      math: {
        score: 4,
        basis: '官方公布数学基准成绩，推理模式带逐步验算，复杂计算仍需复核',
      },
      coding: {
        score: 4,
        basis: '社区反馈普遍认为可读、可调、可解释，但同规模下代码质量不如专用编程代理',
      },
      research: {
        score: 2,
        basis: '联网搜索是需手动开启的独立功能，引用粒度不如检索型产品',
      },
      agent: {
        score: 4,
        basis: 'Agent 模式、GPTs 与 Computer Use 构成完整多步执行链路',
      },
      data: {
        score: 3,
        basis: '能读表格、写 SQL 画图，复杂统计分析需外接 Python 环境',
      },
      office: {
        score: 3,
        basis: '主产物是 Markdown 与代码，Word/PPT 交付需要第三方或手工转换',
      },
      imageGen: {
        score: 4,
        basis: '原生集成图像生成与局部编辑，风格控制弱于专用生图工具',
      },
      vision: {
        score: 4,
        basis: '图像理解、截图解析与文档 OCR 的公开反馈普遍稳定',
      },
      video: {
        score: 2,
        basis: '不生成视频，仅能分析视频内容并有独立的 Sora 入口',
      },
      voice: {
        score: 4,
        basis: '语音通话与高级语音模式为官方主推能力，延迟接近真人对话',
      },
      realtime: {
        score: 4,
        basis: 'Realtime API 与客户端语音实时流均可用，官方文档标注低延迟',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 ChatGPT 的分数稳定在 4 分档，是因为它的能力项在官方文档里都有明确对应功能（联网、图像生成、语音、文件上传、GPTs），功能存在即视为能力可用。例外是免费额度与高峰降级：这些不在 14 维体系内，但会直接影响体感，所以写进了弱项。更新到新一代模型或调整免费策略后，这组分数需要重看。',
    strengths: [
      '能力覆盖最全：文本、图片、音频、文件一个账号全包，不用在多个产品间切换',
      '生态最成熟：插件、GPTs、API、社区提示词最多，遇到问题基本都能搜到解法',
      '中文表达自然，翻译腔比多数海外产品轻，办公邮件和总结类任务可直接用',
      '高级语音与 Agent 模式让「聊」和「干」两种模式共存，切换成本低',
    ],
    weaknesses: [
      '免费版在高峰期会降级到小模型，且推理请求次数有限，密集使用会撞墙',
      '不开启联网时回答可能停在训练数据，问「最近」类问题容易答非所问',
      '深度模式下思考时间长、消耗额度大，简单改写也要等，体感偏慢',
      '长对话后半段会压缩早期内容，容易忘掉十几轮前定下的约束',
    ],
    avoidFor: [
      '需要逐条可核验引用的正式调研：默认不开联网，引用不如检索型工具完整',
      '要求数据不出本机的敏感材料：全部走云端，无法本地部署',
      '要直接交付 Word / PPT / Excel 成品文件的场景：主产物仍是文本',
    ],
    bestFor: [
      '不知道从哪个工具开始的新手，用它当基线做横向对比',
      '日常办公杂活：邮件、会议纪要、翻译、总结、结构化输出',
      '需要多模态输入的任务：把截图、PDF、表格一起丢进去问',
    ],
    chineseQuality: 3,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'OpenAI 未在中国大陆开放服务，官网与 API 在大陆网络下通常无法完成登录与对话；其服务条款也未把中国大陆列入支持地区，用不受支持的网络访问可能导致账号受限。',
      alternatives: ['kimi', 'deepseek', 'doubao'],
    },
    contextWindow: '400K tokens', // TODO: verify 具体上限随模型版本变动
    multimodal: { text: true, image: true, audio: true, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '免费版可用，高级推理模型有次数上限',
      paidFrom: '约 $20/月起（Plus）', // TODO: verify
      model: 'freemium',
      note: '套餐分档较多且额度策略调整频繁，以官方定价页为准',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'high',
    alternatives: ['claude', 'gemini', 'deepseek', 'kimi', 'qwen'],
    officialUrl: 'https://chatgpt.com',
    docsUrl: 'https://platform.openai.com/docs',
    sources: [
      { label: 'ChatGPT 官方定价', url: 'https://openai.com/chatgpt/pricing/' },
      { label: 'OpenAI 开发者文档', url: 'https://platform.openai.com/docs' },
      { label: 'ChatGPT 帮助中心', url: 'https://help.openai.com/' },
    ],
    updatedAt: '2026-09-24',
    featured: true,
  },

  // ------------------------------------------------------------------
  // 2. Claude
  // ------------------------------------------------------------------
  {
    id: 'claude',
    name: 'Claude',
    nameEn: 'Claude',
    vendor: 'Anthropic',
    logo: '/logos/claude.svg',
    tagline: '长文与代码的稳态选手',
    description:
      'Anthropic 出品的对话模型，长文理解、代码质量和「不乱编」是它被反复验证的强项。风格克制、废话少，长文档分析时会主动指出矛盾之处。短板是主产品不做联网检索，也没有图像生成。',
    categories: ['chat'],
    tags: ['长文能力强', '写作质量高', '适合写代码', '幻觉率低', '生态专业'],
    capabilities: {
      writing: {
        score: 5,
        basis: '写作圈长期反馈一致：结构稳、语气自然，长句不易崩，中文改写最不像机翻',
      },
      longform: {
        score: 5,
        basis: '200K 上下文加 Artifacts，长文档交叉比对与矛盾点标注是主打能力',
      },
      reasoning: {
        score: 4,
        basis: '扩展思考模式在复杂拆解任务上表现好，思维链长度受套餐限制',
      },
      math: {
        score: 4,
        basis: '官方数学基准稳定在前列，能给出推导过程，符号题仍需人工校验',
      },
      coding: {
        score: 4,
        basis: 'Claude Code 代理式编程长期处于 SWE-bench 第一梯队，代码风格干净',
      },
      research: {
        score: 2,
        basis: '主产品不做联网检索，需自行接入 API 的 web search 工具或外部检索',
      },
      agent: {
        score: 5,
        basis: 'Claude Code 加 MCP 与 Subagents，是当前代理式编程与工具调用最完整的一套',
      },
      data: {
        score: 4,
        basis: 'analysis 工具可在沙箱里跑 Python 处理数据并出图，不必手写代码',
      },
      office: {
        score: 3,
        basis: 'Artifacts 能出可交互页面与文档，Word / PPT 仍需导出转换',
      },
      imageGen: {
        score: 1,
        basis: '只能理解图片，不能生成图片，生图需另用工具',
      },
      vision: {
        score: 4,
        basis: '图表、扫描件与复杂截图解析的公开反馈较好，倾向把图里信息说清楚',
      },
      video: {
        score: 1,
        basis: '可分析视频帧，但不生成视频',
      },
      voice: {
        score: 2,
        basis: '有语音模式但不是核心方向，音色定制与方言支持都一般',
      },
      realtime: {
        score: 3,
        basis: 'Realtime 能力在 API 侧可用，客户端实时通话的流畅度不如原生语音产品',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Claude 的长文与代码高分，依据集中在官方对长上下文与代码生成能力的说明，以及社区在长文档一致性上的反复反馈。需要注意的是：主产品不做联网检索，检索类分数直接按「不具备」处理而不是给低分；换版本后长文档表现的公开反馈差异较大，建议以本页更新日期为参考。',
    strengths: [
      '长文阅读是硬优势：几十页 PDF 丢进去，它会主动指出互相矛盾的数据而不是硬凑结论',
      '代码可读性最好，生成的实现接近人类写法，注释也写得清楚',
      '幻觉率在主流产品里偏低，不确定时会明说不确定，而不是编一个像模像样的答案',
      'Artifacts 可以把代码和文档直接变成可交互产物，不用自己复制粘贴',
    ],
    weaknesses: [
      '主产品不做联网检索，问今天发生的事会停在训练数据上',
      '不能生成图片、做 PPT 或导出 Word，交付环节仍需手工加工',
      '国内无法直连，需要网络工具手段，团队协作时账号与合规是现实成本',
      '免费额度比 ChatGPT 紧，重度使用会较快触顶',
    ],
    avoidFor: [
      '需要全网检索并逐条标注来源的调研工作：默认离线，引用得自己接',
      '要求一句话出图或出视频的创意工作：本产品没有生成能力',
      '中国大陆团队需要全员直连、无需额外网络环境的场景',
    ],
    bestFor: [
      '读长文档：合同、论文、财报、需求文档的分析与交叉核对',
      '写代码与调代码，尤其是需要解释逻辑而不是只要能跑的场景',
      '中文写作与改写，长文、稿件、公文类文本的润色',
    ],
    chineseQuality: 3,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'Anthropic 未在中国大陆开放服务，网页版与 API 在大陆网络下通常无法登录；服务条款同样未把中国大陆列入支持地区。',
      alternatives: ['kimi', 'deepseek', 'qwen'],
    },
    contextWindow: '200K tokens',
    multimodal: { text: true, image: true, audio: true, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '免费版每天有限额度的对话',
      paidFrom: '约 $20/月起（Pro）', // TODO: verify
      model: 'freemium',
      note: '团队与企业版按席位计价，额度策略逐年收紧，以官方页面为准',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'cli'],
    hallucinationRisk: 'low',
    latency: 'medium',
    stability: 'high',
    alternatives: ['chatgpt', 'gemini', 'deepseek', 'kimi', 'ollama'],
    officialUrl: 'https://claude.ai',
    docsUrl: 'https://docs.anthropic.com',
    sources: [
      { label: 'Anthropic 官方定价', url: 'https://www.anthropic.com/pricing' },
      { label: 'Anthropic API 文档', url: 'https://docs.anthropic.com' },
      { label: '模型能力说明', url: 'https://docs.anthropic.com/en/docs/about-claude/models' },
    ],
    updatedAt: '2026-09-22',
    featured: true,
  },

  // ------------------------------------------------------------------
  // 3. Gemini
  // ------------------------------------------------------------------
  {
    id: 'gemini',
    name: 'Gemini',
    nameEn: 'Gemini',
    vendor: 'Google',
    logo: '/logos/gemini.svg',
    tagline: '超长上下文，Google 生态打通',
    description:
      'Google 的通用助手，核心是超长上下文：一次能读进去一整本书或一段长视频。与 Docs、Sheets、Gmail 的联动是它在国内用不上的护城河。代码和中文写作不是它的强项，但也不差。',
    categories: ['chat'],
    tags: ['超长上下文', '多模态', '免费额度高', 'Google 生态', '识图能力强'],
    capabilities: {
      writing: {
        score: 4,
        basis: '公开反馈普遍认为文本流畅、结构清晰；中文长文偶有英文式表达痕迹',
      },
      longform: {
        score: 5,
        basis: '官方 1M token 上下文，长文档、长视频可一次性读完并交叉提问',
      },
      reasoning: {
        score: 4,
        basis: '思考模式下复杂推理表现好，深度思考有次数与时长限制',
      },
      math: {
        score: 4,
        basis: '官方数学基准稳定，图表与公式类题目识别准确',
      },
      coding: {
        score: 3,
        basis: '可写可读代码并跑 Google Colab，同等条件下弱于专用编程代理',
      },
      research: {
        score: 3,
        basis: '可调 Google 搜索并给链接，Deep Research 模式更完整但国内不可用',
      },
      agent: {
        score: 3,
        basis: '有代理与 Google 服务联动能力，可用性高度依赖账号所在的 Google 生态',
      },
      data: {
        score: 3,
        basis: '与 Sheets 双向打通，复杂统计需借助代码执行环境',
      },
      office: {
        score: 4,
        basis: '与 Docs / Slides / Sheets 双向读写，是少数能直接改办公文件的助手',
      },
      imageGen: {
        score: 4,
        basis: '原生集成图像生成与局部编辑，可与对话上下文联动改图',
      },
      vision: {
        score: 5,
        basis: '视频、长文档、图表理解均为官方主打能力，公开反馈细节捕捉强',
      },
      video: {
        score: 2,
        basis: '不生成视频，但能理解视频内容并跨时间轴提问',
      },
      voice: {
        score: 3,
        basis: '有语音对话与 Live 模式，音色自然度尚可但不如专用语音产品',
      },
      realtime: {
        score: 3,
        basis: 'Live 语音对话延迟尚可，中文实时识别偶有断句错误',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Gemini 的多模态项依据官方对长视频/长文档理解的说明与上下文窗口规格，这类能力有明确的官方输入上限可核对。分数在「是否有联网与代码执行」上取决于接入形态（网页端 vs API），同一模型不同入口的表现可能不同。',
    strengths: [
      '1M token 上下文是硬指标：一次性读完整本书或整段长视频，不用切片拼凑',
      '视频理解能力突出，能对长视频做时间轴级别的提问',
      '与 Google 文档、表格、邮件双向打通，能直接改文件而不是只给文本',
      '免费额度相对宽松，多模态输入几乎不额外计费',
    ],
    weaknesses: [
      '中文写作不如国内模型自然，长文里偶有直译腔和逻辑跳跃',
      '国内无法直连，Google 生态联动（邮箱、文档）在本地基本用不上',
      '代码能力不是它的主攻方向，复杂工程需要自己配环境',
      '深度思考次数有限，密集跑复杂推理会很快触顶',
    ],
    avoidFor: [
      '需要大量生成或精细编辑图像的创意项目：生图风格控制不如专业工具',
      '中国大陆团队在无外部网络条件下协作：产品与依赖服务均不可直连',
      '写中文营销稿、公文等对语感要求极高的内容',
    ],
    bestFor: [
      '超长资料消化：整本书、整份年报、几百页文档一次性读完',
      '长视频理解：看课程、看会议录像并跨片段提问',
      '已经在用 Google Workspace 的团队，直接改文档和表格',
    ],
    chineseQuality: 3,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'Google Gemini 的可用性按地区划分，中国大陆不在其支持列表内；此外 Google 账号体系本身在大陆网络下也常无法完成注册与登录。',
      alternatives: ['qwen', 'doubao', 'yuanbao'],
    },
    contextWindow: '1M tokens', // TODO: verify 各模型档位不同
    multimodal: { text: true, image: true, audio: true, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '免费版每天有限额度，多模态输入不额外计费',
      paidFrom: '约 $19.99/月起（AI Pro）', // TODO: verify
      model: 'freemium',
      note: '与 Google One 订阅打包，套餐内其他权益变化会影响实际性价比',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'plugin', 'cli'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'high',
    alternatives: ['chatgpt', 'claude', 'perplexity', 'notebooklm'],
    officialUrl: 'https://gemini.google.com',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    sources: [
      { label: 'Google AI 套餐说明', url: 'https://one.google.com/about/google-ai-plans/' },
      { label: 'Gemini API 官方文档', url: 'https://ai.google.dev/gemini-api/docs' },
      { label: 'Gemini 模型说明', url: 'https://deepmind.google/models/gemini/' },
    ],
    updatedAt: '2026-09-18',
  },

  // ------------------------------------------------------------------
  // 4. 豆包
  // ------------------------------------------------------------------
  {
    id: 'doubao',
    name: '豆包',
    nameEn: 'Doubao',
    vendor: '字节跳动',
    logo: '/logos/doubao.svg',
    tagline: '免费额度最慷慨的国产通用助手',
    description:
      '字节跳动的通用助手，定位是「零成本、零门槛的日常 AI」。语音通话、生图、读文件都免费开放，对新手极其友好。代价是复杂推理和代码能力平庸，更像生活助手而不是生产力工具。',
    categories: ['chat'],
    tags: ['免费额度高', '中文能力强', '实时语音', '适合入门', '多模态'],
    capabilities: {
      writing: {
        score: 4,
        basis: '中文口语化表达自然，短文案、朋友圈、小红书类改写在公开反馈中评价较好',
      },
      longform: {
        score: 3,
        basis: '支持长文档上传与总结，但超长文本前后一致性会下降',
      },
      reasoning: {
        score: 3,
        basis: '常规逻辑题够用，多步复杂推理会绕，官方未公布推理基准',
      },
      math: {
        score: 3,
        basis: '能解常规数学题，涉及复杂符号推导需人工复核',
      },
      coding: {
        score: 2,
        basis: '能写简单脚本和单文件示例，调试与工程化能力明显不足',
      },
      research: {
        score: 3,
        basis: '自带联网搜索并标注来源，覆盖资讯类问题，学术检索深度有限',
      },
      agent: {
        score: 2,
        basis: '主站代理能力一般，复杂智能体更适合用扣子（Coze）平台自建',
      },
      data: {
        score: 2,
        basis: '能读图表与截图文字，复杂数据处理与统计需要外部工具',
      },
      office: {
        score: 2,
        basis: '主站不直接交付 Word / PPT，产出仍以对话文本为主',
      },
      imageGen: {
        score: 4,
        basis: '集成字节的图像生成与编辑能力，中文提示词理解好',
      },
      vision: {
        score: 4,
        basis: '识图与截图解析能力扎实，中文场景下的 OCR 表现好',
      },
      video: {
        score: 3,
        basis: '有视频生成入口，但主站集成度与可控性一般',
      },
      voice: {
        score: 4,
        basis: '实时语音通话为官方主推功能，延迟低、中文识别稳',
      },
      realtime: {
        score: 4,
        basis: '主打实时语音交互，断句与打断处理接近可用阈值',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 豆包的分数以官方功能清单与大陆可用性为主要依据，多模态与写作的中文反馈较集中。需要提醒：消费级产品的模型版本更新频繁且不逐次公告，本页分数属于「按公开信息整理的区间判断」，更新日期距今较久时请以官方说明为准。',
    strengths: [
      '免费额度非常高：日常对话、读文件、生图、语音几乎不限制，个人用基本零成本',
      '中文语感自然，生活化的表达最贴近国内用户习惯',
      '实时语音通话是免费里少见的成熟功能，识音稳、打断自然',
      '上手门槛低：App 直接用，不需要理解提示词工程',
    ],
    weaknesses: [
      '复杂推理一般，多步逻辑任务经常绕回原点，需要人工纠偏',
      '代码能力偏弱，只能写示例级别代码，真实工程帮不上忙',
      '长文档处理一致性差，读到后段会丢失前文设定的条件',
      '产出的内容缺少信息密度，同一问题换个大模型答案质量差距明显',
    ],
    avoidFor: [
      '写代码、调 Bug、做工程重构：能力与专门的编程工具差距很大',
      '严肃的学术或行业研究：检索深度与引用可靠性不足',
      '需要直接交付 Word / PPT / Excel 成品文件的办公场景',
    ],
    bestFor: [
      '零预算入门：先用它建立对 AI 能力边界的直觉',
      '生活与轻办公问答：查菜谱、改文案、翻译、写通知',
      '免费实时语音练习：练口语、练表达、录口播草稿',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    contextWindow: '1M tokens', // TODO: verify 以官方说明为准
    multimodal: { text: true, image: true, audio: true, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '个人使用基本免费，额度较高',
      model: 'free',
      note: '企业级能力与并发限制走火山引擎的付费 API，个人版无订阅',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'medium',
    alternatives: ['kimi', 'yuanbao', 'qwen', 'deepseek', 'glm'],
    officialUrl: 'https://www.doubao.com',
    docsUrl: 'https://www.volcengine.com/docs/82379',
    sources: [
      { label: '火山引擎豆包大模型文档', url: 'https://www.volcengine.com/docs/82379' },
      { label: '豆包官网', url: 'https://www.doubao.com' },
      { label: '火山引擎模型价格', url: 'https://www.volcengine.com/docs/82379/1099320' },
    ],
    updatedAt: '2026-09-12',
  },

  // ------------------------------------------------------------------
  // 5. Kimi
  // ------------------------------------------------------------------
  {
    id: 'kimi',
    name: 'Kimi',
    nameEn: 'Kimi',
    vendor: '月之暗面',
    logo: '/logos/kimi.svg',
    tagline: '长文档起家，检索是加分项',
    description:
      '月之暗面的通用助手，因超长文本处理能力出名，几十万字的资料丢进去照样能读。联网搜索带引用，公众号与资讯覆盖不错。国内直连、个人使用免费，是长文和检索需求的稳妥选择。',
    categories: ['chat'],
    tags: ['长文能力强', '免费额度高', '联网检索', '中文能力强', '适合办公', '国内直连'],
    capabilities: {
      writing: {
        score: 4,
        basis: '中文长文改写与公众号风格贴合国内语境，逻辑连接词略多',
      },
      longform: {
        score: 5,
        basis: '官方主打超长文本处理，几十万字资料一次读入并按段落引用定位',
      },
      reasoning: {
        score: 4,
        basis: '推理能力在国产通用助手中偏上，多步分析有结构化输出',
      },
      math: {
        score: 4,
        basis: '能给出解题步骤，复杂符号题仍需人工校验',
      },
      coding: {
        score: 3,
        basis: '能读写常规代码并解释，缺少工程化调试能力',
      },
      research: {
        score: 4,
        basis: '联网搜索默认开启且标注来源，资讯与公众号检索的公开反馈较好',
      },
      agent: {
        score: 3,
        basis: '有 Kimi 智能体与开放平台能力，但主站任务编排深度有限',
      },
      data: {
        score: 2,
        basis: '能读表格文本，复杂统计与可视化需要外部工具',
      },
      office: {
        score: 2,
        basis: '产出以对话与网页文本为主，不直接交付办公文件',
      },
      imageGen: {
        score: 2,
        basis: '有轻量生图能力，风格与可控性明显弱于专用生图工具',
      },
      vision: {
        score: 3,
        basis: '可读图片与文档截图，复杂图表解析准确率一般',
      },
      video: {
        score: 1,
        basis: '不生成视频，仅能理解部分视频内容',
      },
      voice: {
        score: 2,
        basis: '有语音通话入口，音色与功能深度不是产品重点',
      },
      realtime: {
        score: 1,
        basis: '以文字交互为主，实时语音与低延迟通话能力有限',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Kimi 的长文档分数依据其官方公布的超长上下文规格与公开的长文本处理说明，这类能力有可核对的参数。短文本写作与推理的分数主要来自公开反馈的倾向性判断，官方未公布可对比的基准，因此这部分依据相对薄弱。',
    strengths: [
      '长文档能力是核心卖点：几十万字资料一次读完，答案还能定位到原文段落',
      '联网搜索默认开启并带来源，资讯类问题比多数国产助手答得准',
      '个人使用免费额度较高，长文件解析基本不额外收费',
      '国内直连稳定，配合浏览器插件可以直接读网页和文档',
    ],
    weaknesses: [
      '不直接交付 Word / PPT / Excel 成品文件，办公链路要自己补',
      '代码能力中等偏下，复杂项目基本用不上',
      '长文摘要偶尔会丢掉细节限定词，引用段落需要自己点开核对',
      '复杂推理稳定性不如头部模型，多轮追问后容易自我重复',
    ],
    avoidFor: [
      '需要交付可编辑办公文件的场景：只出文本与网页',
      '以写代码、调代码为主的工作：编程能力不是它的强项',
      '对实时语音交互有要求的场景：语音不是它的重点能力',
    ],
    bestFor: [
      '读长资料：财报、论文集、行业报告、政策文件的通读与梳理',
      '需要带来源的资讯检索：查新闻、查行业动态并核对原文',
      '国内用户的日常免费助手',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    contextWindow: '2M tokens', // TODO: verify 官方口径为超长文本，具体数值以文档为准
    multimodal: { text: true, image: true, audio: false, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '个人使用免费，长文档解析额度较宽松',
      model: 'free',
      note: 'API 走开放平台按 token 计费，与官网免费对话是两套体系',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'medium',
    stability: 'medium',
    alternatives: ['doubao', 'qwen', 'deepseek', 'chatgpt', 'perplexity', 'notebooklm'],
    officialUrl: 'https://www.kimi.com',
    docsUrl: 'https://platform.moonshot.cn/docs',
    sources: [
      { label: '月之暗面开放平台定价', url: 'https://platform.moonshot.cn/docs/pricing/chat' },
      { label: '月之暗面 API 文档', url: 'https://platform.moonshot.cn/docs' },
      { label: 'Kimi 官网', url: 'https://www.kimi.com' },
    ],
    updatedAt: '2026-09-20',
    featured: true,
  },

  // ------------------------------------------------------------------
  // 6. 通义千问
  // ------------------------------------------------------------------
  {
    id: 'qwen',
    name: '通义千问',
    nameEn: 'Qwen',
    vendor: '阿里巴巴',
    logo: '/logos/qwen.svg',
    tagline: '中文基座扎实，开源最完整',
    description:
      '阿里的通义千问系列，中文基座能力扎实，同时是国产开源模型生态里最完整的一支：对话、代码、视觉、视频都有可下载的权重。适合既想用产品、又想自己微调或本地跑的人。',
    categories: ['chat'],
    tags: ['中文能力强', '开源模型', '可本地部署', '生态完整', '国内直连', 'API 便宜'],
    capabilities: {
      writing: {
        score: 4,
        basis: '中文表达与结构化写作的公开反馈稳定，风格偏正式，适合公文与长文',
      },
      longform: {
        score: 4,
        basis: '支持长文本与文件解析，部分版本提供超长上下文，摘要后段质量下降',
      },
      reasoning: {
        score: 4,
        basis: 'Qwen3 系列思考模式在开源模型推理基准上处于第一梯队',
      },
      math: {
        score: 4,
        basis: '数学与代码基准在同尺寸开源模型中领先，可输出推导步骤',
      },
      coding: {
        score: 4,
        basis: 'Qwen-Coder 系列在开源代码模型中排名靠前，API 价格低，适合批处理',
      },
      research: {
        score: 2,
        basis: '通义 app 联网搜索覆盖一般，学术检索与引用质量不如专业检索工具',
      },
      agent: {
        score: 3,
        basis: '有智能体应用与百炼平台工具编排，开箱即用的代理体验一般',
      },
      data: {
        score: 3,
        basis: '可处理表格与生成 SQL，配合百炼工作流能做简单分析',
      },
      office: {
        score: 3,
        basis: '通义可生成文档与表格内容，格式完整的 PPT / Word 仍需外部工具',
      },
      imageGen: {
        score: 4,
        basis: '通义万相图像生成质量稳定，且权重开放可自部署',
      },
      vision: {
        score: 4,
        basis: 'Qwen-VL 系列在开源多模态理解基准上领先，文档与图表解析能力强',
      },
      video: {
        score: 3,
        basis: '通义万相提供视频生成能力，效果可用但可控性一般',
      },
      voice: {
        score: 3,
        basis: '通义听悟的语音转写能力强，语音合成与音色定制能力一般',
      },
      realtime: {
        score: 2,
        basis: '主产品以文字交互为主，实时语音能力不是重点',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 通义千问的分数依据官方模型家族说明与开源权重可验证的部分（可本地部署这一点对学校场景影响很大）。闭源商用版与开源版能力差异明显，页面给出的是两者之间的中位判断，需按你的实际接入方式上下浮动。',
    strengths: [
      '开源生态最完整：对话、代码、视觉、视频、多模态全都有可下载权重，能自己微调',
      '中文基座扎实，公文、总结、结构化写作类任务质量稳定',
      'API 价格在国产里偏低，适合批量调用与自建应用',
      '有完整的云端工具链（百炼），从模型到应用编排不用散装拼',
    ],
    weaknesses: [
      '通义 app 的联网检索与引用质量一般，做严肃调研不如专业检索工具',
      '主产品的代理和多步任务能力一般，需要自己搭工作流',
      '不同版本（开源 / 商业 / 各尺寸）能力差异大，官方文档分散，选择成本高',
      '不直接交付格式完整的办公文件，产出仍以文本为主',
    ],
    avoidFor: [
      '需要逐条引用、强调来源可信度的正式调研',
      '要求开箱即用的深度代理编排，不想自己搭工作流的场景',
      '只想要一个轻量聊天助手的用户：能力过剩且配置偏复杂',
    ],
    bestFor: [
      '要自部署或微调的中文应用，代码、视觉、视频都想要',
      '需要便宜 API 做批量任务的工程团队',
      '中文长文与公文写作',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    contextWindow: '128K tokens 起（部分版本更长）', // TODO: verify
    multimodal: { text: true, image: true, audio: true, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '通义 app 基础对话免费，新用户 API 常有免费额度',
      paidFrom: '约 ¥0.8/百万 token 起（按模型不同）', // TODO: verify
      model: 'freemium',
      note: '价格随模型档位差异大，开源权重可自行部署以完全免除 API 费用',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'plugin', 'cli'],
    hallucinationRisk: 'medium',
    latency: 'medium',
    stability: 'high',
    alternatives: ['deepseek', 'glm', 'kimi', 'doubao', 'ollama'],
    officialUrl: 'https://www.tongyi.com',
    docsUrl: 'https://help.aliyun.com/zh/model-studio/',
    sources: [
      { label: '阿里云百炼模型列表与价格', url: 'https://help.aliyun.com/zh/model-studio/models' },
      { label: '通义千问开源仓库', url: 'https://github.com/QwenLM/Qwen3' },
      { label: '通义官网', url: 'https://www.tongyi.com' },
    ],
    updatedAt: '2026-09-15',
  },

  // ------------------------------------------------------------------
  // 7. DeepSeek
  // ------------------------------------------------------------------
  {
    id: 'deepseek',
    name: 'DeepSeek',
    nameEn: 'DeepSeek',
    vendor: '深度求索',
    logo: '/logos/deepseek.svg',
    tagline: '推理性价比标杆，可完全自部署',
    description:
      '深度求索的模型，以推理能力和极低价格出名，权重开源。国内直连、免费对话，API 单价低到可以当白菜价跑批处理。它不做联网、不生图、不写文件，是纯粹的「大脑」。',
    categories: ['chat'],
    tags: ['开源模型', '可本地部署', '推理能力强', 'API 便宜', '免费额度高', '国内直连'],
    capabilities: {
      writing: {
        score: 3,
        basis: '中文表达合格偏理性，逻辑清楚但创意与文采一般，长文略干',
      },
      longform: {
        score: 3,
        basis: '支持长上下文，但长文摘要与前文约束保持不如专用长文产品',
      },
      reasoning: {
        score: 5,
        basis: 'R1 系列在公开数学与代码推理基准上接近闭源第一梯队，社区复现结论一致',
      },
      math: {
        score: 5,
        basis: '官方数学基准领先，输出完整推导链，复杂符号题仍建议人工复核',
      },
      coding: {
        score: 4,
        basis: '能写可运行代码并解释思路，但缺少可交互的编辑环境与自动测试闭环',
      },
      research: {
        score: 1,
        basis: '不做联网检索，回答可能停在训练数据，问「最近」类问题必错',
      },
      agent: {
        score: 2,
        basis: '有 API 与开源生态，但官方不提供成熟的代理式产品',
      },
      data: {
        score: 2,
        basis: '能写 SQL 与分析代码，实际跑数与出图需要自己搭环境',
      },
      office: {
        score: 1,
        basis: '只产出文本与代码，不生成 Word / PPT / Excel 成品',
      },
      imageGen: {
        score: 1,
        basis: '主模型不生成图片，需另用其他工具',
      },
      vision: {
        score: 1,
        basis: '主线对话模型不读图，视觉能力由另的变体系列提供',
      },
      video: {
        score: 0,
        basis: '无视频生成能力',
      },
      voice: {
        score: 0,
        basis: '无语音合成与音乐生成能力',
      },
      realtime: {
        score: 0,
        basis: '无实时语音交互产品形态，API 流式输出不等于实时通话',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 DeepSeek 的推理与数学分数依据其官方公布的公开基准与社区复现结论，属于本站依据相对充分的一组。定价与可用性按公开信息整理；推理档位在高峰期可能限流，这点写在弱项里而不是分数里。',
    strengths: [
      '推理能力在同价位里最强：复杂逻辑、数学推导的答案质量接近头部闭源模型',
      'API 价格低到可以忽略，适合批量任务、脚本化调用和自建应用',
      '权重开源，可完全离线自部署，敏感数据不出本机',
      '国内直连稳定，无需网络工具手段',
    ],
    weaknesses: [
      '不做联网检索：任何「最近」「今天」类问题都必须自己去查证',
      '不生图、不做视频、不做语音，能力集中在纯文本推理',
      '只出文本，不交付 Word / PPT / Excel 成品文件',
      '不提供完整的代理产品与工作环境，批量任务要自己接 API 写脚本',
      '高峰期 API 排队明显，输出速度波动大',
    ],
    avoidFor: [
      '需要联网获取最新信息或要求逐条引用的调研工作',
      '生图、生视频、语音、音乐等任何多媒体生产任务',
      '想要开箱即用的办公文件交付：它只给文本',
    ],
    bestFor: [
      '复杂推理与数理题：解谜、推导、方案分析',
      '低成本批量调用：日志分析、批处理、脚本化文本任务',
      '数据不能外传：权重开源，可离线部署',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    contextWindow: '64K tokens 起（随版本不同）', // TODO: verify
    multimodal: { text: true, image: false, audio: false, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '官网对话免费，官方 API 有极低价的促销档',
      paidFrom: '约 $0.3/百万 token 级（促销价）', // TODO: verify
      model: 'freemium',
      note: '定价常有大幅促销与缓存命中优惠，权重开源可完全免费自部署',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'cli'],
    hallucinationRisk: 'medium',
    latency: 'medium',
    stability: 'high',
    alternatives: ['qwen', 'glm', 'chatgpt', 'ollama', 'kimi', 'claude'],
    officialUrl: 'https://www.deepseek.com',
    docsUrl: 'https://api-docs.deepseek.com',
    sources: [
      { label: 'DeepSeek API 定价', url: 'https://api-docs.deepseek.com/quick_start/pricing' },
      { label: 'DeepSeek API 文档', url: 'https://api-docs.deepseek.com' },
      { label: 'DeepSeek 官网', url: 'https://www.deepseek.com' },
    ],
    updatedAt: '2026-09-26',
    featured: true,
  },

  // ------------------------------------------------------------------
  // 8. 智谱清言
  // ------------------------------------------------------------------
  {
    id: 'glm',
    name: '智谱清言',
    nameEn: 'ChatGLM',
    vendor: '智谱 AI',
    logo: '/logos/glm.svg',
    tagline: '国产 Agent 与工具调用的先行者',
    description:
      '智谱 AI 的对话产品，GLM 系列的强项在工具调用与代理任务：能按步骤调工具、填表单、操作手机，属于国产模型里最早把「做事的 AI」做出来的。写作与推理够用，但整体气质偏技术向。',
    categories: ['chat'],
    tags: ['Agent 能力强', '工具调用', '开源模型', '可本地部署', '国内直连', '中文能力强'],
    capabilities: {
      writing: {
        score: 4,
        basis: '中文表达清楚、结构化好，风格偏正式，文采类写作一般',
      },
      longform: {
        score: 3,
        basis: '支持长文本，但超长文档的跨段落一致性需要自己核对',
      },
      reasoning: {
        score: 4,
        basis: 'GLM 思考系列在国产开源模型推理基准上表现靠前',
      },
      math: {
        score: 4,
        basis: '数学基准稳定，可输出步骤，工程化计算需人工校验',
      },
      coding: {
        score: 3,
        basis: '能读写常规代码，缺少工程级调试与测试闭环',
      },
      research: {
        score: 3,
        basis: '支持联网搜索与引用，深度弱于专业检索工具',
      },
      agent: {
        score: 5,
        basis: 'AutoGLM 可在手机上完成多步操作，GLM 系列的工具调用在国内模型里最成熟',
      },
      data: {
        score: 2,
        basis: '能生成 SQL 与分析建议，实际数据管道仍需自行搭建',
      },
      office: {
        score: 2,
        basis: '产出以对话文本为主，办公文件交付能力有限',
      },
      imageGen: {
        score: 3,
        basis: 'CogView 系列可生图且权重开放，效果与主流生图工具有差距',
      },
      vision: {
        score: 3,
        basis: 'GLM 视觉系列可读图与文档，但官方资源更集中在代理方向',
      },
      video: {
        score: 2,
        basis: '有视频相关能力，成熟度与可控性一般',
      },
      voice: {
        score: 2,
        basis: '有语音交互入口，音色与合成能力不是重点',
      },
      realtime: {
        score: 2,
        basis: '以文字交互为主，实时语音延迟与打断体验一般',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 智谱清言的分数以官方功能说明为主依据，中文长文与文档处理是其公开主打方向。免费额度策略变动频繁，价格类信息请直接看官方定价页，本页不提供数字。',
    strengths: [
      '工具调用与多步代理是国产模型里最成熟的一套，能真的「去操作」而不只是给建议',
      'AutoGLM 可在手机上跨应用完成任务，这类场景几乎找不到第二家',
      'GLM 系列权重开源，可离线部署，代理流程可私有化',
      '中文指令遵循好，结构化输出稳定，适合做流程化任务',
    ],
    weaknesses: [
      '写作与创意类产出偏规整，缺风格，做内容创作不如专用写作模型',
      '主产品的界面与交互是技术导向，新手上手不如豆包直观',
      '不交付 Word / PPT 成品，办公链路要自己补',
      '生图、生视频能力存在但成熟度一般，别指望替代专用工具',
    ],
    avoidFor: [
      '内容创作与营销文案：风格化表达不是它的强项',
      '只想要轻松聊天和语音交互的用户：产品偏技术',
      '要求直接输出办公成品的场景',
    ],
    bestFor: [
      '工具调用与流程自动化：跨系统取数、填单、多步操作',
      '需要私有化部署的 Agent 应用开发',
      '中文指令遵循要求严格的工程化任务',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    contextWindow: '128K tokens', // TODO: verify
    multimodal: { text: true, image: true, audio: true, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '官网提供免费对话额度',
      paidFrom: '约 ¥1/百万 token 起（按模型不同）', // TODO: verify
      model: 'freemium',
      note: 'GLM 分多个档位与上下文规格，开源版本可自部署以免除 API 费用',
    },
    platforms: ['web', 'ios', 'android', 'api', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'medium',
    stability: 'medium',
    alternatives: ['qwen', 'deepseek', 'doubao', 'yuanbao', 'ollama'],
    officialUrl: 'https://chatglm.cn',
    docsUrl: 'https://docs.bigmodel.cn',
    sources: [
      { label: '智谱开放平台定价', url: 'https://open.bigmodel.cn/pricing' },
      { label: '智谱开放平台文档', url: 'https://docs.bigmodel.cn' },
      { label: '智谱清言官网', url: 'https://chatglm.cn' },
    ],
    updatedAt: '2026-09-10',
  },

  // ------------------------------------------------------------------
  // 9. 腾讯元宝
  // ------------------------------------------------------------------
  {
    id: 'yuanbao',
    name: '腾讯元宝',
    nameEn: 'Tencent Yuanbao',
    vendor: '腾讯',
    logo: '/logos/yuanbao.svg',
    tagline: '微信生态里的资料问答入口',
    description:
      '腾讯的通用助手，差异化在于能接微信公众号与腾讯系内容：让 AI 去读你平时刷不到的长文。国内直连、免费使用，适合把公众号资料变成可问答的知识库。深度推理和代码不是它的强项。',
    categories: ['chat'],
    tags: ['免费额度高', '微信生态', '联网检索', '中文能力强', '国内直连', '适合入门'],
    capabilities: {
      writing: {
        score: 4,
        basis: '中文口语化表达贴合微信语境，朋友圈、小红书类改写顺手',
      },
      longform: {
        score: 3,
        basis: '可读长文章与文件，但长文摘要的细节保持一般',
      },
      reasoning: {
        score: 3,
        basis: '常规推理够用，复杂多步分析表现中规中矩',
      },
      math: {
        score: 3,
        basis: '能解常见数学题并给步骤，复杂推导需人工复核',
      },
      coding: {
        score: 2,
        basis: '可写简单代码片段，缺少调试与工程能力',
      },
      research: {
        score: 4,
        basis: '深度接入微信公众号与腾讯系内容，资讯与长文检索是差异化能力',
      },
      agent: {
        score: 2,
        basis: '有智能体与插件能力，但主站的多步任务编排深度有限',
      },
      data: {
        score: 2,
        basis: '能读表格文本并做简单统计，复杂分析需外部工具',
      },
      office: {
        score: 2,
        basis: '不直接交付 Word / PPT / Excel 成品文件',
      },
      imageGen: {
        score: 2,
        basis: '有基础生图能力，效果与可控性一般',
      },
      vision: {
        score: 3,
        basis: '可读图片与截图，复杂图表解析准确率中等',
      },
      video: {
        score: 1,
        basis: '不生成视频，主要做图文内容理解',
      },
      voice: {
        score: 2,
        basis: '有语音通话入口，音色与功能深度不是重点',
      },
      realtime: {
        score: 2,
        basis: '实时语音可用但延迟与打断处理一般',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 腾讯元宝的分数依据官方产品说明与可观察的功能边界（联网检索、公众号内容接入等）。它在写作维度的高分来自官方定位而非基准测试，属于「产品设计倾向」而非「能力上限」的判断，参考时请注意这个区别。',
    strengths: [
      '能读微信公众号长文，这是别家难以复制的语料优势',
      '国内直连稳定，界面简洁，微信生态用户几乎零学习成本',
      '个人使用免费，日常问答与资料总结够用',
      '长文问答会标注来源链接，方便回到原文核对',
    ],
    weaknesses: [
      '推理与代码能力平庸，复杂任务帮不上忙',
      '内容质量取决于公众号语料本身，部分来源质量参差',
      '不交付办公成品文件，产出仍是对话文本',
      '不生视频、不做高质量图像创作，能力面偏窄',
    ],
    avoidFor: [
      '写代码、复杂推理、需要严谨数学推导的技术任务',
      '对引用来源权威性有严格要求的正式研究',
      '要求交付 Word / PPT / Excel 成品文件的办公场景',
    ],
    bestFor: [
      '把微信公众号长文变成可问答的知识库',
      '国内日常免费问答与资料总结',
      '微信生态用户的轻量 AI 助手',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    multimodal: { text: true, image: true, audio: true, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '个人使用免费，暂无订阅门槛',
      model: 'free',
      note: '企业能力与并发限制走腾讯云的付费接口，个人对话免费',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'medium',
    alternatives: ['doubao', 'kimi', 'deepseek', 'qwen', 'glm'],
    officialUrl: 'https://yuanbao.tencent.com',
    docsUrl: 'https://cloud.tencent.com/document/product/1729',
    sources: [
      { label: '腾讯云混元大模型文档', url: 'https://cloud.tencent.com/document/product/1729' },
      { label: '腾讯元宝官网', url: 'https://yuanbao.tencent.com' },
      { label: '腾讯云模型价格', url: 'https://buy.cloud.tencent.com/hunyuan' },
    ],
    updatedAt: '2026-09-08',
  },
  // ------------------------------------------------------------------
  // 10. Cursor
  // ------------------------------------------------------------------
  {
    id: 'cursor',
    name: 'Cursor',
    nameEn: 'Cursor',
    vendor: 'Anysphere',
    logo: '/logos/cursor.svg',
    tagline: '把写代码的代理塞进编辑器',
    description:
      '基于 VS Code 改造的 AI 编辑器，核心不是补全而是代理：能读懂整个项目、多文件改代码、跑命令、看报错再自己修。中文支持一般，团队版本与价格策略变动较频繁。',
    categories: ['coding', 'agent'],
    tags: ['写代码', 'Agent 能力强', 'IDE 内使用', '多文件重构', '英文优先'],
    capabilities: {
      writing: {
        score: 2,
        basis: '以代码为主，文本写作是顺手能力，中文表达与结构化写作一般',
      },
      longform: {
        score: 3,
        basis: '能索引整个代码库做上下文，但长文档类材料不是它的设计目标',
      },
      reasoning: {
        score: 4,
        basis: '代理模式下会先规划再改代码，复杂问题的拆解稳定性较好',
      },
      math: {
        score: 2,
        basis: '偶可用于公式与简单计算，不是其能力重点',
      },
      coding: {
        score: 5,
        basis: '基于 VS Code 的全项目索引加多文件代理编辑，官方说明与社区反馈均列为代码类第一梯队',
      },
      research: {
        score: 2,
        basis: '可调用网页抓取补充上下文，但不做系统化带引用的调研',
      },
      agent: {
        score: 5,
        basis: '代理模式可自主读写文件、执行命令、修复报错并迭代，是最完整的开发闭环',
      },
      data: {
        score: 2,
        basis: '能写脚本处理数据，但缺少开箱即用的数据分析与出图工作流',
      },
      office: {
        score: 1,
        basis: '只改代码，不生成 Word / PPT / Excel 成品',
      },
      imageGen: {
        score: 0,
        basis: '不生成图片',
      },
      vision: {
        score: 3,
        basis: '可把截图、设计稿作为上下文理解，对视觉还原有帮助',
      },
      video: {
        score: 0,
        basis: '不生成视频',
      },
      voice: {
        score: 1,
        basis: '无语音对话能力，偶有语音输入但非语音交互',
      },
      realtime: {
        score: 1,
        basis: '以编辑器内交互为主，无实时语音通话形态',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Cursor 的编程分数依据其官方文档说明的产品能力（全项目索引、多文件编辑、命令行代理）与社区反馈的一致倾向。它是「工具型」产品而非单一模型，所以分数反映产品整体体验，不等同于底层模型能力 —— 这也是它在推理/数理维度给分不高的原因。',
    strengths: [
      '全项目索引是真差异：改代码时它知道文件之间的调用关系，不只是当前文件',
      '代理闭环完整：能改多个文件、跑终端命令、看报错再自己修，不用来回贴错误信息',
      '在熟悉的 VS Code 里，切换成本几乎为零，团队容易统一',
      '可接入 MCP 扩展外部工具，把设计稿、数据库、内部系统接进编辑流程',
    ],
    weaknesses: [
      '中文能力偏弱：代码注释和报错解释里的中文表达生硬，prompt 用中文写效果打折',
      '国内无法直连，账号与网络稳定性是持续成本',
      '按请求次数计费，高级模型消耗快，代理跑长任务容易额度告急',
      '大改动仍需人工把关：它会「自信地」改错地方，缺少真正的测试保障',
    ],
    avoidFor: [
      '以中文写作与内容创作为主的工作：中文能力不是它的强项',
      '需要交付 Word / PPT / Excel 成品文件的办公场景',
      '要求完全离线、数据不出本机的环境：它是云端编辑器',
    ],
    bestFor: [
      '跨文件重构、批量改动、陌生代码库上手',
      '写测试、补文档、把设计稿还原成代码',
      '希望把「改代码-跑起来-修报错」压缩成一次对话的开发',
    ],
    chineseQuality: 2,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'Cursor 是本地编辑器加云端服务的组合：编辑器能下载安装，但登录与云端功能在大陆网络下通常不可用。其服务条款也未把中国大陆列为支持地区。',
      alternatives: ['ollama'],
    },
    multimodal: { text: true, image: true, audio: false, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '免费版有少量请求额度',
      paidFrom: '约 $20/月起（Pro）', // TODO: verify
      model: 'freemium',
      note: '按请求次数计费，高级模型与代理模式消耗更快，套餐结构调整较频繁',
    },
    platforms: ['windows', 'mac', 'cli', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'medium',
    alternatives: ['copilot', 'claude', 'chatgpt', 'ollama'],
    officialUrl: 'https://cursor.com',
    docsUrl: 'https://docs.cursor.com',
    sources: [
      { label: 'Cursor 官方定价', url: 'https://cursor.com/pricing' },
      { label: 'Cursor 官方文档', url: 'https://docs.cursor.com' },
      { label: 'Cursor 产品页', url: 'https://cursor.com' },
    ],
    updatedAt: '2026-09-28',
    featured: true,
  },

  // ------------------------------------------------------------------
  // 11. GitHub Copilot
  // ------------------------------------------------------------------
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    nameEn: 'GitHub Copilot',
    vendor: 'GitHub / Microsoft',
    logo: '/logos/copilot.svg',
    tagline: '补全体验最稳，代理能力在追赶',
    description:
      '依托 GitHub 仓库数据的补全工具，IDE 覆盖最广、行内补全最稳，是团队统一代码助手最容易达成共识的选择。代理式改代码正在补齐，但自主度还不及 Cursor。',
    categories: ['coding'],
    tags: ['写代码', 'IDE 插件', '补全稳定', '团队易落地', '英文优先'],
    capabilities: {
      writing: {
        score: 2,
        basis: '代码注释与文档字符串写得不错，整段中文写作不是它的目标',
      },
      longform: {
        score: 2,
        basis: '能利用仓库上下文，但长文档分析与总结能力有限',
      },
      reasoning: {
        score: 3,
        basis: '代理模式可做多步任务，复杂推理稳定性中等',
      },
      math: {
        score: 2,
        basis: '辅助写算法与公式代码，数学推导本身不是它的能力',
      },
      coding: {
        score: 5,
        basis: '基于公开仓库训练，行内补全与函数级生成是长期最稳的方案，IDE 覆盖面最广',
      },
      research: {
        score: 2,
        basis: '可访问 GitHub 公开信息辅助编码，不是通用检索工具',
      },
      agent: {
        score: 4,
        basis: '代理模式与代码评审已正式可用，能开 issue 和提 PR，但自主度低于 Cursor',
      },
      data: {
        score: 2,
        basis: '能写处理数据的代码，缺少数据分析工作流',
      },
      office: {
        score: 1,
        basis: '不生成办公成品文件',
      },
      imageGen: {
        score: 0,
        basis: '不生成图片',
      },
      vision: {
        score: 2,
        basis: '可在对话中读图与截图，视觉能力不是重点',
      },
      video: {
        score: 0,
        basis: '不生成视频',
      },
      voice: {
        score: 1,
        basis: '无语音交互能力',
      },
      realtime: {
        score: 1,
        basis: '以编辑器补全与对话为主，无实时语音形态',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Copilot 的分数依据官方文档中对支持语言、上下文范围与集成深度的说明。它的定位是编辑器内的辅助，不同平台的可用功能差异明显，跨平台平均会失真，因此分数取「主流平台可用集」的判断。',
    strengths: [
      '补全是它最稳的地方：写下一行它就知道你要什么，采纳率高且很少画蛇添足',
      '几乎所有主流 IDE 都有官方插件，团队统一部署几乎没有阻力',
      '能利用仓库历史与公开代码风格，更贴合团队既有规范',
      '代理模式可执行任务并开 issue / 提 PR，与 GitHub 工作流天然打通',
    ],
    weaknesses: [
      '代理自主度不如 Cursor：复杂多文件改动仍需要人盯得更紧',
      '中文能力一般：注释和解释里英文更多，中文项目体验打折',
      '国内无法直连，需要网络工具手段，团队普及有阻力',
      '价值高度绑定 GitHub：脱离 GitHub 的工作流，优势会明显减弱',
    ],
    avoidFor: [
      '需要完全自主完成多文件改造的重构工作：自主度不足',
      '以中文内容写作为主的工作：中文不是它的强项',
      '要求数据完全不出本机的环境：云端服务需上传上下文',
    ],
    bestFor: [
      '团队统一代码助手：装机即用，权限与计费都好解释',
      '日常写代码时的高频补全与样板代码生成',
      '已经在用 GitHub 托管、想顺手用代理开 issue 与提 PR 的团队',
    ],
    chineseQuality: 3,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'GitHub Copilot 的功能依赖 GitHub 账号与服务，GitHub 在大陆网络下访问常不稳定；Copilot 的服务条款亦未把中国大陆列入支持地区。个人使用时常见的情况是编辑器插件可装、但登录与补全服务不可用。',
      alternatives: ['ollama'],
    },
    multimodal: { text: true, image: true, audio: false, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '个人版有免费额度，代理功能受限',
      paidFrom: '约 $10/月起（Pro）', // TODO: verify
      model: 'freemium',
      note: 'Pro 与 Pro+ 分档，团队与企业版按席位另计，价格随模型能力调整',
    },
    platforms: ['plugin', 'web', 'cli'],
    hallucinationRisk: 'low',
    latency: 'fast',
    stability: 'high',
    alternatives: ['cursor', 'claude', 'chatgpt'],
    officialUrl: 'https://github.com/features/copilot',
    docsUrl: 'https://docs.github.com/copilot',
    sources: [
      { label: 'GitHub Copilot 方案与价格', url: 'https://github.com/features/copilot/plans' },
      { label: 'GitHub Copilot 官方文档', url: 'https://docs.github.com/copilot' },
      { label: 'GitHub Copilot 产品页', url: 'https://github.com/features/copilot' },
    ],
    updatedAt: '2026-09-16',
  },

  // ------------------------------------------------------------------
  // 12. Midjourney
  // ------------------------------------------------------------------
  {
    id: 'midjourney',
    name: 'Midjourney',
    nameEn: 'Midjourney',
    vendor: 'Midjourney Inc.',
    logo: '/logos/midjourney.svg',
    tagline: '审美在线的生图标准答案',
    description:
      '以画面质感与风格一致性著称的生图工具，产出的图「一眼看过去就对」，适合品牌视觉、概念图与封面。它是纯生图产品：不会写作、不会推理、不会联网、不会生视频，文字生成仍需后期修。',
    categories: ['image'],
    tags: ['生图质量高', '风格一致', '审美强', '无官方 App', '参数需学习', '英文提示词'],
    capabilities: {
      writing: {
        score: 1,
        basis: '不写文本，图内文字渲染仍常出错，需要外部工具修字',
      },
      longform: {
        score: 1,
        basis: '不处理长文档，仅能作为参考图输入',
      },
      reasoning: {
        score: 1,
        basis: '不做逻辑推理，提示词理解靠训练而非推理',
      },
      math: {
        score: 1,
        basis: '不涉及数理计算',
      },
      coding: {
        score: 0,
        basis: '不写代码',
      },
      research: {
        score: 0,
        basis: '不联网检索，无来源标注概念',
      },
      agent: {
        score: 1,
        basis: '风格微调靠人工调参数，不是自动任务编排',
      },
      data: {
        score: 0,
        basis: '不做数据处理',
      },
      office: {
        score: 1,
        basis: '不出 Word / PPT / Excel，仅能出图供排版使用',
      },
      imageGen: {
        score: 5,
        basis: '画面质感、构图与风格一致性长期处于生图第一梯队，社区产出对比普遍认可',
      },
      vision: {
        score: 3,
        basis: '能理解上传的参考图与角色参考，但描述能力不如视觉大模型细致',
      },
      video: {
        score: 2,
        basis: '有基于图像的简单动画生成，非原生视频生成，镜头控制能力有限',
      },
      voice: {
        score: 0,
        basis: '不生成语音与音乐',
      },
      realtime: {
        score: 0,
        basis: '无实时交互形态，批量出图需排队等待',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Midjourney 的图像生成高分依据其官方公布的版本迭代与社区作品生态；写作、长文、推理等维度直接按「不具备」给 0-1 分，不做模糊处理。生成结果有明显随机性，同一提示词的质量波动属于产品特性，不是评分误差。',
    strengths: [
      '出图审美是最强项：光影、材质、构图都经得起放大看，风格一致性尤其好',
      '风格参考与角色参考能保持同一套视觉语言，做系列图时优势明显',
      '社区沉淀了海量提示词与参数配方，风格库现成',
      '改图、局部重绘与扩展画布在版本迭代后已相当成熟',
    ],
    weaknesses: [
      '没有官方手机 App，主要入口是网页与 Discord，国内不可直连',
      '参数体系与提示词写法有门槛，英文描述能力明显强于中文',
      '图内文字渲染仍常出错，做带字海报必须后期修',
      '不能精确控制构图细节：指定位置、特定文字、指定人物都容易跑偏',
    ],
    avoidFor: [
      '任何写作、推理、编程、研究类工作：它只生图',
      '需要图里文字完全准确的中文海报：字形出错率高',
      '要求可控可复现的精确出图（如严格布局稿）：风格优先于精确指令',
    ],
    bestFor: [
      '品牌与概念视觉：封面、海报、氛围图、风格探索',
      '需要保持同一视觉风格的系列图',
      '先出好图再交给排版工具做成品排版的工作流',
    ],
    chineseQuality: 2,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'Midjourney 只提供网页与 Discord 两种使用方式，没有本地客户端或自部署选项，因此完全依赖能否访问其服务器。',
      alternatives: ['jimeng', 'qwen'],
    },
    multimodal: { text: true, image: true, audio: false, video: false, file: true },
    hasApi: false,
    pricing: {
      freeTier: '仅有限时试用体验，无长期免费档',
      paidFrom: '约 $10/月起（Basic）', // TODO: verify
      model: 'paid',
      note: '全部为订阅制，按 GPU 快速时长计费，取消订阅即失去已购时长',
    },
    platforms: ['web', 'plugin'],
    hallucinationRisk: 'low',
    latency: 'slow',
    stability: 'medium',
    alternatives: ['gemini', 'qwen', 'doubao'],
    officialUrl: 'https://www.midjourney.com',
    docsUrl: 'https://docs.midjourney.com',
    sources: [
      { label: 'Midjourney 官方订阅方案', url: 'https://www.midjourney.com/plans' },
      { label: 'Midjourney 官方文档', url: 'https://docs.midjourney.com' },
      { label: 'Midjourney 官网', url: 'https://www.midjourney.com' },
    ],
    updatedAt: '2026-09-19',
  },

  // ------------------------------------------------------------------
  // 13. Runway
  // ------------------------------------------------------------------
  {
    id: 'runway',
    name: 'Runway',
    nameEn: 'Runway',
    vendor: 'Runway ML',
    logo: '/logos/runway.svg',
    tagline: '最接近专业后期的视频工具',
    description:
      '不只是文生视频，而是把生成、视频编辑、抠像、动作捕捉串成一条工作流的专业工具。学习曲线陡、积分消耗快，但要做能进片头的画面，这是少数真能落地的选择。',
    categories: ['video'],
    tags: ['视频生成', '视频编辑', '专业后期', '学习曲线陡', '积分制'],
    capabilities: {
      writing: {
        score: 1,
        basis: '几乎不做文本写作，脚本需在外部完成',
      },
      longform: {
        score: 1,
        basis: '不处理长文档',
      },
      reasoning: {
        score: 1,
        basis: '不做复杂逻辑推理，镜头语言靠提示词描述',
      },
      math: {
        score: 0,
        basis: '不涉及数理计算',
      },
      coding: {
        score: 0,
        basis: '不写代码',
      },
      research: {
        score: 0,
        basis: '不联网检索',
      },
      agent: {
        score: 2,
        basis: '有多镜头生成工作流，仍需人工逐镜把关，不算真正自动化',
      },
      data: {
        score: 1,
        basis: '不做数据分析',
      },
      office: {
        score: 1,
        basis: '不出办公成品文件',
      },
      imageGen: {
        score: 3,
        basis: '也有图像生成与编辑能力，但产品重心明显在视频',
      },
      vision: {
        score: 3,
        basis: '能理解参考图与首帧，控制画面的准确性高于纯文字描述',
      },
      video: {
        score: 5,
        basis: '文生视频加视频到视频、抠像、动作捕捉与剪辑，工具链完整度在同类中领先',
      },
      voice: {
        score: 1,
        basis: '不做语音与音乐生成，配音需外部工具',
      },
      realtime: {
        score: 1,
        basis: '生成为异步任务，实时交互形态几乎为零',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Runway 的视频维度依据其官方对生成能力与工作流（文生视频、图生视频、剪辑）的说明与社区作品生态。视频之外的三维、设计与音频能力属同厂其他产品线，不在「Runway 网页版」范围内，因此按不具备给分。生成时长与成本限制写在弱项里。',
    strengths: [
      '工具链完整：生成、剪辑、抠像、动作捕捉在同一个项目里串起来，不必来回导',
      '用参考图与首帧控制画面，稳定性明显好于纯文字提示词',
      '运动与镜头语言已有可用的复杂度，短片与概念片能出彩',
      '企业版支持团队协作与资产管理，适合有流程的团队',
    ],
    weaknesses: [
      '积分制收费不直观：同一段视频的时长、分辨率、是否用参考帧，消耗差别很大',
      '学习曲线陡，界面与参数对新手不友好',
      '国内不可直连，没有移动端 App，工作流只能在桌面完成',
      '时长仍偏短，成片还得靠外部剪辑软件补足',
    ],
    avoidFor: [
      '只想要一段几秒的快速小样：学习与积分成本不成比例',
      '需要中文长脚本与文案创作：它不写文本',
      '要求手机端随手出片的轻量场景：没有 App，且国内不可直连',
    ],
    bestFor: [
      '概念片、广告片、MV 片段这类有画面要求的短片',
      '已有素材、要做 AI 特效与修补的剪辑工程',
      '需要抠像、动作捕捉等专业后期能力的团队',
    ],
    chineseQuality: 2,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'Runway 为纯云端视频生成服务，没有本地部署选项，生成能力完全依赖其服务器可达性；服务条款未把中国大陆列入支持地区。',
      alternatives: ['jimeng'],
    },
    multimodal: { text: true, image: true, audio: true, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '免费版仅有少量体验积分',
      paidFrom: '约 $12/月起', // TODO: verify
      model: 'freemium',
      note: '按积分计费，模型迭代后消耗倍率常调整，落地前先算清用量',
    },
    platforms: ['web', 'api'],
    hallucinationRisk: 'low',
    latency: 'slow',
    stability: 'medium',
    alternatives: ['suno', 'qwen', 'doubao'],
    officialUrl: 'https://runwayml.com',
    docsUrl: 'https://docs.dev.runwayml.com',
    sources: [
      { label: 'Runway 官方定价', url: 'https://runwayml.com/pricing' },
      { label: 'Runway API 文档', url: 'https://docs.dev.runwayml.com' },
      { label: 'Runway 官网', url: 'https://runwayml.com' },
    ],
    updatedAt: '2026-09-14',
  },

  // ------------------------------------------------------------------
  // 14. Suno
  // ------------------------------------------------------------------
  {
    id: 'suno',
    name: 'Suno',
    nameEn: 'Suno',
    vendor: 'Suno Inc.',
    logo: '/logos/suno.svg',
    tagline: '把一段描述变成能用的歌',
    description:
      '用文字描述生成完整歌曲的音频工具，人声、和声、编曲一次给全，还能生成配套画面。做原声、样片、游戏配乐和小视频配乐效率很高。风格模仿需要克制，商业授权条款要读清。',
    categories: ['audio', 'video'],
    tags: ['音乐生成', '人声自然', '适合配乐', '中文可用', '积分制', '授权需细读'],
    capabilities: {
      writing: {
        score: 1,
        basis: '能按歌词生成，但歌词创作与文本润色能力很弱，歌词基本要自己写',
      },
      longform: {
        score: 1,
        basis: '不处理长文档，歌词有长度上限',
      },
      reasoning: {
        score: 1,
        basis: '不做复杂推理，靠风格标签与描述匹配',
      },
      math: {
        score: 0,
        basis: '不涉及数理计算，编曲不按乐理推导',
      },
      coding: {
        score: 0,
        basis: '不写代码',
      },
      research: {
        score: 0,
        basis: '不联网检索，没有参考来源机制',
      },
      agent: {
        score: 1,
        basis: '有扩展与自定义功能，但多步自动编排能力有限',
      },
      data: {
        score: 0,
        basis: '不做数据处理',
      },
      office: {
        score: 0,
        basis: '不出办公成品文件',
      },
      imageGen: {
        score: 1,
        basis: '仅有视频画面框架，图像不是它的能力',
      },
      vision: {
        score: 1,
        basis: '不提供图像理解能力',
      },
      video: {
        score: 3,
        basis: '可生成带画面的音乐视频，但镜头与画面质量弱于专业视频工具',
      },
      voice: {
        score: 4,
        basis: '人声自然度与情绪表达在同类中靠前，中英文都能用，风格标签覆盖主流曲风',
      },
      realtime: {
        score: 1,
        basis: '生成是异步任务，无实时交互形态',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Suno 的语音音乐维度依据官方对生成模型能力的说明与社区作品生态；其余维度按「不具备」给 0-1 分。生成时长与曲风控制的可控性是它的主要短板，已写进弱项。',
    strengths: [
      '人声与编曲一次成型：主唱、和声、乐器结构都给了，不用自己混',
      '风格标签覆盖面广，从民谣到电子到国风都能试',
      '中文可用，中文歌词的表现明显好于多数同类',
      '能顺带生成画面，做短视频配乐一条龙，交付效率高',
    ],
    weaknesses: [
      '歌词创作能力弱：文字部分基本要自己写，它只负责唱',
      '风格模仿存在授权风险：刻意贴近在世歌手的授权条款要逐字读',
      '积分制收费，长曲与多次重试消耗快，商用还要单独买授权',
      '国内不可直连，生成结果不可精确控制，废片率不低',
    ],
    avoidFor: [
      '需要精确控制旋律、歌词与结构的商用配乐：随机性太高，不可控',
      '要求歌词创作或文案写作的工作：它不写词',
      '预算固定且不能失败的商业项目：积分消耗与重试成本不可预测',
    ],
    bestFor: [
      '短视频与 demo 配乐：先快速试出合适的氛围',
      '游戏与独立作品的原型音乐',
      '中文歌曲创意验证，验证通过再考虑专业制作',
    ],
    chineseQuality: 3,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'Suno 为纯云端音乐生成服务，无本地部署选项；其服务条款未把中国大陆列入支持地区，账号存在被限制的可能。',
      alternatives: ['tongyi-tingwu'],
    },
    multimodal: { text: true, image: false, audio: true, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '免费版有每日积分，生成歌曲数有限',
      paidFrom: '约 $10/月起', // TODO: verify
      model: 'freemium',
      note: '积分制且商用需额外授权，条款变动频繁，商业使用前务必核对',
    },
    platforms: ['web', 'ios', 'android', 'api'],
    hallucinationRisk: 'low',
    latency: 'medium',
    stability: 'medium',
    alternatives: ['runway', 'qwen', 'doubao'],
    officialUrl: 'https://suno.com',
    docsUrl: 'https://help.suno.com',
    sources: [
      { label: 'Suno 官方订阅方案', url: 'https://suno.com/pricing' },
      { label: 'Suno 帮助中心', url: 'https://help.suno.com' },
      { label: 'Suno 官网', url: 'https://suno.com' },
    ],
    updatedAt: '2026-09-11',
  },

  // ------------------------------------------------------------------
  // 15. Gamma
  // ------------------------------------------------------------------
  {
    id: 'gamma',
    name: 'Gamma',
    nameEn: 'Gamma',
    vendor: 'Gamma Labs',
    logo: '/logos/gamma.svg',
    tagline: '大纲直接变成能发的页面',
    description:
      '给一个主题或一份文档，自动排出结构清晰的演示、文档或网页，排版观感明显好于多数同类。适合对外分享和快速提案，但要拿去当正式交付物，内容还得逐页改。',
    categories: ['office'],
    tags: ['出 PPT', '排版好看', '生成网页', '上手快', '内容需润色'],
    capabilities: {
      writing: {
        score: 3,
        basis: '能把大纲铺成通顺文案，但文字偏模板化，正式稿必须人改',
      },
      longform: {
        score: 3,
        basis: '可导入文档作为素材，长文转演示时取舍判断一般',
      },
      reasoning: {
        score: 2,
        basis: '结构组织靠模板规则，不做真正的分析推理',
      },
      math: {
        score: 1,
        basis: '基本不涉及数理计算，表格里的公式需手工处理',
      },
      coding: {
        score: 1,
        basis: '可导出网页代码，但生成代码质量不是它的强项',
      },
      research: {
        score: 3,
        basis: '可联网抓取内容做补充，来源标注不严格，需自行核实',
      },
      agent: {
        score: 2,
        basis: '有自动生成与主题扩展能力，多步任务编排有限',
      },
      data: {
        score: 2,
        basis: '可插入表格与简单图表，复杂分析需外部工具',
      },
      office: {
        score: 5,
        basis: '核心能力就是直接产出可分享的演示、文档与网页，排版与主题系统成熟',
      },
      imageGen: {
        score: 2,
        basis: '能配图与用图库，生成图像不是它的强项',
      },
      vision: {
        score: 2,
        basis: '能上传图片素材，图像理解能力有限',
      },
      video: {
        score: 2,
        basis: '可插入视频，不生成视频',
      },
      voice: {
        score: 1,
        basis: '不做语音与音乐生成',
      },
      realtime: {
        score: 1,
        basis: '网页交互为主，无实时语音形态',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Gamma 的分数反映的是「内容排版产出」这一产品形态，而非模型能力：它擅长把结构化内容变成可分享页面，写作与办公交付因此高分。研究与数据维度按不具备给分。',
    strengths: [
      '排版观感是它最大的优势：生成的页面比多数 AI 演示工具更像设计过的',
      '一个主题直接出多形态产物：演示、文档、网页共用同一套结构',
      '上手极快，输主题或贴文档就能开始，迭代改一处全篇跟着变',
      '产物是一个链接就能分享，协作与对外沟通成本低',
    ],
    weaknesses: [
      '内容必须逐页润色：默认文案模板味重，直接对外会显得敷衍',
      '复杂专业排版控制不了，精细调整要靠手动，深度定制空间有限',
      '数据与图表能力弱，真实数据要自己贴，做不出可信的数据页',
      '免费版有次数与功能限制，团队协作与品牌管控在付费版',
    ],
    avoidFor: [
      '要求内容严谨、逐字校对的正式文档：文字必须人改',
      '需要精确控制版式或严格遵循模板的企业正式材料',
      '数据密集的分析汇报：图表与数据处理不是它的强项',
    ],
    bestFor: [
      '对外提案与分享：先出结构，再花十分钟改成能发的样子',
      '把一份长文或一份大纲快速拆成演示与网页',
      '个人或小团队的对外沟通材料',
    ],
    chineseQuality: 3,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'Gamma 为云端演示文稿生成服务，依赖其服务器可达性；服务条款未把中国大陆列入支持地区。',
      alternatives: ['wps-ai'],
    },
    multimodal: { text: true, image: true, audio: false, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '免费版每月有限生成额度',
      paidFrom: '约 $12/月起', // TODO: verify
      model: 'freemium',
      note: '按 AI 积分计费，Pro 与 Plus 分档，去水印与分享权限与套餐相关',
    },
    platforms: ['web', 'api'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'medium',
    alternatives: ['notebooklm', 'chatgpt', 'kimi'],
    officialUrl: 'https://gamma.app',
    docsUrl: 'https://help.gamma.app',
    sources: [
      { label: 'Gamma 官方定价', url: 'https://gamma.app/pricing' },
      { label: 'Gamma 帮助中心', url: 'https://help.gamma.app' },
      { label: 'Gamma 官网', url: 'https://gamma.app' },
    ],
    updatedAt: '2026-09-13',
  },

  // ------------------------------------------------------------------
  // 16. NotebookLM
  // ------------------------------------------------------------------
  {
    id: 'notebooklm',
    name: 'NotebookLM',
    nameEn: 'NotebookLM',
    vendor: 'Google',
    logo: '/logos/notebooklm.svg',
    tagline: '只答你给的资料，引用能点开',
    description:
      'Google 的资料问答工具：先上传自己的资料，再提问，答案只基于这些资料并标出出处。这是主流产品里幻觉最少的一类，代价是它不会上网、也不会通用问答。音频概览功能把资料变成两难播客。',
    categories: ['research', 'office'],
    tags: ['基于资料作答', '引用可核验', '幻觉率低', '音频概览', '学习助手', '中文需谨慎'],
    capabilities: {
      writing: {
        score: 3,
        basis: '能基于资料整理与改写文字，独立创作能力有限',
      },
      longform: {
        score: 5,
        basis: '设计目标就是长资料处理，能在几十份文档里定位答案并给原文出处',
      },
      reasoning: {
        score: 3,
        basis: '能在资料范围内做跨文档比较与推断，范围之外的推理能力弱',
      },
      math: {
        score: 2,
        basis: '资料里公式的读取与解释一般，复杂数理计算不是它的强项',
      },
      coding: {
        score: 0,
        basis: '不写代码',
      },
      research: {
        score: 4,
        basis: '严格限定在给定资料内作答并标引用，可信度高，但不做全网检索',
      },
      agent: {
        score: 2,
        basis: '有 Studio 类创作与自定义功能，多步任务编排能力有限',
      },
      data: {
        score: 3,
        basis: '能读表格并生成要点与概览，复杂统计需外部工具',
      },
      office: {
        score: 4,
        basis: '能生成大纲、思维导图、文档与音频概览，可导出到 Google 文档',
      },
      imageGen: {
        score: 0,
        basis: '不生成图片',
      },
      vision: {
        score: 3,
        basis: '可读上传资料里的图片与扫描件，配合文档解析使用',
      },
      video: {
        score: 1,
        basis: '可理解上传的视频链接与视频文件，但完全不生成视频',
      },
      voice: {
        score: 4,
        basis: '音频概览能把资料转成双人对谈式播客，是同类里独特的语音能力',
      },
      realtime: {
        score: 1,
        basis: '以文档问答为主，无实时语音形态',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 NotebookLM 的长文高分依据其官方对「基于你提供的资料回答」的定位说明与资料库机制，这类能力有明确的功能对应关系，可核对性强。它刻意不做通用聊天，所以通用对话维度给中低分 —— 这是产品取舍而非缺陷。',
    strengths: [
      '幻觉最少的一类：答案只来自你给的资料，每句都能点开看原文依据',
      '资料量可以很大：几十份文档、几百页一起上传，跨文档比较是它的本职',
      '音频概览把资料变成可听的播客，通勤和做家务时也能学',
      '学习场景闭环：导入讲义后能生成大纲、思维导图、测验题',
    ],
    weaknesses: [
      '不联网：资料里没有的事它一律答不了，也不会主动补充',
      '不能替代通用助手：写东西、做分析、生成代码都不行',
      '中文体验一般：中文资料的解析与音频概览的普通话表现不如英文',
      '国内无法直连，且账号体系在 Google 内，团队共享资料有合规顾虑',
    ],
    avoidFor: [
      '需要全网检索、回答「最近」类问题的工作：它只读你给的资料',
      '通用写作、编程、办公任务：不是它的能力范围',
      '中文音频学习需求：普通话音频质量与英文差距明显',
    ],
    bestFor: [
      '论文、教材、讲义的高效消化：先上传再问，答案带出处',
      '团队内部资料问答：把散落的文档变成可检索的知识入口',
      '通勤时用音频概览快速过一遍长资料',
    ],
    chineseQuality: 3,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'NotebookLM 依托 Google 账号体系，账号注册与登录在中国大陆网络下通常无法完成，因此即使功能本身可用也进不去。',
      alternatives: ['ima-copilot', 'tongyi-tingwu'],
    },
    multimodal: { text: true, image: true, audio: true, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '个人版免费，笔记与来源数量有限',
      paidFrom: '约 $19.99/月起（Plus）', // TODO: verify
      model: 'freemium',
      note: '与 Google One 打包，额度与来源上限随套餐变化，企业版另有方案',
    },
    platforms: ['web', 'ios', 'android'],
    hallucinationRisk: 'low',
    latency: 'fast',
    stability: 'high',
    alternatives: ['perplexity', 'gemini', 'chatgpt', 'kimi', 'gamma'],
    officialUrl: 'https://notebooklm.google.com',
    docsUrl: 'https://support.google.com/notebooklm',
    sources: [
      { label: 'Google AI 套餐说明', url: 'https://one.google.com/about/google-ai-plans/' },
      { label: 'NotebookLM 帮助中心', url: 'https://support.google.com/notebooklm' },
      { label: 'NotebookLM 官网', url: 'https://notebooklm.google.com' },
    ],
    updatedAt: '2026-09-29',
    featured: true,
  },

  // ------------------------------------------------------------------
  // 17. Perplexity
  // ------------------------------------------------------------------
  {
    id: 'perplexity',
    name: 'Perplexity',
    nameEn: 'Perplexity',
    vendor: 'Perplexity AI',
    logo: '/logos/perplexity.svg',
    tagline: '默认就联网的答案机器',
    description:
      '以「搜索 + 答案」为核心的产品：每个回答都挂在来源链接上，查时效性信息比通用助手靠谱得多。代价是它不写东西、不写代码、不做文件，中文与国内信息源覆盖也一般。',
    categories: ['research'],
    tags: ['联网检索', '引用可核验', '时效性好', '不适合写作', '中文一般', '英文优先'],
    capabilities: {
      writing: {
        score: 2,
        basis: '能顺带改写句子，长文写作、润色与创作不是它的设计目标',
      },
      longform: {
        score: 3,
        basis: '可读网页与上传文件，但长文档消化能力弱于专门的长文工具',
      },
      reasoning: {
        score: 3,
        basis: '基于检索结果的推理表现中等，复杂多步推理需要反复追问',
      },
      math: {
        score: 3,
        basis: '能解常见数学题，复杂符号推导需人工复核',
      },
      coding: {
        score: 1,
        basis: '能写简单代码片段，工程化与调试能力很弱',
      },
      research: {
        score: 5,
        basis: '检索式问答的成熟度最高，答案逐句挂来源，聚焦模式可控范围',
      },
      agent: {
        score: 2,
        basis: '有研究模式与多步检索，但不是可编排的通用代理',
      },
      data: {
        score: 2,
        basis: '能做简单数据解读与图表读取，复杂分析需外部工具',
      },
      office: {
        score: 1,
        basis: '不交付 Word / PPT / Excel 成品文件',
      },
      imageGen: {
        score: 0,
        basis: '不生成图片',
      },
      vision: {
        score: 2,
        basis: '可上传图片问答，图像理解不是重点能力',
      },
      video: {
        score: 0,
        basis: '不生成视频',
      },
      voice: {
        score: 1,
        basis: '无语音合成与音乐生成能力',
      },
      realtime: {
        score: 1,
        basis: '有语音提问入口，但无实时通话形态',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Perplexity 的检索分数依据其官方对「检索 + 带引用回答」的定位与引用呈现方式。写作成品与多模态创作按不具备给分。需要注意的是引用数量不等于引用准确度，这一点已写进弱项，使用时仍需点开原文核对。',
    strengths: [
      '引用是产品地基而不是附加项：每个结论都能点开看原文，可核验性最高',
      '时效性好：问新闻、价格、政策这类最近的事，答案比通用模型靠谱',
      '聚焦模式可以限定检索范围与来源类型，做严肃调研时可控',
      '提问框支持多文件上传，查资料与查代码库片段都能顺手做',
    ],
    weaknesses: [
      '中文能力偏弱：中文检索结果质量与英文源差距明显，国内信息源覆盖有限',
      '不写东西：长文创作、改写、润色都不是它的用途',
      '不写代码也不出办公文件，只能查不能交付',
      '国内无法直连，中文检索的源与结果都不完整',
    ],
    avoidFor: [
      '写作与内容创作：它只给检索式答案，不产出成稿',
      '编程与工程任务：代码能力很弱，也不交付文件',
      '需要中文语料覆盖的调研：中文检索质量是它的短板',
    ],
    bestFor: [
      '查时效性事实：新闻、政策、价格、公司动态',
      '需要可核验来源的快速调研：重点看引用而不只是看结论',
      '英文信息为主的资料检索与技术资料查证',
    ],
    chineseQuality: 3,
    chinaAccessible: false,
    /**
     * 大陆网络下打不开时的实际情况与替代方案。
     * 分清「官方未开放」「服务条款限制」「依赖服务器可达性」三类原因，
     * 因为读者需要的应对完全不同。
     *
     * 本站不提供绕过网络限制的方法，也不推荐任何相关厂商 ——
     * 规避网络管理在境内有法律风险，且与本站「不吹不黑」的承诺冲突。
     */
    access: {
      reality:
        'Perplexity 为纯云端检索问答服务，依赖其服务器可达性；服务条款未把中国大陆列入支持地区。',
      alternatives: ['ima-copilot', 'doubao'],
    },
    multimodal: { text: true, image: true, audio: true, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '免费版每天有限提问次数',
      paidFrom: '约 $20/月起（Pro）', // TODO: verify
      model: 'freemium',
      note: '按搜索次数计费，超额后检索质量或次数会受限，套餐常调整',
    },
    platforms: ['web', 'ios', 'android', 'api', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'medium',
    alternatives: ['notebooklm', 'chatgpt', 'gemini', 'kimi'],
    officialUrl: 'https://www.perplexity.ai',
    docsUrl: 'https://docs.perplexity.ai',
    sources: [
      { label: 'Perplexity 官方 Pro 方案', url: 'https://www.perplexity.ai/pro' },
      { label: 'Perplexity API 文档', url: 'https://docs.perplexity.ai' },
      { label: 'Perplexity 官网', url: 'https://www.perplexity.ai' },
    ],
    updatedAt: '2026-09-17',
  },

  // ------------------------------------------------------------------
  // 18. Ollama
  // ------------------------------------------------------------------
  {
    id: 'ollama',
    name: 'Ollama',
    nameEn: 'Ollama',
    vendor: 'Ollama 社区',
    logo: '/logos/ollama.svg',
    tagline: '把开源模型拉到本机跑',
    description:
      '本地模型运行器：一条命令就能把开源模型装到自己电脑上，能力上限完全取决于你下的那个权重。优势是数据不出本机、零调用费用；代价是硬件门槛、效果打折，且没有任何内置能力。',
    categories: ['open-source', 'chat'],
    tags: ['可本地部署', '完全免费', '数据不出本机', '开源模型', '需自备硬件', '效果取决于模型'],
    capabilities: {
      writing: {
        score: 3,
        basis: '取决于本地权重：装 Qwen / DeepSeek 中文权重可达 4 分以上，默认模型偏弱',
      },
      longform: {
        score: 3,
        basis: '受可用内存与模型上下文限制，长文档体验明显弱于云端产品',
      },
      reasoning: {
        score: 3,
        basis: '本地可跑推理类开源模型，答案质量与速度都受硬件限制',
      },
      math: {
        score: 3,
        basis: '本地模型能做常规计算，复杂推导质量低于云端旗舰',
      },
      coding: {
        score: 3,
        basis: '能跑 Coder 类开源模型辅助写码，需要自己配编辑器与工具链',
      },
      research: {
        score: 0,
        basis: '本身不联网也不检索，资料需自行接搜索工具或预先喂给模型',
      },
      agent: {
        score: 2,
        basis: '可接本地工具做代理，但流程与稳定性都要自己搭',
      },
      data: {
        score: 1,
        basis: '不提供开箱即用的数据分析环境，需要自己配环境与代码执行',
      },
      office: {
        score: 1,
        basis: '不交付 Word / PPT / Excel 成品，只能生成文本',
      },
      imageGen: {
        score: 2,
        basis: '可加载部分生图模型，但生图不是它的主路径，生态分散',
      },
      vision: {
        score: 2,
        basis: '部分视觉模型可在本地跑，模型选择与显存要求需自行确认',
      },
      video: {
        score: 1,
        basis: '理论上可跑本地视频模型，但硬件门槛极高，公开反馈普遍认为不实用',
      },
      voice: {
        score: 2,
        basis: '可跑语音识别与合成模型，质量与易用性不如专用云端服务',
      },
      realtime: {
        score: 2,
        basis: '本地流式输出可用，延迟取决于硬件与模型大小，体验不稳定',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（模型卡 / 产品文档 / 定价页 / 发布说明）、产品实际能力边界、以及社区公开反馈中反复出现的一致倾向。 Ollama 本身不提供模型能力，它提供的是运行器 —— 所有分数取决于你本地装了哪个权重与硬件。给出的是「典型本地配置下的常见区间」，因此置信度低于其他工具，这也是它没有维度拿到 4 分的原因。换模型或显卡，同一台机器上的表现会完全不同。',
    strengths: [
      '数据完全不出本机：敏感资料、内部代码、合同可以直接在本地问',
      '零调用费用：硬件买断之后，用多少都不花钱',
      '模型可自由更换：同一套环境里换中文、换代码、换视觉模型只是换个名字',
      '上手成本极低：一条命令装模型，本地 API 端口与云端几乎同构',
    ],
    weaknesses: [
      '能力上限完全取决于模型与硬件：小显存机器只能跑小模型，效果明显打折',
      '什么都不自带：没有联网检索、没有文件交付、没有数据分析环境',
      '没有官方图形界面，交互靠命令行或第三方前端，对新手不友好',
      '模型生态分散、版本与许可各异，商用前要逐个确认授权',
    ],
    avoidFor: [
      '追求开箱即用的体验：它没有界面、没有内置能力，全靠自己搭',
      '需要联网研究、办公文件交付、生图生视频的工作',
      '手上没有可用硬件、或预期达到云端旗舰效果的场景',
    ],
    bestFor: [
      '数据不能外传的场景：合同、内部文档、私有代码库',
      '长期高频调用、想省掉 API 费用的团队与个人',
      '想尝试本地微调、研究模型选型或做推理实验的技术用户',
    ],
    chineseQuality: 4,
    chinaAccessible: true,
    multimodal: { text: true, image: true, audio: true, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '完全免费，软件与模型下载均无调用费用',
      model: 'open-source',
      note: '成本为本地硬件与电费，模型权重各自有独立许可，商用前需逐个确认',
    },
    platforms: ['mac', 'windows', 'api', 'cli'],
    hallucinationRisk: 'medium',
    latency: 'medium',
    stability: 'high',
    alternatives: ['qwen', 'deepseek', 'glm', 'cursor'],
    officialUrl: 'https://ollama.com',
    docsUrl: 'https://github.com/ollama/ollama/blob/main/README.md',
    sources: [
      { label: 'Ollama 官网与模型库', url: 'https://ollama.com' },
      { label: 'Ollama GitHub 仓库', url: 'https://github.com/ollama/ollama' },
      { label: 'Ollama 文档', url: 'https://github.com/ollama/ollama/blob/main/README.md' },
    ],
    updatedAt: '2026-09-21',
  },

  // ------------------------------------------------------------------
  // 19. WPS AI
  // ------------------------------------------------------------------
  {
    id: 'wps-ai',
    name: 'WPS AI',
    nameEn: 'WPS AI',
    vendor: '金山办公',
    logo: '/logos/wps-ai.svg',
    tagline: '把 AI 装进办公软件，交付环节不用再转手',
    description:
      '金山办公的 AI 能力，做法不是做一个聊天窗口，而是把功能直接放进 WPS 文字、表格、演示和 PDF 里：续写、总结、表格公式、大纲出演示都在原文档里完成。代价是推理、检索、编程这些维度基本不具备，它是一个办公环节工具，不是通用大脑。',
    categories: ['office'],
    tags: ['办公交付', '表格助手', '直接改文档', '国内直连', '会员权益绑定', '不联网'],
    capabilities: {
      writing: {
        score: 4,
        basis: '文字里的续写、扩写、改写与全文总结是官方长期主推功能，中文语感自然，正式文书需逐句改',
      },
      longform: {
        score: 4,
        basis: '支持对整份文档与 PDF 做全文总结与阅读理解，长文档问答在原文件内完成',
      },
      reasoning: {
        score: 2,
        basis: '办公场景不做复杂多步推理，方案分析与判断类任务需要换通用模型',
      },
      math: {
        score: 2,
        basis: '表格助手能生成常规公式，复杂数理推导与验算不是它的能力',
      },
      coding: {
        score: 1,
        basis: '不写代码，最多给出极简脚本片段，无法用于开发任务',
      },
      research: {
        score: 1,
        basis: '不做联网检索，也不提供可点开核对的来源，查资料要换工具',
      },
      agent: {
        score: 2,
        basis: '以单点功能按钮为主，缺少跨文件、跨应用的多步自动执行链路',
      },
      data: {
        score: 3,
        basis: '表格助手能读本表结构并生成公式、做基础统计分析，复杂统计仍需外部工具',
      },
      office: {
        score: 5,
        basis: '产出物就是可编辑的 WPS 文字、表格、演示与 PDF 文件，办公交付这一项无可替代',
      },
      imageGen: {
        score: 3,
        basis: '提供 AI 生图与图片处理入口，可用于文档配图，效果与可控性中等',
      },
      vision: {
        score: 3,
        basis: '可读文档、截图与 PDF 中的图表并转成文字，识别精度属于够用水平',
      },
      video: {
        score: 0,
        basis: '不生成视频，也不做视频素材处理',
      },
      voice: {
        score: 3,
        basis: 'AI 朗读能把文档转成语音用于听读校对，做配音与音乐创作不是它的方向',
      },
      realtime: {
        score: 0,
        basis: '没有实时语音对话形态，交互以文档内的按钮操作为主',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（办公软件的 AI 行为随账号所购权益变动，也无法在本地复现各家闭源模型），因此这些分数来自三部分交叉整理：官方公开资料（WPS AI 产品页与帮助文档）、产品实际能力边界、以及公开反馈中反复出现的一致倾向。办公维度给 5 分的依据是功能对应关系：它的产出物就是可编辑的办公文件，这一点有官方功能说明可核对。其余维度给中低分是按「不具备或非重点」处理，不是对能力上限的判断。需要提醒两点：一是 AI 功能的可用范围与会员等级绑定，免费账号与付费账号看到的不是同一套能力，同一份文档在不同账号下的结果可能完全不同；二是同一功能在不同文档类型上表现差异较大，做表格顺手不代表做长文分析同样顺手。这两点不在 14 维体系内，但直接影响体感，所以写进了弱项。',
    strengths: [
      '交付环节最省事：文字、表格、演示、PDF 都在同一个软件里改，不必先导出再导入别的工具',
      '表格助手能看懂当前表格结构并给出公式，按条件汇总、环比、分类计数这类活不用手写',
      '给一份大纲就能生成演示文稿，页数与结构可控，适合先出框架再在原软件里改',
      'AI 朗读让长文校对变成听一遍，长句里的语病和不顺比读的时候更容易发现',
      '国内直连，企业版在内网部署这件事上比海外产品更容易向学校解释合规',
    ],
    weaknesses: [
      '复杂推理与数理能力一般，做题、写方案分析不如通用大模型',
      '不联网检索，也不给可核验的引用，查资料这一步仍然要换工具',
      '生成内容偏模板化，通知、评语这类文字必须逐句改过再用',
      '不生视频、不做语音创作，音视频素材还得靠别的工具补',
      'AI 权益与会员体系绑定，免费额度和可用功能调整频繁，教学场景容易被打断',
    ],
    avoidFor: [
      '需要联网查证并逐条标注来源的调研工作：它不提供检索与引用',
      '复杂推理、数理推导或需要判断结论可靠性的分析任务',
      '音视频创作：配乐、配音、视频片段都需要另用工具',
    ],
    bestFor: [
      '写教案、出通知、写学生评语这类最终要交成稿的文字工作',
      '表格类杂活：批量公式、分类汇总、图表初版',
      '从一份大纲快速生成演示框架，再在原软件里继续改',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    multimodal: { text: true, image: true, audio: false, video: false, file: true },
    hasApi: true,
    pricing: {
      freeTier: '基础文档编辑免费，AI 功能按账号有免费次数额度',
      paidFrom: '以官方定价页为准',
      model: 'freemium',
      note: 'AI 权益多与 WPS 会员及更高档位打包，会员权益调整频繁，落地前先确认学校账号实际能用到哪些功能',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'fast',
    stability: 'medium',
    alternatives: ['copilot', 'chatgpt', 'kimi', 'gamma', 'doubao'],
    officialUrl: 'https://ai.wps.cn',
    docsUrl: 'https://open.wps.cn/',
    sources: [
      { label: 'WPS AI 官网', url: 'https://ai.wps.cn' },
      { label: '金山办公开放平台文档', url: 'https://open.wps.cn/' },
      { label: 'WPS Office 官网', url: 'https://www.wps.cn/' },
    ],
    updatedAt: '2026-09-28',
  },

  // ------------------------------------------------------------------
  // 20. 通义听悟
  // ------------------------------------------------------------------
  {
    id: 'tongyi-tingwu',
    name: '通义听悟',
    nameEn: 'Tongyi Tingwu',
    vendor: '阿里巴巴',
    logo: '/logos/tongyi-tingwu.svg',
    tagline: '把一堂课、一场会变成可检索的文字',
    description:
      '阿里的音视频转写与内容整理工具。核心动作只有一个：把录音或视频变成带说话人标记的文字，再自动产出纪要、要点与待办。教师用它做录课、听评课和会议记录，省掉的是整理时间，不是判断时间。',
    categories: ['audio', 'office'],
    tags: ['会议转写', '课堂录音', '说话人区分', '自动纪要', '国内直连', '导出文档'],
    capabilities: {
      writing: {
        score: 3,
        basis: '输出以转写稿与要点整理为主，独立成文的长文写作不是它的设计目标',
      },
      longform: {
        score: 4,
        basis: '官方支持长音频与长视频文件的转写与总结，一两小时的课堂或会议属常见处理量级',
      },
      reasoning: {
        score: 2,
        basis: '摘要基于转写文本归纳，说出内容意味着什么需要人判断，多步分析不是它的强项',
      },
      math: {
        score: 0,
        basis: '不做数理计算，听写内容里的符号与公式也不会做推导',
      },
      coding: {
        score: 0,
        basis: '不写代码',
      },
      research: {
        score: 1,
        basis: '不联网检索，没有来源标注机制，只处理你上传的录音与文件',
      },
      agent: {
        score: 2,
        basis: '转写、纪要、待办、字幕是一条固定流水线，跨系统自动执行能力有限',
      },
      data: {
        score: 1,
        basis: '能做说话时长等简单统计，复杂数据分析与图表需外部工具',
      },
      office: {
        score: 3,
        basis: '纪要与摘要可导出为 Word、PDF 与字幕文件，演示文稿仍需另做',
      },
      imageGen: {
        score: 0,
        basis: '不生成图片',
      },
      vision: {
        score: 3,
        basis: '可对视频画面做内容识别与描述，画面级细节与文字识别精度有限',
      },
      video: {
        score: 1,
        basis: '能处理与理解视频内容，完全不生成视频',
      },
      voice: {
        score: 4,
        basis: '核心能力就是语音转写与实时听写，中文与多语种识别是官方主推方向',
      },
      realtime: {
        score: 4,
        basis: '支持实时听写与边听边出稿，实时场景是它的主要使用方式',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（识别准确率取决于录音条件与说话人，无法在统一条件下复现各家闭源能力），因此这些分数来自三部分交叉整理：官方公开资料（通义听悟产品页与帮助文档）、产品实际能力边界、以及公开反馈中反复出现的一致倾向。语音与实时维度的高分依据明确：产品形态就是转写与听写，能力与维度一一对应，可核对性强。写作、推理、数理、编程、视频生成几个维度按「不具备」给 0-2 分，不做模糊处理。需要提醒的是：一段安静的办公室录音和一段嘈杂的教室录音不能相提并论，因此这里的分数反映的是「具备这类能力」，不反映「在你的场景里有多准」。学校落地前请先用自己的录音试一段，再决定是否推广。',
    strengths: [
      '中文连续说话的识别在国产工具里靠前，会议与课堂这种整段发言基本能直接用',
      '说话人区分做得清楚：谁的哪句话被标出来，听评课和访谈整理时省掉大量时间',
      '一次录音同时给出文字、要点、待办与思维导图，不用再让别的模型重读一遍原文',
      '支持导出 Word、PDF 与字幕文件，转写结果能直接进学校既有的文档流程',
      '国内直连，个人使用免费额度对教师日常够用，上传课堂录音没有额外的合规顾虑',
    ],
    weaknesses: [
      '多人抢话、背景噪音大的时候错误率明显上升，关键数字与人名必须人工核对',
      '摘要只概括录音里说了什么，说不出这些内容对教学意味着什么',
      '专业术语、方言和中英夹说的课堂容易转错，转写稿仍需逐段校订',
      '生成的纪要与待办是初稿，要不要采纳、怎么排进教学安排，仍要老师自己判断',
      '只能处理录音与文件，不能生成视频或音乐，也不做数理与编程类内容',
    ],
    avoidFor: [
      '需要联网查证并逐条标注来源的调研工作：它只处理你上传的录音',
      '录音条件无法保证准确率的场合直接出正式材料：错误会一路带到公文里',
      '音视频创作与数理推理类任务：它不生成内容，也不做推导',
    ],
    bestFor: [
      '录课与听课：把课堂录音转成文字稿，再归纳教学环节与时间分配',
      '听评课与教研：多人发言转写后按说话人拆开，看课堂互动结构',
      '家长会与各类会议：整理成要点与待办，避免漏掉某一方的承诺',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    multimodal: { text: true, image: true, audio: true, video: true, file: true },
    hasApi: true,
    pricing: {
      freeTier: '个人使用免费，长音频转写有免费时长额度',
      paidFrom: '以官方定价页为准',
      model: 'freemium',
      note: '程序化调用要走阿里云的语音类接口，与网页端的功能范围并不完全对齐，接入前需先确认能拿到哪些能力',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'api'],
    hallucinationRisk: 'low',
    latency: 'medium',
    stability: 'medium',
    alternatives: ['qwen', 'kimi', 'chatgpt', 'doubao', 'ima-copilot'],
    officialUrl: 'https://tingwu.aliyun.com',
    docsUrl: 'https://help.aliyun.com/zh/model-studio/',
    sources: [
      { label: '通义听悟官网', url: 'https://tingwu.aliyun.com' },
      { label: '阿里云百炼模型与能力文档', url: 'https://help.aliyun.com/zh/model-studio/' },
      { label: '阿里云智能语音交互文档', url: 'https://help.aliyun.com/zh/isi/' },
    ],
    updatedAt: '2026-09-29',
  },

  // ------------------------------------------------------------------
  // 21. 即梦
  // ------------------------------------------------------------------
  {
    id: 'jimeng',
    name: '即梦',
    nameEn: 'Jimeng',
    vendor: '字节跳动',
    logo: '/logos/jimeng.svg',
    tagline: '中文提示词好懂的生图与短视频工具',
    description:
      '字节跳动的生成式视觉工具，主形态就是文生图与图生图，视频生成可以接在图片后面做。它不理解你的教学意图、也不会写字，但它对中文描述的反应比多数同类直接，配图这件事的成本被压得很低。',
    categories: ['image', 'video'],
    tags: ['生图', '中文提示词', '图生视频', '局部重绘', '国内直连', '需后期修字'],
    capabilities: {
      writing: {
        score: 1,
        basis: '仅能生成图内文字与短提示词描述，文本写作不是它的能力',
      },
      longform: {
        score: 0,
        basis: '不处理长文档，也不做长文总结',
      },
      reasoning: {
        score: 0,
        basis: '不做逻辑推理，提示词理解靠生成模型而不是推理过程',
      },
      math: {
        score: 0,
        basis: '不涉及数理计算',
      },
      coding: {
        score: 0,
        basis: '不写代码',
      },
      research: {
        score: 0,
        basis: '不联网检索，没有来源标注的概念',
      },
      agent: {
        score: 1,
        basis: '流程是「输入描述—出图—再改图」，跨工具的多步自动编排能力有限',
      },
      data: {
        score: 0,
        basis: '不做数据处理与统计',
      },
      office: {
        score: 1,
        basis: '只出图片文件，Word、PPT、Excel 等成品仍需另做',
      },
      imageGen: {
        score: 5,
        basis: '文生图与图生图是产品主形态，中文提示词理解好，风格与细节在国产生图工具里靠前',
      },
      vision: {
        score: 3,
        basis: '可用参考图与局部重绘来约束画面，图像理解属于生成的附带能力，不是独立识别工具',
      },
      video: {
        score: 4,
        basis: '文生视频与图生视频在官方产品内可用，镜头与时长的可控性属中等水平',
      },
      voice: {
        score: 1,
        basis: '不做配音与音乐生成，音轨需要外部工具处理',
      },
      realtime: {
        score: 1,
        basis: '生成是异步排队任务，没有实时交互形态',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（生图效果主观性强，同一提示词的结果本身就有波动，无法用统一标准给出判断），因此这些分数来自三部分交叉整理：官方公开资料（即梦产品页与使用说明）、产品实际能力边界、以及公开反馈中反复出现的一致倾向。图像生成与视频维度的高分依据是功能对应关系：文生图、图生图与图生视频是产品主形态，这一点官方可直接核对，属于「具备该能力」的判断，不是画质排名。写作、长文、推理、数理、编程、研究、数据七个维度按「不具备」给 0-1 分，不做模糊处理。需要提醒的是：审美偏好差异很大，同一段提示词在不同人手里结果不同，落地前请用自己的教学场景试一批，再决定哪些图能进课堂、哪些只能自己看。',
    strengths: [
      '中文提示词理解好，「水墨风格的江南小镇黄昏」这类描述不用翻译就能出对方向的东西',
      '图生图与局部重绘实用：给已有课件插图换个背景、去掉多余元素，比重新生成稳定',
      '视频生成能接在图片后面做，同一套素材里静态图与短片能保持相近风格',
      '国内直连且有移动端 App，手机上临时改一张图不用回到电脑',
      '免费额度对做课堂配图基本够用，个人教师不必为几张插图单独付费',
    ],
    weaknesses: [
      '不写文本也不做推理：任何需要先想清楚再落笔的活它都帮不上',
      '生成结果随机性大，同一提示词重抽几次差异明显，不适合要求精确一致的场合',
      '图内文字与手部结构仍会出错，做带字的信息图必须后期修',
      '精细构图难控制：指定人物位置、数量或精确比例时经常跑偏',
      '只产出图片与短视频片段，既不能交付文档，也不能替代剪辑软件完成成片',
    ],
    avoidFor: [
      '任何需要写作、推理或给出结论的工作：它只生成图像',
      '要求构图精确、前后一致的教材插图：随机性会直接破坏教学表达',
      '需要交付文档或完整视频成片的场景：它给素材，不给成品',
    ],
    bestFor: [
      '课件配图：为抽象概念找一张能一眼讲清楚的示意图',
      '课堂素材：故事插画、场景图、活动封面图',
      '短视频片段：把静态图变成几秒的动态画面，用在导入或回顾环节',
    ],
    chineseQuality: 4,
    chinaAccessible: true,
    multimodal: { text: true, image: true, audio: false, video: true, file: true },
    hasApi: false,
    pricing: {
      freeTier: '每日有免费生成额度，出图质量受分辨率与次数限制',
      paidFrom: '以官方定价页为准',
      model: 'freemium',
      note: '按积分与会员档位计费，不同分辨率与视频时长的消耗差别很大，重抽次数要算进用量',
    },
    platforms: ['web', 'ios', 'android'],
    hallucinationRisk: 'low',
    latency: 'slow',
    stability: 'medium',
    alternatives: ['doubao', 'qwen', 'gemini', 'midjourney'],
    officialUrl: 'https://jimeng.jianying.com',
    sources: [
      { label: '即梦 AI 官网', url: 'https://jimeng.jianying.com' },
      { label: '剪映官网（同属字节创作生态）', url: 'https://www.capcut.cn' },
    ],
    updatedAt: '2026-09-29',
  },

  // ------------------------------------------------------------------
  // 22. ima
  // ------------------------------------------------------------------
  {
    id: 'ima-copilot',
    name: 'ima',
    nameEn: 'ima.copilot',
    vendor: '腾讯',
    logo: '/logos/ima-copilot.svg',
    tagline: '先把资料放进去，再开始提问',
    description:
      '腾讯的知识库式问答工具：把网页、公众号文章、PDF 和自己的文档放进去，它只在这些资料里回答并给出处。检索强、幻觉少是它的立身之本，代价是资料之外的通用能力很薄。',
    categories: ['research', 'chat'],
    tags: ['知识库', '基于资料作答', '引用可回溯', '公众号生态', '国内直连', '免费'],
    capabilities: {
      writing: {
        score: 3,
        basis: '能基于资料整理与改写文字，独立成文的长文写作与打磨不是它的主攻方向',
      },
      longform: {
        score: 4,
        basis: '知识库可导入数十份文档并在其中定位答案，长资料问答是产品主形态',
      },
      reasoning: {
        score: 3,
        basis: '提供深度思考模式，公开反馈中复杂推理的稳定性属中等水平',
      },
      math: {
        score: 2,
        basis: '能解常规题目并给出步骤，复杂符号推导需人工复核',
      },
      coding: {
        score: 1,
        basis: '能写简单代码片段，调试与工程化能力基本不具备',
      },
      research: {
        score: 4,
        basis: '主打联网检索与知识库检索，答案附来源链接，公众号文章可直接导入再问答',
      },
      agent: {
        score: 2,
        basis: '有扩展与工具调用入口，跨系统的多步自动执行不是产品重点',
      },
      data: {
        score: 2,
        basis: '能读表格文本并做简单统计，复杂分析与可视化需外部工具',
      },
      office: {
        score: 2,
        basis: '产出以对话文本为主，不直接交付 Word、PPT、Excel 成品文件',
      },
      imageGen: {
        score: 2,
        basis: '有基础生图能力，效果与可控性一般，不是它的使用重点',
      },
      vision: {
        score: 3,
        basis: '可读图片、扫描件与文档截图，配合知识库一起使用',
      },
      video: {
        score: 1,
        basis: '不生成视频，主要做图文与文档内容的理解',
      },
      voice: {
        score: 1,
        basis: '有语音输入入口，但没有实时通话与语音创作形态',
      },
      realtime: {
        score: 1,
        basis: '以文字交互为主，实时语音交互不是产品重点',
      },
    },
    overallScore: 0, // TODO: computed by lib/score.ts
    evidence:
      '本站不做自建评测（知识库问答的准确度取决于用户导入的资料与提问方式，无法在统一条件下复现各家闭源能力），因此这些分数来自三部分交叉整理：官方公开资料（ima 产品页与腾讯云文档）、产品实际能力边界、以及公开反馈中反复出现的一致倾向。长文与检索两个高分维度依据的是产品形态：先导入资料、再基于资料作答并给出出处，这类能力有明确的功能对应关系，可核对性强。其余维度给中低分是按「不具备或非重点」处理，不等于能力上限。需要说明的是：本页分数反映「能力类型具备」，不反映「你导入的资料质量」——资料本身没写清楚的地方，它照样答不出来，所以资料整理仍然是人的工作。',
    strengths: [
      '知识库是产品地基：先把资料放进去再提问，答案能回到原资料的段落，而不是靠模型记忆',
      '公众号文章和网页可以直接变成知识库，这是腾讯生态里最实用的一块能力',
      '联网检索与知识库检索可以叠加：问「最近」也能把范围限定在你自己的资料里',
      '国内直连，界面干净，上传资料到提问的路径很短，新手不容易半路放弃',
    ],
    weaknesses: [
      '推理与代码能力一般，复杂分析和工程任务帮不上忙',
      '资料没导入的部分它答不了，也不会像通用助手那样先反问你要什么',
      '不直接交付 Word、PPT、Excel 成品，产出仍是对话文本',
      '没有面向学校系统的程序化接入方式，批量处理只能人工上传',
    ],
    avoidFor: [
      '需要通用推理、数理推导或写代码的工作：不是它的能力范围',
      '要求交付办公成品的场景：主产物仍是文本',
      '一次要处理数十份以上资料且需要批量自动化的场景：容量与接入方式都受限',
    ],
    bestFor: [
      '校本资料的沉淀问答：教研组把方案、课例、纪要集中成可追问的知识库',
      '公众号文章与政策文件的长文整理：先导入再提问，避免凭印象引用',
      '上传教材或试卷后做基于原文的问答与出题',
    ],
    chineseQuality: 5,
    chinaAccessible: true,
    multimodal: { text: true, image: true, audio: false, video: false, file: true },
    hasApi: false,
    pricing: {
      freeTier: '个人使用免费，知识库容量与单次提问次数有上限',
      paidFrom: '以官方定价页为准',
      model: 'freemium',
      note: '知识库条数、单次引用数量与深度研究的可用次数随会员档位变化',
    },
    platforms: ['web', 'ios', 'android', 'windows', 'mac', 'plugin'],
    hallucinationRisk: 'medium',
    latency: 'medium',
    stability: 'medium',
    alternatives: ['yuanbao', 'notebooklm', 'kimi', 'qwen', 'tongyi-tingwu'],
    officialUrl: 'https://ima.qq.com',
    sources: [
      { label: 'ima 官网', url: 'https://ima.qq.com' },
      { label: '腾讯云混元大模型文档', url: 'https://cloud.tencent.com/document/product/1729' },
    ],
    updatedAt: '2026-09-30',
  },
]

/** id → Tool 的索引，避免组件里反复 find */
export const toolsById: Record<string, Tool> = Object.fromEntries(
  tools.map((t) => [t.id, t])
)
