import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/** 过滤掉数组里的空值与 null/undefined */
export function compact<T>(items: (T | null | undefined | false | '' | 0)[]): T[] {
  return items.filter(Boolean) as T[]
}

/** 按 key 分组 */
export function groupBy<T, K extends string>(items: T[], getKey: (item: T) => K): Record<K, T[]> {
  return items.reduce(
    (acc, item) => {
      const key = getKey(item)
      ;(acc[key] ||= []).push(item)
      return acc
    },
    {} as Record<K, T[]>
  )
}

/** 打乱数组（确定性种子，保证 SSR/CSR 输出一致） */
export function seededShuffle<T>(items: T[], seed = 42): T[] {
  const arr = [...items]
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}