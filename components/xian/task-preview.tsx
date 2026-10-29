'use client'

import { useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Code2,
  FileText,
  MessageSquare,
  Sparkles,
} from 'lucide-react'

const examples = [
  {
    title: '写一条消息',
    icon: MessageSquare,
    label: '日常沟通',
    material: '明天下午三点，三楼会议室，讨论产品发布。大家带一下各自的进展。',
    request: '给同事写一条会议提醒，语气自然，80 字以内。保留时间、地点和准备事项。',
    output: [
      '大家好，明天下午 3 点在三楼会议室讨论产品发布。请带上各自的最新进展，我们一起对齐下一步安排。',
    ],
    note: '零散信息 → 可以直接发送的消息',
  },
  {
    title: '整理会议记录',
    icon: FileText,
    label: '信息整理',
    material: '虚构项目记录：小林周三交设计，小陈周五给技术排期。预算还没定，下次会议再议。',
    request: '把记录整理成行动清单，分别列出任务、负责人、时间。没确定的事项单独列出，不补写信息。',
    output: ['设计稿 · 小林 · 周三', '技术排期 · 小陈 · 周五', '待确认：预算，下次会议讨论'],
    note: '一段记录 → 三条清楚的行动项',
  },
  {
    title: '做一个小网页',
    icon: Code2,
    label: '动手创作',
    material: '想做一个待办清单，可以添加、勾选和删除任务。先不用登录，也不用服务器。',
    request:
      '用原生 HTML、CSS 和 JavaScript 做待办清单。给出一个可保存为 HTML 并直接打开的完整例子，说明怎么使用。',
    output: ['添加一条任务', '完成一件小事', '把想法变成作品'],
    note: '一句需求 → 一个能操作的界面',
  },
]

export function TaskPreview({ onLaunch }: { onLaunch: (prompt: string, mode: number) => void }) {
  const [selected, setSelected] = useState(0),
    [stage, setStage] = useState(0)
  const [done, setDone] = useState<number[]>([])
  const example = examples[selected]
  return (
    <section className="x-starter-strip x-task-demo" aria-label="快速开始">
      <div className="xdp-heading">
        <span className="x-eyebrow">
          <Sparkles size={13} /> 从一件小事开始
        </span>
        <h2>
          AI 能做什么？
          <br />
          <span>点开，看看。</span>
        </h2>
        <p>选一个场景，走一遍从材料到结果的过程。</p>
        <div className="xdp-scenarios" aria-label="选择演示场景">
          {examples.map((item, i) => (
            <button
              key={item.title}
              aria-pressed={selected === i}
              onClick={() => {
                setSelected(i)
                setStage(0)
                setDone([])
              }}
            >
              <item.icon size={16} />
              <span>{item.title}</span>
              <ArrowUpRight size={15} />
            </button>
          ))}
        </div>
      </div>
      <div className="xdp-device" data-stage={stage}>
        <div className="xdp-device-head">
          <span>
            <i /> 互动示例
          </span>
          <small>
            {example.label} / 0{selected + 1}
          </small>
        </div>
        <div className="xdp-steps" aria-label="演示步骤">
          {['看材料', '加要求', '看示例'].map((label, i) => (
            <button key={label} aria-pressed={stage === i} onClick={() => setStage(i)}>
              <span>{stage > i ? <Check size={12} /> : i + 1}</span>
              {label}
            </button>
          ))}
        </div>
        <div className="xdp-screen" key={`${selected}-${stage}`}>
          <div className="xdp-paper-label">
            <span>
              {stage === 0
                ? '你手里的材料'
                : stage === 1
                  ? '告诉 AI 你想怎么做'
                  : '整理后，可以是这样'}
            </span>
            <small>{stage === 2 ? '示例结果' : 'INPUT'}</small>
          </div>
          {stage < 2 ? (
            <p className="xdp-paper-text">{stage === 0 ? example.material : example.request}</p>
          ) : selected === 2 ? (
            <div className="xdp-todo" aria-label="待办界面示例">
              {example.output.map((text, i) => (
                <button
                  key={text}
                  aria-pressed={done.includes(i)}
                  onClick={() =>
                    setDone((old) => (old.includes(i) ? old.filter((n) => n !== i) : [...old, i]))
                  }
                >
                  <span>{done.includes(i) && <Check size={13} />}</span>
                  <span>{text}</span>
                </button>
              ))}
              <small>试着勾选一项，体验这个界面。</small>
            </div>
          ) : (
            <div className="xdp-results">
              {example.output.map((line, i) => (
                <p key={line}>
                  <span>{selected === 1 ? `0${i + 1}` : '↗'}</span>
                  {line}
                </p>
              ))}
            </div>
          )}
          <div className="xdp-paper-foot">
            <span className="xdp-orbit-symbol" aria-hidden="true">
              ✳
            </span>
            <span>{example.note}</span>
          </div>
        </div>
        <div className="xdp-controls">
          <p>示例演示，亲自试试会打开真实 AI。</p>
          {stage < 2 ? (
            <button className="xdp-next" onClick={() => setStage(stage + 1)}>
              下一步 <ArrowRight size={16} />
            </button>
          ) : (
            <button
              className="x-button"
              onClick={() => onLaunch(`${example.request}\n\n材料：${example.material}`, selected)}
            >
              亲自试试 <ArrowUpRight size={16} />
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
