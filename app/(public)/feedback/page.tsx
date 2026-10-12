import type { Metadata } from 'next'
import { FeedbackForm } from '@/components/feedback-form'
import { PageHeader } from '@/components/page-header'

export const metadata: Metadata = {
  title: '问题反馈',
  description: '提出使用问题、建议与感受，支持文字和截图，无需登录。',
  alternates: { canonical: '/feedback/' },
}
export default function FeedbackPage() {
  return (
    <>
      <PageHeader
        title="让这里更好用，也更有收获"
        description="遇到了问题，有一个建议，或想聊聊使用感受？告诉我们。"
        breadcrumbs={[{ label: '首页', href: '/' }, { label: '问题反馈' }]}
      />
      <div className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        <FeedbackForm />
        <aside className="space-y-6 lg:pt-4">
          <div className="rounded-2xl bg-accent/60 p-6">
            <h2 className="text-lg font-semibold">你的反馈，帮助我们改进</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              我们会结合使用规范评估，并非所有建议都会采纳。改进始终围绕三个方向：
            </p>
            <ol className="mt-5 space-y-4">
              {[
                ['方便', '想找的内容，容易找到。'],
                ['快捷', '更少操作，就能动手实践。'],
                ['易理解', '说明清楚，学完真的会用。'],
              ].map(([title, text], index) => (
                <li key={title} className="flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-sm text-primary">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <p className="px-2 text-sm leading-7 text-muted-foreground">
            希望你每次进来，都能带着一项新知识、一种新方法，或一个能用起来的成果离开。
          </p>
        </aside>
      </div>
    </>
  )
}
