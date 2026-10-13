import { describe, expect, it } from 'vitest'
import { runInNewContext } from 'node:vm'
import { MOBILE_VIEWPORT_BOOTSTRAP } from '../mobile-viewport'

function viewport() {
  const listeners: Record<string, () => void> = {},
    variables: Record<string, string> = {}
  const root = {
    dataset: { keyboard: '' },
    style: {
      setProperty: (key: string, value: string) => {
        variables[key] = value
      },
    },
  }
  const document = {
    documentElement: root,
    activeElement: { matches: () => false },
    addEventListener: (type: string, fn: () => void) => {
      listeners[type] = fn
    },
  }
  const visualViewport = {
    height: 844,
    offsetTop: 0,
    scale: 1,
    addEventListener: (type: string, fn: () => void) => {
      listeners[type] = fn
    },
  }
  const context = {
    innerHeight: 844,
    innerWidth: 390,
    document,
    visualViewport,
    window: { visualViewport },
    requestAnimationFrame: (fn: () => void) => {
      fn()
      return 1
    },
    cancelAnimationFrame: () => {},
    dispatchEvent: () => {},
    Event,
    addEventListener: (type: string, fn: () => void) => {
      listeners[type] = fn
    },
  }
  runInNewContext(MOBILE_VIEWPORT_BOOTSTRAP, context)
  return { context, document, visualViewport, root, variables, update: () => listeners.resize() }
}
describe('手机可见视口与输入空间', () => {
  it('Android 布局视口与键盘一起缩小时仍识别键盘，并在关闭时恢复', () => {
    const view = viewport()
    view.document.activeElement.matches = () => true
    view.context.innerHeight = 440
    view.visualViewport.height = 440
    view.update()
    expect(view.root.dataset.keyboard).toBe('open')
    expect(view.variables['--visible-height']).toBe('440px')
    view.context.innerHeight = view.visualViewport.height = 844
    view.update()
    expect(view.root.dataset.keyboard).toBe('closed')
  })
  it('iOS 可见视口缩小且滚动时保留窗口位置', () => {
    const view = viewport()
    view.document.activeElement.matches = () => true
    view.visualViewport.height = 400
    view.visualViewport.offsetTop = 90
    view.update()
    expect(view.root.dataset.keyboard).toBe('open')
    expect(view.variables['--visible-top']).toBe('90px')
  })
  it('双指放大与地址栏伸缩不会被当作键盘', () => {
    const view = viewport()
    view.visualViewport.height = 750
    view.update()
    expect(view.root.dataset.keyboard).toBe('closed')
    view.document.activeElement.matches = () => true
    view.visualViewport.height = 422
    view.visualViewport.scale = 2
    view.update()
    expect(view.root.dataset.keyboard).toBe('closed')
  })
})
