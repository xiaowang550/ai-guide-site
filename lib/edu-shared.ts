import type { EduIntensity, EduStage, EduSubject } from '@/data/types'
import { eduPolicyRules } from '@/data/edu-policy'

/**
 * 客户端安全的教育模块纯函数。
 *
 * 为什么单独拆出来：`lib/edu.ts` 为了给服务端页面算指标，
 * 会 import eduPrograms / eduToolkits / eduSchools / eduBriefings / eduFaq 全部数据。
 * 一旦有 client 组件（规范生成器、教案包列表）从它取常量，
 * 这些长文本就会被打进浏览器包，而且进入「多个页面共享」的 chunk —— 等于全站替它买单。
 *
 * 这里只依赖规则表 edu-policy（十几 KB），可以被客户端安全引用。
 * 常量也从这里出，避免再出现「从 data 聚合出口 import」把整包数据拖进来。
 */

export const AUDIENCE_LABELS: Record<'teacher' | 'student' | 'guardian' | 'school', string> = {
  teacher: '教师',
  student: '学生',
  guardian: '家长',
  school: '学校管理者',
}

export const STAGE_LABELS: EduStage[] = ['小学', '初中', '高中', '职高']

export const SUBJECT_OPTIONS: EduSubject[] = [
  '语文',
  '数学',
  '英语',
  '科学',
  '信息技术',
  '道德与法治',
  '综合实践',
  '通用',
]

export const INTENSITY_OPTIONS: EduIntensity[] = [
  '仅教师可用',
  '学生可用需声明',
  '学生可受限使用',
  '明确禁止',
]

/** 内容版本化：判断某份材料是否仍在有效期内（不需要任何数据集） */
export function isCurrent(validFrom: string, validTo?: string, now: Date = new Date()): boolean {
  const t = now.getTime()
  const from = new Date(validFrom).getTime()
  const to = validTo ? new Date(validTo).getTime() : Number.POSITIVE_INFINITY
  return t >= from && t <= to
}

export interface PolicyInput {
  stage: EduStage
  subject: EduSubject
  intensity: EduIntensity
}

export interface PolicyResult {
  /** 命中的规则 id（可解释：说明为什么适用这几条） */
  matchedRuleIds: string[]
  /** 未命中任何规则的字段组合 */
  fallbacks: string[]
  sections: { title: string; items: string[] }[]
  redLines: string[]
  /** 学生 AI 使用声明（按学段与强度定制） */
  declaration: string
  /** 作业与评价的调整建议 */
  homeworkAdjustments: string[]
}

const SUBJECT_TOOLKIT_HINT: Record<EduSubject, string> = {
  语文: '涉及作文与阅读理解时，工具只能用于解释概念与生成练习，不得用于生成作文初稿',
  数学: '涉及解题过程时，必须保留完整推导链，工具输出不得直接作为解题步骤提交',
  英语: '涉及听说读写产出时，需声明使用工具，并保留录音或修改记录',
  科学: '涉及实验与结论时，工具可辅助设计方案，但数据必须来自真实实验记录',
  信息技术: '涉及代码时，鼓励工具辅助调试，但需能逐行解释自己的代码',
  道德与法治: '涉及观点表达时，教师须先做价值引导，不以工具输出作为学生答案',
  综合实践: '涉及资料整理时，要求标注来源与核对方式',
  通用: '所有学科通用：工具用于提效，不替代学生本人的思考过程',
}

/**
 * 规范生成器：按「学段 + 学科 + 使用强度」匹配规则，合并去重后输出条款与红线。
 * 同样的输入永远得到同样的输出，页面会显示命中了哪几条规则，便于质疑与修订。
 */
export function generatePolicy(input: PolicyInput): PolicyResult {
  const matched = eduPolicyRules.filter(
    (rule) =>
      rule.stages.includes(input.stage) &&
      (rule.subjects.length === 0 || rule.subjects.includes('通用') || rule.subjects.includes(input.subject)) &&
      rule.intensities.includes(input.intensity)
  )

  // 兜底规则：至少给出一条通则，避免空结果
  const general = eduPolicyRules.filter(
    (rule) => rule.stages.includes(input.stage) && rule.subjects.includes('通用')
  )
  const used = matched.length > 0 ? matched : general
  const fallbacks =
    matched.length > 0
      ? []
      : ['没有完全匹配的组合，已套用通用规则，请在使用前核对条款是否贴合本校实际']

  const sections = dedupeSections(used.flatMap((r) => r.clauses))
  const redLines = dedupe(used.flatMap((r) => r.redLines))

  const subjectNote = SUBJECT_TOOLKIT_HINT[input.subject]
  if (subjectNote && !sections.some((s) => s.items.includes(subjectNote))) {
    sections.push({ title: '学科专项要求', items: [subjectNote] })
  }

  return {
    matchedRuleIds: used.map((r) => r.id),
    fallbacks,
    sections,
    redLines,
    declaration: buildDeclaration(input),
    homeworkAdjustments: buildHomeworkAdjustments(input),
  }
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items))
}

function dedupeSections(sections: { title: string; items: string[] }[]): { title: string; items: string[] }[] {
  const map = new Map<string, string[]>()
  for (const s of sections) {
    const list = map.get(s.title) ?? []
    list.push(...s.items)
    map.set(s.title, list)
  }
  return Array.from(map, ([title, items]) => ({ title, items: dedupe(items) }))
}

const INTENSITY_LABEL: Record<EduIntensity, string> = {
  仅教师可用: '仅教师在教学准备环节使用',
  学生可用需声明: '学生可使用，但每次使用必须声明并接受核对',
  学生可受限使用: '学生可在明确范围内使用，超出范围需教师单独授权',
  明确禁止: '本范围内禁止学生使用，只允许教师演示',
}

/**
 * 生成给学生的单据。
 *
 * **这一段曾经是个逻辑错误**：强度选「明确禁止」时，页面仍然输出
 * 「AI 使用声明」，让被禁止使用 AI 的学生去签一份「我用了 AI、我这样核对过」
 * 的声明 —— 既自相矛盾，也会教出「先签了再说」的习惯。
 *
 * 现在按强度分两种单据：
 * - 允许 / 受限使用 → 使用声明（声明用了什么、怎么核对）
 * - 明确禁止       → 观察记录（记录观看教师演示时观察到了什么）
 *
 * 两者由同一入口 generatePolicy 产出，但字段完全不同。
 * 页面标题也随强度变化，见 declarationTitle()。
 */
export function buildDeclaration(input: PolicyInput): string {
  if (input.intensity === '明确禁止') return buildObservationRecord(input)
  return `AI 使用声明（${input.stage} · ${input.subject}）

本人${INTENSITY_LABEL[input.intensity]}。
我使用的工具：____________________（写明工具名称与版本/日期）
我用在以下环节：____________________（如：查资料、整理提纲、检查错题）
我的核对方式：____________________（至少写一种：换一种问法再问 / 找到了原始来源 / 用课本知识反证）
以下部分由我本人独立完成：____________________
我确认：以上内容没有直接复制工具输出，也没有请人代写。若有不实，愿承担相应责任。

声明人：__________  日期：__________`
}

/**
 * 「明确禁止」时给学生的单据：AI 使用观察记录。
 *
 * 用途是替代个人产出 —— 学生不用 AI，但要观看教师演示并留下观察痕迹，
 * 这份记录就是该场景下合理的学习证据。字段围绕「我看到了什么、
 * 我注意到什么局限、我打算自己怎么试」，而不是「我用了什么」。
 */
export function buildObservationRecord(input: PolicyInput): string {
  return `AI 使用观察记录（${input.stage} · ${input.subject}）

本范围内禁止学生使用 AI。以下是观看教师演示时的观察记录。

演示课次与日期：____________________
演示工具：____________________（写明工具名称与版本/日期）
我观察到的三个要点：____________________（写具体做法，不要写「学到了很多」）
我注意到的一处局限：____________________（哪一步需要人工核对、哪一步它做错了）
我的疑问：____________________
我想自己动手试的一件事（不用 AI）：____________________
记录人：__________  日期：__________`
}

/**
 * 单据标题随强度变化。
 * 页面标题不能写死成「AI 使用声明」—— 禁止使用时出现这个标题本身就是错的。
 */
export function declarationTitle(input: PolicyInput): string {
  return input.intensity === '明确禁止' ? 'AI 使用观察记录' : 'AI 使用声明'
}

export function buildHomeworkAdjustments(input: PolicyInput): string[] {
  const base = [
    '过程留痕：作业需附提问记录或修改记录，只交最终成品不予采信',
    '口头答辩：随机抽问两个细节，验证是否本人完成',
    '评分拆分：将评分拆为「过程 40% + 结果 60%」，过程部分给明确的可观察标准',
  ]
  if (input.intensity === '明确禁止') {
    return [
      ...base,
      '本范围以「教师演示 + 学生观察记录」替代个人产出，评分只看观察记录与课堂表现',
    ]
  }
  if (input.intensity === '仅教师可用') {
    return [
      ...base,
      '学生产出的完整性由教师把关：教师须核对工具输出中的事实与数字后再使用',
    ]
  }
  return [
    ...base,
    '声明使用：学生须在作业末尾附 AI 使用声明，声明本身计入过程分',
    `学科要求：${SUBJECT_TOOLKIT_HINT[input.subject]}`,
  ]
}