'use client'

import { useState } from 'react'
import {
  ArrowRight,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  SearchCheck,
  Sparkles,
} from 'lucide-react'
import type { ConceptMapData } from '@/data/concept-maps'

export function ConceptMap({ data }: { data: ConceptMapData }) {
  const [scene, setScene] = useState<'office' | 'school'>('office')
  const icons = [FileText, Sparkles, SearchCheck]
  return (
    <figure className="concept-process">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg">{data.title}</h2>
        <div className="concept-scene-tabs" role="group" aria-label="切换图解示例">
          <button
            type="button"
            aria-pressed={scene === 'office'}
            onClick={() => setScene('office')}
          >
            <BriefcaseBusiness className="h-3.5 w-3.5" aria-hidden />
            日常工作
          </button>
          <button
            type="button"
            aria-pressed={scene === 'school'}
            onClick={() => setScene('school')}
          >
            <GraduationCap className="h-3.5 w-3.5" aria-hidden />
            课堂教学
          </button>
        </div>
      </div>
      <ol className="concept-process-flow">
        {data.labels.map((label, index) => {
          const Icon = icons[index]
          return (
            <li key={label}>
              <Icon className="h-7 w-7 text-primary" aria-hidden />
              <strong>{label}</strong>
              <p>{data[scene][index]}</p>
              {index < 2 && <ArrowRight className="concept-process-arrow h-4 w-4" aria-hidden />}
            </li>
          )
        })}
      </ol>
      <figcaption className="mt-4 text-xs leading-6 text-muted-foreground">
        {data.reminder}
      </figcaption>
    </figure>
  )
}
