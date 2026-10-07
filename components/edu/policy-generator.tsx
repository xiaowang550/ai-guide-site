'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Scale, ShieldAlert } from 'lucide-react'
import type { EduIntensity, EduStage, EduSubject } from '@/data/types'
import {
  INTENSITY_OPTIONS,
  STAGE_LABELS,
  SUBJECT_OPTIONS,
  declarationTitle,
  generatePolicy,
} from '@/lib/edu-shared'
import { eduPolicyRules } from '@/data/edu-policy'
import { CopyableText } from '@/components/copyable-text'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * AI 使用规范生成器：纯规则，不调用任何大模型 API。
 * 结果可复现，并显示命中了哪几条规则，便于学校质疑与修订。
 */
export function PolicyGenerator() {
  const [stage, setStage] = useState<EduStage>('初中')
  const [subject, setSubject] = useState<EduSubject>('通用')
  const [intensity, setIntensity] = useState<EduIntensity>('学生可用需声明')

  const input = useMemo(() => ({ stage, subject, intensity }), [stage, subject, intensity])
  const result = useMemo(() => generatePolicy(input), [input])
  const ruleLabels = new Map(eduPolicyRules.map((r) => [r.id, r.label]))

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* 输入 */}
      <div className="border-b border-hairline pb-5 lg:sticky lg:top-20 lg:self-start">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Scale className="h-4 w-4" aria-hidden />
          填三个条件
        </h2>
        <div className="mt-4 space-y-5">
          <Group label="学段">
            <div className="flex flex-wrap gap-1.5">
              {STAGE_LABELS.map((s) => (
                <Chip key={s} active={stage === s} onClick={() => setStage(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </Group>

          <Group label="学科">
            <div className="flex flex-wrap gap-1.5">
              {SUBJECT_OPTIONS.map((s) => (
                <Chip key={s} active={subject === s} onClick={() => setSubject(s)}>
                  {s}
                </Chip>
              ))}
            </div>
          </Group>

          <Group label="使用强度">
            <div className="space-y-1.5">
              {INTENSITY_OPTIONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIntensity(i)}
                  aria-pressed={intensity === i}
                  className={cn(
                    'block w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                    intensity === i
                      ? 'border-primary bg-primary/5 font-medium text-primary'
                      : 'hover:border-primary/40'
                  )}
                >
                  {i}
                </button>
              ))}
            </div>
          </Group>
        </div>

        <div className="mt-5 border-t pt-4 text-[11px] leading-5 text-muted-foreground">
          <p>命中规则：</p>
          <ul className="mt-1.5 space-y-1">
            {result.matchedRuleIds.map((id) => (
              <li key={id}>
                <Badge variant="secondary" className="font-normal">
                  {ruleLabels.get(id) ?? id}
                </Badge>
              </li>
            ))}
          </ul>
          {result.fallbacks.map((f) => (
            <p key={f} className="mt-2 text-amber-700 dark:text-amber-300">
              {f}
            </p>
          ))}
        </div>
      </div>

      {/* 输出 */}
      <div className="min-w-0 space-y-6">
        <section className="border-b border-hairline pb-5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg">规范草案</h2>
            <Badge variant="secondary">
              {stage} · {subject} · {intensity}
            </Badge>
          </div>
          <p className="mt-1.5 text-sm text-muted-foreground">
            这是按本地通行做法生成的草案，供教研组讨论修改后发布。正式发布前请结合本校实际与上级要求调整。
          </p>
          <div className="mt-4 space-y-5">
            {result.sections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold">{section.title}</h3>
                <ul className="mt-2 space-y-1.5">
                  {section.items.map((item) => (
                    <li key={item} className="flex gap-2 text-sm leading-6 text-foreground/85">
                      <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-danger/40 bg-danger/5 p-5">
          <h2 className="flex items-center gap-2 text-lg text-danger">
            <ShieldAlert className="h-5 w-5" aria-hidden />
            红线：以下做法明确禁止
          </h2>
          <ul className="mt-3 space-y-2">
            {result.redLines.map((r) => (
              <li key={r} className="flex gap-2 rounded-lg bg-card p-3 text-sm leading-6 text-foreground/90">
                <AlertTriangle className="mt-1 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden />
                {r}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg">作业与评价调整建议</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {result.homeworkAdjustments.map((a) => (
              <li key={a} className="flex items-start gap-2 border-t border-hairline py-3.5 text-sm leading-6">
                <span aria-hidden className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {a}
              </li>
            ))}
          </ul>
        </section>

        <section>
          {/* 标题跟着强度走：禁止学生使用时出现「使用声明」这个标题本身就是错的 */}
          <h2 className="mb-3 text-lg">
            {input.intensity === '明确禁止' ? '配套的学生观察记录' : '配套的学生使用声明'}
          </h2>
          <CopyableText
            text={result.declaration}
            title={`${declarationTitle(input)}（可复制打印）`}
          />
          {input.intensity === '明确禁止' ? (
            <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs leading-5">
              你选了「明确禁止」，所以这里给的是观察记录而不是使用声明 ——
              既然不允许学生使用 AI，就不该让学生去签一份「我用了 AI」的声明。
              学生看教师演示并记录观察要点，是这个强度下合理的学习证据。
            </p>
          ) : null}
        </section>

        <p className="border-t pt-5 text-xs leading-6 text-muted-foreground">
          本工具是纯规则引擎（{eduPolicyRules.length} 条规则），不调用任何大模型 API：
          同样的三个条件永远得到同样的草案。规则本身也可以被质疑 ——
          发现某条规则与本校情况冲突，请通过
          <Link href="/edu/support" className="text-primary underline underline-offset-4">
            {' '}
            答疑与反馈
          </Link>{' '}
          提交，我们会修订规则并在简报中说明改动。
        </p>
      </div>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-2.5 py-1 text-xs transition-colors',
        active
          ? 'border-primary bg-primary/10 font-medium text-primary'
          : 'text-muted-foreground hover:border-primary/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}