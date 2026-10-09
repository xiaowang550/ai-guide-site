import { ArrowRight, CheckCircle2, ClipboardCheck, ShieldAlert } from 'lucide-react'

export function ToolOverview({
  strength,
  check,
  avoid,
}: {
  strength: string
  check: string
  avoid: string
}) {
  const cards = [
    { title: '先用在这里', icon: CheckCircle2, text: strength },
    { title: '用完检查什么', icon: ClipboardCheck, text: check },
    { title: '先避开这个场景', icon: ShieldAlert, text: avoid },
  ]
  return (
    <div className="tool-overview" aria-label="工具使用速览">
      {cards.map((card, index) => (
        <div key={card.title}>
          <card.icon className="mb-3 h-5 w-5 text-primary" aria-hidden />
          <h2 className="text-sm font-semibold">{card.title}</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{card.text}</p>
          {index < cards.length - 1 && (
            <ArrowRight className="tool-overview-arrow h-4 w-4" aria-hidden />
          )}
        </div>
      ))}
    </div>
  )
}
