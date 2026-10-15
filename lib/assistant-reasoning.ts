import type { FreeModel, ReasoningChoice } from './assistant-models.ts'
import { REASONING_EFFORTS } from './assistant-models.ts'

export function supportedReasoning(model: FreeModel, value: unknown): value is ReasoningChoice {
  return (
    value === undefined ||
    value === 'default' ||
    (REASONING_EFFORTS.includes(value as never) &&
      !!model.reasoningSupport?.efforts.includes(value as never)) ||
    (!!model.reasoningSupport?.budget &&
      ['budget-1024', 'budget-2048', 'budget-4096'].includes(String(value)))
  )
}
/** No guessed effort levels. Default routers and mandatory reasoning never get an off switch. */
export function reasoningOptions(
  model: FreeModel,
  choice: ReasoningChoice = 'default',
  practice = false,
) {
  if (!model.reasoning || model.id === 'openrouter/free') return {}
  const support = model.reasoningSupport
  if (choice.startsWith('budget-'))
    return { reasoning: { max_tokens: Number(choice.slice(7)), exclude: true } }
  if (choice !== 'default') return { reasoning: { effort: choice, exclude: true } }
  if (practice && support?.efforts.includes('none'))
    return { reasoning: { effort: 'none', exclude: true } }
  if (practice && support && !support.mandatory)
    return { reasoning: { enabled: false, exclude: true } }
  if (practice && support?.efforts.length) {
    const lowest = [...support.efforts].find((e) => e !== 'none')
    if (lowest) return { reasoning: { effort: lowest, exclude: true } }
  }
  return { reasoning: { exclude: true } }
}
