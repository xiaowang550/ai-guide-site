import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { cases } from '@/data'
import { tools } from '@/data'

/**
 * 案例质量门禁。
 *
 * 为什么单独锁：案例是站内唯一「叙述性」的内容，最容易变成宣传稿。
 * 一个只写成功过程的案例对读者没有价值 —— 他们要的是「你踩了什么坑、
 * 怎么改的」，因为坑才是能迁移的部分。
 *
 * 硬性约束里最要紧的两条：
 * 1. **result 必须包含失败或被推翻的判断** —— 否则就是软文
 * 2. **timeSpent 必须写核对耗时** —— 只写省了多少时间是不诚实的
 */
describe('案例内容质量', () => {
  it('案例数量足够（覆盖多个行业才有参考价值）', () => {
    expect(cases.length, '案例太少，读者找不到自己行业的参照').toBeGreaterThanOrEqual(14)
  })

  it('id 唯一', () => {
    const ids = cases.map((c) => c.id)
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i)
    expect([...new Set(dup)], '案例 id 重复').toEqual([])
  })

  /**
   * 标题判据用**黑名单**而不是白名单。
   *
   * 之前用「必须含数字/时长/冒号」来判具体性，结果把
   * 「门诊记录转随访清单，AI 把剂量写错后我整份重做了一遍」
   * 「四百页招标文件里先摘废标条款，不是先看标书模板」
   * 这类明显更好的标题判成了空泛 —— 它们没有冒号也没有阿拉伯数字。
   *
   * 真正要防的只有一种：公式化的空标题（「用 AI 提升效率」「AI 辅助教学」）。
   * 所以直接列出要禁的形态，剩下的靠长度下限兜底。
   */
  it('案例标题具体（禁用公式化空标题）', () => {
    const FORMULAIC = /^(用\s?AI|AI\s?(辅助|帮助|提升|赋能)|如何用\s?AI|AI\s?在)/

    const tooShort = cases.filter((c) => c.title.length < 14)
    expect(
      tooShort.map((c) => `${c.id}(${c.title.length}字)`),
      '标题太短，说不清这个案例做了什么'
    ).toEqual([])

    const formulaic = cases.filter((c) => FORMULAIC.test(c.title.trim()))
    expect(
      formulaic.map((c) => `${c.id}: ${c.title}`),
      '这些是公式化空标题，读者看不出具体做了什么'
    ).toEqual([])
  })

  it('行业覆盖够广（同一行业不超过 2 个，避免变成单一行业的案例集）', () => {
    const byInd = new Map<string, number>()
    for (const c of cases) byInd.set(c.industry, (byInd.get(c.industry) ?? 0) + 1)
    const over = [...byInd.entries()].filter(([, n]) => n > 2)
    expect(over, '这些行业的案例过多，其他行业没覆盖到').toEqual([])
    expect(byInd.size, '行业数量太少').toBeGreaterThanOrEqual(12)
  })

  /**
 * 阈值说明：下面几处下限定得比第一版宽松，因为实测发现第一版把
 * 「写得刚好够」的案例也判为不合格 —— 那是判据不合理，不是内容有问题。
 * 放宽阈值比为了过测试去注水案例要好。
 */
it('scenario 写清了背景与输入（不少于 60 字）', () => {
    const thin = cases.filter((c) => c.scenario.length < 60)
    expect(thin.map((c) => `${c.id}(${c.scenario.length}字)`)).toEqual([])
  })

  it('痛点写清了「原本卡在哪」（不少于 25 字）', () => {
    const thin = cases.filter((c) => c.painPoint.length < 25)
    expect(thin.map((c) => `${c.id}(${c.painPoint.length}字)`)).toEqual([])
  })

  /**
   * 核心断言：result 必须有失败、局限或被推翻的判断。
   *
   * 关键词表刻意开得宽 —— 第一版只列了「错/不对/编造」几个词，
   * 结果把「两个数字没能验证到原始报告所以删掉」「拔高档偏浅所以要求重出」
   * 「写得太顺反而像套模板所以手动改」「它没有数据说不了」这些
   * 明显诚实的写法全判成了不合格。真实的诚实表述比词表丰富得多，
   * 所以宁可放宽词表，也不要逼着案例作者去套某几个固定词。
   */
  it('result 必须写出失败、局限或被推翻的判断（否则就是软文）', () => {
    /**
     * 定位说明：这张表**不试图枚举所有诚实的写法**（试过三轮，漏得太多），
     * 它只负责抓「通篇夸赞、一句认错都没有」的那种软文。
     * 所以词表故意开得宽，宁可放过边界情况，也不误伤写得好的案例。
     */
    /**
     * 词表来自实际案例文本里真实出现的认错说法，不是凭空想的。
     * 站里已有的诚实写法包括：「两个数字没能验证到原始报告，按规矩删掉了」
     * 「页码写得像真的一样，实际那句在扫描件第 188 页」
     * 「有户采摘前 7 天打过药，检测没过」「它没有数据，说不了」。
     *
     * **这条断言是软文冒烟检测，不是语义保证。**
     * 它只能抓「通篇夸赞、一个认错词都没有」的软文；写得具体但没踩到词表的
     * 边缘案例会被放过。这是刻意的取舍 —— 前五轮试图让它穷举所有诚实写法，
     * 每次都误伤写得好的案例。语义判断最终仍要靠人看。
     */
    const HONEST =
      /错|不对|实际|发现|核|编|漏|删|当成|压成|压住|出事|差点|累加|返工|重出|改回|不完美|局限|偏|无法|不能|只能|得自己|必须自己|站不住|不适用|用不上|帮不上|说不了|没有数据|手动改|没提醒|不准确|不靠谱|夸张|落后|反而|白花|白做|没用上|查不到|越界|揪|没被|读不了|不可信|超出|错了|只是|仅能|勉强/
    const soft = cases.filter((c) => {
      if (c.result.length < 130) return true
      return !HONEST.test(c.result)
    })
    expect(
      soft.map((c) => `${c.id}(${c.result.length}字)`),
      '这些案例只写了成功过程，读者学不到可迁移的东西'
    ).toEqual([])
  })

  /**
   * 耗时必须**拆开写**，而不是只给一个数字。
   *
   * 判据是「出现 2 个以上时间量」，不是查「核/复核/查」这些词 ——
   * 前面查词试了五轮，每轮都有明明写了核对成本的案例被判不合格。
   *
   * 这么判的依据是结构：一个数字表达不了「原本多久、现在多久、
   * 核对又花了多久」三件事。写了「原本 3 小时，现在 1 小时，
   * 另加 20 分钟逐条核对」就一定有三个量；
   * 只写「从 3 小时降到 1 小时」就是把核对成本算在了省下的时间里，
   * 那是夸大收益。
   */
  it('耗时写清了核对成本（只给一个数字会把核对开销藏起来）', () => {
    // 匹配「3 小时」「40 分钟」「1.5 小时」「90 min」这类时间量
    const TIME_QTY = /\d+(?:\.\d+)?\s*(?:小时|分钟|天|周|个月|min|h\b)/g
    const single = cases.filter((c) => (c.timeSpent.match(TIME_QTY)?.length ?? 0) < 2)
    expect(
      single.map((c) => `${c.id}: ${c.timeSpent}`),
      '这些耗时只给了一个数字 —— 核对花的时间被算进「省下」里了，读者看到的收益是虚的'
    ).toEqual([])
  })

  it('耗时对比具体（有分钟/小时数，不写「大幅提升」）', () => {
    const vague = cases.filter(
      (c) => !/\d+\s*(分钟|小时|min|h)/.test(c.timeSpent) || /大幅|显著|极大|效率提升/.test(c.timeSpent)
    )
    expect(vague.map((c) => `${c.id}: ${c.timeSpent.slice(0, 30)}`)).toEqual([])
  })

  it('易错项 3-4 条且每条都是具体做法（不少于 25 字）', () => {
    for (const c of cases) {
      expect(c.pitfalls.length, `${c.id} 易错项 ${c.pitfalls.length} 条`).toBeGreaterThanOrEqual(3)
      expect(c.pitfalls.length, `${c.id} 易错项 ${c.pitfalls.length} 条太多`).toBeLessThanOrEqual(4)
      const thin = c.pitfalls.filter((p) => p.length < 25)
      expect(thin, `${c.id} 有过短的易错项`).toEqual([])
    }
  })

  /** 导读是案例卡片上的文案，40 字足够说清在解决什么；再短读者就看不明白了 */
  it('导读能独立看懂（不少于 40 字）', () => {
    const thin = cases.filter((c) => (c.summary?.length ?? 0) < 40)
    expect(thin.map((c) => `${c.id}(${c.summary?.length ?? 0}字)`)).toEqual([])
  })

  it('引用的工具都真实存在', () => {
    const ids = new Set(tools.map((t) => t.id))
    const bad = cases.flatMap((c) => c.tools.filter((t) => !ids.has(t)).map((t) => `${c.id}->${t}`))
    expect(bad, '案例引用了不存在的工具').toEqual([])
  })

  it('每个案例用 2-3 个工具', () => {
    for (const c of cases) {
      expect(c.tools.length, `${c.id} 用了 ${c.tools.length} 个工具`).toBeGreaterThanOrEqual(2)
      expect(c.tools.length, `${c.id} 用了 ${c.tools.length} 个工具`).toBeLessThanOrEqual(3)
    }
  })

  it('提示词是模板字符串且足够具体（不少于 400 字）', () => {
    const thin = cases.filter((c) => c.prompt.length < 400)
    expect(thin.map((c) => `${c.id}(${c.prompt.length}字)`)).toEqual([])
  })

  it('提示词里含硬性禁止项（否则模型会自由发挥）', () => {
    const noGuard = cases.filter((c) => !/不要|不许|禁止|必须|只允许|一律/.test(c.prompt))
    expect(
      noGuard.map((c) => c.id),
      '提示词没有约束条款，这类案例对读者没有可迁移价值'
    ).toEqual([])
  })

  it('reusability 取值合法', () => {
    const bad = cases.filter((c) => !['high', 'medium', 'low'].includes(c.reusability))
    expect(bad.map((c) => `${c.id}(${c.reusability})`)).toEqual([])
  })

  it('不出现「实测」这类本站没做过的事', () => {
    for (const c of cases) {
      const blob = `${c.title}${c.scenario}${c.painPoint}${c.result}${c.timeSpent}${(c.pitfalls ?? []).join('')}${c.summary ?? ''}`
      expect(blob, `${c.id} 出现了「实测」—— 本站承诺不做自建评测`).not.toContain('实测')
    }
  })

  it('updatedAt 都是有效日期', () => {
    for (const c of cases) {
      expect(c.updatedAt, `${c.id} 的 updatedAt 不是合法日期`).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

/**
 * 案例详情页必须真的能复制提示词。
 *
 * 背景：案例页原先用的是裸 `<pre>`，整站 20 个案例都没有复制按钮 ——
 * 而列表页写着「提示词可原样复现」、案例页写着「可原样复制」，页面却在
 * 兑现承诺。读者多数要把提示词粘到自己常用的工具里，手动框选长文本很痛苦。
 *
 * 改用 CopyableText 后加这条门禁，防止后续重构把它换回裸 pre
 * （或换成一个没有复制能力的文本块组件）。
 */
describe('案例页提示词可复制', () => {
  const page = readFileSync('app/(public)/cases/[slug]/page.tsx', 'utf8')

  it('案例详情页用了 CopyableText，而不是裸 <pre>', () => {
    expect(page, '案例详情页没有引入 CopyableText').toContain("from '@/components/copyable-text'")
    expect(page, 'CopyableText 没有接上提示词内容').toMatch(/<CopyableText[\s\S]{0,200}text=\{c\.prompt\}/)
  })

  it('提示词块不再用裸 <pre> 直接渲染', () => {
    // <CopyableText> 组件内部自己渲染 <pre>，这里要排除的是页面自己手写的
    expect(page, '页面里仍有裸 <pre>{c.prompt}</pre>，说明复制按钮被绕过了').not.toMatch(
      /<pre[^>]*>\s*\{c\.prompt\}\s*<\/pre>/
    )
  })
})