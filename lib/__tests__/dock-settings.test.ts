import { afterEach, describe, expect, it, vi } from 'vitest'
import { readSettings, subscribeSettings, SETTINGS_STORAGE_KEY } from '../settings'

afterEach(() => vi.unstubAllGlobals())
describe('助手位置在浏览器内同步', () => {
  it('其他标签页的位置变化使用最新设置，不把 StorageEvent 当成 CustomEvent', () => {
    const browser = new EventTarget()
    let value = JSON.stringify({ assistantDock: { x: 60, y: 200 } })
    vi.stubGlobal('window', browser)
    vi.stubGlobal('localStorage', { getItem: () => value })
    const changed = vi.fn(),
      unsubscribe = subscribeSettings(changed)
    value = JSON.stringify({ assistantDock: { x: 120, y: 300 } })
    browser.dispatchEvent(Object.assign(new Event('storage'), { key: SETTINGS_STORAGE_KEY }))
    expect(changed.mock.calls[0][0].assistantDock).toEqual({ x: 120, y: 300 })
    browser.dispatchEvent(Object.assign(new Event('storage'), { key: 'another-setting' }))
    expect(changed).toHaveBeenCalledOnce()
    unsubscribe()
    browser.dispatchEvent(Object.assign(new Event('storage'), { key: SETTINGS_STORAGE_KEY }))
    expect(changed).toHaveBeenCalledOnce()
  })
  it('非有限坐标回退到默认位置，入口不会因为异常本地数据消失', () => {
    vi.stubGlobal('window', new EventTarget())
    vi.stubGlobal('localStorage', { getItem: () => '{"assistantDock":{"x":1e309,"y":200}}' })
    expect(readSettings().assistantDock).toBe('bottom-right')
  })
})
