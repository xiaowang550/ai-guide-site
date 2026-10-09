/** 只接收小尺寸、带文件签名的图片数据；不代访客抓取外部图片网址。 */
export function validAssistantImage(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 240000) return false
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value)
  if (!match || match[2].length % 4 !== 0) return false
  try {
    const bytes = atob(match[2].slice(0, 32))
    if (match[1] === 'jpeg') return bytes.startsWith('\xff\xd8\xff')
    if (match[1] === 'png') return bytes.startsWith('\x89PNG\r\n\x1a\n')
    return bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP'
  } catch {
    return false
  }
}
