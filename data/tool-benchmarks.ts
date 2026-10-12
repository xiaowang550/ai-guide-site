import type { BenchmarkResult, ToolBenchmark } from '@/lib/tool-benchmarks'

// Manually verified against the original boards on 2026-10-12. This is a dated
// snapshot, not a live feed or a claim that the entire application was tested.
const checkedAt = '2026-10-12'
const aa = (model: string, value: number): BenchmarkResult => ({
  board: 'aa-intelligence',
  model,
  value,
})
const text = (
  model: string,
  value: number,
  uncertainty: number,
  votes: number,
  preliminary = false,
): BenchmarkResult => ({
  board: 'arena-text',
  model,
  value,
  uncertainty,
  votes,
  preliminary,
  publishedAt: '2026-10-08',
})
const modelNote =
  '参考同厂商的指定模型；应用实际使用的版本、套餐和工具配置可能不同，不代表整个产品的总分。'
const measured: Record<string, BenchmarkResult[]> = {
  chatgpt: [
    aa('GPT-6.1 Sol (max)', 52),
    text('gpt-6.1-sol-max', 1484, 9, 4512),
    aa('GPT-6 Astra (max)', 53),
  ],
  claude: [
    aa('Claude Opus 5.5 (max with fallback)', 58),
    text('claude-opus-5.5-high', 1507, 8, 6272),
  ],
  gemini: [aa('Gemini 4 Argon (high)', 53), text('gemini-4-argon-high', 1525, 9, 4892, true)],
  qwen: [aa('Qwen3.8 Max (0902)', 45), text('qwen3.8-max', 1483, 5, 25378)],
  kimi: [aa('Kimi K3 (max)', 44), text('kimi-k3-max', 1488, 5, 30351)],
  glm: [aa('GLM-5.3 (max)', 45), text('glm-5.3-max', 1478, 5, 20049)],
  deepseek: [aa('DeepSeek V4.1 Flash (max)', 39), text('deepseek-v4.1-flash-max', 1475, 7, 10872)],
  mistral: [aa('Mistral Large 4 Preview', 38), text('mistral-large-4', 1429, 9, 4179)],
  gemma: [aa('Gemma 4 31B', 15), text('gemma-4-31b', 1452, 7, 6145)],
  doubao: [text('dola-seed-2.0-pro', 1456, 3, 79195)],
  runway: [
    { board: 'arena-video', model: 'runway-gen-4.5', value: 1225, uncertainty: 8, votes: 48127 },
  ],
}
const workflow = new Set(['dify', 'n8n', 'langgraph', 'ollama'])
const apps = new Set([
  'cursor',
  'copilot',
  'gamma',
  'notebooklm',
  'perplexity',
  'wps-ai',
  'tongyi-tingwu',
  'ima-copilot',
  'yuanbao',
])
export function toolBenchmark(id: string): ToolBenchmark {
  return {
    checkedAt,
    results: measured[id] ?? [],
    note: measured[id]
      ? modelNote
      : workflow.has(id)
        ? '这是部署或流程编排工具。输出表现取决于接入模型、资料与配置，不能直接套用模型排行榜分数。'
        : apps.has(id)
          ? '这是应用产品；本次未核实到可直接代表此产品、同条件的公开第三方测试，不借用底层模型分数。'
          : '本次未核实到对应版本的可比公开实测。暂无实测分不代表能力差；可查看官方功能和试用结果。',
  }
}
