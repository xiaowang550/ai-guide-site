'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BriefcaseBusiness, GraduationCap, RotateCcw, ShieldCheck } from 'lucide-react'
import {
  labSteps,
  walkthrough,
  type LabIssue,
  type LabScenario,
} from '@/lib/learning/agent-walkthrough'

export function AgentLab() {
  const [scenario, setScenario] = useState<LabScenario>('office')
  const [issue, setIssue] = useState<LabIssue>('normal')
  const [stage, setStage] = useState(0)
  const state = walkthrough(scenario, issue, stage)
  function changeScenario(value: LabScenario) {
    setScenario(value)
    setStage(0)
  }
  return (
    <section className="agent-lab" aria-labelledby="agent-lab-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">用一份材料，走一遍过程</p>
          <h2 id="agent-lab-title" className="mt-2 text-xl">
            Agent 到底在哪一步做判断？
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            虚构材料的交互走读。看懂顺序和失败处理，再到你选用的工具中实践。
          </p>
        </div>
        <div className="concept-scene-tabs" role="group" aria-label="选择走读场景">
          <button
            type="button"
            aria-pressed={scenario === 'office'}
            onClick={() => changeScenario('office')}
          >
            <BriefcaseBusiness className="h-4 w-4" aria-hidden />
            会议待办
          </button>
          <button
            type="button"
            aria-pressed={scenario === 'school'}
            onClick={() => changeScenario('school')}
          >
            <GraduationCap className="h-4 w-4" aria-hidden />
            校内通知
          </button>
        </div>
      </div>
      <div className="agent-lab-controls">
        <label htmlFor="agent-lab-issue">换一种情况</label>
        <select
          id="agent-lab-issue"
          value={issue}
          onChange={(event) => {
            setIssue(event.target.value as LabIssue)
            setStage(0)
          }}
        >
          <option value="normal">材料齐全</option>
          <option value="missing">资料有缺项</option>
          <option value="tool-failed">工具读取失败</option>
          <option value="injected">资料夹带额外指令</option>
        </select>
        <span className="text-xs text-muted-foreground">只读指定资料 · 先出草稿 · 再人工核对</span>
      </div>
      <ol className="agent-lab-steps" aria-label="走读步骤">
        {labSteps.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              aria-current={stage === index ? 'step' : undefined}
              disabled={issue === 'tool-failed' && index > 2}
              onClick={() => setStage(index)}
            >
              <span>{index + 1}</span>
              {label}
            </button>
            {index < 4 && <ArrowRight className="h-4 w-4 text-primary/40" aria-hidden />}
          </li>
        ))}
      </ol>
      <div className={`agent-lab-panels ${stage > 0 ? 'has-result' : ''}`}>
        <div>
          <p className="text-xs font-medium text-primary">这次的材料 · {state.title}</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7">{state.input}</p>
        </div>
        <div aria-live="polite" aria-atomic="true">
          <p className="text-xs font-medium text-primary">
            第 {stage + 1} 步 · {labSteps[stage]}
          </p>
          <p className="mt-3 text-sm leading-7">{state.note}</p>
          {stage === 2 && (
            <p className="mt-3 rounded-lg bg-muted/60 px-3 py-2 text-xs">获准工具：{state.tool}</p>
          )}
          {stage >= 3 && issue !== 'tool-failed' && (
            <div className="mt-4 overflow-x-auto">
              <table className="agent-lab-table">
                <caption className="sr-only">{state.title} · 练习结果</caption>
                <thead>
                  <tr>
                    <th>事项</th>
                    <th>相关人／地点</th>
                    <th>时间／核对要求</th>
                  </tr>
                </thead>
                <tbody>
                  {state.rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((value, i) => (
                        <td key={i}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={`agent-lab-status ${state.stopped ? 'is-paused' : ''}`}>
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden />
            {state.status}
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-3">
          <button
            type="button"
            className="home-button"
            disabled={!state.canNext}
            onClick={() => setStage((value) => value + 1)}
          >
            {state.stopped ? '先处理失败' : stage === 4 ? '走读完成' : '看下一步'}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            onClick={() => setStage(0)}
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            从头看
          </button>
        </div>
        <Link href="/guides/agent-first-workflow" className="section-link">
          带着任务单做完整练习 →
        </Link>
      </div>
    </section>
  )
}
