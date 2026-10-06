import { describe, expect, it } from 'vitest'
import {
  AUDIENCE_LABELS,
  buildDeclaration,
  computeEduMetrics,
  faqByAudience,
  generatePolicy,
  isCurrent,
  ladderProgressFor,
  programByTier,
  schoolByPhase,
  schoolsByPhase,
  toolkitsByProgram,
  eduBriefings,
  eduFaq,
  eduPolicyRules,
  eduPrograms,
  eduSchools,
  eduTiers,
  eduToolkits,
  INTENSITY_OPTIONS,
  STAGE_LABELS,
  SUBJECT_OPTIONS,
} from '../edu'
import { CAPABILITY_KEYS } from '../score'
import { tools } from '@/data/tools'
import type { EduIntensity, EduStage, EduSubject } from '@/data/types'

const PROGRAM_IDS = new Set(eduPrograms.map((p) => p.id))
const TOOLKIT_IDS = new Set(eduToolkits.map((t) => t.id))
const TIER_IDS = new Set(eduTiers.map((t) => t.id))

describe('阶梯定义', () => {
  it('教师四层、学生三层，编号连续', () => {
    const teacher = eduTiers.filter((t) => t.audience === 'teacher')
    const student = eduTiers.filter((t) => t.audience === 'student')
    expect(teacher).toHaveLength(4)
    expect(student).toHaveLength(3)
    expect(teacher.map((t) => t.order)).toEqual([1, 2, 3, 4])
    expect(student.map((t) => t.order)).toEqual([1, 2, 3])
  })

  it('每一层都有目标与前置条件', () => {
    for (const t of eduTiers) {
      expect(t.goal.length).toBeGreaterThan(5)
      expect(t.requires.length).toBeGreaterThan(5)
      expect(TIER_IDS.has(t.id)).toBe(true)
    }
  })

  it('programByTier 只返回该层课程', () => {
    for (const tier of eduTiers) {
      const items = programByTier(tier.id)
      expect(items.length).toBeGreaterThan(0)
      expect(items.every((p) => p.tier === tier.id)).toBe(true)
    }
  })
})

describe('课程数据契约', () => {
  it('课程 id 唯一，字段完整', () => {
    expect(PROGRAM_IDS.size).toBe(eduPrograms.length)
    for (const p of eduPrograms) {
      expect(TIER_IDS.has(p.tier), `${p.id} 层级非法`).toBe(true)
      expect(p.outcome.length).toBeGreaterThan(10)
      expect(p.assessment.length).toBeGreaterThan(5)
      expect(p.modules.length).toBeGreaterThanOrEqual(3)
      expect(p.deliverables.length).toBeGreaterThanOrEqual(3)
      expect(p.commonMistakes.length).toBeGreaterThanOrEqual(2)
      expect(p.lessons).toBeGreaterThanOrEqual(1)
      expect(p.version).toMatch(/^v\d/)
      expect(p.validFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(p.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('模块时长为正且包含要点', () => {
    for (const p of eduPrograms) {
      for (const m of p.modules) {
        expect(m.minutes).toBeGreaterThan(0)
        expect(m.points.length).toBeGreaterThan(0)
        expect(m.title.length).toBeGreaterThan(0)
      }
    }
  })

  it('关联引用只指向站内真实内容', () => {
    for (const p of eduPrograms) {
      for (const ref of p.relatedRefs) {
        if (ref.kind === 'tool') {
          expect(tools.some((t) => t.id === ref.id), `${p.id} -> 未知工具 ${ref.id}`).toBe(true)
        }
      }
    }
  })

  it('若有替代关系，被替代课程必须存在', () => {
    for (const p of eduPrograms) {
      if (p.supersededBy) {
        expect(PROGRAM_IDS.has(p.supersededBy), `${p.id} -> 未知替代课程`).toBe(true)
        expect(p.validTo, `${p.id} 标了替代关系就必须有过期时间`).toBeTruthy()
      }
    }
  })
})

describe('教案包数据契约', () => {
  it('教案包 id 唯一，课时数与教案结构一致', () => {
    expect(TOOLKIT_IDS.size).toBe(eduToolkits.length)
    for (const t of eduToolkits) {
      expect(PROGRAM_IDS.has(t.programId), `${t.id} -> 未知课程 ${t.programId}`).toBe(true)
      expect(t.lessonPlans).toHaveLength(t.lessons)
      expect(t.discussionQuestions.length).toBeGreaterThanOrEqual(3)
      expect(t.activities.length).toBeGreaterThanOrEqual(2)
      expect(t.policyNotes.length).toBeGreaterThanOrEqual(3)
      expect(t.declarationTemplate.length).toBeGreaterThan(40)
      expect(t.version).toMatch(/^v\d/)
    }
  })

  it('配套工具都存在，且以大陆可直连工具为主', () => {
    for (const t of eduToolkits) {
      for (const id of t.toolIds) {
        const tool = tools.find((x) => x.id === id)
        expect(tool, `${t.id} -> 未知工具 ${id}`).toBeTruthy()
      }
      const cnCount = t.toolIds.filter(
        (id) => tools.find((x) => x.id === id)?.chinaAccessible
      ).length
      expect(cnCount, `${t.id} 至少应有 1 个大陆可直连工具`).toBeGreaterThan(0)
    }
  })

  it('课时目标、学生产出与易卡点齐全', () => {
    for (const t of eduToolkits) {
      for (const plan of t.lessonPlans) {
        expect(plan.goal.length).toBeGreaterThan(5)
        expect(plan.flow.length).toBeGreaterThanOrEqual(3)
        expect(plan.studentOutput.length).toBeGreaterThan(5)
      }
    }
  })

  it('toolkitsByProgram 返回配套教案包', () => {
    expect(toolkitsByProgram(eduToolkits[0].programId).length).toBeGreaterThan(0)
  })
})

describe('试点学校数据契约', () => {
  it('学校 id 唯一，交付内容与阶梯逻辑一致', () => {
    expect(new Set(eduSchools.map((s) => s.id)).size).toBe(eduSchools.length)
    for (const s of eduSchools) {
      expect(s.deliveredPrograms.length).toBeGreaterThan(0)
      for (const id of s.deliveredPrograms) {
        expect(PROGRAM_IDS.has(id), `${s.id} -> 未知课程 ${id}`).toBe(true)
      }
      for (const id of s.deliveredToolkits) {
        expect(TOOLKIT_IDS.has(id), `${s.id} -> 未知教案包 ${id}`).toBe(true)
      }
      expect(s.teachersReached).toBeGreaterThanOrEqual(s.seedTeachers)
      expect(s.seedTeachers).toBeGreaterThan(0)
      expect(s.nextStep.length).toBeGreaterThan(5)
      expect(s.customization.length).toBeGreaterThan(5)
    }
  })

  it('试点验证阶段不应包含教学层及以上课程', () => {
    for (const s of eduSchools.filter((x) => x.phase === '试点验证')) {
      const advanced = s.deliveredPrograms.filter((id) => id.startsWith('t3-') || id.startsWith('t4-'))
      expect(advanced, `${s.id} 试点阶段不应含 T3/T4`).toEqual([])
    }
  })

  it('schoolsByPhase / schoolByPhase 按阶段筛选正确', () => {
    const total = ['试点验证', '成熟复制', '区域推广', '师资自传播'].reduce(
      (sum, p) => sum + schoolsByPhase(p as never).length,
      0
    )
    expect(total).toBe(eduSchools.length)
    expect(schoolByPhase).toBeTypeOf('function')
  })
})

describe('示例数据标记（对外发布的诚实性）', () => {
  it('每所学校都必须显式标记 isSample（示例 true / 真实 false）', () => {
    for (const s of eduSchools) {
      expect(
        typeof s.isSample,
        `${s.name} 缺少 isSample 标记：真实信息请设 false，示例数据请设 true`
      ).toBe('boolean')
    }
  })

  it('存在示例数据时，覆盖人数类指标必须被标记为「含示例数据」', () => {
    const hasSample = eduSchools.some((s) => s.isSample)
    const metrics = computeEduMetrics()
    expect(metrics.includesSample).toBe(hasSample)
  })

  it('指标里的 includesSample 会随学校数据变化（改数据不用改指标代码）', () => {
    const onlyReal = computeEduMetrics({
      schools: [{ ...eduSchools[0], isSample: false }],
    })
    expect(onlyReal.includesSample).toBe(false)
    expect(onlyReal.schools).toBe(1)
  })

  it('学校数据的其他约束仍然成立（标记不影响原有校验）', () => {
    expect(eduSchools.length).toBeGreaterThanOrEqual(3)
    const ids = new Set(eduSchools.map((s) => s.id))
    expect(ids.size).toBe(eduSchools.length)
    for (const s of eduSchools) {
      expect(s.teachersReached).toBeGreaterThanOrEqual(s.seedTeachers)
      expect(s.nextStep.length).toBeGreaterThan(5)
      expect(s.customization.length).toBeGreaterThan(5)
    }
  })
})

describe('ladderProgressFor（看板阶梯进度）', () => {
  const tiers = eduTiers as unknown as { id: string; order: number; audience: 'teacher' | 'student' }[]

  it('试点学校只到第一层，下一层为 T2', () => {
    const pilot = eduSchools.find((s) => s.phase === '试点验证')!
    const r = ladderProgressFor(pilot, tiers)
    expect(r.reached).toContain('T1')
    expect(r.reached).not.toContain('T3')
    expect(r.nextTier).toBeTruthy()
  })

  it('四层全上的学校 nextTier 为空', () => {
    const full = {
      ...eduSchools[0],
      deliveredPrograms: eduPrograms.filter((p) => p.tier.startsWith('T')).map((p) => p.id),
    }
    const r = ladderProgressFor(full, tiers)
    expect(r.reached).toHaveLength(4)
    expect(r.nextTier).toBeNull()
  })
})

describe('computeEduMetrics（过程指标）', () => {
  it('统计口径正确且自洽', () => {
    const m = computeEduMetrics()
    expect(m.programs).toBe(eduPrograms.length)
    expect(m.toolkits).toBe(eduToolkits.length)
    expect(m.schools).toBe(eduSchools.length)
    expect(m.teachersReached).toBe(eduSchools.reduce((s, x) => s + x.teachersReached, 0))
    expect(m.teachersReached).toBeGreaterThanOrEqual(m.seedTeachers)
    expect(m.pilotSchools).toBe(eduSchools.filter((s) => s.phase === '试点验证').length)
    expect(m.lessons).toBeGreaterThan(0)
    expect(m.latestUpdate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('可注入数据，纯函数可测', () => {
    const m = computeEduMetrics({
      programs: [],
      toolkits: [],
      schools: [],
      briefings: [],
      now: new Date('2026-10-01'),
    })
    expect(m).toMatchObject({ programs: 0, toolkits: 0, schools: 0, teachersReached: 0 })
  })

  it('最近更新日期取全库最大值', () => {
    const m = computeEduMetrics()
    const all = [
      ...eduPrograms.map((p) => p.updatedAt),
      ...eduToolkits.map((t) => t.updatedAt),
      ...eduBriefings.map((b) => b.date),
    ].sort()
    expect(m.latestUpdate).toBe(all[all.length - 1])
  })
})

describe('规范规则表', () => {
  it('规则 id 唯一，字段合法', () => {
    expect(new Set(eduPolicyRules.map((r) => r.id)).size).toBe(eduPolicyRules.length)
    for (const r of eduPolicyRules) {
      expect(r.stages.length).toBeGreaterThan(0)
      expect(r.intensities.length).toBeGreaterThan(0)
      expect(r.clauses.length).toBeGreaterThan(0)
      expect(r.redLines.length).toBeGreaterThan(0)
      for (const s of r.stages) expect(STAGE_LABELS).toContain(s)
      for (const s of r.subjects) expect(SUBJECT_OPTIONS).toContain(s)
      for (const i of r.intensities) expect(INTENSITY_OPTIONS).toContain(i)
    }
  })
})

describe('generatePolicy（纯规则生成规范）', () => {
  const allCombos: [EduStage, EduSubject, EduIntensity][] = STAGE_LABELS.flatMap((stage) =>
    SUBJECT_OPTIONS.map((subject) => [stage, subject, '学生可用需声明'] as [EduStage, EduSubject, EduIntensity])
  )

  it('任何组合都能产出条款与红线，不返回空结果', () => {
    for (const [stage, subject, intensity] of allCombos) {
      const r = generatePolicy({ stage, subject, intensity })
      expect(r.sections.length, `${stage}/${subject} 无条款`).toBeGreaterThan(0)
      expect(r.redLines.length, `${stage}/${subject} 无红线`).toBeGreaterThan(0)
      expect(r.declaration).toContain('AI 使用声明')
      expect(r.homeworkAdjustments.length).toBeGreaterThan(0)
    }
  })

  it('是纯函数：同输入同输出', () => {
    const input = { stage: '初中', subject: '数学', intensity: '学生可用需声明' } as const
    expect(generatePolicy(input)).toEqual(generatePolicy(input))
  })

  it('条款去重，不出现重复项', () => {
    const r = generatePolicy({ stage: '初中', subject: '通用', intensity: '学生可用需声明' })
    for (const s of r.sections) {
      expect(new Set(s.items).size).toBe(s.items.length)
    }
    expect(new Set(r.redLines).size).toBe(r.redLines.length)
  })

  it('学段差异生效：小学与高中结果不同', () => {
    const primary = generatePolicy({ stage: '小学', subject: '通用', intensity: '学生可用需声明' })
    const high = generatePolicy({ stage: '高中', subject: '通用', intensity: '学生可用需声明' })
    expect(primary.sections).not.toEqual(high.sections)
  })

  it('学科专项生效：数学会带上推导链要求', () => {
    const r = generatePolicy({ stage: '初中', subject: '数学', intensity: '学生可用需声明' })
    const text = JSON.stringify(r)
    expect(text).toContain('推导')
  })

  it('强度差异生效：明确禁止时会禁用学生产出', () => {
    const banned = generatePolicy({ stage: '初中', subject: '通用', intensity: '明确禁止' })
    const allowed = generatePolicy({ stage: '初中', subject: '通用', intensity: '学生可用需声明' })
    expect(banned.homeworkAdjustments).not.toEqual(allowed.homeworkAdjustments)
    expect(banned.sections).not.toEqual(allowed.sections)
  })

  it('返回命中规则，便于解释与质疑', () => {
    const r = generatePolicy({ stage: '初中', subject: '语文', intensity: '学生可用需声明' })
    expect(r.matchedRuleIds.length).toBeGreaterThan(0)
    for (const id of r.matchedRuleIds) {
      expect(eduPolicyRules.some((rule) => rule.id === id)).toBe(true)
    }
  })

  it('命中不到时会走兜底并说明原因', () => {
    // 职高 × 明确禁止 在部分规则下没有精确命中，应仍然可用且给出说明
    const r = generatePolicy({ stage: '职高', subject: '信息技术', intensity: '明确禁止' })
    expect(r.sections.length).toBeGreaterThan(0)
  })
})

describe('buildDeclaration（学生使用声明）', () => {
  it('包含学段、学科与核对方式要求', () => {
    const d = buildDeclaration({ stage: '初中', subject: '英语', intensity: '学生可用需声明' })
    expect(d).toContain('初中')
    expect(d).toContain('英语')
    expect(d).toContain('核对')
    expect(d).toContain('声明人')
  })

  it('不同强度生成不同措辞', () => {
    const a = buildDeclaration({ stage: '小学', subject: '通用', intensity: '明确禁止' })
    const b = buildDeclaration({ stage: '小学', subject: '通用', intensity: '学生可用需声明' })
    expect(a).not.toBe(b)
  })
})

describe('简报与 FAQ 数据契约', () => {
  it('简报按日期倒序，影响页面为站内路由', () => {
    const dates = eduBriefings.map((b) => b.date)
    expect([...dates].sort().reverse()).toEqual(dates)
    for (const b of eduBriefings) {
      expect(b.changes.length).toBeGreaterThan(0)
      expect(b.actions.length).toBeGreaterThan(0)
      expect(b.implications.length).toBeGreaterThan(0)
      for (const href of b.affectedRefs) expect(href.startsWith('/')).toBe(true)
    }
  })

  it('FAQ 覆盖四类对象，答案非空', () => {
    expect(eduFaq.length).toBeGreaterThanOrEqual(15)
    for (const f of eduFaq) {
      expect(Object.keys(AUDIENCE_LABELS)).toContain(f.audience)
      expect(f.answer.length).toBeGreaterThan(20)
      for (const href of f.refs) expect(href.startsWith('/')).toBe(true)
    }
    expect(faqByAudience('teacher').length).toBeGreaterThan(0)
    expect(faqByAudience('student').length).toBeGreaterThan(0)
  })
})

describe('isCurrent（内容版本化）', () => {
  const now = new Date('2026-10-01T00:00:00Z')

  it('有效期内为当前版本', () => {
    expect(isCurrent('2026-09-01', undefined, now)).toBe(true)
    expect(isCurrent('2026-01-01', '2026-12-31', now)).toBe(true)
  })

  it('过期或未生效为非当前版本', () => {
    expect(isCurrent('2026-01-01', '2026-06-30', now)).toBe(false)
    expect(isCurrent('2027-01-01', undefined, now)).toBe(false)
  })
})

describe('能力维度数据未被教育模块污染', () => {
  it('教育模块引用的工具维度仍为 14 项', () => {
    for (const t of tools) {
      expect(Object.keys(t.capabilities).sort()).toEqual([...CAPABILITY_KEYS].sort())
    }
  })
})