import type { NewsItem } from './types.ts'

/** 中文整理尚未就绪时明确说明，不拿推测的内容补成新闻。 */
export function newsDisplay(item: NewsItem) {
  const chinese = /[\u3400-\u9fff]/.test(item.title)
  const release = item.originalTitle.match(/^Ollama\s+(v[\d.]+)$/i)
  return {
    ...item,
    title: chinese
      ? item.title
      : release
        ? `Ollama 发布 ${release[1]}`
        : `${item.sourceName}：${item.category}新消息`,
    summary:
      item.summary ||
      (release
        ? '官方已发布新版本，具体修复与使用条件请查看版本说明。'
        : chinese
          ? '官方已发布这条更新。完整内容与适用范围请查看官方原文。'
          : '官方已发布这条消息，中文摘要正在整理。可展开原始标题，或阅读官方原文。'),
    takeaway:
      item.takeaway ||
      {
        模型发布: '选模型时，先对照自己的任务，再确认开放范围与使用条件。',
        功能更新: '常用这个工具？可以查看更新说明，确认自己的账号是否已开放。',
        编程工具: '写代码或学习编程时，可留意所需的插件版本、权限和工作环境。',
        使用变化: '使用前核对适用账号、费用和生效时间，避免影响现有安排。',
        研究与行业: '适合了解行业应用与研究思路；案例中的结果需结合其具体条件。',
      }[item.category],
    languageLabel: item.reviewed
      ? '中文整理'
      : item.translation === 'automatic'
        ? '自动中文整理'
        : chinese
          ? '官方中文'
          : release
            ? '官方版本'
            : '中文整理中',
  }
}
