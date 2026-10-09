import type { LearningPath } from './types'

export const advancedPath: LearningPath = {
  id: 'model-to-agent',
  title: '进阶：从模型选型到 Agent 工作流',
  audience: '已会基本提问，希望把重复工作做成流程的人',
  estHours: 5,
  summary:
    '六个小练习：选模型、定字段、接资料、试 Agent、定位失败、验收成本。先走读，再选择工具实践。',
  phases: [
    {
      title: '01 选模型：先看任务，再看名字',
      outcome: '交出一张有相同输入、验收标准和失败记录的模型对照表。',
      items: [
        { label: '对照当前工具能力与来源', href: '/compare?ids=deepseek,qwen', type: 'tool' },
        { label: '模型选型与路由', href: '/learn/model-routing', type: 'concept' },
        { label: '用同一任务比较两个候选', href: '/guides/model-task-audit', type: 'guide' },
      ],
    },
    {
      title: '02 连步骤：让结果可交接',
      outcome: '定义一份任务清单结构，并让缺字段或无依据的结果退回核对。',
      items: [
        { label: '固定工作流', href: '/learn/workflow', type: 'concept' },
        { label: '结构化输出', href: '/learn/structured-output', type: 'concept' },
        { label: '把草稿变成下一步能读的结构', href: '/guides/structured-handoff', type: 'guide' },
      ],
    },
    {
      title: '03 接资料：回答要有依据',
      outcome: '形成一组有出处的回答，资料外或版本冲突的问题明确停止。',
      items: [
        { label: 'RAG 场景图解', href: '/learn/rag', type: 'concept' },
        { label: '有出处的问答流程', href: '/guides/knowledge-workflow', type: 'guide' },
        { label: 'NotebookLM：先用获准资料练习', href: '/tools/notebooklm', type: 'tool' },
      ],
    },
    {
      title: '04 试 Agent：让行动有边界',
      outcome: '写清工具范围与退出条件，形成待人工确认的草稿和运行记录。',
      items: [
        { label: 'Agent 与工作流的区别', href: '/learn/agent', type: 'concept' },
        { label: '工具调用由谁执行', href: '/learn/tool-calling', type: 'concept' },
        { label: '人工审批与接管', href: '/learn/human-approval', type: 'concept' },
        { label: '第一个 Agent 任务', href: '/guides/agent-first-workflow', type: 'guide' },
      ],
    },
    {
      title: '05 查失败：从第一个错误往回看',
      outcome: '区分材料缺项、工具失败与越权请求，明确哪些操作能安全重试。',
      items: [
        { label: 'Agent 记忆与状态', href: '/learn/agent-memory', type: 'concept' },
        { label: '资料中的提示注入', href: '/learn/prompt-injection', type: 'concept' },
        { label: '失败定位与重试', href: '/guides/agent-failure-review', type: 'guide' },
      ],
    },
    {
      title: '06 做验收：结果与消耗一起看',
      outcome: '保存正常和失败样本的验收表，只填写实际观察到的消耗。',
      items: [
        { label: 'Agent 验收与评估', href: '/learn/agent-evaluation', type: 'concept' },
        { label: '可靠性、耗时与成本验收', href: '/guides/agent-evaluation-cost', type: 'guide' },
        { label: '基准测试与自己的任务有何区别', href: '/learn/benchmark', type: 'concept' },
      ],
    },
  ],
  updatedAt: '2026-10-08',
}

export const advancedResources = [
  {
    id: 'dify',
    name: 'Dify',
    kind: '可视化 AI 应用',
    fit: '把知识检索、模型和输出节点连成小应用。',
    first: '先做“资料 → 提取 → 核对 → 草稿”，再考虑加入 Agent 节点。',
    boundary: '模型调用与托管可能另收费；新 Agent 节点的可用范围需按当前文档核对。',
    href: 'https://docs.dify.ai/en/cloud/use-dify/nodes/agent',
    label: '看官方节点说明',
  },
  {
    id: 'n8n',
    name: 'n8n',
    kind: '业务系统与流程连接',
    fit: '把已有表格、任务系统与 AI 步骤串起来。',
    first: '在获准环境先接只读资料，对写入或发送操作单独配置审核。',
    boundary: '连接服务需授权；自托管也有运行维护成本，不等于所有连接都可离线。',
    href: 'https://docs.n8n.io/advanced-ai/human-in-the-loop-tools/',
    label: '看官方审批示例',
  },
  {
    id: 'langgraph',
    name: 'LangGraph',
    kind: '面向开发者的编排框架',
    fit: '明确管理状态、条件分支、暂停和失败恢复。',
    first: '已有代码基础时，从少量节点、明确状态和人工检查开始。',
    boundary: '需要编程与运行环境；框架不自带模型额度，也不会自动保证任务正确。',
    href: 'https://docs.langchain.com/oss/javascript/langgraph/overview',
    label: '看官方框架介绍',
  },
] as const

export const advancedModels = [
  {
    id: 'deepseek',
    label: 'DeepSeek / Qwen',
    otherId: 'qwen',
    task: '中文提取与资料整理',
    check: '比较字段、未知项和实际可用的模型模式。',
  },
  {
    id: 'kimi',
    label: 'Kimi / Claude',
    otherId: 'claude',
    task: '长材料与多步骤草稿',
    check: '检查材料是否读全、引用是否支持结论。',
  },
  {
    id: 'chatgpt',
    label: 'ChatGPT / Gemini',
    otherId: 'gemini',
    task: '图表、文件与跨类型输入',
    check: '区分模型能力、产品入口和组织权限。',
  },
  {
    id: 'ollama',
    label: 'Ollama 与本地模型',
    task: '部署方式与资料去向',
    check: '核对本地或 Cloud 模式、模型许可与硬件条件。',
  },
  {
    id: 'gemma',
    label: 'Gemma 与本地模型家族',
    otherId: 'qwen',
    task: '本地部署与资料检索',
    check: '区分聊天模型和嵌入模型，按硬件选择尺寸、模态与许可。',
  },
  {
    id: 'mistral',
    label: 'Mistral 与结构化任务',
    otherId: 'deepseek',
    task: '字段提取与工具调用',
    check: '用同一份脱敏材料比较；公开预览和可下载权重分别核对。',
  },
] as const
