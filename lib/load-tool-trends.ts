import { freshTrends, type ToolTrends } from './tool-trends'
import { toolTrendsSeed } from '../data/tool-trends'
let request: Promise<ToolTrends> | undefined
let requestedAt = 0
export function loadToolTrends(): Promise<ToolTrends> {
  if (Date.now() - requestedAt > 600000) {
    request = undefined
    requestedAt = Date.now()
  }
  return (request ??= fetch('/api/tool-trends')
    .then(async (response) => {
      if (!response.ok) throw new Error('trends unavailable')
      const result = await response.json()
      if (!Array.isArray(result.items) || typeof result.asOf !== 'string')
        throw new Error('invalid trends')
      return freshTrends(result)
    })
    .catch(() => freshTrends(toolTrendsSeed)))
}
