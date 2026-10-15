'use client'
import type { FreeModel, ReasoningChoice } from '@/lib/assistant-models'
const labels = {
  none: '关闭',
  minimal: '极低',
  low: '低',
  medium: '中',
  high: '高',
  xhigh: '很高',
  max: '最高',
}
export function ReasoningPicker({
  model,
  value,
  onChange,
  busy,
}: {
  model?: FreeModel
  value: ReasoningChoice
  onChange: (v: ReasoningChoice) => void
  busy: boolean
}) {
  const support = model?.reasoningSupport
  if (!model?.reasoning || !support || (!support.efforts.length && !support.budget)) return null
  return (
    <label
      className="assistant-reasoning-control"
      title="更高强度可能需要等待更久。只显示模型官方支持的设置。"
    >
      <span>推理</span>
      <select
        aria-label="推理强度"
        value={value}
        disabled={busy}
        onChange={(e) => onChange(e.target.value as ReasoningChoice)}
      >
        <option value="default">默认</option>
        {support.efforts.map((e) => (
          <option key={e} value={e}>
            {labels[e]}
          </option>
        ))}
        {support.budget && (
          <optgroup label="思考预算">
            <option value="budget-1024">1,024 tokens</option>
            <option value="budget-2048">2,048 tokens</option>
            <option value="budget-4096">4,096 tokens</option>
          </optgroup>
        )}
      </select>
    </label>
  )
}
