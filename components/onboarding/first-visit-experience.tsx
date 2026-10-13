'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ArrowDown, Sparkles, LoaderCircle, Send } from 'lucide-react'
import { useTutor } from '@/components/learning/use-tutor'
import './onboarding.css'

const FIRST_MESSAGE = '你好！我是 AI 新手，请推荐一个今天就能用上的 AI 小技巧。'
const EXAMPLE =
  '你可以让 AI 把一段杂乱的笔记整理成待办清单。试着告诉它：“把下面的笔记整理成三条待办，每条写清要做什么。”发出消息后，先检查结果，再修改使用。'
const QUICK_TASKS = [
  {
    label: '整理待办',
    prompt:
      '请把这段练习笔记整理成三条待办，80 字以内：周五下午四点开教研会，每位老师带一个案例，会议室要提前确认。不确定的信息标【待核对】。',
  },
  {
    label: '起草通知',
    prompt:
      '请写一段 80 字以内的教研通知：本周五下午四点，学校会议室，每位老师带一个备课案例。不要新增具体日期或联系人。',
  },
  {
    label: '学习作图',
    prompt:
      '我要画一株教室窗边的小绿植。请给一条 60 字以内的作图描述，含主体、场景和风格。只写提示词，不声称已生成图片。',
  },
]
type Stage = 'input' | 'send' | 'answer' | 'choose'

export function FirstVisitExperience({ onClose }: { onClose: (today: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const request = useRef({ id: 0 })
  const router = useRouter()
  const tutor = useTutor()
  const [stage, setStage] = useState<Stage>('input')
  const [today, setToday] = useState(false)
  const [prompt, setPrompt] = useState(FIRST_MESSAGE)
  const [answer, setAnswer] = useState('')
  const [kind, setKind] = useState('')
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    const element = dialog.current
    const activeRequest = request.current
    const viewport = window.visualViewport
    function fitViewport() {
      if (!element) return
      const height = viewport?.height ?? window.innerHeight
      const width = viewport?.width ?? window.innerWidth
      element.style.setProperty('--intro-height', `${height}px`)
      element.style.setProperty('--intro-width', `${width}px`)
      element.style.setProperty('--intro-top', `${(viewport?.offsetTop ?? 0) + height / 2}px`)
      element.style.setProperty('--intro-left', `${(viewport?.offsetLeft ?? 0) + width / 2}px`)
    }
    fitViewport()
    viewport?.addEventListener('resize', fitViewport)
    viewport?.addEventListener('scroll', fitViewport)
    window.addEventListener('resize', fitViewport)
    if (element && !element.open) element.showModal()
    return () => {
      activeRequest.id++
      viewport?.removeEventListener('resize', fitViewport)
      viewport?.removeEventListener('scroll', fitViewport)
      window.removeEventListener('resize', fitViewport)
      element?.close()
    }
  }, [])

  function chooseRoute(skip = false) {
    request.current.id++
    tutor.stop()
    setSkipped(skip)
    setStage('choose')
  }
  function finish(path: string) {
    request.current.id++
    tutor.stop()
    onClose(today)
    router.push(path)
  }
  function skipOrClose() {
    request.current.id++
    tutor.stop()
    onClose(today)
  }
  async function generate() {
    if (stage === 'choose' || !tutor.ready || tutor.busy || !prompt.trim()) return
    const id = ++request.current.id
    setAnswer('')
    setKind('正在回答…')
    try {
      await tutor.run(prompt, (text) => {
        if (id === request.current.id) setAnswer((previous) => previous + text)
      })
      if (id === request.current.id) {
        setKind('实时 AI 回答')
        setStage('answer')
      }
    } catch {
      if (id === request.current.id) {
        setKind('回答未完成')
        setStage('answer')
      }
    }
  }
  function example() {
    request.current.id++
    tutor.stop()
    setAnswer(EXAMPLE)
    setKind('教学示例 · 未调用模型')
    setStage('answer')
  }
  const guide = tutor.busy
    ? '正在回答，文字会一点点出现。随时可以点 × 跳过。'
    : tutor.error && !answer
      ? '暂未收到完整回答。可以换个模型、查看示例，或跳过练习。'
      : stage === 'input'
        ? '① 点下面的输入框。直接用这句话，或者改成你想问的内容。'
        : stage === 'send'
          ? '② 点亮起的“发送消息”，把这句话交给 AI。'
          : '③ 看看 AI 的回答，再选择适合你的学习路线。'

  return (
    <dialog
      ref={dialog}
      className="first-visit-dialog"
      aria-label="新手动手指引"
      onCancel={(event) => {
        event.preventDefault()
        skipOrClose()
      }}
    >
      <style>{`.intro-task-chips{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.intro-task-chips button{border:1px solid hsl(var(--border));border-radius:20px;background:hsl(var(--accent));color:hsl(var(--foreground));padding:8px 14px;min-height:44px}.intro-task-chips button:focus-visible{outline:2px solid hsl(var(--primary));outline-offset:3px}`}</style>
      <style>{`.intro-scene{display:flex;align-items:center;gap:16px;border-radius:12px;background:hsl(var(--accent));overflow:hidden;margin:12px 0}.intro-scene img{width:96px;height:72px;object-fit:cover}.intro-scene p{font-size:14px;line-height:1.7;margin:0;padding:8px 12px 8px 0}`}</style>
      <header>
        <span className="intro-mark">
          <Sparkles size={20} />
        </span>
        <div>
          <small>{stage === 'choose' ? '按你的起点出发' : '小芽带你试一次 · 约 1 分钟'}</small>
          <h2>{stage === 'choose' ? '选一条适合你的学习路线' : '欢迎，先和 AI 聊一句吧'}</h2>
        </div>
        <button type="button" aria-label="关闭新手指引" onClick={skipOrClose}>
          <X size={20} />
        </button>
      </header>
      <div className="intro-content">
        {stage === 'choose' ? (
          <>
            <p className="intro-muted">
              {skipped ? '已跳过快速练习。' : '第一步就这么简单。'}之后随时可以在“教程”里继续学。
            </p>
            <div className="intro-choices">
              <button onClick={() => finish('/start/')}>
                <span aria-hidden="true">🌱</span>
                <h3>我是新手，零基础</h3>
                <p>从对话、图片到语音，小芽手把手带你练习。</p>
                <strong>
                  进入零基础教程 <ArrowRight size={16} />
                </strong>
              </button>
              <button onClick={() => finish('/')}>
                <span aria-hidden="true">🧭</span>
                <h3>我了解过一些 AI 知识</h3>
                <p>直接浏览工具、教程和案例，按需要探索。</p>
                <strong>
                  进入首页 <ArrowRight size={16} />
                </strong>
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="intro-purpose-line">
              <span>找 AI 工具、学方法、完成教学和工作任务。</span>无需注册，打开就能学。
            </p>
            <div className="intro-scene">
              {/* eslint-disable-next-line @next/next/no-img-element -- Optimized local teaching scene. */}
              <img
                src="/images/cases/campus-notice.webp"
                alt="把零散资料整理成通知的场景插画"
                width="96"
                height="72"
              />
              <p>
                <strong>一段材料 → 一份短草稿 → 你来核对</strong>
                <br />
                选一件小事，试着把要求说清楚。
              </p>
            </div>
            <div className="intro-guide" role="status">
              <span>{guide}</span>
              {stage !== 'answer' && !tutor.busy && <ArrowDown size={18} aria-hidden="true" />}
            </div>
            <div className="intro-task-chips" aria-label="选择一个小任务">
              {QUICK_TASKS.map((task) => (
                <button
                  key={task.label}
                  disabled={tutor.busy}
                  onClick={() => {
                    setPrompt(task.prompt)
                    setAnswer('')
                    setStage('send')
                    tutor.setError('')
                    input.current?.focus()
                  }}
                >
                  {task.label}
                </button>
              ))}
            </div>
            <label className="intro-input-label" data-spotlight={stage === 'input'}>
              你发给 AI 的话
              <textarea
                ref={input}
                aria-label="第一条对话消息"
                aria-describedby="intro-prompt-help"
                value={prompt}
                maxLength={1000}
                disabled={tutor.busy}
                onFocus={() => {
                  if (stage === 'input') setStage('send')
                }}
                onChange={(event) => {
                  setPrompt(event.target.value)
                  setAnswer('')
                  tutor.setError('')
                  setStage('send')
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                    event.preventDefault()
                    void generate()
                  }
                }}
              />
            </label>
            <p id="intro-prompt-help" className="intro-muted">
              “提示词”就是你发给 AI 的要求，像平时聊天一样写。
            </p>
            <div className="intro-actions">
              <button
                className="intro-primary"
                data-spotlight={stage === 'send' && !tutor.busy}
                disabled={!tutor.ready || tutor.busy || !prompt.trim()}
                onClick={() => void generate()}
              >
                {tutor.busy ? (
                  <LoaderCircle size={16} className="intro-spin" />
                ) : (
                  <Send size={16} />
                )}
                {tutor.busy
                  ? `正在回答 · ${tutor.elapsed} 秒`
                  : tutor.error
                    ? '重试发送'
                    : '发送消息'}
              </button>
              {tutor.busy && <button onClick={tutor.stop}>停止生成</button>}
              {stage === 'input' && (
                <button onClick={() => input.current?.focus()}>直接用这句话</button>
              )}
            </div>
            <small className="intro-muted">
              {tutor.ready
                ? `免费体验 · ${tutor.current?.name} · 点击发送才会调用模型。`
                : '免费 AI 连接暂不可用。可以先看对话示例，或跳过练习。'}
            </small>
            {answer && (
              <article className="intro-output" aria-label="AI 对话回答">
                <small>{kind}</small>
                <p>{answer}</p>
              </article>
            )}
            {tutor.error && (
              <div className="intro-status">
                <p role="status">{tutor.error}</p>
                <label className="intro-input-label">
                  换一个免费模型试试
                  <select
                    aria-label="更换体验免费模型"
                    value={tutor.model}
                    disabled={tutor.busy}
                    onChange={(event) => {
                      tutor.setModel(event.target.value)
                      tutor.setError('')
                      setAnswer('')
                      setStage('send')
                    }}
                  >
                    {tutor.catalog?.models
                      .filter(
                        (model) => model.available && tutor.catalog?.connected[model.provider],
                      )
                      .map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )}
            {!tutor.busy && (
              <button className="intro-example" onClick={example}>
                先看对话示例
              </button>
            )}
            {tutor.busy && tutor.elapsed >= 12 && (
              <p className="intro-muted" role="status">
                当前免费通道等待较久。可以停止后看示例，或者直接选择学习路线。
              </p>
            )}
            {stage === 'answer' && answer && (
              <p className="intro-muted intro-takeaway">
                可以继续追问、补充要求。使用前先核对；页面上的小芽也能陪你练习。
              </p>
            )}
          </>
        )}
      </div>
      <footer>
        <label>
          <input
            type="checkbox"
            checked={today}
            onChange={(event) => setToday(event.target.checked)}
          />
          今天不再弹出
        </label>
        {stage !== 'choose' &&
          (stage === 'answer' && answer && !tutor.busy ? (
            <button className="intro-primary" onClick={() => chooseRoute()}>
              选择我的学习路线 <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={() => chooseRoute(true)}>
              跳过，选择学习路线 <ArrowRight size={16} />
            </button>
          ))}
      </footer>
    </dialog>
  )
}
