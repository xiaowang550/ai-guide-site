/** Copy the displayed answer, retaining code, list order and table columns without Markdown marks. */
export function readableAnswer(element: Element | null | undefined, fallback: string) {
  if (!element) return fallback
  function text(node: Node): string {
    if (node.nodeType === 3) return node.textContent ?? ''
    if (node.nodeType !== 1) return ''
    const el = node as Element,
      tag = el.tagName.toLowerCase()
    if (['script', 'style', 'img', 'input', 'button'].includes(tag)) return ''
    if (tag === 'br') return '\n'
    if (tag === 'pre') return (el.textContent ?? '').trimEnd() + '\n\n'
    if (tag === 'tr')
      return (
        Array.from(el.children)
          .map((cell) => text(cell).trim())
          .join('\t') + '\n'
      )
    const content = Array.from(el.childNodes).map(text).join('')
    if (tag === 'li') {
      const parent = el.parentElement
      const index = parent ? Array.from(parent.children).indexOf(el) : 0
      const marker =
        parent?.tagName === 'OL' ? Number(parent.getAttribute('start') ?? 1) + index + '. ' : '• '
      return marker + content.trim() + '\n'
    }
    if (['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'table'].includes(tag))
      return content.trim() + '\n\n'
    if (tag === 'a') {
      const href = el.getAttribute('href') ?? ''
      if (/^https?:\/\//.test(href) && !content.includes(href)) return content + ' (' + href + ')'
    }
    return content
  }
  return (
    text(element)
      .replace(/\n{3,}/g, '\n\n')
      .trim() || fallback
  )
}

export function safeAnswerUrl(value: string) {
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return ''
  if (/^(\/(?!\/)|#|\?)/.test(value)) return value
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}
