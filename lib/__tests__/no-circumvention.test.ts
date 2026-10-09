import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, type Dirent } from 'node:fs'
import { join } from 'node:path'

/**
 * 立场守卫：本站不提供绕过网络限制的内容。
 *
 * 这不是一个形式化的检查。这类内容一旦写进站点，
 * 就等于在替规避网络管理背书 —— 有法律风险，也会砸掉「不吹不黑」的承诺。
 * 而「以后有人不小心加进去」是很现实的风险：
 * 写教程的人可能觉得自己在做好事。
 *
 * 所以把它变成会失败的测试。谁想加，先来改这个测试并写清理由。
 */

const SCAN_DIRS = ['app', 'components', 'lib', 'data', 'docs', 'proxy']
const SKIP = ['__tests__', 'node_modules', '.next', 'out', '.git', 'README.md']

/**
 * 明确排除的文件（要写清理由，否则「悄悄排除」本身就是个漏洞）。
 *
 * `lib/access.ts` 的职责就是**检测**这些词，所以它的源码里必然出现它们。
 * 排除它是合理的；真正的风险是有人把违规内容塞进这个文件，
 * 所以额外加了一条断言：这个文件里除了检测正则之外不应有别的中文长句。
 */
const SKIP_WITH_REASON: { path: string; reason: string }[] = [
  { path: 'lib/access.ts', reason: '职责就是检测这些词，源码里必然包含它们' },
  {
    path: 'lib/assistant.ts',
    reason: '猜条件的关键词表：识别用户说「不用翻墙」，从而推荐境内可直连的工具 —— 是规避手段的检测方，不是提供方',
  },
]

/** 被排除的文件必须仍然是逻辑文件，不许借「检测」之名藏面向读者的文案 */
const BLIND_SPOT_FILES = SKIP_WITH_REASON.map((x) => x.path)

/**
 * 禁止出现的词。
 *
 * 分两类：
 * - 绕过手段/工具：出现即是在提供规避手段
 * - 具体厂商：出现即是在做带货（无论文案多中性）
 *
 * 「VPN」一词本身没被禁止 —— 页面里说明「本站不提供 VPN 相关内容」是必要的，
 * 真正禁止的是把它当成解法来介绍。
 */
const BANNED: { re: RegExp; why: string; label: string }[] = [
  { re: /翻墙/g, why: '规避网络管理的表述', label: '翻墙' },
  { re: /梯子/g, why: '规避网络管理的表述', label: '梯子' },
  { re: /机场(?![^。]{0,12}(附近|出行))/g, why: '特定 VPN 服务的行话', label: '机场' },
  { re: /西游云/g, why: '具体 VPN 厂商，等于带货', label: '西游云' },
  { re: /\bclash\b/gi, why: '具体代理工具名', label: 'clash' },
  { re: /shadow\s*rocket/gi, why: '具体代理工具名', label: 'Shadowrocket' },
  { re: /\bv2ray\b/gi, why: '具体代理工具名', label: 'v2ray' },
  { re: /sing-?box/gi, why: '具体代理工具名', label: 'sing-box' },
  { re: /wireguard/gi, why: '具体代理协议/工具', label: 'WireGuard' },
  { re: /订阅链接|节点订阅|机场地址/g, why: '提供规避服务的具体信息', label: '订阅/节点信息' },
  { re: /代购账号|共享账号|借号/g, why: '违反服务条款且账号会被收回', label: '账号代购/共享' },
]

function walk(dir: string, out: string[] = []): string[] {
  let entries: Dirent[]
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    const full = join(dir, e.name)
    if (SKIP.some((s) => full.includes(s))) continue
    // Windows 上路径是反斜杠分隔，先规范化再比，否则排除永远不生效
    const norm = full.replace(/\\/g, '/')
    if (SKIP_WITH_REASON.some((s) => norm.includes(s.path))) continue
    if (e.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx|md|js)$/.test(e.name)) out.push(full)
  }
  return out
}

const files = SCAN_DIRS.flatMap((d) => walk(d))

describe('立场守卫：不提供绕过网络限制的内容', () => {
  it('扫描范围覆盖到文件（防止路径写错导致空跑）', () => {
    expect(files.length).toBeGreaterThan(80)
  })

  it('源码与文档里不出现绕过手段或相关厂商', () => {
    const offenders: string[] = []

    for (const f of files) {
      const text = readFileSync(f, 'utf8')
      text.split('\n').forEach((line, i) => {
        for (const b of BANNED) {
          if (b.re.test(line)) {
            offenders.push(`${f}:${i + 1}  [${b.label}] ${line.trim().slice(0, 80)}`)
          }
        }
      })
    }

    expect(
      offenders,
      `以下内容违反本站立场（不提供绕过网络限制的方法，也不做厂商带货）：\n${offenders.join('\n')}`
    ).toEqual([])
  })

  it('可访问性页面存在且明确声明了不提供什么', () => {
    const page = readFileSync('app/(public)/learn/access/page.tsx', 'utf8')
    expect(page, '缺少「不提供」声明').toContain('不提供')
    expect(page, '应说明法律风险').toContain('法律风险')
    expect(page, '应说明不做厂商带货').toContain('带货')
  })

  it('可访问性页面给出了替代方案，而不是只说「打不开」', () => {
    const page = readFileSync('app/(public)/learn/access/page.tsx', 'utf8')
    expect(page).toContain('alternatives')
    expect(page, '应给出处理步骤而不是只讲问题').toContain('按这个顺序处理')
  })

  it('区分了三类原因（混成一句「需要网络工具」等于没给读者下一步）', () => {
    const page = readFileSync('app/(public)/learn/access/page.tsx', 'utf8')
    expect(page).toContain('unserved')
    expect(page).toContain('tos-restricted')
    expect(page).toContain('network-dependent')
  })

  it('诚实说明「可直连不等于一定稳定」', () => {
    // 过度承诺是另一种形式的吹黑，与不吹不黑冲突
    const page = readFileSync('app/(public)/learn/access/page.tsx', 'utf8')
    expect(page, '应澄清可直连不等于稳定').toMatch(/不等于|不保证|也会/)
  })

  it('工具详情页不再出现「需借助网络工具」这种无行动价值的说法', () => {
    const detail = readFileSync('app/(public)/tools/[slug]/page.tsx', 'utf8')
    expect(detail, '应改为指向替代方案').toContain('见下方替代方案')
    expect(detail, '「需借助网络工具」等于没说下一步').not.toContain('需借助网络工具')
  })

  /**
   * 排除这些文件的代价是它们成了盲区，这里把盲区补上。
   *
   * 判定方式不是「不许出现长中文」（那会误伤注释），而是
   * **它们必须保持是逻辑文件**：不许 import React、不许出现 JSX 标签。
   * 真要把面向读者的文案塞进 lib 逻辑文件里，这个断言就会失败。
   */
  it('被排除的文件仍然只是逻辑文件（不许借「检测」之名藏文案）', () => {
    expect(BLIND_SPOT_FILES.length).toBeGreaterThan(0)
    for (const f of BLIND_SPOT_FILES) {
      const src = readFileSync(f, 'utf8')
      expect(src, `${f} 是逻辑文件，不该引入 React`).not.toMatch(/from ['"]react['"]/)
      expect(src, `${f} 是逻辑文件，不该出现 JSX`).not.toMatch(/return\s*\(?\s*</)
      expect(src, `${f} 是逻辑文件，不该引入 next/link`).not.toMatch(/from ['"]next\/link['"]/)
      expect(src, `${f} 是逻辑文件，不该引入 lucide 图标`).not.toMatch(/from ['"]lucide-react['"]/)
    }
  })

  it('豁免项都写了理由（防止无声堆积）', () => {
    for (const x of SKIP_WITH_REASON) {
      expect(x.reason.length, `${x.path} 缺少豁免理由`).toBeGreaterThan(10)
    }
  })
})