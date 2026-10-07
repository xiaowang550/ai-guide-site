/**
 * 全站数据模型（唯一数据契约）
 *
 * 约定：
 * - 所有数据以 TypeScript 对象形式存放在 `data/` 下，组件只读不写。
 * - 评分、价格等易过时信息必须带 `updatedAt` 与 `sources`。
 * - 不确定的数值用 `// TODO: verify` 标注，绝不留空字符串占位。
 */

// ---------- 能力维度 ----------

/** 14 个能力维度，禁止自定义新增（新增需同步 lib/score.ts 权重与全量数据） */
export type CapabilityKey =
  | 'writing'
  | 'longform'
  | 'reasoning'
  | 'math'
  | 'coding'
  | 'research'
  | 'agent'
  | 'data'
  | 'office'
  | 'imageGen'
  | 'vision'
  | 'video'
  | 'voice'
  | 'realtime'

export type Score = 0 | 1 | 2 | 3 | 4 | 5

export interface CapabilityScore {
  score: Score
  /** 打分依据：官方基准测试 / 公开反馈 / 社区共识（本站不做自建评测） */
  basis?: string
}

/** 工具在大陆网络下的实际情况与替代方案 */
export interface AccessNote {
  /**
   * 一句话说清「打开会怎样」，要区分原因：
   * 官方未在该地区开放 / 服务条款限制 / 访问不稳定 —— 这三者性质不同，
   * 读者需要的应对也不同。
   */
  reality: string
  /**
   * 打不开时能替代的本站已收录工具（Tool.id）。
   * 必须是 `chinaAccessible: true` 的工具，否则等于把用户从一扇关着的门推到另一扇。
   */
  alternatives: string[]
}

// ---------- 工具 ----------

export interface Tool {
  /** slug，如 'claude' */
  id: string
  name: string
  nameEn: string
  vendor: string
  /** 站内相对路径，如 '/logos/claude.svg' */
  logo: string
  /** 一句话定位 */
  tagline: string
  /** 2-3 句介绍 */
  description: string
  categories: ToolCategory[]
  tags: string[]

  capabilities: Record<CapabilityKey, CapabilityScore>
  /** 由 lib/score.ts 加权计算得出，数据文件中不手填 */
  overallScore: number

  /** 3-5 条强项，具体到能举例 */
  strengths: string[]
  /** 3-5 条弱项，必须诚实 */
  weaknesses: string[]
  /** 3 条「别用它做」 */
  avoidFor: string[]
  /** 3 条最适合的场景 */
  bestFor: string[]
  /**
   * 评分方法说明：这个工具的分数怎么来的、什么情况下会失效。
   *
   * 存在意义：本站承诺「不吹不黑」，就必须说清依据边界。
   * 我们**没有自建评测**（无法在本地复现各家闭源模型），
   * 所以这里如实写明：依据来自公开资料整理 + 能力边界判断 + 社区共识，
   * 并指出什么情况下这个分数不再成立（例如大版本更新后）。
   */
  evidence?: string

  chineseQuality: Score
  /** 中国大陆是否可直连 */
  chinaAccessible: boolean
  /**
   * 不可直连时的说明。
   *
   * 为什么 `chinaAccessible: false` 不够：那个布尔值只回答「能不能打开」，
   * 而读者真正需要的是「打不开该怎么办、能换用什么」。
   * 少了这一段，工具详情页只能写一句「大陆需借助网络工具」，
   * 等于没说 —— 点击链接打不开，页面却没给出任何下一步。
   *
   * **不要在这里写绕过网络限制的方法。** 本站不提供此类教程：
   * 一是规避网络管理在境内有法律风险，二是本站承诺「不吹不黑」，
   * 不做厂商带货。诚实地说清限制、并给出可用的替代方案，才是能提供的价值。
   */
  access?: AccessNote
  /** 文本上下文窗口，如 '200K tokens' */
  contextWindow?: string
  multimodal: MultimodalSupport
  hasApi: boolean

  pricing: Pricing
  platforms: Platform[]

  hallucinationRisk: 'low' | 'medium' | 'high'
  latency: 'fast' | 'medium' | 'slow'
  stability: 'high' | 'medium' | 'low'
  /** 其他 Tool.id */
  alternatives: string[]

  officialUrl: string
  docsUrl?: string
  sources: Source[]
  /** ISO 日期字符串 */
  updatedAt: string
  featured?: boolean
}

export type ToolCategory =
  | 'chat'
  | 'coding'
  | 'image'
  | 'video'
  | 'audio'
  | 'research'
  | 'agent'
  | 'office'
  | 'data'
  | 'open-source'

export const TOOL_CATEGORIES: ToolCategory[] = [
  'chat',
  'coding',
  'image',
  'video',
  'audio',
  'research',
  'agent',
  'office',
  'data',
  'open-source',
]

export interface MultimodalSupport {
  text: boolean
  image: boolean
  audio: boolean
  video: boolean
  file: boolean
}

export type Platform = 'web' | 'ios' | 'android' | 'windows' | 'mac' | 'api' | 'plugin' | 'cli'

export interface Pricing {
  /** 免费额度描述，如 '免费版每天 5 条消息' */
  freeTier: string
  /** 如 '约 $20/月起' */
  paidFrom?: string
  model: 'free' | 'freemium' | 'paid' | 'open-source'
  note?: string
}

export interface Source {
  label: string
  url: string
}

// ---------- 概念 ----------

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export interface Concept {
  id: string
  term: string
  termEn?: string
  difficulty: Difficulty
  /** 一句话定义 */
  definition: string
  whyItMatters: string
  /** 打比方 */
  analogy: string
  example: string
  misconceptions: string[]
  /** 其他 Concept.id */
  related: string[]
  category: string
  /** 关联 content/concepts/<id>.mdx（可选） */
  bodyKey?: string
  updatedAt: string
}

// ---------- 术语表 ----------

export interface GlossaryEntry {
  id: string
  term: string
  termEn: string
  short: string
  /** 长解释，可含 Markdown */
  detail: string
  /** 关联 Concept.id */
  conceptId?: string
  updatedAt: string
}

// ---------- 教程 ----------

export interface Guide {
  id: string
  title: string
  type: 'method' | 'scenario'
  level: Difficulty
  durationMin: number
  prerequisites: string[]
  /** 做完你会得到什么 */
  outcome: string
  steps: GuideStep[]
  promptTemplates: PromptTemplate[]
  /** Tool.id */
  tools: string[]
  nextGuides: string[]
  /** 关联 content/guides/<id>.mdx（可选） */
  bodyKey?: string
  summary?: string
  updatedAt: string
}

export interface GuideStep {
  title: string
  doWhat: string
  /** 在哪做 */
  where: string
  /** 输入什么 */
  input?: string
  expectedOutput?: string
  /** 出错怎么办 */
  troubleshooting?: string
}

// ---------- 提示词模板 ----------

export interface PromptTemplate {
  id: string
  title: string
  scenario: string
  /** 含 {{变量}} */
  body: string
  variables: { key: string; label: string; placeholder: string }[]
  exampleOutput?: string
  /** 各模型上的注意事项 */
  modelNotes?: string
}

// ---------- 学习路径 ----------

export interface LearningPath {
  id: string
  title: string
  audience: string
  estHours: number
  summary: string
  phases: PathPhase[]
  updatedAt: string
}

export interface PathPhase {
  title: string
  /** 学完你能做什么 */
  outcome: string
  items: PathItem[]
}

export interface PathItem {
  label: string
  href: string
  type: 'concept' | 'guide' | 'tool' | 'case'
}

// ---------- 案例 ----------

export interface CaseStudy {
  id: string
  title: string
  industry: string
  role: string
  scenario: string
  painPoint: string
  /** Tool.id */
  tools: string[]
  /** 真实提示词原文 */
  prompt: string
  result: string
  timeSpent: string
  pitfalls: string[]
  reusability: 'high' | 'medium' | 'low'
  summary?: string
  updatedAt: string
}

// ---------- 场景决策器 ----------

export interface ScenarioRule {
  id: string
  label: string
  /** 站点内使用的图标名，见 components/ui/Icon.tsx */
  icon: string
  /** 权重 0-1，求和归一 */
  weights: Partial<Record<CapabilityKey, number>>
  /** 必须 ≥ minRequiredScore 分的维度 */
  requiredCapabilities?: { key: CapabilityKey; minRequiredScore?: Score }[]
  defaultPromptTemplate: string
  pitfalls: string[]
  workflow?: { step: number; action: string; preferCapability: CapabilityKey }[]
  /** 一句话说明这个场景在挑什么 */
  description: string
}

/** 决策器第 2 步的补充条件 */
export interface RequirementFlags {
  chineseFirst?: boolean
  mustBeFree?: boolean
  lowBudget?: boolean
  privacySensitive?: boolean
  chinaDirect?: boolean
  needDeliverableFile?: boolean
  noLearningCurve?: boolean
}

// ---------- 更新雷达 ----------

export type UpdateType =
  | 'new-tool'
  | 'removed'
  | 'price-change'
  | 'capability-change'
  | 'new-concept'
  | 'new-guide'
  | 'data-fix'

export interface UpdateRecord {
  id: string
  date: string
  type: UpdateType
  summary: string
  /** 影响的页面路由 */
  affected: string[]
}

// ---------- 搜索 ----------

export type SearchDocType = 'tool' | 'concept' | 'guide' | 'case' | 'path' | 'program' | 'toolkit' | 'briefing'

export interface SearchDoc {
  id: string
  type: SearchDocType
  title: string
  /** 英文名 / 术语英文 */
  subtitle?: string
  /** 摘要，用于搜索命中 */
  summary: string
  /** 关键词加权 */
  keywords: string[]
  href: string
  tags: string[]
}

// ==========================================================================
// AI 教育供给模块（面向本地学校：管理者 / 教师 / 学生）
// 对应方案：教师端四层阶梯、学生端三层阶梯、课程与教案包、更新机制、试点推广
// ==========================================================================

/** 阶梯层级：教师 L1-L4，学生 S1-S3 */
export type EduLadderTier = 'T1' | 'T2' | 'T3' | 'T4' | 'S1' | 'S2' | 'S3'

export interface EduTier {
  id: EduLadderTier
  audience: 'teacher' | 'student'
  /** 阶梯序号（教师 1-4，学生 1-3） */
  order: number
  name: string
  /** 一句话说明这一层要解决什么 */
  goal: string
  /** 从这一层到下一层的前置条件 */
  requires: string
}

/** 课程（进校宣讲与工作坊的最小交付单位） */
export interface EduProgram {
  id: string
  title: string
  tier: EduLadderTier
  /** 面向的学段，如 '小学' / '初中' / '高中' / '跨学段' */
  stage: string
  /** 学科或岗位方向 */
  subject: string
  /** 课时（45 分钟一课时） */
  lessons: number
  /** 建议交付形式 */
  format: EduProgramFormat
  /** 学完能达成什么（可验收） */
  outcome: string
  /** 面向谁 */
  audience: string
  prerequisites: string[]
  /** 大纲模块（每个模块含时长与要点） */
  modules: EduProgramModule[]
  /** 每层配套交付物 */
  deliverables: string[]
  /** 常见错误清单 */
  commonMistakes: string[]
  /** 关联的站内材料：guides/ concepts/ tools 的 id */
  relatedRefs: { kind: 'guide' | 'concept' | 'tool'; id: string }[]
  /** 验收方式 */
  assessment: string
  version: string
  /** 适用时间（内容版本化的核心字段） */
  validFrom: string
  validTo?: string
  /** 被哪门课程/教案包替代（内容版本化：替代关系） */
  supersededBy?: string
  updatedAt: string
}

export type EduProgramFormat =
  | '进校宣讲'
  | '教师工作坊'
  | '线上直播'
  | '校本定制'
  | '种子教师培养'

export interface EduProgramModule {
  title: string
  minutes: number
  points: string[]
  /** 课堂活动设计 */
  activity?: string
}

/** 课程与教案包：学校拿到即可开课 / 备课 */
export interface EduToolkit {
  id: string
  title: string
  stage: string
  subject: string
  /** 关联课程 */
  programId: string
  /** 适用课次 */
  lessons: number
  /** 教案结构（每一课时） */
  lessonPlans: EduLessonPlan[]
  /** 课堂讨论题 */
  discussionQuestions: string[]
  /** 课堂活动设计 */
  activities: string[]
  /** 配套工具（Tool.id），用于「用什么工具做」 */
  toolIds: string[]
  /** AI 使用规范要点（进入教案的硬性要求） */
  policyNotes: string[]
  /** 学生 AI 使用声明（作业提交时附） */
  declarationTemplate: string
  version: string
  validFrom: string
  validTo?: string
  supersededBy?: string
  updatedAt: string
}

export interface EduLessonPlan {
  title: string
  minutes: number
  goal: string
  flow: string[]
  /** 学生产出 */
  studentOutput: string
  /** 常见问题与处理 */
  troubleshooting: string[]
}

/** 试点学校与区域推广看板 */
export interface EduSchool {
  id: string
  name: string
  /**
   * 是否为演示用的示例数据。
   *
   * 重要：学校名称、教师人数属于机构的真实信息，未经许可不应公开在网站上。
   * 示例数据必须标 true，页面会显示醒目标记，覆盖人数类指标也会注明
   * 「含示例数据」—— 避免演示数字被当成真实成果传播。
   * 替换成真实试点信息时，请一并改成 false。
   */
  isSample?: boolean
  stage: string
  /** 推广阶段 */
  phase: EduSchoolPhase
  /** 已交付内容：EduProgram.id */
  deliveredPrograms: string[]
  /** 已交付教案包：EduToolkit.id */
  deliveredToolkits: string[]
  /** 种子教师人数 */
  seedTeachers: number
  /** 覆盖教师人数 */
  teachersReached: number
  /** 下一步动作 */
  nextStep: string
  /** 校本化说明 */
  customization: string
  updatedAt: string
}

export type EduSchoolPhase = '试点验证' | '成熟复制' | '区域推广' | '师资自传播'

/** 定期简报：本期变了什么、对我们意味着什么 */
export interface EduBriefing {
  id: string
  /** 期号，如 '2026 第 3 期' */
  issue: string
  date: string
  /** 面向谁 */
  audience: 'teachers' | 'schools' | 'both'
  summary: string
  /** 本期变化 */
  changes: EduChange[]
  /** 对学校意味着什么 */
  implications: string[]
  /** 建议动作 */
  actions: EduAction[]
  /** 受影响的站内内容 */
  affectedRefs: string[]
  editorNote?: string
}

export interface EduChange {
  title: string
  /** 变化性质 */
  kind: '工具变更' | '能力变更' | '政策与规范' | '风险提示' | '方法更新'
  detail: string
  /** 建议动作 */
  action: string
}

export interface EduAction {
  title: string
  detail: string
  /** 谁来做 */
  owner: '教研组' | '班主任' | '任课教师' | '学校管理者' | 'AI 教育部门'
  /** 优先级 */
  priority: 'high' | 'medium' | 'low'
}

/** AI 使用规范生成器的规则（纯规则，不调用任何模型 API） */
export interface EduPolicyRule {
  id: string
  label: string
  /** 适用学段 */
  stages: EduStage[]
  /** 适用学科，空数组表示全学科 */
  subjects: EduSubject[]
  /** 适用强度 */
  intensities: EduIntensity[]
  /** 条款 */
  clauses: EduPolicyClause[]
  /** 该组合下必须禁止的做法 */
  redLines: string[]
}

export type EduStage = '小学' | '初中' | '高中' | '职高'
export type EduSubject =
  | '语文'
  | '数学'
  | '英语'
  | '科学'
  | '信息技术'
  | '道德与法治'
  | '综合实践'
  | '通用'
export type EduIntensity = '仅教师可用' | '学生可用需声明' | '学生可受限使用' | '明确禁止'

export interface EduPolicyClause {
  title: string
  items: string[]
}

/** 答疑与反馈回路 */
export interface EduFaq {
  id: string
  /** 面向对象 */
  audience: 'teacher' | 'student' | 'guardian' | 'school'
  category: string
  question: string
  answer: string
  /** 相关站内页面 */
  refs: string[]
  updatedAt: string
}