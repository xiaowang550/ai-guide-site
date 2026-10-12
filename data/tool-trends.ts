import type { ToolTrends } from '../lib/tool-trends'
/** OpenRouter 公开模型榜单快照；在线接口会替换成近七天的数据。 */
export const toolTrendsSeed: ToolTrends = {
  asOf: '2026-10-11T00:00:00Z',
  method: 'snapshot',
  items: [
    { toolId: 'deepseek', model: 'DeepSeek V4.1 Flash', rank: 1 },
    { toolId: 'glm', model: 'GLM 5.3 Flash', rank: 2 },
    { toolId: 'chatgpt', model: 'GPT-6 Luna', rank: 6 },
    { toolId: 'claude', model: 'Claude Opus 5.5', rank: 8 },
  ],
}
