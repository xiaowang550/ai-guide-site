import type { GlossaryEntry } from '@/data/types'

/** 取某个概念关联的术语（用于概念页侧栏与知识库卡片） */
export function glossaryForConcept(glossary: GlossaryEntry[], conceptId: string): GlossaryEntry[] {
  return glossary.filter((g) => g.conceptId === conceptId)
}

/** 按中文拼音/英文首字母分组的稳定排序（不引入拼音库） */
export function sortGlossary(entries: GlossaryEntry[]): GlossaryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.term === b.term) return 0
    return a.term.localeCompare(b.term, 'zh-Hans-CN')
  })
}

export function groupByInitial(entries: GlossaryEntry[]): { initial: string; items: GlossaryEntry[] }[] {
  const groups: { initial: string; items: GlossaryEntry[] }[] = []
  for (const entry of sortGlossary(entries)) {
    const ch = entry.term.charAt(0)
    const last = groups[groups.length - 1]
    if (last && last.initial === ch) last.items.push(entry)
    else groups.push({ initial: ch, items: [entry] })
  }
  return groups
}