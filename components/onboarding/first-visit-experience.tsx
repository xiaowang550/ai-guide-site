'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, Sparkles, LoaderCircle } from 'lucide-react'
import { useTutor } from '@/components/learning/use-tutor'
import { SIMPLE_PROMPT, CLEAR_PROMPT, SAMPLE_RESULTS } from '@/components/learning/prompt-samples'
import './onboarding.css'
export function FirstVisitExperience({
  onClose,
}: {
  onClose: (today: boolean, completed: boolean) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    router = useRouter(),
    tutor = useTutor()
  const [step, setStep] = useState(0),
    [today, setToday] = useState(false),
    [prompts, setPrompts] = useState([SIMPLE_PROMPT, CLEAR_PROMPT]),
    [results, setResults] = useState(['', '']),
    [kinds, setKinds] = useState(['', ''])
  useEffect(() => {
    const element = dialog.current
    if (element && !element.open) element.showModal()
    return () => element?.close()
  }, [])
  function close(completed = false) {
    tutor.stop()
    onClose(today, completed)
  }
  async function generate(index: number) {
    setResults((old) => old.map((r, i) => (i === index ? '' : r)))
    setKinds((old) => old.map((r, i) => (i === index ? '生成中' : r)))
    try {
      await tutor.run(prompts[index], (text) =>
        setResults((old) => old.map((r, i) => (i === index ? r + text : r))),
      )
      setKinds((old) => old.map((r, i) => (i === index ? '实时模型回答' : r)))
    } catch {
      setKinds((old) => old.map((r, i) => (i === index ? '回答未完成' : r)))
    }
  }
  function example(index: number) {
    tutor.stop()
    setPrompts((old) => old.map((p, i) => (i === index ? [SIMPLE_PROMPT, CLEAR_PROMPT][index] : p)))
    setResults((old) => old.map((r, i) => (i === index ? SAMPLE_RESULTS[index] : r)))
    setKinds((old) => old.map((r, i) => (i === index ? '教学示例 · 未调用模型' : r)))
  }
  return (
    <dialog
      ref={dialog}
      className="first-visit-dialog"
      aria-label="一分钟认识本站"
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
    >
      <header>
        <span className="intro-mark">
          <Sparkles size={20} />
        </span>
        <div>
          <small>从一件小事开始 · 约 1 分钟</small>
          <h2>{step < 4 ? '这个网站，能帮你做什么？' : '选一条适合你的路线'}</h2>
        </div>
        <button type="button" aria-label="关闭首次教学" onClick={() => close()}>
          <X size={20} />
        </button>
      </header>
      <div className="intro-progress" aria-label={`第 ${Math.min(step + 1, 4)} / 4 步`}>
        {['先发一句话', '补充要求', '看看差别', '认识本站'].map((label, i) => (
          <span key={label} data-active={i <= step}>
            {i + 1} {label}
          </span>
        ))}
      </div>
      <div className="intro-content">
        {step < 2 ? (
          <>
            <p className="intro-eyebrow">
              {step === 0 ? '01 · 手把手发出第一条消息' : '02 · 让 AI 少猜一点'}
            </p>
            <h3>
              {step === 0 ? '先告诉 AI：你想做什么。' : '再说清：给谁看、有哪些信息、要什么格式。'}
            </h3>
            <p className="intro-muted">
              {step === 0
                ? '下面这句话就是“提示词”。可以直接发，也可以改成你的任务。'
                : '不用术语。把这三个条件补进去，看看回答会怎么变。'}
            </p>
            {step === 1 && (
              <div className="intro-chips">
                <span>给高中教师看</span>
                <span>时间地点已知</span>
                <span>80–120 字 · 三部分</span>
              </div>
            )}
            <label className="intro-input-label">
              你发给 AI 的话
              <textarea
                aria-label={step === 0 ? '一句话提示词' : '详细提示词'}
                value={prompts[step]}
                maxLength={1000}
                disabled={tutor.busy}
                onChange={(e) =>
                  setPrompts((old) => old.map((p, i) => (i === step ? e.target.value : p)))
                }
              />
            </label>
            <div className="intro-actions">
              <button
                className="intro-primary"
                disabled={!tutor.ready || tutor.busy || !prompts[step].trim()}
                onClick={() => void generate(step)}
              >
                {tutor.busy ? (
                  <>
                    <LoaderCircle size={16} className="intro-spin" />
                    正在生成…
                  </>
                ) : step === 0 ? (
                  '发送第一句话'
                ) : (
                  '发送详细要求'
                )}
              </button>
              {tutor.busy && <button onClick={tutor.stop}>停止生成</button>}
              <button disabled={tutor.busy} onClick={() => example(step)}>
                先看教学示例
              </button>
            </div>
            <small className="intro-muted">
              {tutor.ready
                ? `当前模型：${tutor.current?.name}。点击发送才会使用免费体验次数，两份回答共两次。`
                : 'AI 连接准备中，也可以先看明确标注的教学示例。'}
            </small>
            {results[step] && (
              <article className="intro-output">
                <small>{kinds[step]}</small>
                <p>{results[step]}</p>
              </article>
            )}
            {tutor.error && (
              <p role="status" className="intro-status">
                {tutor.error}
              </p>
            )}
          </>
        ) : step === 2 ? (
          <>
            <p className="intro-eyebrow">03 · 同一个任务，比较两种问法</p>
            <h3>要求越清楚，越容易拿到能用的结果。</h3>
            <div className="intro-compare">
              {results.map((text, i) => (
                <article key={i} data-clear={i === 1}>
                  <h4>{i === 0 ? '只说一句话' : '补充了具体要求'}</h4>
                  <small>{kinds[i]}</small>
                  <p>{text || '这一份还未生成，可以返回上一步试试。'}</p>
                </article>
              ))}
            </div>
            <div className="intro-chips">
              <span>有没有编造？</span>
              <span>格式是否清楚？</span>
              <span>能否直接修改使用？</span>
            </div>
            <p className="intro-muted">
              结果由模型或已标注示例展示；详细问法也需要核对，不保证每次都更好。
            </p>
          </>
        ) : step === 3 ? (
          <>
            <p className="intro-eyebrow">04 · 把小技巧带回真实任务</p>
            <h3>本站帮你认识 AI，也帮你真正用起来。</h3>
            <div className="intro-purpose">
              <article>
                <span>↗</span>
                <h4>找工具</h4>
                <p>按任务比较能力，知道适合用谁。</p>
              </article>
              <article>
                <span>◎</span>
                <h4>学方法</h4>
                <p>从零基础到提示词、图片和语音练习。</p>
              </article>
              <article>
                <span>▤</span>
                <h4>做成事</h4>
                <p>参考教学和工作案例，做出能修改的成品。</p>
              </article>
            </div>
            <p className="intro-muted">无需本站账号。小芽可以陪你提问、练习和找资料。</p>
          </>
        ) : (
          <>
            <p className="intro-muted">
              没有入学门槛。按你现在的情况选择，之后还能在“教程”里切换。
            </p>
            <div className="intro-choices">
              <button
                onClick={() => {
                  close(true)
                  router.push('/start/')
                }}
              >
                <span>🌱</span>
                <h3>我是新手，零基础</h3>
                <p>小芽从第一条消息开始，陪你一步一步做。</p>
                <strong>进入零基础一对一 →</strong>
              </button>
              <button
                onClick={() => {
                  close(true)
                  router.push('/')
                }}
              >
                <span>🧭</span>
                <h3>我已经了解过 AI</h3>
                <p>直接浏览工具、教程和案例，按需要探索。</p>
                <strong>去首页自由探索 →</strong>
              </button>
            </div>
          </>
        )}
      </div>
      <footer>
        <label>
          <input type="checkbox" checked={today} onChange={(e) => setToday(e.target.checked)} />
          今天不再弹出
        </label>
        <div>
          {step > 0 && step < 4 && (
            <button disabled={tutor.busy} onClick={() => setStep(step - 1)}>
              上一步
            </button>
          )}
          {step < 4 && (
            <button
              className="intro-primary"
              disabled={tutor.busy || (step < 2 && !results[step])}
              onClick={() => setStep(step + 1)}
            >
              {step === 0
                ? '再试详细的问法'
                : step === 1
                  ? '并排看看差别'
                  : step === 2
                    ? '本站还能做什么'
                    : '选择我的学习路线'}
              <ArrowRight size={16} />
            </button>
          )}
        </div>
      </footer>
    </dialog>
  )
}
