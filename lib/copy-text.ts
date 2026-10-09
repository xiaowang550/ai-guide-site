/** 返回真实复制结果，权限不足或 fallback 失败时由界面提示手动复制。 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {}
  if (typeof document === 'undefined') return false
  const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
  const selection = window.getSelection(),
    ranges = selection
      ? [...Array(selection.rangeCount)].map((_, i) => selection.getRangeAt(i).cloneRange())
      : []
  const input = document.createElement('textarea')
  input.value = text
  input.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'
  input.setAttribute('readonly', '')
  document.body.appendChild(input)
  try {
    input.select()
    return document.execCommand('copy') === true
  } catch {
    return false
  } finally {
    input.remove()
    active?.focus({ preventScroll: true })
    if (selection) {
      selection.removeAllRanges()
      for (const range of ranges) selection.addRange(range)
    }
  }
}
