/**
 * 14 个能力维度的键与中文标签（后台校验与表单用）。
 *
 * **为什么在这里重复定义一遍，而不是直接 import `@/lib/score`**：
 * Pages Functions 用 esbuild 打包，不保证解析 tsconfig 的 `@/` 路径别名；
 * 而 `lib/admin/*` 要能在 Workers 运行时里执行，必须全部用相对导入。
 * 换句话说，这不是重复，是隔离构建体系的必要动作。
 *
 * 两份定义必须保持一致，由 `lib/__tests__/admin-schema.test.ts` 断言
 * `ADMIN_CAPABILITY_KEYS` 与 `lib/score.ts` 的 `CAPABILITY_META` 完全相等。
 * 改了一处不改另一处，测试立刻红。
 */

export const ADMIN_CAPABILITY_KEYS = [
  'writing',
  'longform',
  'reasoning',
  'math',
  'coding',
  'research',
  'agent',
  'data',
  'office',
  'imageGen',
  'vision',
  'video',
  'voice',
  'realtime',
] as const

export type AdminCapabilityKey = (typeof ADMIN_CAPABILITY_KEYS)[number]

export const ADMIN_CAPABILITY_LABELS: Record<AdminCapabilityKey, string> = {
  writing: '写作表达',
  longform: '长文理解',
  reasoning: '逻辑推理',
  math: '数理计算',
  coding: '编程开发',
  research: '联网研究',
  agent: '任务自动化',
  data: '数据分析',
  office: '办公产出',
  imageGen: '图像生成',
  vision: '图像理解',
  video: '视频生成',
  voice: '语音音乐',
  realtime: '实时交互',
}

/** 后台当前只支持编辑工具资料。其余内容类型留了位置但还没做表单 */
export const CONTENT_KINDS = ['tool'] as const
export type ContentKind = (typeof CONTENT_KINDS)[number]

export const CONTENT_KIND_LABELS: Record<string, string> = {
  tool: '工具资料',
}
