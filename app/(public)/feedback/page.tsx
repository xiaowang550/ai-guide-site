import '@/app/styles/reference-hero.css'
import '@/app/styles/reference-feedback.css'
import type { Metadata } from 'next'
import { BookOpen, Sprout, Zap } from 'lucide-react'
import { FeedbackForm } from '@/components/feedback-form'
import { ReferenceArt } from '@/components/reference-art'
export const metadata: Metadata = {
  title: '问题反馈',
  description: '提出使用问题、建议与感受，支持文字和截图，无需登录。',
  alternates: { canonical: '/feedback/' },
}
export default function FeedbackPage() {
  return (
    <div className="container pb-10">
      <div className="feedback-layout">
        <section className="feedback-intro">
          <h1>
            让这里更好用，
            <br />
            也更有收获
          </h1>
          <p>
            遇到了问题，有一个建议，或想聊聊使用感受？
            <br />
            欢迎告诉我们，一起让 AI 能力图谱变得更好。
          </p>
          <ReferenceArt />
        </section>
        <div className="min-w-0">
          <FeedbackForm />
        </div>
      </div>
      <section className="reference-panel">
        <h2>你的反馈，帮助我们改进</h2>
        <p className="text-sm text-muted-foreground">
          我们会结合使用规范评估，并非所有建议都会采纳。改进围绕三个方向：
        </p>
        <div className="feedback-principles">
          {[
            { title: '方便', text: '想找的内容，容易找到。减少步骤，让你更顺手。', icon: Sprout },
            { title: '快捷', text: '更少操作，就能动手实践。把时间留给真正的任务。', icon: Zap },
            {
              title: '易理解',
              text: '说明清楚，学完真的会用。每次进来，都能带着收获离开。',
              icon: BookOpen,
            },
          ].map(({ title, text, icon: Icon }) => (
            <article key={title}>
              <Icon size={30} />
              <span>
                <strong>{title}</strong>
                <p>{text}</p>
              </span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}
