'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, HelpCircle, ShieldAlert, ArrowRight } from 'lucide-react'
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

export function PolicyGenerator() {
  const [stage, setStage] = useState<EduStage>('初中')
  const [subject, setSubject] = useState<EduSubject>('通用')
  const [intensity, setIntensity] = useState<EduIntensity>('仅教师可用')
  const input = useMemo(() => ({ stage, subject, intensity }), [stage, subject, intensity])
  const result = useMemo(() => generatePolicy(input), [input])
  const observation = intensity === '仅教师可用' || intensity === '明确禁止'
  const declaration = result.declaration
  const policyText = [
    `${stage} · ${subject} · ${intensity}`,
    ...result.sections.map(
      (section) => `${section.title}\n${section.items.map((item) => `• ${item}`).join('\n')}`,
    ),
    `禁止事项\n${result.redLines.map((item) => `• ${item}`).join('\n')}`,
    `作业与评价\n${result.homeworkAdjustments.map((item) => `• ${item}`).join('\n')}`,
  ].join('\n\n')
  return (
    <div>
      <section className="school-policy-controls print:hidden" aria-label="生成规范的条件">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base">第一步：确定课堂的使用范围</h2>
          <span className="text-xs text-muted-foreground">初中建议从教师演示开始</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            学段
            <select
              value={stage}
              onChange={(event) => setStage(event.target.value as EduStage)}
              className="mt-2 block w-full rounded-xl border bg-background p-3"
            >
              {STAGE_LABELS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            学科
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value as EduSubject)}
              className="mt-2 block w-full rounded-xl border bg-background p-3"
            >
              {SUBJECT_OPTIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            谁可以使用
            <select
              value={intensity}
              onChange={(event) => setIntensity(event.target.value as EduIntensity)}
              className="mt-2 block w-full rounded-xl border bg-background p-3"
            >
              {INTENSITY_OPTIONS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>
      </section>
      <section className="mt-8" aria-live="polite">
        <h2 className="mb-4 text-xl">第二步：用三个场景看懂边界</h2>
        <div className="school-safety-map">
          <div>
            <CheckCircle2 className="mb-3 h-6 w-6 text-primary" aria-hidden />
            <h3 className="text-base">可以这样做</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {observation
                ? '教师展示公开材料的 AI 示例；学生用纸面观察单找依据、提问题。'
                : '在教师规定范围内辅助提纲、解释或练习；保留自己的初稿、核查与修改记录。'}
            </p>
            <p className="mt-3 text-xs font-medium text-primary">
              {observation ? '例：对照课文核查一份摘要' : '例：改提纲后，独立写出论证段'}
            </p>
          </div>
          <div>
            <HelpCircle className="mb-3 h-6 w-6 text-amber-600 dark:text-amber-300" aria-hidden />
            <h3 className="text-base">先向教师确认</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              确认任务是否允许、哪一部分必须独立完成、是否需要账号，以及学校和工具的使用条件。
            </p>
            <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
              例：研究作业能否用 AI 整理思路
            </p>
          </div>
          <div>
            <ShieldAlert className="mb-3 h-6 w-6 text-danger" aria-hidden />
            <h3 className="text-base">不可以这样做</h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              上传可识别的学生与家庭信息；把没有核实的内容当事实；把 AI 代写冒充独立完成。
            </p>
            <p className="mt-3 text-xs font-medium text-danger">例：上传班级成绩名单让工具排名</p>
          </div>
        </div>
        {result.fallbacks.length > 0 && (
          <div className="mt-4 rounded-xl bg-amber-500/10 p-4 text-sm leading-6">
            {result.fallbacks.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        )}
      </section>
      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-xl">第三步：带走可讨论的草案</h2>
          <p className="mb-4 mt-2 text-sm leading-6 text-muted-foreground">
            供教研组结合本校安排确认后使用。当前：{stage} · {subject} · {intensity}。
          </p>
          <details className="school-details">
            <summary>查看完整规范与禁止事项</summary>
            {result.sections.map((section) => (
              <div key={section.title} className="mb-5">
                <h3 className="text-sm font-semibold">{section.title}</h3>
                <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
            <h3 className="mb-2 text-sm font-semibold text-danger">以下做法明确禁止</h3>
            <ul className="space-y-2 text-sm leading-6">
              {result.redLines.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
          <details className="school-details mt-4" data-print-hide>
            <summary>复制整份草案</summary>
            <CopyableText text={policyText} label="复制规范草案" />
          </details>
          <details className="school-details mt-4">
            <summary>作业与评价怎么调整</summary>
            <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
              {result.homeworkAdjustments.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        </div>
        <div>
          <h2 className="mb-3 text-xl">
            {input.intensity === '明确禁止'
              ? '配套的学生观察记录'
              : observation
                ? '配套的学生观察记录'
                : '配套的学生使用声明'}
          </h2>
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            {observation
              ? '只观察教师演示时，记录发现和依据，无需填写本人使用了什么工具。'
              : '记录辅助范围、核查依据和独立完成的部分。'}
          </p>
          <CopyableText
            text={declaration}
            title={declarationTitle(input)}
            label={observation ? '复制观察记录' : '复制使用声明'}
          />
        </div>
      </section>
      <details className="school-details mt-8">
        <summary>查看草案采用的规则依据</summary>
        <ul className="space-y-2 text-xs leading-6 text-muted-foreground">
          {result.matchedRuleIds.map((id) => (
            <li key={id}>{eduPolicyRules.find((rule) => rule.id === id)?.label ?? id}</li>
          ))}
        </ul>
      </details>
      <Link href="/edu/toolkits" className="section-link mt-7">
        找到对应的课堂教案
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}
