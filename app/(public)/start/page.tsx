import { PageRegions, RegionSlot } from '@/components/page-regions'
import type { Metadata } from 'next'
import '@/app/styles/reference-hero.css'
import { PageHeader } from '@/components/page-header'
import { RookieLab } from '@/components/learning/rookie-lab'
export const metadata: Metadata = {
  title: '零基础一对一：先做一件小事',
  description:
    '选一个小任务，亲手写要求、修改草稿、检查结果。基础练习后可继续试作图、看图和语音，进度保存在本浏览器。',
  alternates: { canonical: '/start' },
}
export default function StartPage() {
  return (
    <>
      <RegionSlot moduleId="beginner" id="header">
        <PageHeader
          title="零基础一对一"
          description="选一件事，跟着做。学会写要求、改草稿，再按需要试图片和语音。"
          breadcrumbs={[
            { label: '首页', href: '/' },
            { label: '教程', href: '/guides/' },
            { label: '零基础一对一' },
          ]}
        />
      </RegionSlot>
      <PageRegions
        moduleId="beginner"
        sections={[
          {
            id: 'practice',
            content: (
              <>
                <div className="container">
                  <RookieLab />
                </div>
              </>
            ),
          },
        ]}
      />
    </>
  )
}
