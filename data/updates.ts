import type { UpdateRecord, UpdateType } from '@/data/types'

/**
 * 更新雷达数据
 *
 * 写作口径（重要）：
 * - 这里记录的是「本站数据发生了什么变更」，不是厂商公告或新闻通稿。
 * - 任何未经本站核实的产品变化都不写进 summary；
 *   价格一律不写具体数字，只写本站如何处理该字段。
 * - 按 date 倒序排列，最新的在最前。
 */

export const updates: UpdateRecord[] = [
  {
    id: 'u-2026-09-28-notebooklm-realtime-score',
    date: '2026-09-28',
    type: 'capability-change',
    summary:
      '为全部 18 个工具补齐 realtime 维度的评分与依据说明。此前该维度缺省，视频与语音类场景的排序实际被忽略，补齐后 /find 的「做视频」场景结果发生变化。',
    affected: ['/tools', '/find', '/compare'],
  },
  {
    id: 'u-2026-09-22-ppt-outline-guide',
    date: '2026-09-22',
    type: 'new-guide',
    summary:
      '新增《从大纲到成品 PPT》教程，区分了文字页、图表页、数据页三种版式的处理方式，并给出页标题该怎么写的判断标准。',
    affected: ['/guides/ppt-from-outline', '/guides'],
  },
  {
    id: 'u-2026-09-15-price-field-policy',
    date: '2026-09-15',
    type: 'price-change',
    summary:
      '改变价格字段的处理方式：6 个工具的付费档位从站内维护的具体数字改为「以官方定价页为准」的描述加官方链接。本站不再更新价格数字，因此价格页的可信来源只有官方页面。',
    affected: ['/tools', '/compare'],
  },
  {
    id: 'u-2026-09-11-market-sizing-case',
    date: '2026-09-11',
    type: 'new-guide',
    summary:
      '案例库新增「市场分析师」场景，附带完整提示词原文，重点是取数清单与口径分歧的处理方式，同时进入职场 30 天路径的第 4 周。',
    affected: ['/cases/market-sizing', '/paths/workplace-30d'],
  },
  {
    id: 'u-2026-09-08-kimi-longform-score-fix',
    date: '2026-09-08',
    type: 'data-fix',
    summary:
      '修正 kimi 的 longform 与 research 两项评分依据，之前的打分没有区分「上下文窗口大」和「长文里检索得准」。修正后它在「读长文档」场景中的排名下降两位。',
    affected: ['/tools/kimi', '/compare', '/find'],
  },
  {
    id: 'u-2026-09-02-doubao-record',
    date: '2026-09-02',
    type: 'new-tool',
    summary:
      '补齐 doubao 的完整数据页：14 个维度的评分依据、中文场景的逐条依据说明、明确的弱项与「别用它做什么」，此前的信息只够放进工具列表。',
    affected: ['/tools/doubao', '/tools'],
  },
  {
    id: 'u-2026-08-26-duplicate-record-merged',
    date: '2026-08-26',
    type: 'removed',
    summary:
      '移除了一份重复收录的工具数据，与已有条目指向同一产品。站内每个工具只保留唯一 slug，对比页不再出现两行近似结果。',
    affected: ['/tools/chatgpt', '/compare', '/tools'],
  },
  {
    id: 'u-2026-08-19-cot-concept-page',
    date: '2026-08-19',
    type: 'new-concept',
    summary:
      '新增概念页「思维链」，重点写清它在普通对话里并不需要手动开启，以及强行要求「一步步思考」时反而可能降低正确率。',
    affected: ['/learn/chain-of-thought', '/learn'],
  },
  {
    id: 'u-2026-08-12-excel-guide-wording-fix',
    date: '2026-08-12',
    type: 'data-fix',
    summary:
      '修正《Excel 分析教程》中一处表述：删掉了会让人误以为 AI 能直接修改本地文件的说法，改为先做清洗方案与校验、再人工执行的流程。',
    affected: ['/guides/excel-analysis', '/guides'],
  },
  {
    id: 'u-2026-08-05-weaknesses-rewrite',
    date: '2026-08-05',
    type: 'data-fix',
    summary:
      '重写了 4 个工具的弱点字段，统一改成「别用它做什么」的形式，并要求每条弱点举一个具体场景。原先的写法只有形容词，无法用于决策。',
    affected: ['/tools', '/compare'],
  },
  {
    id: 'u-2026-07-28-research-guide',
    date: '2026-07-28',
    type: 'new-guide',
    summary:
      '新增《小型调研怎么做才不是抄资料》教程，要求每条结论都留出处、找不到就写「查不到」，并给出交叉验证的两个动作。',
    affected: ['/guides/market-research', '/guides'],
  },
  {
    id: 'u-2026-07-20-agent-score-criteria',
    date: '2026-07-20',
    type: 'capability-change',
    summary:
      '统一了 agent 维度的打分标准为「能读写文件并执行命令，且有权限控制」。此前不同工具按不同含义打分，跨工具比较没有意义。',
    affected: ['/tools/cursor', '/tools/copilot', '/tools/ollama'],
  },
  {
    id: 'u-2026-07-14-bad-prompt-guide',
    date: '2026-07-14',
    type: 'new-guide',
    summary:
      '新增《坏提示词怎么改》教程，收录站内提问失败案例的「改写前 / 改写后」对照，改法只按失败原因分类，不给通用模板。',
    affected: ['/guides/bad-prompt-fix', '/guides'],
  },
  {
    id: 'u-2026-07-09-updatedat-definition',
    date: '2026-07-09',
    type: 'data-fix',
    summary:
      '统一全站 updatedAt 的含义为「本站数据最后核对日期」，并在工具页脚注明。这个字段此前混用了官方更新时间和本站核对时间，无法判断可信度。',
    affected: ['/tools', '/compare'],
  },
  {
    id: 'u-2026-07-03-glossary-expansion',
    date: '2026-07-03',
    type: 'new-concept',
    summary:
      '扩充术语表，补上站内没有单独概念页但使用频率很高的词，每个词给一句话短解释和一段可展开的详细解释。',
    affected: ['/learn/glossary', '/learn'],
  },
]

export const updatesById: Record<string, UpdateRecord> = updates.reduce<
  Record<string, UpdateRecord>
>((acc, item) => {
  acc[item.id] = item
  return acc
}, {})

/** 更新类型的展示信息，顺序即页面上筛选器的顺序 */
export const updateTypeMeta: Record<UpdateType, { label: string; hint: string }> = {
  'new-tool': { label: '新增工具', hint: '首次补齐完整数据页的工具' },
  removed: { label: '移除', hint: '数据被删除或合并到其他条目' },
  'price-change': { label: '价格处理', hint: '本站如何处理价格字段，不记录价格数字' },
  'capability-change': { label: '能力口径', hint: '某个维度的定义或打分标准发生变化' },
  'new-concept': { label: '新增概念', hint: '新增或扩充概念页、术语表' },
  'new-guide': { label: '新增教程', hint: '新增教程或案例' },
  'data-fix': { label: '数据修正', hint: '修正评分、表述、字段含义' },
}

/** 按年月分组，用于页面的时间线渲染 */
export function groupUpdatesByMonth(
  records: UpdateRecord[] = updates
): { month: string; items: UpdateRecord[] }[] {
  const groups: { month: string; items: UpdateRecord[] }[] = []
  for (const record of records) {
    const month = record.date.slice(0, 7)
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.items.push(record)
    else groups.push({ month, items: [record] })
  }
  return groups
}