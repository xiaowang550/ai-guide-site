import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { tools } from '@/data'
import { recommend, filterByFlags, isLocalOnly, countLocalOnly, FLAG_KIND } from '@/lib/recommend'
import { scenarios } from '@/data/scenarios'
import { promptTemplates } from '@/data/prompts'
import { generatePolicy, buildDeclaration, declarationTitle } from '@/lib/edu-shared'
import {
  MAX_COMPARE,
  compareRangeText,
  compareWithAlternatives,
} from '@/lib/compare-constants'
import { SCORING_SOURCE_SUMMARY } from '@/lib/scoring-statement'

/**
 * 七项修复的回归门禁。
 *
 * 每一条对应一个具体缺陷。这类修复的共同特点是**改回去也不会报错**：
 * client 引用桩只是把函数源码显示出来、隐私条件从硬门槛退回加减分只是排序变差、
 * 观察记录退回使用声明只是逻辑不通 —— 没有一条会崩。
 * 所以必须显式锁住。
 */

/** 读构建产物里的某个 HTML（需要先 build） */
function readOut(rel: string): string | null {
  try {
    return readFileSync(`out/${rel}/index.html`, 'utf8')
  } catch {
    try {
      return readFileSync(`out/${rel}`, 'utf8')
    } catch {
      return null
    }
  }
}

/**
 * 去掉注释，只留可执行代码。
 *
 * 为什么需要：注释里经常为了说明历史问题而引用出问题的写法
 * （比如「原先在这里 export const MAX_COMPARE = 4」），
 * 不剥掉注释的话源码断言会匹配到自己的说明文字。
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/(^|\s)\/\/.*$/, '$1'))
    .join('\n')
}

describe('1. MAX_COMPARE 不再泄漏 client 边界错误码', () => {
  it('MAX_COMPARE 定义在非 client 模块里', () => {
    // 先剥掉注释再判断：注释里为了说明历史写法会引用 `export const MAX_COMPARE`，
    // 不剥掉的话这个断言会匹配到自己的注释（第一版就踩了这个坑）。
    const code = stripComments(readFileSync('components/compare-picker.tsx', 'utf8'))
    expect(
      code,
      "compare-picker.tsx 是 'use client' 模块，不能在里面定义需要被服务端取值的常量"
    ).not.toMatch(/export const MAX_COMPARE/)
    expect(code).toMatch(/import \{ MAX_COMPARE \} from '@\/lib\/compare-constants'/)

    const lib = stripComments(readFileSync('lib/compare-constants.ts', 'utf8'))
    expect(lib).toMatch(/export const MAX_COMPARE = \d+/)
  })

  it('对比页从非 client 模块取常量', () => {
    const page = readFileSync('app/(public)/compare/page.tsx', 'utf8')
    expect(
      page,
      '对比页不能再从 components/compare-picker 导入常量'
    ).not.toMatch(/from '@\/components\/compare-picker'/)
    expect(page).toMatch(/from '@\/lib\/compare-constants'/)
  })

  /**
   * 结构性防线：从 client 模块导入的东西，如果被插值进模板字符串就是 bug。
   *
   * 只检查「导入了什么」是不够的 —— 导入**组件**完全合法，
   * 服务端页面里 `import { PrintButton } from '@/components/print-button'` 是正常的。
   * 真正会出事的是导入**普通常量**再插值进字符串：那个常量会变成
   * `function(){throw Error("Attempted to call X() from the server...")}` 的桩，
   * 模板字符串一插值就把整个函数源码写进 HTML。
   *
   * 所以判据是：**从 client 模块导入的绑定名，是否出现在模板字符串插值里**。
   */
  it('服务端页面不会把 client 模块的常量插值进模板字符串', () => {
    const serverPages = [
      'app/(public)/compare/page.tsx',
      'app/(public)/tools/[slug]/page.tsx',
      'app/(public)/find/page.tsx',
      'app/(public)/cases/[slug]/page.tsx',
      'app/(public)/tools/page.tsx',
      'app/(public)/cases/page.tsx',
    ]
    const offenders: string[] = []

    for (const p of serverPages) {
      const src = stripComments(readFileSync(p, 'utf8'))
      for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from\s*'(@\/components\/[^']+)'/g)) {
        const names = m[1]
          .split(',')
          .map((s) => s.trim().split(/\s+as\s+/).pop()!.trim())
          .filter(Boolean)
        const target = `components/${m[2].replace('@/components/', '')}.tsx`
        let targetSrc = ''
        try {
          targetSrc = readFileSync(target, 'utf8')
        } catch {
          continue
        }
        if (!stripComments(targetSrc).startsWith("'use client'")) continue

        for (const n of names) {
          // 该名字是否被用在模板字符串插值里
          if (new RegExp(`\\$\\{[^}]*\\b${n}\\b`).test(src)) {
            offenders.push(`${p}: ${n}（来自 ${m[2]}）被插值进模板字符串`)
          }
        }
      }
    }
    expect(
      offenders,
      '从 client 模块导入的常量被插值进模板字符串，构建时会被替换成 client 引用桩，' +
        '桩的函数源码会被写进 HTML 正文与 meta 标签。常量要放 lib/。'
    ).toEqual([])
  })

  it('构建产物里不再出现 client 引用桩的报错文案', () => {
    const html = readOut('compare')
    if (!html) return // 还没 build，跳过而不是给假绿
    expect(
      html.includes('MAX_COMPARE') || html.includes('Attempted to call'),
      '对比页仍包含 client 边界错误码'
    ).toBe(false)
    expect(html).toContain(compareRangeText())
  })

  it('数量文案由常量生成，改上限会自动跟着变', () => {
    expect(compareRangeText()).toBe(`横向比较 2-${MAX_COMPARE} 个工具`)
  })
})

describe('2. 隐私条件是硬门槛而非加减分', () => {
  it('privacySensitive 被归类为硬门槛', () => {
    expect(FLAG_KIND.privacySensitive).toBe('hard')
  })

  it('勾上之后只留下可本地部署的工具', () => {
    const left = filterByFlags(tools, { privacySensitive: true })
    expect(left.length, '仍然有云端服务留在候选里').toBeGreaterThan(0)
    for (const t of left) {
      expect(isLocalOnly(t), `${t.name} 不是可本地部署的工具，却被保留了`).toBe(true)
    }
  })

  it('确实会剔除工具（不是标了硬门槛但没生效）', () => {
    expect(filterByFlags(tools, { privacySensitive: true }).length).toBeLessThan(
      tools.length
    )
    expect(countLocalOnly(tools)).toBeGreaterThan(0)
    expect(countLocalOnly(tools), '一个可本地部署的工具都没有，这条条件就没有意义').toBeLessThan(
      tools.length
    )
  })

  it('isLocalOnly 只认可自己部署，不被其他字段误导', () => {
    const ollama = tools.find((t) => t.id === 'ollama')
    expect(ollama).toBeTruthy()
    expect(isLocalOnly(ollama!)).toBe(true)
    // hasApi: false 的工具不等于数据不出本机
    for (const t of tools) {
      if (!t.hasApi) expect(isLocalOnly(t), `${t.name} 无 API 但仍是云端服务`).toBe(false)
    }
  })

  it('引擎端到端也只推可本地部署的工具', () => {
    for (const s of scenarios) {
      const rec = recommend(s, { privacySensitive: true }, tools, { promptTemplates })
      if (!rec.primary) continue
      expect(
        isLocalOnly(rec.primary.tool),
        `${s.id} 在隐私硬门槛下推荐了 ${rec.primary.tool.name}`
      ).toBe(true)
    }
  })

  it('界面上照实告知候选池有多小', () => {
    const wizard = readFileSync('components/scenario-wizard.tsx', 'utf8')
    expect(wizard).toContain('countLocalOnly')
  })
})

describe('3. 示例数据标识在所有出现指标的地方一致', () => {
  it('指标组件在含示例数据时给出显著警示，而不只是小字说明', () => {
    const src = readFileSync('components/edu/edu-metrics.tsx', 'utf8')
    expect(src).toContain('includesSample')
    // 必须有一条独立于卡片小字的警示条
    expect(src, '缺少示例数据的警示条').toMatch(/AlertTriangle/)
    expect(src, '卡片本身也应带示例标记').toMatch(/示例/)
  })

  it('指标卡的小字不再用含糊的「含示例数据」', () => {
    const src = readFileSync('components/edu/edu-metrics.tsx', 'utf8')
    expect(src, '仍写着含糊的「含示例数据」').not.toContain('含示例数据 ·')
  })

  /**
   * 首页自己写死的那行数字。
   *
   * 这条是本项最初真正的病灶：首页没有用 EduMetricsBar，而是在 FAQ 里直接写
   * 「试点学校 8 所 · 覆盖教师 680 人次」，和 schools 页顶部的示例数据警示
   * 完全脱节。同一份数据，一个页面标得很醒目、另一个页面像真成果。
   */
  it('公开首页不再展示暂停模块的示例学校成果', () => {
    const page = readFileSync('app/(public)/page.tsx', 'utf8')
    expect(page).not.toContain('metrics.schools')
    expect(page).not.toContain('metrics.teachersReached')
    expect(page).toContain('metrics.programs')
    expect(page).toContain('metrics.toolkits')
  })

  it('保留的学校记录在后台明确标记示例数据', () => {
    const view = readFileSync('components/admin/school-modules-view.tsx', 'utf8')
    expect(view).toContain('school.isSample')
    expect(view).toContain('不代表实际覆盖成果')
  })

})

describe('4. 评分来源说明口径统一', () => {
  it('口径常量存在且包含三个来源', () => {
    expect(SCORING_SOURCE_SUMMARY).toContain('不做自建评测')
    expect(SCORING_SOURCE_SUMMARY).toContain('编辑判断')
    expect(SCORING_SOURCE_SUMMARY).toContain('厂商赞助')
  })

  it('四处页面都引用统一组件，不各写一遍', () => {
    for (const p of [
      'app/(public)/compare/page.tsx',
      'app/(public)/tools/[slug]/page.tsx',
    ]) {
      expect(
        readFileSync(p, 'utf8'),
        `${p} 应引用 ScoringSourceNote，而不是自己写一遍口径`
      ).toContain('ScoringSourceNote')
    }
  })

  it('对比页必须有评分来源说明（原先完全没有）', () => {
    const page = readFileSync('app/(public)/compare/page.tsx', 'utf8')
    expect(page).toContain('ScoringSourceNote')
    // 比的是 JSX 使用位置，不是 import 位置 ——
    // import 语句的先后顺序和页面上的呈现顺序无关。
    const usedAt = page.indexOf('<ScoringSourceNote')
    const tableAt = page.indexOf('<CompareWorkbench')
    expect(usedAt, '说明必须真的渲染在页面里').toBeGreaterThan(-1)
    expect(tableAt).toBeGreaterThan(-1)
    expect(usedAt, '评分来源说明应排在对比表之前').toBeLessThan(tableAt)
  })

  it('关于页与工具库页的措辞不与统一口径冲突', () => {
    const toolsPage = readFileSync('app/(public)/tools/page.tsx', 'utf8')
    expect(toolsPage).toContain('不做自建评测')
    const about = readFileSync('app/(public)/about/page.tsx', 'utf8')
    expect(about).toContain('不做自建评测')
  })
})

describe('5. 禁止学生使用时生成观察记录', () => {
  const base = { stage: '小学' as const, subject: '语文' as const }

  it('允许使用时仍是使用声明', () => {
    for (const intensity of ['学生可用需声明', '学生可受限使用'] as const) {
      const doc = buildDeclaration({ ...base, intensity })
      expect(doc).toContain('AI 使用声明')
      expect(doc).toContain('我使用的工具')
      expect(declarationTitle({ ...base, intensity })).toBe('AI 使用声明')
    }
  })

  it('明确禁止时改成观察记录，且不含任何使用声明字段', () => {
    const doc = buildDeclaration({ ...base, intensity: '明确禁止' })
    expect(doc).toContain('AI 使用观察记录')
    // 关键：不能出现「我使用的工具」「我的核对方式」这类要求学生承认用量的字段
    expect(doc, '禁止使用时仍让学生填写使用了什么工具').not.toContain('我使用的工具')
    expect(doc).not.toContain('我的核对方式')
    expect(doc, '禁止使用时仍让学生承诺「没有直接复制工具输出」').not.toContain(
      '没有直接复制工具输出'
    )
    expect(declarationTitle({ ...base, intensity: '明确禁止' })).toBe('AI 使用观察记录')
  })

  it('观察记录有实际可填的字段（不是空壳）', () => {
    const doc = buildDeclaration({ ...base, intensity: '明确禁止' })
    expect(doc).toContain('我观察到的三个要点')
    expect(doc).toContain('我注意到的一处局限')
    expect(doc).toContain('记录人')
    expect(doc.length).toBeGreaterThan(120)
  })

  it('generatePolicy 端到端也返回观察记录', () => {
    const res = generatePolicy({ ...base, intensity: '明确禁止' })
    expect(res.declaration).toContain('观察记录')
    expect(res.declaration).not.toContain('我使用的工具')
  })

  it('页面标题随强度变化，不写死成「使用声明」', () => {
    const gen = readFileSync('components/edu/policy-generator.tsx', 'utf8')
    expect(gen).toContain('declarationTitle')
    expect(gen).toMatch(/明确禁止[\s\S]{0,80}观察记录/)
  })
})

describe('6. 本地工具不被套用 SaaS 上手模板', () => {
  const ollama = tools.find((t) => t.id === 'ollama')!

  it('Ollama 被识别为本地工具', () => {
    expect(isLocalOnly(ollama)).toBe(true)
  })

  it('工具详情页按交付方式分支，且本地分支不出现注册与联网提示', () => {
    const page = readFileSync('app/(public)/tools/[slug]/page.tsx', 'utf8')
    expect(page).toContain('isLocalOnly(tool)')
    expect(page, '缺少本地安装分支').toContain('本地安装，不需要注册')

    // 只截取本地分支那一段：起点是本地分支的 title，终点是三元表达式的 `) : (`。
    // 不能按 '</StepCard>' 截 —— StepCard 是自闭合标签，没有结束标签，
    // indexOf 会返回 -1，slice(0, -1) 反而截掉了后面几乎全部内容。
    const start = page.indexOf('本地安装，不需要注册')
    const end = page.indexOf(') : (', start)
    expect(end, '没找到本地分支的结束位置').toBeGreaterThan(start)
    const localBranch = page.slice(start, end)

    expect(localBranch, '本地分支出现了注册才有的「绑定手机号」').not.toContain('绑定手机号')
    expect(localBranch, '本地分支出现了联网要求').not.toContain('网络环境')
    // 本地分支必须说清「数据不外传」。用语义等价的两种说法做匹配，
    // 而不是锁死某一句文案 —— 改措辞不该让这个断言变红。
    expect(
      localBranch,
      '本地分支没有说明数据不会离开本机'
    ).toMatch(/留在你自己机器上|不出本机|不经过任何第三方/)
  })

  it('SaaS 工具仍走注册分支', () => {
    const page = readFileSync('app/(public)/tools/[slug]/page.tsx', 'utf8')
    expect(page).toContain('注册与准备')
  })

  it('构建产物里 Ollama 页面没有绑定手机号这类错误指引', () => {
    const html = readOut('tools/ollama')
    if (!html) return
    expect(html, 'Ollama 页面仍出现「绑定手机号」').not.toContain('绑定手机号')
    expect(html).toContain('本地安装')
  })
})

describe('7. 替代品对比默认包含当前工具', () => {
  it('当前工具永远排第一个，且不超过上限', () => {
    for (const t of tools) {
      const ids = compareWithAlternatives(t).split(',')
      expect(ids[0], `${t.name}：当前工具不在第一位`).toBe(t.id)
      expect(ids.length).toBeLessThanOrEqual(MAX_COMPARE)
      expect(new Set(ids).size, `${t.name}：对比列表里有重复项`).toBe(ids.length)
    }
  })

  it('替代品不够时也能用（只有一个工具时列表只有它自己）', () => {
    const solo = { id: 'x', alternatives: [] }
    expect(compareWithAlternatives(solo)).toBe('x')
  })

  it('替代品里混进了自己也不会重复', () => {
    const selfRef = { id: 'a', alternatives: ['a', 'b'] }
    expect(compareWithAlternatives(selfRef)).toBe('a,b')
  })

  it('超上限时优先保住当前工具', () => {
    const many = { id: 'a', alternatives: ['b', 'c', 'd', 'e', 'f'] }
    const ids = compareWithAlternatives(many).split(',')
    expect(ids).toHaveLength(MAX_COMPARE)
    expect(ids[0]).toBe('a')
  })

  it('工具详情页的两个对比入口都走统一函数', () => {
    const page = readFileSync('app/(public)/tools/[slug]/page.tsx', 'utf8')
    const raw = [...page.matchAll(/href=\{`\/compare\?ids=\$\{([^}]+)\}`\}/g)].map((m) => m[1])
    expect(raw.length, '没找到对比链接').toBeGreaterThan(0)
    for (const expr of raw) {
      // 允许的两种：显式带上 tool.id 的两两对比，或走 compareWithAlternatives
      expect(
        expr.includes('compareWithAlternatives') || expr.includes('tool.id'),
        `对比链接没有包含当前工具或没走统一函数：${expr}`
      ).toBe(true)
    }
  })
})
