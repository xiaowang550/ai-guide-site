import { Compass, Goal, FolderOpen, ListFilter, Copy, Table2 } from 'lucide-react'

const ELEMENTS = [
  { icon: Compass, label: '角色', question: '以什么身份帮你？', example: '产品团队助理' },
  { icon: Goal, label: '目标', question: '这次完成什么？', example: '整理一份周报' },
  {
    icon: FolderOpen,
    label: '背景',
    question: '给谁看，有哪些材料？',
    example: '发给主管，附本周记录',
  },
  { icon: ListFilter, label: '约束', question: '有哪些边界？', example: '300 字内，不编造数据' },
  { icon: Copy, label: '示例', question: '参考什么样子？', example: '每条写清动作和进度' },
  { icon: Table2, label: '格式', question: '结果怎么交付？', example: '完成 / 进行中 / 下周计划' },
]

export function PromptMap() {
  return (
    <section className="lesson-section">
      <h2 className="text-xl">一张图，记住怎么问</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        简单任务先说“目标＋格式”，复杂任务再补其他项。
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {ELEMENTS.map(({ icon: Icon, ...item }, i) => (
          <div key={item.label} className="prompt-element">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Icon className="h-4 w-4 text-primary" />
                {item.label}
              </span>
              <span className="text-xs text-muted-foreground">0{i + 1}</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{item.question}</p>
            <p className="mt-2 text-sm leading-6">{item.example}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="prompt-example">
          <span className="text-xs text-muted-foreground">信息太少</span>
          <p className="mt-3 text-sm">“帮我写周报。”</p>
          <p className="mt-2 text-xs text-muted-foreground">AI 只能猜内容和格式。</p>
        </div>
        <div className="prompt-example is-good">
          <span className="text-xs font-medium text-primary">可以直接开始</span>
          <p className="mt-3 text-sm leading-7">
            “把下面的本周记录整理成周报，分完成、进行中、下周计划三段。300
            字内，不编造数据，缺失信息标待确认。”
          </p>
        </div>
      </div>
    </section>
  )
}
