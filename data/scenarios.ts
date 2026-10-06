import type { CapabilityKey, ScenarioRule } from '@/data/types'

/**
 * 场景决策器的规则表
 *
 * 引擎约定（见 lib/recommend.ts）：
 * 1. weights 先归一化到和为 1，再与工具的 0-5 分能力加权，得出 0-5 的适配分。
 *    因此这里只需要表达相对重要性，不要凑成 1。
 * 2. requiredCapabilities 是硬门槛：工具在该维度低于 minRequiredScore
 *    就直接不进候选，不参与排序。只在确实做不到就不算结果时使用。
 * 3. defaultPromptTemplate 必须指向 prompts.ts 中真实存在的模板 id。
 * 4. 本文件不调用任何大模型 API，结果完全由规则决定，可复现、可离线、可单测。
 *
 * icon 取值受限于 components/ui/Icon.tsx，不要自创。
 */

export const scenarios: ScenarioRule[] = [
  {
    id: 'write',
    label: '写东西',
    icon: 'pen',
    weights: {
      writing: 0.4,
      reasoning: 0.2,
      longform: 0.15,
      coding: 0.05,
      research: 0.05,
    },
    defaultPromptTemplate: 'weekly-report-draft',
    pitfalls: [
      '不给出受众和长度，一上来就让它写全文，结果全是套话。',
      '不给格式约束，它会默认写成一篇散文，你还得再排一遍版。',
      '把「帮我润色这段」当成提示词，得到的只是换词版；不说明要解决什么问题就没有改动依据。',
    ],
    workflow: [
      { step: 1, action: '先让它只出提纲，你确认结构后再让它写正文', preferCapability: 'reasoning' },
      { step: 2, action: '逐段指出「哪里不对」而不是让它全部重写', preferCapability: 'writing' },
      { step: 3, action: '定稿前核对数字、人名、时间，AI 常在这类细节上出错', preferCapability: 'longform' },
    ],
    description: '挑的是文字表达能力和跟随修改的能力，而不是知识量——写东西的瓶颈通常在结构，不在资料。',
  },
  {
    id: 'read-long-doc',
    label: '读长文档',
    icon: 'file-text',
    weights: {
      longform: 0.35,
      research: 0.25,
      reasoning: 0.2,
      writing: 0.1,
      data: 0.1,
    },
    defaultPromptTemplate: 'long-doc-digest',
    pitfalls: [
      '只看开头几页的摘要就下结论，长文档的关键约束往往在中后段。',
      '不要求标注页码或原文位置，出错之后无法回查，等于没读。',
      '一份几十页的 PDF 一次丢进去让它「总结全文」，它会平均用力，重要条件和例外条件被一起抹平。',
    ],
    workflow: [
      { step: 1, action: '先让它出目录和关键问题清单，确认你要找的东西在不在里面', preferCapability: 'longform' },
      { step: 2, action: '按清单逐段提问，每个答案都必须带原文位置', preferCapability: 'research' },
    ],
    description: '挑的是在长上下文里定位和保持一致的能力：能不能读全，还能不能指回原文。',
  },
  {
    id: 'make-office',
    label: '做 PPT 或表格',
    icon: 'presentation',
    weights: {
      office: 0.35,
      writing: 0.2,
      data: 0.2,
      longform: 0.15,
      reasoning: 0.1,
    },
    requiredCapabilities: [{ key: 'office', minRequiredScore: 3 }],
    defaultPromptTemplate: 'ppt-outline-builder',
    pitfalls: [
      '直接让它「做一个 PPT」，出来的是一份 Word 大纲；成品文件需要工具本身支持导出。',
      '页标题写成「产品优势」「核心价值」，整份 deck 就退回产品介绍了，标题应该是完整句子。',
      '表格让它一次生成 50 列的宽表，看起来很全，但打印出来没法看，列宽和分组得自己定。',
    ],
    description: '挑的是能不能落到具体文件格式上，以及内容组织能力；只会输出文本的工具在这里直接不合格。',
  },
  {
    id: 'code',
    label: '写代码',
    icon: 'code',
    weights: {
      coding: 0.45,
      reasoning: 0.25,
      agent: 0.15,
      longform: 0.1,
      data: 0.05,
    },
    defaultPromptTemplate: 'code-reviewer',
    pitfalls: [
      '不给版本和技术栈，它会按最新框架的写法生成，落到你项目里编译不过。',
      '不给背景就问「为什么变慢了」，得到的是一份通用最佳实践清单，没有一条能开工。',
      '一次让它改五件事，结果 diff 自己都读不完；改一件、验一件才划算。',
    ],
    workflow: [
      { step: 1, action: '让它先给出证据和验证方式，再给修复动作', preferCapability: 'reasoning' },
      { step: 2, action: '在能读写文件、能跑命令的编辑器里做改动并自查 diff', preferCapability: 'agent' },
    ],
    description: '挑的是长代码里的定位能力和可执行性：能不能读懂一个陌生模块，并给出可验证的结论。',
  },
  {
    id: 'research',
    label: '查资料做研究',
    icon: 'search',
    weights: {
      research: 0.4,
      longform: 0.25,
      reasoning: 0.2,
      data: 0.1,
      writing: 0.05,
    },
    defaultPromptTemplate: 'research-with-citations',
    pitfalls: [
      '不要求带链接，它会给出一段看起来极其专业的推演，全程没有一个可查的出处。',
      '让它「综合来看」两种矛盾的结论，它会给你一个两边都不认的中间答案，这在你这行等于零信息。',
      '拿没有来源的数字继续算，最后一步的模型也一起失效。',
    ],
    workflow: [
      { step: 1, action: '先要取数清单：需要哪些变量、每个变量在哪里能查到', preferCapability: 'research' },
      { step: 2, action: '交叉检索两遍，只保留有链接、能打开原文的数字', preferCapability: 'longform' },
      { step: 3, action: '自己复算关键数字，并写出哪个数字对结论影响最大', preferCapability: 'data' },
    ],
    description: '挑的是带出处输出的能力和交叉验证的倾向；引用是否可点开，比答案本身更重要。',
  },
  {
    id: 'image',
    label: '做图',
    icon: 'image',
    weights: {
      imageGen: 0.6,
      vision: 0.2,
      writing: 0.1,
      reasoning: 0.1,
    },
    requiredCapabilities: [{ key: 'imageGen', minRequiredScore: 3 }],
    defaultPromptTemplate: 'image-prompt-writer',
    pitfalls: [
      '只写「帮我画一张好看的图」，出来的图没有明确主体，因为提示词里就没有主体。',
      '不写画面比例和用途，同一个提示词在竖版海报和横版 banner 里会废掉一半。',
      '让它写英文提示词却不给风格限制，它会默认套用某一家的默认画风，看起来都像。',
    ],
    workflow: [
      { step: 1, action: '先用文字模型把画面描述写细：主体、光线、镜头、比例', preferCapability: 'writing' },
      { step: 2, action: '生成后用读图能力检查构图和文字是否有错，再决定是否重画', preferCapability: 'vision' },
    ],
    description: '挑的是图像生成能力和对提示词的响应质量；这一维度是硬门槛，分数不够就换工具，不靠权重弥补。',
  },
  {
    id: 'video',
    label: '做视频',
    icon: 'video',
    weights: {
      video: 0.4,
      imageGen: 0.2,
      writing: 0.15,
      voice: 0.15,
      realtime: 0.1,
    },
    requiredCapabilities: [{ key: 'video', minRequiredScore: 3 }],
    defaultPromptTemplate: 'video-shotlist',
    pitfalls: [
      '一条提示词里同时要求运镜、人物表情、字幕样式和背景音乐，结果每样都差一点。',
      '不写时长和镜头数，它会给你 15 秒一个镜头的方案，和短视频的实际节奏完全不符。',
      '先生成画面再补声音，节奏对不上；反过来先定旁白时长，画面按秒数裁剪更省事。',
    ],
    workflow: [
      { step: 1, action: '先写分镜表：时间码 / 画面 / 旁白 / 字幕，分镜定了再生成', preferCapability: 'writing' },
      { step: 2, action: '用图像工具逐镜头出关键帧，确认风格统一后再转视频', preferCapability: 'imageGen' },
      { step: 3, action: '视频生成后补配音与字幕，音画对不齐就回到分镜表改时长', preferCapability: 'voice' },
    ],
    description: '挑的是视频生成硬能力和节奏控制；单靠一个工具很难一次到位，通常要图像和文字工具配合。',
  },
  {
    id: 'data',
    label: '做数据分析',
    icon: 'bar-chart',
    weights: {
      data: 0.4,
      reasoning: 0.2,
      math: 0.2,
      coding: 0.1,
      office: 0.1,
    },
    defaultPromptTemplate: 'spreadsheet-analyst',
    pitfalls: [
      '直接把整份原始表丢进去问「有什么结论」，它会挑最显眼的一列讲，而那列恰恰是最不需要分析的。',
      '不说明口径就让它算增长率，分母口径不一致时算出来的数全是错的，而且看起来很专业。',
      '让它直接给清洗后的表：干净到你不知道它改了多少，不可回滚的步骤必须自己确认。',
    ],
    workflow: [
      { step: 1, action: '先让它出分析问题和口径清单，你确认后再让它算数', preferCapability: 'reasoning' },
      { step: 2, action: '每一步给出预期行数或预期范围，你用自己的数据核对', preferCapability: 'data' },
      { step: 3, action: '结论自己复算一遍，把 AI 的结果当成草稿而不是答案', preferCapability: 'math' },
    ],
    description: '挑的是数值可靠性和口径意识；这一场景里，一个算错的漂亮结论比没有结论更糟。',
  },
  {
    id: 'automate',
    label: '自动化一个流程',
    icon: 'workflow',
    weights: {
      agent: 0.35,
      coding: 0.25,
      reasoning: 0.2,
      office: 0.1,
      research: 0.1,
    },
    defaultPromptTemplate: 'workflow-automation-plan',
    pitfalls: [
      '上来就说「帮我自动化」，它会给一个听起来完整的方案，但没问你这个流程一周跑几次、失败了谁来看。',
      '让它一次设计全流程，第 3 步开始就会开始假设前面步骤的输出格式，而这些格式实际上并不存在。',
      '涉及发邮件、改数据、付款的步骤没有人工确认点，出错时你连回滚的位置都找不到。',
    ],
    workflow: [
      { step: 1, action: '先画出流程的输入、处理、判断三段，标出哪些必须人工确认', preferCapability: 'reasoning' },
      { step: 2, action: '把能接 API 的环节和只能靠读写的环节分开处理', preferCapability: 'agent' },
      { step: 3, action: '先手工跑通两周再自动化，异常样本攒够了才知道规则怎么写', preferCapability: 'coding' },
    ],
    description: '挑的是跨步骤的执行能力和工具接入能力；单个工具再强，也替代不了一条流程里的多个环节。',
  },
  {
    id: 'learn',
    label: '学习答疑',
    icon: 'graduation-cap',
    weights: {
      reasoning: 0.3,
      writing: 0.2,
      longform: 0.2,
      research: 0.15,
      math: 0.15,
    },
    defaultPromptTemplate: 'concept-explainer',
    pitfalls: [
      '问「解释一下 RAG」，它给的是一段百科式的定义，抽象程度和你原来一样，看完还是不会用。',
      '不给你的基础水平，它默认你已经知道术语，于是用另一个术语解释这个术语。',
      '一次问五个问题，答案互相之间会打架；一次问一个才改得动。',
    ],
    description: '挑的是把复杂概念讲简单、并能按你的水平调整讲法的能力；这里最重要的问题是「你懂到哪一步」。',
  },
]

export const scenariosById: Record<string, ScenarioRule> = scenarios.reduce<
  Record<string, ScenarioRule>
>((acc, item) => {
  acc[item.id] = item
  return acc
}, {})

export function findScenario(id: string): ScenarioRule | undefined {
  return scenariosById[id]
}

/** 这个场景会看哪几个能力维度，按归一化后的权重从高到低 */
export function scenarioCapabilityOrder(rule: ScenarioRule): {
  key: CapabilityKey
  weight: number
}[] {
  const entries = Object.entries(rule.weights) as [CapabilityKey, number][]
  const total = entries.reduce((sum, [, w]) => sum + Math.max(0, w), 0)
  if (total === 0) return []
  return entries
    .filter(([, w]) => w > 0)
    .map(([key, w]) => ({ key, weight: w / total }))
    .sort((a, b) => b.weight - a.weight)
}