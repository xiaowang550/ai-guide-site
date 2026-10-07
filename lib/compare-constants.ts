/**
 * 对比功能的上限常量。
 *
 * 为什么单独放一个文件：这个常量原先定义在 components/compare-picker.tsx，
 * 而那个文件带 'use client'。服务端组件 app/compare/page.tsx 从中 import
 * MAX_COMPARE 用来拼文案（metadata 的 description 与页面副标题），
 * 于是 Next 把整个常量替换成了 client 引用代理 —— 一个函数体是
 * `function(){throw Error("Attempted to call MAX_COMPARE() from the server...")}`
 * 的桩。模板字符串一插值，**整个函数源码被写进了 HTML 正文和 meta 标签**，
 * 页面上直接显示这段错误代码。
 *
 * 规则：任何需要在服务端取值的常量，都不能放在 'use client' 模块里。
 * 组件和常量要分开：组件可以带 'use client'，常量不行。
 */
export const MAX_COMPARE = 4

/** 对比数量范围的中文描述，服务端文案统一用它，避免各处手写数字 */
export function compareRangeText(): string {
  return `横向比较 2-${MAX_COMPARE} 个工具`
}

/**
 * 工具详情页「和替代品对比」用的 id 列表。
 *
 * 为什么要当前工具排在第一个：
 * 那个按钮的语义是「拿我正在看的这个去和替代品比」，但原来的链接只传了替代品 id，
 * 对比表里根本没有当前工具 —— 读者点进去只能横向比较几个替代品之间，
 * 拿不到「它到底比这些强在哪、弱在哪」这个他真正想知道���答案。
 *
 * 超上限时的取舍：当前工具永远保留，剩下的名额给替代品。
 * 宁可少比一个替代品，也不能把「被比较的那个」挤掉 —— 那这个入口就没有意义了。
 */
export function compareWithAlternatives(tool: {
  id: string
  alternatives: string[]
}): string {
  const rest = tool.alternatives.filter((id) => id !== tool.id)
  return [tool.id, ...rest].slice(0, MAX_COMPARE).join(',')
}
