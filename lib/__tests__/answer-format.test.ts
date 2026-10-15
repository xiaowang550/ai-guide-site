import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AnswerBody } from '@/components/assistant/answer-body'
import { safeAnswerUrl } from '@/lib/answer-text'

describe('回答阅读排版', () => {
  it('截图中的标题、加粗、列表和表格变成语义元素，不展示原始标记', () => {
    const html = renderToStaticMarkup(
      createElement(AnswerBody, {
        text: '### 北京行程\n\n**第一天：市区**\n\n- 上午：故宫\n- 下午：景山\n\n| 步骤 | 做什么 |\n| --- | --- |\n| 检索 | 找相关材料 |\n| 生成 | 整理回答 |',
      }),
    )
    expect(html).toContain('<h4>北京行程</h4>')
    expect(html).toContain('<strong>第一天：市区</strong>')
    expect(html).toContain('<li>上午：故宫</li>')
    expect(html).toContain('<table>')
    expect(html).toContain('<td>检索</td>')
    expect(html).not.toContain('###')
    expect(html).not.toContain('**第一天')
    expect(html).not.toContain('| --- |')
  })
  it('HTML 和脚本不会执行，图片不触发加载，危险协议不能成为链接', () => {
    const html = renderToStaticMarkup(
      createElement(AnswerBody, {
        text: '<script>alert(1)</script>\n\n<img src="https://invalid.example/pixel" onerror="alert(2)">\n\n[危险](javascript:alert%281%29)\n\n![追踪](https://invalid.example/pixel)',
      }),
    )
    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('onerror=')
    expect(safeAnswerUrl('//invalid.example')).toBe('')
    expect(safeAnswerUrl('data:text/html,test')).toBe('')
    expect(safeAnswerUrl('https://example.com/a')).toBe('https://example.com/a')
    expect(safeAnswerUrl('/tools/')).toBe('/tools/')
  })
  it('代码中的星号、管道和换行保留；未结束的流式代码也能安全展示', () => {
    const html = renderToStaticMarkup(
      createElement(AnswerBody, {
        text: '```js\nconst text = "**原样** | 保留"\nconsole.log(text)\n',
      }),
    )
    expect(html).toContain('<pre><code')
    expect(html).toContain('**原样** | 保留')
    expect(html).not.toContain('<strong>原样')
  })
})
