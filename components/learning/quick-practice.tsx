'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { CopyableText } from '@/components/copyable-text'

const TASKS = [
  {
    id: 'report',
    label: '写周报',
    title: '把零散记录整理成周报',
    hint: '贴入本周记录、真实进度和下周计划。',
    instruction:
      '请把材料整理成一份简洁周报，分【本周完成】【进行中】【下周计划】【风险与待确认】四段。每条写清动作、结果和进度。',
    guide: 'weekly-report',
  },
  {
    id: 'meeting',
    label: '会议待办',
    title: '从会议记录提取待办',
    hint: '贴入允许分享的会议记录，先移除敏感内容。',
    instruction:
      '请从会议记录提取待办，用表格输出【事项】【负责人】【截止时间】【需要确认的信息】。只记录材料中明确提到的责任人和时间，未说明就标待确认。',
    guide: 'prompt-basics',
  },
  {
    id: 'ppt',
    label: 'PPT 大纲',
    title: '先把汇报主线理清',
    hint: '写下主题、听众、讲述时长和希望传达的结论。',
    instruction:
      '请根据材料生成逐页 PPT 大纲，用表格输出【页标题】【唯一信息点】【建议图表】【讲述时长】。先给一句话主线，一页只讲一件事，不编造案例或数字。',
    guide: 'ppt-from-outline',
  },
  {
    id: 'explain',
    label: '读懂资料',
    title: '把难懂的资料解释清楚',
    hint: '贴入你想读懂的一小段资料，并注明卡在哪里。',
    instruction:
      '请解释材料：先用一句话说核心意思，再用一个日常例子说明对应关系，最后给一个能检查我是否理解的小问题。保留原文结论，不增加未经支持的事实。',
    guide: 'explain-like-five',
  },
]

export function QuickPractice() {
  const [selected, setSelected] = useState('report')
  const [materials, setMaterials] = useState<Record<string, string>>({})
  const task = TASKS.find((t) => t.id === selected)!
  const body = `${task.instruction}\n\n共同要求：不确定的信息标【待确认】；保留真实数字、日期和原意。\n\n我的材料：\n${materials[selected]?.trim() || '【把自己的材料替换到这里】'}`
  return (
    <section id="quick-practice" className="quick-practice">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">今天就能用</p>
          <h2 className="mt-2 text-xl">选一件事，马上试一遍</h2>
        </div>
        <span className="text-xs text-muted-foreground">选任务 → 填材料 → 复制到 AI</span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2" aria-label="练习任务">
        {TASKS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={selected === t.id}
            className="practice-tab"
            onClick={() => setSelected(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">{task.title}</h3>
          <label
            htmlFor="practice-materials"
            className="mb-3 mt-2 block text-xs leading-6 text-muted-foreground"
          >
            {task.hint}
          </label>
          <textarea
            id="practice-materials"
            value={materials[selected] ?? ''}
            onChange={(e) => setMaterials((p) => ({ ...p, [selected]: e.target.value }))}
            placeholder="只填写可以分享的材料…"
            className="practice-materials"
          />
          <p className="mt-2 text-[11px] text-muted-foreground">
            这里只整理提示词，不发送你的材料。
          </p>
          <Link
            href={`/guides/${task.guide}`}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary"
          >
            跟着完整教程做
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <CopyableText
          text={body}
          title="复制后，粘贴到你正在用的 AI"
          label="复制提示词"
          className="bg-card"
        />
      </div>
    </section>
  )
}
