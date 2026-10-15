import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
export const metadata: Metadata = { title: '内容复核', robots: { index: false, follow: false } }
export default function FreshnessPage() {
  redirect('/admin/?tab=review')
}
