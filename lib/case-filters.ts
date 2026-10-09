export const CASE_TOPICS = [
  { id: 'all', label: '全部案例' },
  { id: 'teaching', label: '教学与学校' },
  { id: 'writing', label: '写作与沟通' },
  { id: 'documents', label: '资料与文档' },
  { id: 'data', label: '表格与数据' },
  { id: 'workflow', label: 'Agent 与流程' },
] as const
export type CaseTopic = (typeof CASE_TOPICS)[number]['id']
export interface CasePreview {
  id: string
  title: string
  industry: string
  role: string
  summary: string
  tools: { id: string; name: string; logo: string }[]
  reusability: 'high' | 'medium' | 'low'
  updatedAt: string
  illustrative: boolean
}
export function caseMatchesTopic(item: CasePreview, topic: CaseTopic): boolean {
  const text = `${item.title} ${item.industry} ${item.role} ${item.summary}`
  if (topic === 'all') return true
  if (topic === 'teaching') return /教学|教师|学校|课文|课堂|初中|高中|教育/.test(text)
  if (topic === 'writing') return /写作|周报|邮件|通知|公告|文案|沟通|会议|报道|采访/.test(text)
  if (topic === 'documents') return /资料|文档|材料|合同|报告|记录|检索|招标|条款/.test(text)
  if (topic === 'data') return /数据|表格|Excel|流水|金额|统计|报表|计算|财务|清洗|市场/.test(text)
  return (
    /流程|自动|工作流|行动清单|分类|Agent/.test(text) ||
    item.tools.some((tool) => ['dify', 'n8n', 'langgraph'].includes(tool.id))
  )
}
export function filterCases(
  items: CasePreview[],
  query: string,
  topic: CaseTopic,
  industry: string,
): CasePreview[] {
  const q = query.trim().toLocaleLowerCase()
  return items.filter(
    (item) =>
      caseMatchesTopic(item, topic) &&
      (!industry || item.industry === industry) &&
      (!q ||
        [item.title, item.summary, item.industry, item.role, ...item.tools.map((tool) => tool.name)]
          .join(' ')
          .toLocaleLowerCase()
          .includes(q)),
  )
}
