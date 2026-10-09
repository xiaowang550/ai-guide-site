import { advancedPath } from './advanced-learning'
import type { LearningPath, PathPhase } from '@/data/types'

/**
 * 学习路径数据
 *
 * 设计约定：
 * - 路径本身不重复教程/概念页的内容，只做排序和验收标准。
 * - 每个 phase 的 outcome 写成可验收的能力描述，
 *   避免「了解 X」「熟悉 X」这类无法判断是否达标的说法。
 * - 所有 href 必须指向站内真实存在的路由：
 *   /learn/<概念>、/guides/<教程>、/tools/<工具>、/cases/<案例>，
 *   以及固定页 /learn/glossary、/tools、/compare、/find。
 */

export const paths: LearningPath[] = [
  advancedPath,
  {
    id: 'zero-to-pro',
    title: '零基础 7 天入门',
    audience: '完全没用过 AI、被术语劝退的职场人',
    estHours: 6,
    summary:
      '不追求会用工具，只追求能把它当成一个靠谱的助手用起来：知道它擅长什么、不擅长什么，会用结构化的方式提问，能判断一段输出能不能直接用。7 天，每天 40 到 60 分钟。',
    phases: [
      {
        title: '第 1-2 天：先把它当成一个搜索框',
        outcome:
          '能独立完成一次带上下文的提问，并在回答末尾说出这段回答有没有可信的来源——这就是这个阶段的验收标准。',
        items: [
          { label: '大模型到底是什么', href: '/learn/llm', type: 'concept' },
          { label: '提示词的四个要素', href: '/guides/prompt-basics', type: 'guide' },
          { label: '不知道选哪个就先比一下', href: '/compare', type: 'tool' },
          { label: '直接按场景挑一个', href: '/find', type: 'tool' },
          { label: '术语速查表', href: '/learn/glossary', type: 'concept' },
        ],
      },
      {
        title: '第 3-4 天：改稿，而不是一次成稿',
        outcome:
          '能用「先出提纲 → 指出问题 → 再改」这个循环，把一份 AI 初稿改到自己愿意在末尾署名的程度，连续三轮不越改越差。',
        items: [
          { label: '迭代与纠错：为什么要多轮', href: '/guides/iterate-and-correct', type: 'guide' },
          { label: '提示词：同一个任务的三种写法', href: '/learn/prompt', type: 'concept' },
          { label: 'temperature 到底调的是什么', href: '/learn/temperature', type: 'concept' },
          { label: '案例：运营周报怎么改出来的', href: '/cases/weekly-report-ops', type: 'case' },
        ],
      },
      {
        title: '第 5-6 天：让它按格式给你能用的东西',
        outcome:
          '能一次拿到结构稳定、字数可控、可以直接复制进自己文档的输出；出现格式跑偏时，能说出该改提示词里的哪一句。',
        items: [
          { label: '让输出稳定下来的五个约束', href: '/guides/reliable-output', type: 'guide' },
          {
            label: '上下文窗口：为什么长对话会变笨',
            href: '/learn/context-window',
            type: 'concept',
          },
          { label: 'token 和上下文的关系', href: '/learn/token', type: 'concept' },
          { label: '周报模板：可直接复制的结构', href: '/guides/weekly-report', type: 'guide' },
          { label: '案例：8 页 PPT 的页标题怎么定', href: '/cases/ppt-sales-deck', type: 'case' },
        ],
      },
      {
        title: '第 7 天：知道什么时候别用它',
        outcome:
          '能对一段看起来很专业的 AI 输出做基本核查，说出它引用了什么、哪里没有来源，并给自己列出至少三条不该交给 AI 的任务。',
        items: [
          { label: '幻觉：它为什么会编', href: '/learn/hallucination', type: 'concept' },
          { label: '坏提示词怎么改', href: '/guides/bad-prompt-fix', type: 'guide' },
          { label: '开源模型和闭源模型的差别', href: '/learn/open-vs-closed', type: 'concept' },
          {
            label: '案例：不许调和矛盾的综述提示词',
            href: '/cases/research-literature',
            type: 'case',
          },
        ],
      },
    ],
    updatedAt: '2026-09-22',
  },
  {
    id: 'workplace-30d',
    title: '职场提效 30 天',
    audience: '会用聊天但用得浅的职场人',
    estHours: 10,
    summary:
      '已经每天都在用，但输出还得大改。这个路径按「模板化 → 读长材料 → 出成品 → 查得准」四步推进，每一步都落在一个自己工作里真实存在的任务上，30 天跑完，估时 10 小时（每天 20 到 30 分钟）。',
    phases: [
      {
        title: '第 1 周：把手上的重复动作变成模板',
        outcome:
          '能挑出每周至少一件重复工作，把它写成一条带 {{变量}} 的提示词，下一周只改变量就直接用，不用重新描述一遍。',
        items: [
          { label: '提示词四要素复习', href: '/guides/prompt-basics', type: 'guide' },
          { label: '周报教程：把一次性的活变成流程', href: '/guides/weekly-report', type: 'guide' },
          { label: '案例：周报提示词逐条拆解', href: '/cases/weekly-report-ops', type: 'case' },
          {
            label: '案例：分层任务单（每周重复型工作）',
            href: '/cases/teaching-materials',
            type: 'case',
          },
          { label: '案例：分镜表模板', href: '/cases/short-video-scripts', type: 'case' },
        ],
      },
      {
        title: '第 2 周：让它读你读不完的材料',
        outcome:
          '能把一份 80 页 PDF 在半小时内变成一页要点，并在要点旁边标出哪三处必须回原文核对。',
        items: [
          { label: '长 PDF 摘要教程', href: '/guides/long-pdf-summary', type: 'guide' },
          {
            label: '多模态：上传 PDF 时它实际在读什么',
            href: '/learn/multimodal',
            type: 'concept',
          },
          { label: '上下文窗口与截断', href: '/learn/context-window', type: 'concept' },
          { label: 'NotebookLM：以上传文件为主的思路', href: '/tools/notebooklm', type: 'tool' },
          { label: '案例：文献综述的表格输出', href: '/cases/research-literature', type: 'case' },
        ],
      },
      {
        title: '第 3 周：从大纲到能交出去的成品',
        outcome:
          '能把 AI 给的大纲或表格转成 Word/Excel/PPT 成品文件，并自己复核过全部关键数字——复核这一步做不到，就不算完成。',
        items: [
          { label: 'Excel 分析教程', href: '/guides/excel-analysis', type: 'guide' },
          { label: '从大纲到 PPT 教程', href: '/guides/ppt-from-outline', type: 'guide' },
          { label: '财务脏表：怎么校验每一步', href: '/cases/excel-cleaning', type: 'case' },
          { label: '销售 deck 的判断书写法', href: '/cases/ppt-sales-deck', type: 'case' },
          { label: 'Gamma：直接出成品文件的路径', href: '/tools/gamma', type: 'tool' },
        ],
      },
      {
        title: '第 4 周：查得比别人快一点',
        outcome:
          '能独立完成一次带来源链接的小型调研，每条结论后面都有出处，并且至少挑出一处不可信的结论说明理由。',
        items: [
          { label: '小型调研教程', href: '/guides/market-research', type: 'guide' },
          { label: '思维链：什么时候该让它先想', href: '/learn/chain-of-thought', type: 'concept' },
          { label: 'Perplexity：带链接检索的用法', href: '/tools/perplexity', type: 'tool' },
          { label: '市场规模提示词逐条拆解', href: '/cases/market-sizing', type: 'case' },
          { label: '幻觉：怎么核查一段输出', href: '/learn/hallucination', type: 'concept' },
        ],
      },
    ],
    updatedAt: '2026-09-29',
  },
  {
    id: 'creator-advanced',
    title: '进阶：把 AI 做成能用的东西',
    audience: '开发者 / 想做 AI 应用的创作者',
    estHours: 14,
    summary:
      '目标不是写更多代码，而是让 AI 在你的项目里可靠地干活：知道它会在什么地方失效、能给它接上私有数据、能让它动手操作文件，并用结构化的提示词把生成结果变成可提交的代码。适合已有工程基础的开发者。',
    phases: [
      {
        title: '第 1 段：搞懂它为什么会对、为什么会错',
        outcome:
          '能解释幻觉、温度和上下文窗口这三件事各自会在什么场景下毁掉你的功能，并说出对应的工程手段（检索、结构约束、重试或拒绝）。',
        items: [
          { label: '幻觉的成因与工程对策', href: '/learn/hallucination', type: 'concept' },
          { label: 'temperature 与采样', href: '/learn/temperature', type: 'concept' },
          { label: '上下文窗口与截断处理', href: '/learn/context-window', type: 'concept' },
          { label: 'token 计量与成本估算', href: '/learn/token', type: 'concept' },
          { label: '让输出稳定：结构化约束的做法', href: '/guides/reliable-output', type: 'guide' },
        ],
      },
      {
        title: '第 2 段：给模型接上它自己的数据',
        outcome:
          '能把一份私有文档集做成可检索的片段，并让问答结果带回出处；能分清补充事实材料与调整模型输出行为这两类需求。',
        items: [
          { label: 'RAG 的完整流程', href: '/learn/rag', type: 'concept' },
          { label: 'embedding 决定了检索质量上限', href: '/learn/embedding', type: 'concept' },
          { label: '向量库选型', href: '/learn/vector-database', type: 'concept' },
          { label: 'NotebookLM：零代码的对照实现', href: '/tools/notebooklm', type: 'tool' },
          {
            label: '微调：什么时候值得，什么时候不值',
            href: '/learn/fine-tuning',
            type: 'concept',
          },
        ],
      },
      {
        title: '第 3 段：让它动手，而不只是说话',
        outcome:
          '能让一个工具在你的项目里读写文件、执行命令，并在它出错时自己判断这一步的结果是否可信，而不是直接接受。',
        items: [
          { label: 'Agent 的能力边界', href: '/learn/agent', type: 'concept' },
          { label: 'MCP：工具是怎么被接进来的', href: '/learn/mcp', type: 'concept' },
          { label: 'Cursor：编辑器内的工作方式', href: '/tools/cursor', type: 'tool' },
          { label: 'Claude：长任务上的处理习惯', href: '/tools/claude', type: 'tool' },
          {
            label: '案例：老代码定位的三段式提示词',
            href: '/cases/code-legacy-review',
            type: 'case',
          },
        ],
      },
      {
        title: '第 4 段：把生成结果变成能提交的代码',
        outcome:
          '能用 AI 完成一次有明确范围的改动并逐行自查 diff，能说出哪些改动绝对不允许交给它（数据库迁移、权限、金额计算）。',
        items: [
          { label: '提示词工程在代码场景的映射', href: '/learn/prompt', type: 'concept' },
          {
            label: 'bad prompt 修复：需求说不清是主因',
            href: '/guides/bad-prompt-fix',
            type: 'guide',
          },
          { label: '迭代与纠错：多轮改到能跑', href: '/guides/iterate-and-correct', type: 'guide' },
          { label: 'Copilot：补全与改写的边界', href: '/tools/copilot', type: 'tool' },
          { label: 'ChatGPT：脱离编辑器时的做法', href: '/tools/chatgpt', type: 'tool' },
        ],
      },
      {
        title: '第 5 段：不出本机、不花钱的那条路',
        outcome:
          '能判断一个需求是否必须本地部署，并说出本地模型在哪些能力上明显弱于云端（长上下文、复杂推理、工具调用稳定性）。',
        items: [
          { label: '开源与闭源的取舍', href: '/learn/open-vs-closed', type: 'concept' },
          { label: 'Ollama：本地跑起来的最小路径', href: '/tools/ollama', type: 'tool' },
          { label: '对齐与安全限制', href: '/learn/alignment', type: 'concept' },
          { label: '多模态能力是怎么被调用的', href: '/learn/multimodal', type: 'concept' },
          { label: '按补充条件重新挑一遍工具', href: '/find', type: 'tool' },
        ],
      },
    ],
    updatedAt: '2026-09-26',
  },
]

export const pathsById: Record<string, LearningPath> = paths.reduce<Record<string, LearningPath>>(
  (acc, item) => {
    acc[item.id] = item
    return acc
  },
  {},
)

/** 路径内每个 phase 的条目数之和，用于展示「多少个页面」 */
export function countPathItems(path: LearningPath): number {
  return path.phases.reduce((sum, phase: PathPhase) => sum + phase.items.length, 0)
}

export function findPath(id: string): LearningPath | undefined {
  return pathsById[id]
}
