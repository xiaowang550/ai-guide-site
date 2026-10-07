import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'

/**
 * Cloudflare Pages Functions 的依赖链门禁。
 *
 * 背景：Functions 跑在 Workers 运行时上，而本站的其他部分（构建、测试、本地开发）
 * 跑在 Node 上。两者对 import 的容忍度差别很大，**失败只发生在 Cloudflare 上**：
 * 本地 typecheck、lint、测试、构建全绿，CI 也全绿，唯独 Cloudflare 部署失败，
 * 而构建日志只显示「No deployment available」，看不出原因。
 *
 * 这类问题只能靠静态检查提前拦住 —— 所以在这里把依赖图走一遍。
 *
 * 三条规则：
 *   1. 不能 import Node 内置模块（node:crypto 之类）。Workers 里没有。
 *   2. 不能用 `@/` 路径别名。Pages Functions 用 esbuild 打包，不保证解析 tsconfig 别名。
 *   3. 不能引入外部依赖。Functions 的依赖只能是仓库内的文件 ——
 *      加任何 npm 包都会让打包体积和失败面变大。
 */

const ROOT = process.cwd()
const ENTRY = 'functions/api/[[path]].ts'

/**
 * 去掉注释再匹配 import。
 *
 * 不去注释会误报：`lib/admin/crypto.ts` 的文件头注释里写着
 * 「任何 `import ... from 'node:crypto'` 都会让 Pages Function 编译失败」，
 * 正则会把这句说明当成真的 import。第一版就踩了这个坑。
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1')
}

const IMPORT_RE =
  /(?:import|export)[\s\S]*?from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g

function resolveSpec(spec: string, fromFile: string): string | null {
  if (!spec.startsWith('.')) return null
  const base = resolve(dirname(fromFile), spec)
  for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
    if (existsSync(cand)) return cand
  }
  return null
}

interface GraphResult {
  files: string[]
  nodeBuiltins: string[]
  aliases: string[]
  externals: string[]
  unresolved: string[]
}

function walkDependencyGraph(entry: string): GraphResult {
  const seen = new Set<string>()
  const nodeBuiltins: string[] = []
  const aliases: string[] = []
  const externals: string[] = []
  const unresolved: string[] = []

  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    const code = stripComments(readFileSync(file, 'utf8'))
    for (const m of code.matchAll(IMPORT_RE)) {
      const spec = m[1] || m[2] || m[3]
      if (!spec) continue
      const at = `${relative(ROOT, file)}`
      if (spec.startsWith('node:')) nodeBuiltins.push(`${at} -> ${spec}`)
      else if (spec.startsWith('@/')) aliases.push(`${at} -> ${spec}`)
      else if (!spec.startsWith('.')) externals.push(`${at} -> ${spec}`)
      else {
        const target = resolveSpec(spec, file)
        if (!target) unresolved.push(`${at} -> ${spec}`)
        else if (target.endsWith('.ts') || target.endsWith('.tsx')) visit(target)
      }
    }
  }

  visit(resolve(ROOT, entry))
  return {
    files: [...seen].map((f) => relative(ROOT, f)).sort(),
    nodeBuiltins,
    aliases,
    externals,
    unresolved,
  }
}

describe('Pages Functions 的依赖链（这些约束只在 Cloudflare 上才会暴露）', () => {
  it('入口文件存在', () => {
    // 双层方括号是「捕获任意多段路径」，写成单层只会匹配到 /api/x
    expect(existsSync(resolve(ROOT, ENTRY)), `找不到 ${ENTRY}`).toBe(true)
  })

  const graph = walkDependencyGraph(ENTRY)

  it('依赖链里没有 Node 内置模块', () => {
    expect(
      graph.nodeBuiltins,
      `Workers 运行时没有 node: 模块。涉及 ${graph.nodeBuiltins.join('、')}` +
        '—— 请改用 WebCrypto（crypto.subtle），它在本项目里两侧都有'
    ).toEqual([])
  })

  it('依赖链里没有 @/ 路径别名', () => {
    expect(
      graph.aliases,
      `Pages Functions 用 esbuild 打包，不保证解析 tsconfig 的 @/ 别名。涉及 ${graph.aliases.join('、')}` +
        '—— 请改成相对导入（lib/admin 与 lib/db 内部本来就该用相对导入）'
    ).toEqual([])
  })

  it('依赖链里没有外部 npm 依赖', () => {
    expect(
      graph.externals,
      `Functions 只能依赖仓库内的文件。涉及 ${graph.externals.join('、')}` +
        '—— 需要的能力优先用 Web 标准 API 实现'
    ).toEqual([])
  })

  it('所有相对导入都能解析到实际文件', () => {
    expect(graph.unresolved, `解析失败的导入：${graph.unresolved.join('、')}`).toEqual([])
  })

  it('依赖链规模合理（防止无意中把整个 data/ 拖进来）', () => {
    // 依赖链只该是 lib/admin + lib/db 那一小片。
    // 如果这里突然出现 data/ 下的文件，说明某个模块引入了全量数据，
    // 那会直接决定 Worker 打包体积。
    expect(graph.files.length, `依赖链有 ${graph.files.length} 个文件：\n${graph.files.join('\n')}`)
      .toBeLessThan(30)
    expect(graph.files.some((f) => f.startsWith('data/')), 'Functions 不该依赖 data/ 下的数据')
      .toBe(false)
  })

  it('本地 sqlite 适配器没有混进依赖链', () => {
    // lib/db/sqlite.ts 依赖 node:sqlite，只该出现在本地与测试里。
    // 它一旦被 Functions 引用，上面那条「无 Node 内置模块」就会红。
    expect(graph.files.some((f) => f.endsWith('db/sqlite.ts'))).toBe(false)
  })
})

describe('wrangler.toml 在数据库就绪前不能声明 D1 绑定', () => {
  const src = readFileSync('wrangler.toml', 'utf8')

  it('要么整段注释掉，要么 database_id 是合法 UUID', () => {
    const active = src
      .split('\n')
      .filter((l) => /^\s*(#\s*)?\[\[d1_databases\]\]/.test(l) && !l.trimStart().startsWith('#'))
    if (active.length === 0) return // 已注释掉，符合预期

    const id = src.match(/^\s*database_id\s*=\s*"([^"]+)"/m)?.[1]
    expect(
      id,
      'database_id 存在但不是合法 UUID —— Cloudflare 会解析这个绑定并失败，' +
        '导致整个部署失败，而构建日志只显示「No deployment available」'
    ).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('变量名固定为 DB（代码里读的是 env.DB）', () => {
    // 只在启用状态下检查
    const active = src
      .split('\n')
      .filter((l) => /^\s*(#\s*)?binding\s*=/.test(l) && !l.trimStart().startsWith('#'))
    for (const line of active) {
      expect(line).toMatch(/binding\s*=\s*"DB"/)
    }
  })
})
