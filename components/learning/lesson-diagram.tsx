import { ArrowRight, ClipboardCheck, Cpu, FileText, Layers, Search, Wrench } from 'lucide-react'
import type { DiagramIcon, GuideVisual } from '@/data/guide-visuals'

const icons: Record<DiagramIcon, typeof FileText> = {
  material: FileText,
  model: Cpu,
  search: Search,
  check: ClipboardCheck,
  output: Layers,
  tool: Wrench,
}
export function LessonDiagram({ visual }: { visual: GuideVisual }) {
  return (
    <figure className="lesson-diagram">
      <figcaption>
        <span className="eyebrow">先看懂这件事怎么完成</span>
        <h2 className="mt-2 text-lg">{visual.title}</h2>
      </figcaption>
      <ol className="lesson-diagram-flow">
        {visual.steps.map((step, index) => {
          const Icon = icons[step.icon]
          return (
            <li key={step.label}>
              <Icon className="h-6 w-6 text-primary" aria-hidden />
              <strong>{step.label}</strong>
              <p>{step.detail}</p>
              {index < visual.steps.length - 1 && (
                <ArrowRight className="lesson-diagram-arrow h-4 w-4" aria-hidden />
              )}
            </li>
          )
        })}
      </ol>
      <p className="mt-4 text-xs leading-6 text-muted-foreground">{visual.note}</p>
    </figure>
  )
}
