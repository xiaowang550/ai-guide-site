'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * 打印按钮。
 *
 * 为什么需要：教案包、学生使用声明、规范草案这三类内容的真实使用场景
 * 是「打印出来带进教室」，而网页默认会把导航、按钮、深色区块一起印出来。
 * 配合 globals.css 里的 @media print，纸面上只剩内容。
 */
export function PrintButton({ className, label = '打印' }: { className?: string; label?: string }) {
  useEffect(() => {
    let expanded: HTMLDetailsElement[] = []
    const beforePrint = () => {
      expanded = Array.from(
        document.querySelectorAll<HTMLDetailsElement>('main details:not([open])'),
      )
      expanded.forEach((details) => {
        details.open = true
      })
    }
    const afterPrint = () => {
      expanded.forEach((details) => {
        details.open = false
      })
      expanded = []
    }
    window.addEventListener('beforeprint', beforePrint)
    window.addEventListener('afterprint', afterPrint)
    return () => {
      window.removeEventListener('beforeprint', beforePrint)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [])
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      onClick={() => {
        if (typeof window !== 'undefined') window.print()
      }}
      title="按打印版的排版输出（A4，自动隐藏导航与按钮）"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden />
      {label}
    </Button>
  )
}
