/**
 * 子情境数据。
 *
 * 单独成文件而不是塞进 data/scenarios.ts：子情境数量（30 条）比场景（10 个）
 * 多得多，混在一起会让场景本身的权重表被埋掉 —— 而权重表是决策器最该被
 * 审阅的部分。分开之后，看权重就看 scenarios.ts，看细化就看这里。
 *
 * 写子情境的唯一标准：**改了权重之后，推荐结果要真的不一样。**
 * 如果某个子情境算出来和场景级结果一致，那它只是文字游戏，应该删掉。
 * （这一点由 lib/__tests__/scenario-variants.test.ts 逐条断言。）
 */

export interface VariantSeed {
  scenarioId: string
  id: string
  label: string
  hint: string
  weights: Record<string, number>
  requiredCapabilities?: { key: string; minRequiredScore?: number }[]
  promptTemplateId?: string
}

/**
 * 第一批：写作与内容、技术与数据。
 * 其余由 data/scenario-variants-b.ts 补齐（见 index 导出）。
 */
export const VARIANT_SEEDS: VariantSeed[] = [
  // ---------- 写东西 ----------
  {
    scenarioId: 'write',
    id: 'draft-from-scratch',
    label: '从零起草一份没写过的东西',
    hint: '难在定结构，不是难在辞藻。给不给得出提纲，比文字好不好看重要',
    weights: { writing: 0.5, reasoning: 0.3, longform: 0.05 },
  },
  {
    scenarioId: 'write',
    id: 'rewrite-tone',
    label: '把已有的东西改得更像人写的',
    hint: '难在别把它改得面目全非。跟随修改、不乱加内容，比文采重要',
    weights: { writing: 0.55, reasoning: 0.15, longform: 0.25 },
  },
  {
    scenarioId: 'write',
    id: 'cut-down',
    label: '把太长的稿子压短',
    hint: '难在不丢关键信息。判断哪些能砍，比生成更考验对材料的理解',
    promptTemplateId: 'long-doc-digest',
    weights: { writing: 0.35, longform: 0.35, reasoning: 0.2 },
  },

  // ---------- 读长文档 ----------
  {
    scenarioId: 'read-long-doc',
    id: 'digest',
    label: '几千字的材料，读完要一份摘要',
    hint: '难在不把中段漏掉。能不能一次读完原文，是这里的关键',
    promptTemplateId: 'long-doc-digest',
    weights: { longform: 0.5, reasoning: 0.2, writing: 0.15 },
  },
  {
    scenarioId: 'read-long-doc',
    id: 'scanned-pdf',
    label: '扫描件 / 图片版 PDF',
    hint: '难在要先看得见。纯文本工具在这里直接读不出内容',
    weights: { longform: 0.25, vision: 0.45, reasoning: 0.2 },
    requiredCapabilities: [{ key: 'vision', minRequiredScore: 3 }],
  },
  {
    scenarioId: 'read-long-doc',
    id: 'find-in-doc',
    label: '在整份材料里找一条信息',
    hint: '难在能不能指回原文位置。给不出页码的答案没法核对，等于没用',
    promptTemplateId: 'long-doc-digest',
    weights: { longform: 0.4, vision: 0.15, research: 0.2, reasoning: 0.2 },
  },

  // ---------- 查资料做研究 ----------
  {
    scenarioId: 'research',
    id: 'current-events',
    label: '查最近才发生的事',
    hint: '难在知识截止之后的东西。没有联网能力就只能靠旧知识编',
    promptTemplateId: 'research-with-citations',
    weights: { research: 0.5, reasoning: 0.25, writing: 0.15 },
    requiredCapabilities: [{ key: 'research', minRequiredScore: 3 }],
  },
  {
    scenarioId: 'research',
    id: 'compare-sources',
    label: '多个来源说法不一致，要判断可信度',
    hint: '难在敢不敢说「这两条矛盾」。和稀泥的输出没有价值',
    promptTemplateId: 'research-with-citations',
    weights: { reasoning: 0.4, research: 0.35, longform: 0.15, writing: 0.1 },
  },
  {
    scenarioId: 'research',
    id: 'lit-review',
    label: '读文献写综述',
    hint: '难在不让它把二十篇读成同一句结论。方法部分要能读进去',
    promptTemplateId: 'research-with-citations',
    weights: { longform: 0.4, reasoning: 0.3, research: 0.2, writing: 0.1 },
  },

  // ---------- 写代码 ----------
  {
    scenarioId: 'code',
    id: 'legacy-understand',
    label: '读懂一个没人维护的旧模块',
    hint: '难在先给证据再给方案。愿意承认「这里我看不懂」的工具更可信',
    promptTemplateId: 'code-reviewer',
    weights: { coding: 0.3, longform: 0.3, reasoning: 0.3 },
  },
  {
    scenarioId: 'code',
    id: 'new-feature',
    label: '从零写一个新功能',
    hint: '难在能不能跑起来。可执行、能验证，比解释得漂亮重要',
    weights: { coding: 0.6, reasoning: 0.25, agent: 0.1, longform: 0.05 },
  },
  {
    scenarioId: 'code',
    id: 'fix-bug',
    label: '修一个查不出原因的 bug',
    hint: '难在会不会瞎改。能列出「我怀疑这三处、依据是什么」才有意义',
    promptTemplateId: 'code-reviewer',
    weights: { coding: 0.35, reasoning: 0.4, longform: 0.15 },
  },

  // ---------- 自动化一个流程 ----------
  {
    scenarioId: 'automate',
    id: 'repeat-manual',
    label: '每周都要手动做一遍的活',
    hint: '难在容错。跑十次错三次的工具，不能放进流程里',
    promptTemplateId: 'workflow-automation-plan',
    weights: { agent: 0.6, coding: 0.2, reasoning: 0.15 },
  },
  {
    scenarioId: 'automate',
    id: 'pull-data-in',
    label: '把数据从一个系统搬到另一个',
    hint: '难在边界情况。字段缺失、格式变了、接口限流，这些才是真正的工作量',
    promptTemplateId: 'workflow-automation-plan',
    weights: { agent: 0.3, coding: 0.3, data: 0.25, reasoning: 0.15 },
  },
  {
    scenarioId: 'automate',
    id: 'internal-tool',
    label: '给自己搭一个小工具',
    hint: '难在维护。别人接手还能改的工具才算做完',
    promptTemplateId: 'workflow-automation-plan',
    weights: { coding: 0.45, reasoning: 0.25, office: 0.15, agent: 0.15 },
  },

  // ---------- 做数据分析 ----------
  {
    scenarioId: 'data',
    id: 'clean-dirty-table',
    label: '把脏表整理干净',
    hint: '难在不把原表改坏。每一步要能回滚，能说出动了哪些单元格',
    promptTemplateId: 'spreadsheet-analyst',
    weights: { data: 0.45, coding: 0.3, reasoning: 0.2, office: 0.05 },
  },
  {
    scenarioId: 'data',
    id: 'explain-a-number',
    label: '这个数字为什么变了',
    hint: '难在口径。先确认分母、范围、统计方式，答案才有意义',
    promptTemplateId: 'spreadsheet-analyst',
    weights: { data: 0.4, reasoning: 0.4, longform: 0.1, writing: 0.1 },
  },
  {
    scenarioId: 'data',
    id: 'make-chart',
    label: '做完分析要出图出表',
    hint: '难在能不能落成成品文件。只会输出 Markdown 的在这里不合格',
    promptTemplateId: 'spreadsheet-analyst',
    weights: { data: 0.4, office: 0.3, writing: 0.15, reasoning: 0.15 },
    requiredCapabilities: [{ key: 'office', minRequiredScore: 3 }],
  },
]
