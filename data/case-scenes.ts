/** Original ImageGen scene illustrations; reusable by task rather than anonymous AI icons. */
export function caseScene(id: string) {
  if (/campus|gov-guide/.test(id)) return 'campus-notice'
  if (/meeting|onboarding/.test(id)) return 'team-meeting'
  if (/teaching|lesson|research|translation|learning/.test(id)) return 'lesson-plan'
  if (/excel|market|sales-month|expense|invoice|budget/.test(id)) return 'data-analysis'
  if (/workorder|code|workflow|form/.test(id)) return 'workflow-automation'
  if (/video|newsroom|poster/.test(id)) return 'content-studio'
  if (/sales-deck|customer|restaurant|shop/.test(id)) return 'shop-operations'
  if (/logistics|travel/.test(id)) return 'dispatch-planning'
  if (/clinic|claim/.test(id)) return 'care-checklist'
  if (/farm/.test(id)) return 'field-work'
  if (/contract|credit|tender|policy/.test(id)) return 'document-review'
  return 'everyday-writing'
}
