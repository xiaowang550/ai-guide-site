export { ComparePicker } from './compare-picker'
export { CompareTable } from './compare-table'
export { CompareWorkbench } from './compare-workbench'
// 上限常量从非 client 模块转出：原先从这里（再到 client 组件）取，
// 服务端拼文案时会把 client 引用桩的源码写进 HTML。
export { MAX_COMPARE, compareRangeText } from '@/lib/compare-constants'
