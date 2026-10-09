import { describe, expect, it } from 'vitest'
import { validAssistantImage } from '../assistant-image'
describe('图片输入只接受小型图片数据', () => {
  it('允许正确签名的 JPEG、PNG、WebP，不信任名称或 MIME 声称', () => {
    expect(validAssistantImage('data:image/jpeg;base64,' + btoa('\xff\xd8\xff\xe0sample'))).toBe(
      true,
    )
    expect(validAssistantImage('data:image/png;base64,' + btoa('\x89PNG\r\n\x1a\nexample'))).toBe(
      true,
    )
    expect(validAssistantImage('data:image/webp;base64,' + btoa('RIFF0000WEBPtest'))).toBe(true)
    expect(validAssistantImage('data:image/png;base64,' + btoa('not a picture'))).toBe(false)
  })
  it('拒绝外部网址、SVG、非法 base64 和过大图片', () => {
    for (const image of [
      'https://internal.test/image.png',
      'data:image/svg+xml;base64,PHN2Zz4=',
      'data:image/jpeg;base64,!!!',
      'data:image/png;base64,AAAAA',
      'data:image/jpeg;base64,' + 'A'.repeat(240000),
    ])
      expect(validAssistantImage(image)).toBe(false)
  })
})
