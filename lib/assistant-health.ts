import type { Db } from './db/types.ts'
import type { AssistantProvider, FreeModel, ModelHealth } from './assistant-models.ts'
export const HEALTH_TTL_MS = 36 * 3600000
export interface StoredHealth extends ModelHealth {
  keyTag: string
}
export interface HealthPlan {
  id: string
  startedAt: string
  source: 'admin' | 'daily'
  models: FreeModel[]
  keyTags: Partial<Record<AssistantProvider, string>>
  results: ModelHealth[]
  completedAt?: string
}
export function healthId(model: string) {
  return 'health:' + model
}
export async function modelHealth(db: Db): Promise<StoredHealth[]> {
  const rows = await db.all<{ data: string }>(
    "SELECT data FROM assistant_store WHERE id LIKE 'health:%'",
  )
  return rows.flatMap((row) => {
    try {
      return [JSON.parse(row.data) as StoredHealth]
    } catch {
      return []
    }
  })
}
export function usableHealth(
  value: StoredHealth | undefined,
  keyTag: string | undefined,
  now = Date.now(),
) {
  const age = value ? now - Date.parse(value.checkedAt) : Infinity
  return !!value?.ok && !!keyTag && value.keyTag === keyTag && age >= 0 && age <= HEALTH_TTL_MS
}
export function publicHealth({ keyTag: _private, ...value }: StoredHealth): ModelHealth {
  return value
}
