import '../../styles/school.css'
import type { ReactNode } from 'react'
import { SchoolNav } from '@/components/edu/school-nav'

export default function EduLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SchoolNav />
      {children}
    </>
  )
}
