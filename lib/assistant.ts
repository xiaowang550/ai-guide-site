/**
 * 助手回答引擎（纯函数，无网络、无大模型 API）。
 *
 * 设计前提：站点是纯静态、无后端、无 API Key，所以助手不能是"会联网的聊天机器人"。
 * 它做的是**站内检索 + 规则组合**：所有回答里的事实都来自 data/，都能点进对应页面核对。
 * 回答卡片里也会标注这一点，避免用户误以为它是实时联网的。
 *
 * 支持的意图（靠关键词 + Fuse 模糊匹配判定）：
 *   选型：帮我选 / 该用哪个 → 调用决策器引擎 recommend()，输出首选 + 理由 + 链接
 *   工具优缺点：xx 有什么坑 / 缺点 → 从 tools 数据取强项/弱项/别用它做
 *   概念解释：什么是 RAG → 从 concepts 取定义 + 比喻 + 延伸阅读
 *   教程推荐：怎么写周报 → 匹配 guides + prompts
 *   保鲜状态：数据过没过时 → 用 freshness 引擎回答
 *   兜底：站内搜索 → 返回最相关的几条，并引导去 /find 与 /search
 */
import type { CapabilityKey, ScenarioRule, Tool } from '@/data/types'
import { recommend } from './recommend'
import type { RequirementFlags } from '@/data/types'
import { searchDocs, type SearchDocWithWeight } from './search'
import { capabilityLabel } from './score'
import { daysSince, levelOf } from './freshness'

export interface AssistantToolsIndex {
  tools: Tool[]
  searchDocs: SearchDocWithWeight[]
  concepts: { id: string; term: string; termEn?: string; definition: string; analogy: string }[]
  guides: { id: string; title: string; summary?: string; type: string }[]
  /** 决策器规则：直接复用站内那一份，保证助手结论与 /find 完全一致 */
  scenarios: ScenarioRule[]
}

export type AssistantIntent =
  | 'recommend'
  | 'tool-pros-cons'
  | 'concept'
  | 'guide'
  | 'freshness'
  | 'search'

export interface AssistantAnswer {
  intent: AssistantIntent
  /** 一句话结论 */
  headline: string
  /** 正文段落 */
  paragraphs: string[]
  /** 可点进站内的链接 */
  links: { href: string; label: string; hint?: string }[]
  /** 供用户直接点的问题 */
  followUps: string[]
  /** 回答依据（可追溯） */
  basis?: string
}

const RECOMMEND_HINTS = [
  '帮我选',
  '该用哪个',
  '用什么好',
  '推荐一个',
  '选型',
  '怎么选',
  '不知道用',
  '帮我看看用',
]
const PROS_CONS_HINTS = ['有什么坑', '缺点', '弱点', '别用', '不好用', '靠不靠谱', '能信吗', '局限']
const CONCEPT_HINTS = ['什么是', '是什么', '什么意思', '概念', '解释一下', '啥意思', '定义']
const GUIDE_HINTS = ['怎么做', '怎么写', '教程', '方法', '步骤', '怎么用', '提示词']
const FRESHNESS_HINTS = ['数据过时', '数据最新', '多久没更新', '过没过期', '保鲜', '可信吗', '准确吗']

/**
 * 轻量归一：只做小写与标点清理，**保留疑问词**。
 * 意图判定依赖「是什么 / 怎么 / 有什么坑」这类信号词，
 * 所以这里不能把它们洗掉 —— 否则所有提问都会退化成站内搜索。
 */
function normalize(q: string): string {
  return q
    .trim()
    .toLowerCase()
    .replace(/[?？!！。,，、~～]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 检索用查询：剥离疑问词与客套话。
 * 「什么是 RAG」→ 「rag」；「有没有讲提示词的教程」→ 「讲提示词的教程」。
 * 这些词几乎出现在每个问句里，留着会稀释真正有意义的关键词。
 */
export function cleanQuery(q: string): string {
  return normalize(q)
    .replace(
      /(帮我|请问|麻烦|我想|我要|想要|需要|可以|能不能|好不好|有没有|是什么|什么是|啥意思|什么意思|指的是|解释一下|解释|介绍一下|介绍|告诉我|说下|说说|怎么样|咋用|怎么用|如何|怎么|怎样|为什么|哪个|哪些|推荐|建议)/g,
      ' '
    )
    .replace(/\s+/g, ' ')
    .trim()
}

function includesAny(q: string, hints: string[]): boolean {
  return hints.some((h) => q.includes(h))
}

/** 判定意图：关键词优先，其次看搜索命中类型 */
export function detectIntent(query: string, index: AssistantToolsIndex): AssistantIntent {
  const q = normalize(query)
  if (!q) return 'search'
  if (includesAny(q, FRESHNESS_HINTS)) return 'freshness'
  if (includesAny(q, RECOMMEND_HINTS)) return 'recommend'
  if (includesAny(q, PROS_CONS_HINTS)) return 'tool-pros-cons'
  if (includesAny(q, GUIDE_HINTS)) return 'guide'
  if (includesAny(q, CONCEPT_HINTS)) return 'concept'

  // 没命中关键词时，看搜索结果里哪类内容占多数
  const hits = searchDocs(index.searchDocs, query, 6)
  if (hits.length === 0) return 'search'
  const tally = hits.reduce<Record<string, number>>((acc, h) => {
    acc[h.doc.type] = (acc[h.doc.type] ?? 0) + 1
    return acc
  }, {})
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0]
  switch (top) {
    case 'concept':
      return 'concept'
    case 'guide':
      return 'guide'
    case 'tool':
      return 'tool-pros-cons'
    case 'program':
    case 'toolkit':
      return 'guide'
    default:
      return 'search'
  }
}

/**
 * 场景同义词表：用户的话不会等于场景标签（「想读一份很长的文档」≠「读长文档」）。
 * 这里显式列出口语说法，比模糊分词可靠，也方便后续按真实提问补充。
 */
const SCENARIO_KEYWORDS: Record<string, string[]> = {
  write: ['写', '文案', '文章', '润色', '改写', '邮件', '周报', '稿子', '标题', '总结'],
  'read-long-doc': ['长文档', '读文档', 'pdf', '论文', '文件', '报告', '很长的文档', '长文章', '资料'],
  'make-office': ['ppt', '幻灯片', '表格', 'excel', 'word', '成品文件', '汇报材料', '课件'],
  code: ['代码', '编程', '程序', '脚本', 'bug', '调试', '前端', '后端'],
  research: ['调研', '研究', '查资料', '查一下', '资料', '竞品', '行业'],
  image: ['图片', '配图', '画', '生图', '海报', '插画', '修图'],
  video: ['视频', '短视频', '剪辑', '口播', '分镜'],
  data: ['数据', '统计', '分析', 'excel', '表格', '报表'],
  automate: ['自动化', '批量', '流程', '重复', '脚本', '工作流'],
  learn: ['学习', '入门', '零基础', '搞懂', '理解', '解释'],
}

/** 从自然语言里猜场景（映射到站内定义的全部场景，数量由数据决定） */
export function guessScenario(
  query: string,
  scenarios: AssistantToolsIndex['scenarios']
): string | null {
  const q = normalize(query)

  // 第一优先：同义词表命中（按关键词长度优先，长词更具体）
  const direct = Object.entries(SCENARIO_KEYWORDS)
    .map(([id, words]) => ({
      id,
      score: words.reduce((sum, w) => (q.includes(w) ? sum + w.length : sum), 0),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
  if (direct.length > 0 && scenarios.some((s) => s.id === direct[0].id)) {
    return direct[0].id
  }

  // 兜底：场景标签 / 描述里的词面重合
  const scored = scenarios
    .map((s) => {
      const words = [s.label, s.description]
        .join('')
        .toLowerCase()
        .split(/[\s、，,。/与和]+/)
        .filter((w) => w.length >= 2)
      let score = 0
      for (const w of words) if (q.includes(w)) score += w.length
      return { id: s.id, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return scored[0]?.id ?? null
}

/** 猜用户附加的条件 */
export function guessFlags(query: string): RequirementFlags {
  const q = normalize(query)
  const flags: RequirementFlags = {}
  if (includesAny(q, ['免费', '不花钱', '预算'])) flags.mustBeFree = true
  if (includesAny(q, ['大陆', '国内', '直连', '不用翻墙'])) flags.chinaDirect = true
  if (includesAny(q, ['保密', '隐私', '不能上传', '敏感'])) flags.privacySensitive = true
  if (includesAny(q, ['中文', '汉'])) flags.chineseFirst = true
  if (includesAny(q, ['文件', 'ppt', 'word', 'excel', '成品'])) flags.needDeliverableFile = true
  return flags
}

const FOLLOWUPS = {
  recommend: ['这个工具有什么弱点？', '有没有免费的替代品？', '换个场景我该怎么选？'],
  'tool-pros-cons': ['那什么场景适合用它？', '有没有更强的选择？', '帮我按场景选一个'],
  concept: ['这个概念在日常工作里怎么用？', '有哪些容易误解的地方？', '给我相关的教程'],
  guide: ['有没有现成的提示词可以用？', '这个方法适合新手吗？', '按这个方法给我挑个工具'],
  freshness: ['哪条数据最旧？', '怎么提交勘误？', '更新的频率是怎样的？'],
  search: ['帮我选一个工具', '什么是 RAG', '数据多久没更新了'],
} as const

/**
 * 抽取「站内事实」：站点简介 + 与问题最相关的几条内容。
 *
 * 为什么不把整站数据塞给模型：
 * - 全部数据几十万 token，代价高且模型注意力会被稀释
 * - AI 模式的卖点恰恰是"只用站内事实回答"，事实越少越可控
 * 所以只给最相关的 6 条 + 一段站点定位说明。
 */
export function extractSiteFacts(
  query: string,
  index: AssistantToolsIndex
): {
  siteSummary: string
  relevant: { title: string; href: string; note: string }[]
} {
  const cleaned = cleanQuery(query)
  const hits = [
    ...searchDocs(index.searchDocs, cleaned, 6),
    ...searchDocs(index.searchDocs, query, 6),
  ].filter((h, i, arr) => arr.findIndex((x) => x.doc.id === h.doc.id) === i)

  const relevant = hits.slice(0, 6).map((h) => ({
    title: h.doc.title,
    href: h.doc.href,
    note: (h.doc.subtitle ? h.doc.subtitle + '：' : '') + h.doc.summary,
  }))

  return {
    siteSummary: [
      '本站是一个中文 AI 学习与工具指南站，核心是「能力地图」与「场景决策器」。',
      `能力地图：收录 ${index.tools.length} 个 AI 工具，每个在 14 个维度（写作、长文理解、推理、数理、编程、研究、Agent、数据、办公、图像生成、图像理解、视频、语音、实时交互）上有 0-5 分，并标注强项、弱项与「别用它做」。`,
      '场景决策器：纯规则引擎，输入任务类型与限制条件，输出首选与备选工具及可解释理由，不调用大模型。',
      '另有知识库（AI 概念与术语）、教程（含可复制提示词）、案例库（真实提示词原文）、AI 教育供给（面向学校的课程与教案包）。',
      '内容全部带更新时间与来源链接，超过阈值会标注「可能已过时」。',
    ].join('\n'),
    relevant,
  }
}

/** 生成回答（纯函数：同样的输入永远同样的输出） */
export function answer(query: string, index: AssistantToolsIndex, now: Date = new Date()): AssistantAnswer {
  const intent = detectIntent(query, index)
  const followUps = [...FOLLOWUPS[intent]]

  switch (intent) {
    case 'recommend':
      return answerRecommend(query, index, followUps)
    case 'tool-pros-cons':
      return answerToolProsCons(query, index, followUps)
    case 'concept':
      return answerConcept(query, index, followUps)
    case 'guide':
      return answerGuide(query, index, followUps)
    case 'freshness':
      return answerFreshness(index, now, followUps)
    default:
      return answerSearch(query, index, followUps)
  }
}

function answerRecommend(
  query: string,
  index: AssistantToolsIndex,
  followUps: string[]
): AssistantAnswer {
  const scenarioId = guessScenario(query, index.scenarios)
  const rule = index.scenarios.find((s) => s.id === scenarioId)
  const flags = guessFlags(query)

  // 猜不出场景就退回站内搜索，并引导用户去 /find 手选
  if (!rule) {
    return {
      intent: 'recommend',
      headline: '我可以帮你选，但需要你先去决策器点一下场景',
      paragraphs: [
        `助手会调用站内那套纯规则决策器给你结论，所以它只能覆盖已经定义好的 ${index.scenarios.length} 个场景。`,
        '在决策器里选一个任务类型，再勾上你的限制条件，结果会带完整的命中理由和备选。',
      ],
      links: [
        {
          href: '/find',
          label: '打开场景决策器',
          hint: `${index.scenarios.length} 个场景 + 可解释推荐`,
        },
      ],
      followUps,
      basis: '助手不联网、不调用大模型；推荐由站内规则引擎计算',
    }
  }

  const result = recommend(rule, flags, index.tools)
  const primary = result.primary
  if (!primary) {
    return {
      intent: 'recommend',
      headline: '当前条件下没有工具能同时满足所有要求',
      paragraphs: [
        '最常见的原因是条件互相冲突（例如同时要求「必须免费」+「数据不能上传云端」+「要能出成品文件」）。',
        `试着放开其中一条，或者到决策器里自己调条件：${rule.label}。`,
      ],
      links: [
        { href: '/find', label: '打开场景决策器' },
        { href: '/compare', label: '手动对比工具' },
      ],
      followUps,
      basis: `场景「${rule.label}」的权重表在 /find 页面底部公开`,
    }
  }

  const matched = primary.matched
    .filter((m) => m.weight > 0.05)
    .slice(0, 3)
    .map((m) => `${capabilityLabel(m.key as CapabilityKey)}（权重 ${m.weight}）`)
    .join('、')

  const alternates = result.alternates
    .map((a) => `${a.tool.name}（${a.score}/5）`)
    .join('、')

  return {
    intent: 'recommend',
    headline: `「${rule.label}」场景下，首选 ${primary.tool.name}（适配分 ${primary.score}/5）`,
    paragraphs: [
      primary.reasons[0] ?? '按场景权重加权后它的得分最高。',
      matched ? `命中的能力维度：${matched}。` : '',
      alternates ? `备选：${alternates}。取舍要看你的具体约束，不是分数低的就不行。` : '',
      '别只看首选：这个场景我最想提醒的是——所有工具的输出都要自己核对一遍，尤其是数字和引用。',
    ].filter(Boolean),
    links: [
      { href: `/tools/${primary.tool.id}`, label: `${primary.tool.name} 能力详情`, hint: '含弱项与别用它做' },
      { href: '/find', label: '在决策器里复现这个结论' },
      ...(alternates ? [{ href: '/compare', label: '对比这几个工具' }] : []),
    ],
    followUps,
    basis: '来自站内规则引擎（场景权重 × 工具能力分 + 你勾选的条件），不是拍脑袋推荐',
  }
}

function answerToolProsCons(
  query: string,
  index: AssistantToolsIndex,
  followUps: string[]
): AssistantAnswer {
  const cleaned = cleanQuery(query)
  const hit =
    searchDocs(index.searchDocs, cleaned, 8).find((h) => h.doc.type === 'tool') ??
    searchDocs(index.searchDocs, query, 8).find((h) => h.doc.type === 'tool')
  const tool = hit ? index.tools.find((t) => t.id === hit.doc.id) : undefined
  if (!tool) {
    return {
      intent: 'tool-pros-cons',
      headline: '没找到对应的工具，换个名字试试',
      paragraphs: ['比如直接输入工具名（DeepSeek、NotebookLM、Cursor），或去工具库按维度筛选。'],
      links: [{ href: '/tools', label: '打开工具库' }],
      followUps,
    }
  }

  const notFor = tool.alternatives.map((id) => index.tools.find((t) => t.id === id)?.name).filter(Boolean)

  return {
    intent: 'tool-pros-cons',
    headline: `${tool.name}：强项在${capabilityLabel(topKey(tool))}，但有三个地方要小心`,
    paragraphs: [
      `强项：${tool.strengths[0]}`,
      `短板：${tool.weaknesses[0]}`,
      `别用它做：${tool.avoidFor[0]}`,
      tool.chinaAccessible
        ? '中国大陆可直接访问，不用折腾网络环境。'
        : '中国大陆通常需要借助网络工具，课上/办公室里临时用要提前确认。',
      notFor.length > 0
        ? `如果它不合手，可以看看：${notFor.slice(0, 3).join('、')}。`
        : '它在站内还没有登记替代品，想换工具可以从工具库按维度找。',
    ],
    links: [
      { href: `/tools/${tool.id}`, label: `${tool.name} 完整能力档案`, hint: '含 14 维雷达与打分依据' },
      { href: '/compare', label: '和别家横向对比' },
    ],
    followUps,
    basis: `数据更新于 ${tool.updatedAt}，来源见工具详情页底部`,
  }
}

function answerConcept(
  query: string,
  index: AssistantToolsIndex,
  followUps: string[]
): AssistantAnswer {
  // 先用清洗后的关键词搜；搜不到再退回原句，避免清洗过头丢失信息
  const cleaned = cleanQuery(query)
  const hit =
    searchDocs(index.searchDocs, cleaned, 8).find((h) => h.doc.type === 'concept') ??
    searchDocs(index.searchDocs, query, 8).find((h) => h.doc.type === 'concept')
  const concept = hit
    ? index.concepts.find((c) => c.id === hit.doc.id)
    : index.concepts.find((c) => cleaned.includes(normalize(c.term)) || normalize(c.term).includes(cleaned))

  if (!concept) {
    return {
      intent: 'concept',
      headline: '这个概念还没收录到站内',
      paragraphs: ['可以先在术语表里搜一下，那里是全站概念的索引。'],
      links: [
        { href: '/learn/glossary', label: '术语表' },
        { href: '/learn', label: '知识库' },
      ],
      followUps,
    }
  }

  return {
    intent: 'concept',
    headline: `${concept.term}${concept.termEn ? `（${concept.termEn}）` : ''}`,
    paragraphs: [concept.definition, `打个比方：${concept.analogy}`, '想知道在日常工作里怎么用，直接看这一页的延伸阅读。'],
    links: [
      { href: `/learn/${concept.id}`, label: `读完整解释`, hint: '按六段式结构展开' },
      { href: '/learn/glossary', label: '术语表' },
    ],
    followUps,
    basis: '来自站内知识库，内容有编辑复核',
  }
}

function answerGuide(query: string, index: AssistantToolsIndex, followUps: string[]): AssistantAnswer {
  const cleaned = cleanQuery(query)
  const hits = [
    ...searchDocs(index.searchDocs, cleaned, 8),
    ...searchDocs(index.searchDocs, query, 8),
  ]
  const guide = hits.find((h) => h.doc.type === 'guide')
  // 标题里出现任一关键词也算命中（「写周报」能命中《用 AI 写周报…》）
  const methodHits = cleaned
    ? index.guides.filter((g) => {
        const title = normalize(g.title)
        return (
          title.includes(cleaned) ||
          cleaned.split(' ').some((word) => word.length >= 2 && title.includes(word))
        )
      })
    : []

  if (!guide && methodHits.length === 0) {
    return {
      intent: 'guide',
      headline: '没有完全对应的教程，但可以按场景找',
      paragraphs: [
        '站内教程分两类：通用方法课（怎么把话说清楚）和场景实操课（照着做完就能交活）。',
        '告诉我你具体要做什么，比如「写周报」「读长文档」，我能直接给你一篇。',
      ],
      links: [
        { href: '/guides', label: '浏览全部教程' },
        { href: '/find', label: '用场景决策器找方法' },
      ],
      followUps,
    }
  }

  const title = guide ? guide.doc.title : (methodHits[0]?.title ?? '相关教程')
  const id = guide ? guide.doc.id : (methodHits[0]?.id ?? '')

  return {
    intent: 'guide',
    headline: `这篇能直接照着做：${title}`,
    paragraphs: [
      '站内教程的写法是「照着做完就能交活」：每一步都写清在哪做、输入什么、预期输出是什么、出错了怎么办。',
      '如果你时间紧，先看「目标」那一段，确认做完你会得到什么，再决定要不要投入。',
    ],
    links: [
      ...(id ? [{ href: `/guides/${id}`, label: '打开教程' }] : []),
      { href: '/guides', label: '其他教程' },
    ],
    followUps,
    basis: '站内教程均标注版本与复核时间',
  }
}

function answerFreshness(
  index: AssistantToolsIndex,
  now: Date,
  followUps: string[]
): AssistantAnswer {
  const ages = index.tools.map((t) => ({
    tool: t,
    age: daysSince(t.updatedAt, now),
  }))
  const worst = ages.sort((a, b) => b.age - a.age)[0]
  const staleCount = ages.filter((a) => levelOf(a.age, 'tool') === 'stale').length

  return {
    intent: 'freshness',
    headline:
      staleCount === 0
        ? `全部 ${ages.length} 个工具的数据都在有效期内，最旧的一条是 ${worst.tool.name}（${worst.age} 天前更新）`
        : `有 ${staleCount} 个工具的数据已超过 180 天未复核，请以官方页面为准`,
    paragraphs: [
      '站内每条数据都带 updatedAt 与来源链接，超过阈值会在页面上直接标「可能已过时」，不会装作是最新的。',
      '不同内容用不同阈值：工具能力 30 天算新，概念定义 180 天算新——一刀切的过期标准是懒。',
      '如果你发现某条明显过时，提交勘误最快，我们会在 7 天内核对并记进更新雷达。',
    ],
    links: [
      { href: '/freshness', label: '数据保鲜看板', hint: '全站复核状态与待办清单' },
      { href: '/about#errata', label: '提交勘误' },
      { href: '/updates', label: '更新雷达' },
    ],
    followUps,
    basis: '阈值与状态由站内保鲜引擎实时计算，见 /freshness',
  }
}

function answerSearch(query: string, index: AssistantToolsIndex, followUps: string[]): AssistantAnswer {
  const cleaned = cleanQuery(query)
  const hits = [
    ...searchDocs(index.searchDocs, cleaned, 5),
    ...searchDocs(index.searchDocs, query, 5),
  ].filter((h, i, arr) => arr.findIndex((x) => x.doc.id === h.doc.id) === i)
  if (hits.length === 0) {
    return {
      intent: 'search',
      headline: '站内没找到相关内容',
      paragraphs: [
        '换个更短的关键词试试，比如只输入工具名、概念名，或者场景（如「PPT」「周报」）。',
        '如果你是想解决具体问题，直接用场景决策器更快——它不需要你先知道工具名字。',
      ],
      links: [
        { href: '/find', label: '打开场景决策器' },
        { href: '/search', label: '全站搜索' },
      ],
      followUps,
    }
  }

  return {
    intent: 'search',
    headline: `站内有 ${hits.length} 条相关内容，最相关的是「${hits[0].doc.title}」`,
    paragraphs: [
      hits[0].doc.summary,
      '不确定该用哪个工具的话，别自己猜——描述你要做的事，让决策器给结论。',
    ],
    links: hits.slice(0, 4).map((h) => ({ href: h.doc.href, label: h.doc.title })),
    followUps,
    basis: '站内全文检索（Fuse.js），不是外部搜索',
  }
}

// ---- 工具函数 ----

function topKey(tool: Tool): CapabilityKey {
  const entries = Object.entries(tool.capabilities) as [CapabilityKey, { score: number }][]
  return entries.sort((a, b) => b[1].score - a[1].score)[0]?.[0] ?? 'writing'
}
