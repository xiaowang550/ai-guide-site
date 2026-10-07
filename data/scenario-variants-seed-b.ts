/**
 * 子情境数据第二批：办公产出、图像、视频、学习答疑。
 *
 * 与第一批（data/scenario-variants-seed.ts）同结构，合并阶段由 data/index.ts 接入。
 *
 * 写法上的两个要点：
 *
 * 1. weights 是**覆盖**，不是完整权重表。没写到的维度沿用场景级权重
 *    （见 data/scenarios.ts），所以每条只写真正要改的三到五个维度。
 * 2. 同一个场景下的三条，权重必须明显拉开。区分不开的条目只是文字游戏。
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

export const VARIANT_SEEDS_B: VariantSeed[] = [
  // ---------- 做 PPT 或表格 ----------
  {
    scenarioId: 'make-office',
    id: 'slides-deck',
    label: '做一份会议汇报用的幻灯片',
    hint: '难在能不能直接导出成品文件。只在对话框里给一份文字大纲的，在这里不算完成',
    // 汇报类主要吃排版落地，写作次之，配图只是点缀。
    promptTemplateId: 'ppt-outline-builder',
    weights: { office: 0.5, writing: 0.3, imageGen: 0.15, data: 0.05 },
  },
  {
    scenarioId: 'make-office',
    id: 'spreadsheet',
    label: '把杂乱数据做成表格文件',
    hint: '难在公式和格式能存下来。只在回复里贴一张表格的，下次就没法接着用了',
    // 表格更吃数据处理和计算，办公输出反而退到辅助位置。
    promptTemplateId: 'spreadsheet-analyst',
    weights: { data: 0.5, math: 0.25, office: 0.25, reasoning: 0.15 },
    requiredCapabilities: [{ key: 'office', minRequiredScore: 3 }, { key: 'data', minRequiredScore: 3 }],
  },
  {
    scenarioId: 'make-office',
    id: 'formal-doc',
    label: '合同方案这类要留档的文件',
    hint: '难在条款不漏、措辞能担责。写得漂亮但责任边界含糊的，比写不出来更麻烦',
    // 留档文件以文字为准，排版只要能落到文件格式里就行。
    weights: { writing: 0.45, longform: 0.25, office: 0.2, reasoning: 0.15 },
    requiredCapabilities: [{ key: 'office', minRequiredScore: 3 }],
  },

  // ---------- 做图 ----------
  {
    scenarioId: 'image',
    id: 'text-to-image',
    label: '按一段文字描述生成新图',
    hint: '难在提示词要具体。主体、光线、比例缺一，出来的图就只剩一个气氛',
    promptTemplateId: 'image-prompt-writer',
    weights: { imageGen: 0.75, writing: 0.15, vision: 0.1 },
  },
  {
    scenarioId: 'image',
    id: 'edit-image',
    label: '改已有的图，换背景或局部重画',
    hint: '难在改一处不崩别处，还要接得住原图画风。接不住的会一眼看出是贴上去的',
    // 读图能力决定能不能定位到要改的地方，所以权重比从零生成更依赖它。
    promptTemplateId: 'image-prompt-writer',
    weights: { imageGen: 0.35, vision: 0.5, reasoning: 0.1, writing: 0.05 },
  },
  {
    scenarioId: 'image',
    id: 'print-ready',
    label: '要放进 PPT 或付印的成品图',
    hint: '难在尺寸和清晰度。分辨率不够的图一放大就糊，投屏和印刷都藏不住',
    promptTemplateId: 'image-prompt-writer',
    weights: { imageGen: 0.45, office: 0.25, vision: 0.2, writing: 0.05 },
    requiredCapabilities: [{ key: 'imageGen', minRequiredScore: 4 }],
  },

  // ---------- 做视频 ----------
  {
    scenarioId: 'video',
    id: 'gen-clip',
    label: '从零生成一段视频片段',
    hint: '难在一次别要求太多。运镜、表情、字幕一起要，结果每样都差一点',
    promptTemplateId: 'video-shotlist',
    weights: { video: 0.55, imageGen: 0.2, writing: 0.15, vision: 0.05 },
  },
  {
    scenarioId: 'video',
    id: 'assemble-edit',
    label: '图文配成一条能发的视频',
    hint: '难在音画对得上。先定旁白时长再按秒数裁画面，顺序反了要全部重来',
    // 剪辑类里视频生成只占一小块，脚本、配音、文件落地才是主要工作量。
    promptTemplateId: 'video-shotlist',
    weights: { writing: 0.35, voice: 0.3, office: 0.2, video: 0.15, realtime: 0.05 },
  },
  {
    scenarioId: 'video',
    id: 'talking-head',
    label: '数字人或口播讲课的视频',
    hint: '难在念得像人。提纲不能直接念，句长、停连、口语词都得先改一遍',
    promptTemplateId: 'video-shotlist',
    weights: { voice: 0.4, video: 0.35, realtime: 0.15, writing: 0.1 },
  },

  // ---------- 学习答疑 ----------
  {
    scenarioId: 'learn',
    id: 'absolute-beginner',
    label: '完全零基础，从头学一样东西',
    hint: '难在不用术语解释术语。先确认你懂到哪一步，比一次讲多深更要紧',
    promptTemplateId: 'concept-explainer',
    weights: { reasoning: 0.35, writing: 0.3, longform: 0.15, research: 0.1 },
  },
  {
    scenarioId: 'learn',
    id: 'go-deeper',
    label: '已经入门，想深挖其中一个点',
    hint: '难在接得住已有上下文。绕开你已经会的部分，是深入和重复的分界线',
    promptTemplateId: 'concept-explainer',
    weights: { reasoning: 0.45, longform: 0.25, research: 0.15, writing: 0.1 },
  },
  {
    scenarioId: 'learn',
    id: 'teach-others',
    label: '备课，或者要讲给别人听',
    hint: '难在讲的人跟得上。听众问到哪一层就停在哪，是讲稿和论文的分界',
    promptTemplateId: 'concept-explainer',
    weights: { writing: 0.5, longform: 0.25, reasoning: 0.15, office: 0.1 },
  },
]