'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ArrowLeft, Check, Copy, Sprout, Compass } from 'lucide-react'
import { useTutor } from '@/components/learning/use-tutor'
import { BeginnerTaskPractice } from '@/components/learning/beginner-task-practice'
import {
  beginnerTasks,
  beginnerTask,
  type BeginnerTaskId,
  type BeginnerEvidence,
} from '@/lib/beginner-tasks'
import {
  readLocal,
  saveLocal,
  rookieProgress,
  ROOKIE_KEY,
  EXPERIENCE_KEY,
} from '@/lib/onboarding-state'
import { copyText } from '@/lib/copy-text'
import { FormattedAnswer } from '@/components/assistant/formatted-answer'
import { readableAnswer } from '@/lib/answer-text'
import { useSiteModules } from '@/components/site-module-context'
import { pathEnabled } from '@/lib/site-modules'
import './onboarding.css'

export function FirstVisitExperience({ onClose }: { onClose: (today: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null),
    content = useRef<HTMLDivElement>(null),
    title = useRef<HTMLHeadingElement>(null)
  const router = useRouter(),
    { config } = useSiteModules()
  const [step, setStep] = useState<'choose' | 'practice' | 'map'>('choose'),
    [task, setTask] = useState<BeginnerTaskId>('todo'),
    [today, setToday] = useState(true),
    [evidence, setEvidence] = useState<BeginnerEvidence | null>(null),
    [copied, setCopied] = useState('')
  const tutor = useTutor(step === 'practice')
  useEffect(() => {
    const element = dialog.current,
      viewport = window.visualViewport
    function fit() {
      if (!element) return
      const height = viewport?.height ?? innerHeight,
        width = viewport?.width ?? innerWidth
      element.style.setProperty('--intro-height', height + 'px')
      element.style.setProperty('--intro-width', width + 'px')
      element.style.setProperty('--intro-top', (viewport?.offsetTop ?? 0) + height / 2 + 'px')
      element.style.setProperty('--intro-left', (viewport?.offsetLeft ?? 0) + width / 2 + 'px')
    }
    fit()
    viewport?.addEventListener('resize', fit)
    viewport?.addEventListener('scroll', fit)
    window.addEventListener('resize', fit)
    if (element && !element.open) element.showModal()
    return () => {
      viewport?.removeEventListener('resize', fit)
      viewport?.removeEventListener('scroll', fit)
      window.removeEventListener('resize', fit)
      element?.close()
    }
  }, [])
  useEffect(() => {
    content.current?.scrollTo({ top: 0 })
    title.current?.focus()
  }, [step])
  function close() {
    tutor.stop()
    onClose(today)
  }
  function finish(path: string) {
    tutor.stop()
    onClose(today)
    const url = new URL(path, location.href),
      preview = new URLSearchParams(location.search).get('design-preview')
    if (preview) url.searchParams.set('design-preview', preview)
    router.push(url.pathname + url.search)
  }
  function complete(value: BeginnerEvidence) {
    setEvidence(value)
    const progress = rookieProgress(readLocal(ROOKIE_KEY, {}))
    saveLocal(ROOKIE_KEY, { stage: 1, done: [...new Set([...progress.done, 0])] })
    setStep('map')
  }
  function chooseLevel(level: 'beginner' | 'experienced') {
    saveLocal(EXPERIENCE_KEY, { level })
    if (level === 'beginner') finish('/start/?task=' + task + '&from=intro')
    else {
      finish('/?guide=experienced')
      window.dispatchEvent(new Event('zhiya:experienced-guide'))
    }
  }
  const current = beginnerTask(task)
  return (
    <dialog
      ref={dialog}
      className="first-visit-dialog"
      aria-labelledby="intro-title"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <header>
        {/* eslint-disable-next-line @next/next/no-img-element -- Existing optimized local mascot. */}
        <img
          className="intro-sprout"
          src="/brand/desk-sprout-v2.webp"
          width="48"
          height="48"
          alt=""
        />
        <div>
          <small>小芽带你上手</small>
          <h2 id="intro-title" ref={title} tabIndex={-1}>
            {step === 'choose'
              ? '先试一件小事'
              : step === 'practice'
                ? '动手：' + current.label
                : '接下来，按你的基础继续'}
          </h2>
        </div>
        <button type="button" aria-label="关闭新手指引" onClick={close}>
          <X size={20} />
        </button>
      </header>
      <ol className="intro-progress" aria-label="上手进度">
        {['选一件事', '亲手试试', '选学习方式'].map((label, i) => (
          <li
            key={label}
            aria-current={['choose', 'practice', 'map'][i] === step ? 'step' : undefined}
          >
            <span>{i + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      <div className="intro-content" ref={content}>
        {step === 'choose' && (
          <>
            <p className="intro-purpose-line">
              <strong>写消息、做计划，先让 AI 帮你一次。</strong>
              <br />
              在这里先练一次，再找适合自己的工具。
            </p>
            <div className="intro-task-cards">
              {beginnerTasks.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => {
                    setTask(t.id)
                    setStep('practice')
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Reuse locally generated work scenes. */}
                  <img src={'/images/cases/' + t.cover + '.webp'} alt="" width="160" height="100" />
                  <span>
                    <strong>{t.label}</strong>
                    <small>{t.benefit}</small>
                    <b>
                      试一试 <ArrowRight size={15} />
                    </b>
                  </span>
                </button>
              ))}
            </div>
            <p className="intro-muted">不知道选哪项？先试“整理待办”。材料已经准备好了。</p>
          </>
        )}
        {step === 'practice' && (
          <>
            <button
              type="button"
              className="intro-back"
              disabled={tutor.busy}
              onClick={() => {
                tutor.stop()
                setStep('choose')
              }}
            >
              <ArrowLeft size={15} />
              换一件事
            </button>
            <BeginnerTaskPractice
              key={task}
              taskId={task}
              tutor={tutor}
              onComplete={complete}
              completeLabel="做完了，选择接下来的用法"
            />
          </>
        )}
        {step === 'map' && (
          <>
            <div className="intro-success">
              <Check size={22} />
              <div>
                <strong>
                  {evidence?.kind === 'example'
                    ? '你已完成一次示例练习。'
                    : '你已完成一次 AI 对话。'}
                </strong>
                <p>接下来想一步步学，还是自己探索？</p>
              </div>
            </div>
            {evidence && (
              <details className="intro-keepsake">
                <summary>保留刚才的{evidence.kind === 'example' ? '示例' : '回答'}</summary>
                <small>{evidence.kind === 'example' ? '本次教学示例' : '本次 AI 草稿'}</small>
                <FormattedAnswer text={evidence.output} />
                <button
                  type="button"
                  onClick={async (e) =>
                    setCopied(
                      (await copyText(
                        readableAnswer(
                          e.currentTarget.closest('details')?.querySelector('.answer-body'),
                          evidence.output,
                        ),
                      ))
                        ? '已复制'
                        : '请选中文字手动复制',
                    )
                  }
                >
                  <Copy size={15} />
                  {copied || '复制这份草稿'}
                </button>
              </details>
            )}
            <div className="intro-levels" aria-label="选择你的使用基础">
              {pathEnabled(config, '/start') && (
                <button className="intro-next-practice" onClick={() => chooseLevel('beginner')}>
                  <Sprout size={25} />
                  <strong>我是零基础</strong>
                  <span>继续一对一：提问、追问、检查回答。</span>
                  <b>
                    带着刚才的内容继续练 <ArrowRight size={16} />
                  </b>
                </button>
              )}
              <button onClick={() => chooseLevel('experienced')}>
                <Compass size={25} />
                <strong>我有一些基础</strong>
                <span>回首页，试试选工具、做对比、找案例。</span>
                <b>
                  回首页，边用边了解 <ArrowRight size={16} />
                </b>
              </button>
            </div>
            <p className="intro-muted">没听懂的地方，可以点页面上的小芽继续问。</p>
          </>
        )}
      </div>
      <footer>
        <label>
          <input type="checkbox" checked={today} onChange={(e) => setToday(e.target.checked)} />
          今天不再提示
        </label>
        <button type="button" onClick={close}>
          {step === 'map' ? '先自己逛逛' : '稍后再试'}
        </button>
      </footer>
    </dialog>
  )
}
