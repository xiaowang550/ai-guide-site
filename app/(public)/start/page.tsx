import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { RookieLab } from '@/components/learning/rookie-lab'
export const metadata: Metadata = {
  title: '零基础一对一：从第一次对话开始',
  description:
    '小芽陪你练习对话、提示词、文生图、图生文、语音转文字，再完成一个真实任务。无需本站账号，进度保存在本浏览器。',
  alternates: { canonical: '/start' },
}
export default function StartPage() {
  return (
    <>
      <PageHeader
        title="零基础一对一"
        description="不用先懂术语，也不赶进度。从第一条消息开始，做完六个小练习，学会在本站继续探索。"
        breadcrumbs={[
          { label: '首页', href: '/' },
          { label: '教程', href: '/guides/' },
          { label: '零基础一对一' },
        ]}
      />
      <div className="container">
        <RookieLab />
      </div>
    </>
  )
}
