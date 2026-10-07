import type {
  CaseStudy,
  Concept,
  GlossaryEntry,
  Guide,
  LearningPath,
  PromptTemplate,
  SearchDoc,
  Tool,
} from './types'
import { tools as rawTools } from './tools'
import { concepts as rawConcepts } from './concepts'
import { guides } from './guides'
import { cases } from './cases'
import { paths } from './paths'
import { updates } from './updates'
import { scenarios } from './scenarios'
import { glossary } from './glossary'
import { promptTemplates } from './prompts'
import { eduPrograms, eduTiers } from './edu-programs'
import { eduToolkits } from './edu-toolkits'
import { eduSchools } from './edu-schools'
import { eduBriefings } from './edu-briefings'
import { eduFaq } from './edu-faq'
import { eduPolicyRules } from './edu-policy'
import { computeOverallScore } from '@/lib/score'
import contentOverrides from './generated/content-override.json'
import { applyOverrides, parseOverrideFile } from '@/lib/content/apply-overrides'

/**
 * 工具综合分不在数据文件里手填，这里统一计算后对外暴露。
 * 页面请从本文件取工具列表，不要直接 import data/tools。
 *
 * ── 后台改动的内容是怎么进来的 ──
 *
 * 后台（D1）里「已发布」的内容以**字段级覆盖**的形式合到基线之上。
 * 覆盖文件由构建第一步 `scripts/sync-content.mjs` 生成
 * （从公开的 /api/content/published 拉取，不需要任何凭据）。
 *
 * 这样安排的理由：
 *   · `data/*.ts` 仍是唯一基线，仍过全部 data 门禁 ——
 *     后台改出来的内容合并后同样要过这些校验（引用了不存在的工具、
 *     缺了能力维度，都会在 CI 里被抓到，而不是等线上才发现）
 *   · 内容源不可达时覆盖文件是空的，站点照常按基线发布
 *   · 覆盖通常只有几百字节，不会明显增加前端包体积
 *
 * 整条替换看起来更简单，但那会让「代码里修的数据」被后台一条旧记录静默盖掉。
 */
const overrides = parseOverrideFile(contentOverrides)

export const tools: Tool[] = applyOverrides(rawTools, overrides).tools.map((tool) => ({
  ...tool,
  overallScore: computeOverallScore(tool.capabilities),
}))

export const toolsById: Record<string, Tool> = Object.fromEntries(
  tools.map((t) => [t.id, t])
)

export const concepts: Concept[] = rawConcepts
export const conceptsById: Record<string, Concept> = Object.fromEntries(
  concepts.map((c) => [c.id, c])
)

export { guides, cases, paths, updates, scenarios, glossary, promptTemplates }

/** AI 教育供给模块（面向本地学校）：课程 / 教案包 / 试点 / 简报 / 规范 / FAQ */
export {
  eduPrograms,
  eduTiers,
  eduToolkits,
  eduSchools,
  eduBriefings,
  eduFaq,
  eduPolicyRules,
}

export const guidesById: Record<string, Guide> = Object.fromEntries(guides.map((g) => [g.id, g]))
export const casesById: Record<string, CaseStudy> = Object.fromEntries(cases.map((c) => [c.id, c]))
export const pathsById: Record<string, LearningPath> = Object.fromEntries(paths.map((p) => [p.id, p]))
export const promptTemplatesById: Record<string, PromptTemplate> = Object.fromEntries(
  promptTemplates.map((p) => [p.id, p])
)
export const glossaryById: Record<string, GlossaryEntry> = Object.fromEntries(
  glossary.map((g) => [g.id, g])
)

/** 按 id 取工具，找不到返回 undefined（不抛异常，避免页面崩溃） */
export function getTool(id: string): Tool | undefined {
  return toolsById[id]
}

/** 按 id 批量取工具，自动剔除无效 id（用于工具数组渲染） */
export function getTools(ids: string[]): Tool[] {
  return ids.map((id) => toolsById[id]).filter((t): t is Tool => Boolean(t))
}

/** 按 id 取概念 / 教程 / 案例，找不到返回 undefined */
export function getConcept(id: string): Concept | undefined {
  return conceptsById[id]
}

export function getGuide(id: string): Guide | undefined {
  return guidesById[id]
}

export function getCaseStudy(id: string): CaseStudy | undefined {
  return casesById[id]
}

export function getPromptTemplate(id: string): PromptTemplate | undefined {
  return promptTemplatesById[id]
}

/** 安全解析 /compare?ids=a,b,c */
export function parseIdsParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(',') : (value ?? '')
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && toolsById[s])
    .slice(0, 4)
}

/** 站内搜索索引：全站聚合，服务端构建时生成，客户端仅做模糊匹配 */
export const searchDocs: SearchDoc[] = [
  ...tools.map<SearchDoc>((t) => ({
    id: t.id,
    type: 'tool',
    title: t.name,
    subtitle: `${t.nameEn} · ${t.vendor}`,
    summary: t.tagline,
    keywords: [...t.tags, t.nameEn, t.vendor, t.description],
    href: `/tools/${t.id}`,
    tags: t.tags,
  })),
  ...concepts.map<SearchDoc>((c) => ({
    id: c.id,
    type: 'concept',
    title: c.term,
    subtitle: c.termEn,
    summary: c.definition,
    keywords: [c.termEn ?? '', c.category, c.whyItMatters],
    href: `/learn/${c.id}`,
    tags: [c.category],
  })),
  ...guides.map<SearchDoc>((g) => ({
    id: g.id,
    type: 'guide',
    title: g.title,
    subtitle: g.type === 'method' ? '通用方法课' : '场景实操课',
    summary: g.summary ?? g.outcome,
    keywords: [g.type, g.level, g.outcome, ...g.tools],
    href: `/guides/${g.id}`,
    tags: g.tools,
  })),
  ...cases.map<SearchDoc>((c) => ({
    id: c.id,
    type: 'case',
    title: c.title,
    subtitle: `${c.industry} · ${c.role}`,
    summary: c.summary ?? c.scenario,
    keywords: [c.industry, c.role, ...c.tools],
    href: `/cases/${c.id}`,
    tags: c.tools,
  })),
  ...paths.map<SearchDoc>((p) => ({
    id: p.id,
    type: 'path',
    title: p.title,
    subtitle: p.audience,
    summary: p.summary,
    keywords: [p.audience, p.summary],
    href: `/paths/${p.id}`,
    tags: [],
  })),
  // ---------- AI 教育供给：课程 / 教案包 / 简报 ----------
  ...eduPrograms.map<SearchDoc>((p) => ({
    id: p.id,
    type: 'program',
    title: p.title,
    subtitle: `${p.tier} · ${p.stage} · ${p.subject}`,
    summary: p.outcome,
    keywords: [p.tier, p.stage, p.subject, p.format, p.audience, ...p.deliverables],
    href: `/edu/programs/${p.id}`,
    tags: [p.stage, p.subject, p.format],
  })),
  ...eduToolkits.map<SearchDoc>((t) => ({
    id: t.id,
    type: 'toolkit',
    title: t.title,
    subtitle: `教案包 · ${t.stage} · ${t.subject}`,
    summary: `${t.lessons} 课时教案，含课堂活动、讨论题、AI 使用规范要点与学生使用声明。`,
    keywords: [t.stage, t.subject, '教案包', '课堂活动', '使用规范', ...t.policyNotes],
    href: `/edu/toolkits/${t.id}`,
    tags: [t.stage, t.subject, '教案包'],
  })),
  ...eduBriefings.map<SearchDoc>((b) => ({
    id: b.id,
    type: 'briefing',
    title: `${b.issue}：${b.summary}`,
    subtitle: `简报 · ${b.audience === 'both' ? '通用' : b.audience === 'teachers' ? '教师' : '学校管理者'}`,
    summary: b.changes.map((c) => c.title).join('；'),
    keywords: b.changes.flatMap((c) => [c.kind, c.title]),
    href: `/edu/briefings/${b.id}`,
    tags: ['简报'],
  })),
]