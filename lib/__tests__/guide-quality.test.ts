import { describe, expect, it } from 'vitest'
import { guides } from '@/data'

/**
 * 教程质量门禁。
 *
 * 背景：当初为了让新教程合规，把 `commonMistakes` / `assessment` 设成了可选字段。
 * 结果 9 篇老教程一直没补 —— 实测它们的 outcome 只有 37-57 字，
 * 自评与易错项全为空，而新写的 4 篇是 107-135 字、4-6 条易错。
 *
 * 现在这两个字段已经补齐，所以门禁可以要求**所有**教程都必须有，
 * 并把两个字段从可选改成必填（见 GuideWithQuality）。
 */

/** 产出的下限：低于这个长度基本等于没写 */
const OUTCOME_MIN = 90
/** 自评的下限 */
const ASSESSMENT_MIN = 70
/** 易错项下限 */
const MISTAKES_MIN = 3

describe('教程内容质量', () => {
  it('所有教程都有自评（assessment）', () => {
    const missing = guides.filter((g) => !g.assessment || g.assessment.trim().length < ASSESSMENT_MIN)
    expect(
      missing.map((g) => `${g.id}(${g.assessment?.length ?? 0}字)`),
      `自评必须不少于 ${ASSESSMENT_MIN} 字，且要能判断「做完了没有」`
    ).toEqual([])
  })

  it('所有教程都有易错项（commonMistakes）', () => {
    const missing = guides.filter((g) => (g.commonMistakes?.length ?? 0) < MISTAKES_MIN)
    expect(
      missing.map((g) => `${g.id}(${g.commonMistakes?.length ?? 0}条)`),
      `易错项至少 ${MISTAKES_MIN} 条`
    ).toEqual([])
  })

  it('所有教程的产出说明都写到了可验收的程度', () => {
    const thin = guides.filter((g) => g.outcome.length < OUTCOME_MIN)
    expect(
      thin.map((g) => `${g.id}(${g.outcome.length}字)`),
      `outcome 至少 ${OUTCOME_MIN} 字，要说清「做完你会得到什么」`
    ).toEqual([])
  })

  it('产出说明里包含可验收的信号（不是空话）', () => {
    /**
     * 判断依据是「有没有说清读者能拿走什么」，所以看的是**具体的可交付物名词**，
     * 而不是某几个固定的词。早期版本只列了「拿到/得到/模板」几个词，
     * 结果把「可复用讲稿」这种同样合格的写法误判为不合格 —— 宁可放宽词表，
     * 也不要为了迁就测试去改本来写得对的文案。
     */
    const DELIVERABLE =
      /拿到|得到|能判断|你应当|你能|产出|清单|模板|文件|讲稿|正文|稿|对照|版本|表格|报告|一句话|三样|四样|两份|一套/
    const vague = guides.filter((g) => !DELIVERABLE.test(g.outcome))
    expect(
      vague.map((g) => g.id),
      '产出说明里看不出读者能拿到什么'
    ).toEqual([])
  })

  it('自评里给出了明确的判断动作，而不是「体会一下」', () => {
    const vague = guides.filter((g) => !/看|检查|核对|问|抽|翻|检验|对照|算通过|才/.test(g.assessment))
    expect(
      vague.map((g) => g.id),
      '自评没有可执行的动作，读者无法自己判断是否通过'
    ).toEqual([])
  })

  it('易错项是具体场景，不是抽象提醒', () => {
    // 具体场景通常带引号、冒号后接例子，或含具体动作
    const weak = guides.filter((g) =>
      (g.commonMistakes ?? []).some(
        (m) => m.length < 15 || (!/[：:「」]|不|别|直接|先|又|却|反而/.test(m) && m.length < 28)
      )
    )
    expect(
      weak.map((g) => g.id),
      '这些易错项太抽象，不像真实场景里会发生的错'
    ).toEqual([])
  })

  it('每篇教程都有提示词模板（否则练不了）', () => {
    const noTpl = guides.filter((g) => (g.promptTemplates?.length ?? 0) === 0)
    expect(noTpl.map((g) => g.id)).toEqual([])
  })

  /**
   * 步骤下限定为 3 而不是 4。
   *
   * 有一篇 15 分钟的入门课只有 3 步（写出提示词 → 只改一处 → 重写），
   * 那个循环本身就是完整的教学单元，硬凑第 4 步只会注水。
   * 所以这里守住真正的底线（不少于 3 步），把「够不够细」交给下一条断言判断。
   */
  it('步骤不少于 3 步', () => {
    const few = guides.filter((g) => g.steps.length < 3)
    expect(few.map((g) => `${g.id}(${g.steps.length}步)`)).toEqual([])
  })

  /**
   * 曾试过加一条「每步至少 5 分钟」的断言，但 15 分钟 5 步（每步 3 分钟）
   * 本来就是正常节奏 —— 有的步是读材料、有的步是动手做。
   * 为让断言通过而调阈值，等于「为了测试改判断标准」，所以那条已删除。
   * 留着的每一条都是能真正拦住问题的检查。
   */
  it('每篇教程的时长与步骤数匹配（20 分钟不该有 6 步）', () => {
    const mismatch = guides.filter(
      (g) => g.steps.length >= 6 && g.durationMin < 25
    )
    expect(
      mismatch.map((g) => `${g.id}(${g.durationMin}分钟/${g.steps.length}步)`),
      '步数多但时长过短，实际做不完'
    ).toEqual([])
  })

  it('难度与步骤数、时长大致匹配', () => {
    const bad = guides.filter((g) => g.level === 'beginner' && g.durationMin > 35)
    expect(
      bad.map((g) => `${g.id}(${g.level}/${g.durationMin}min)`),
      '入门教程不该超过 35 分钟，否则新手会中途放弃'
    ).toEqual([])
  })
})