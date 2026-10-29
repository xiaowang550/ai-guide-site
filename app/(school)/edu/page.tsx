import type { Metadata } from 'next'
import { TeacherHome } from '@/components/xian/teacher-home'
import { SchoolHomeModules } from '@/components/edu/school-home-modules'
import { PageRegions } from '@/components/page-regions'
export const metadata: Metadata = {
  title: '教师空间',
  description: '备课、课堂与评价，把 AI 变成一节课里的实际帮助。',
  alternates: { canonical: '/edu' },
}
export default function SchoolHome() {
  return (
    <PageRegions
      moduleId="school"
      sections={[
        {
          id: 'content',
          content: (
            <>
              <TeacherHome />
              <SchoolHomeModules />
            </>
          ),
        },
      ]}
    />
  )
}
