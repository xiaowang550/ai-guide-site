import { tools, guides, cases } from '@/data'
import { TemplateHomeEntry } from './template-entry'
export function DesignHome() {
  return (
    <TemplateHomeEntry
      tools={tools
        .filter((t) => ['chatgpt', 'deepseek', 'kimi', 'doubao'].includes(t.id))
        .map(({ id, name, logo, tagline }) => ({ id, name, logo, tagline }))}
      guides={guides.slice(0, 3).map(({ id, title, durationMin }) => ({ id, title, durationMin }))}
      cases={cases.slice(0, 3).map(({ id, title, industry }) => ({ id, title, industry }))}
    />
  )
}
