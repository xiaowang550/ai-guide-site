'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, ArrowRight, ArrowDown, Sparkles, LoaderCircle, Send } from 'lucide-react'
import { useTutor } from '@/components/learning/use-tutor'
import './onboarding.css'

const FIRST_MESSAGE = '你好！我是 AI 新手，请推荐一个今天就能用上的 AI 小技巧。'
const EXAMPLE =
  '你可以让 AI 把一段杂乱的笔记整理成待办清单。试着告诉它：“把下面的笔记整理成三条待办，每条写清要做什么。”发出消息后，先检查结果，再修改使用。'
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
    if (stage === 'choose') finish('/')
    else chooseRoute(true)
  }
  async function generate() {
    if (stage !== 'send' || !tutor.ready || tutor.busy || !prompt.trim()) return
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
      <header>
        <span className="intro-mark">
          <Sparkles size={20} />
        </span>
        <div>
          <small>{stage === 'choose' ? '按你的起点出发' : '小芽带你试一次 · 约 1 分钟'}</small>
          <h2>{stage === 'choose' ? '选一条适合你的学习路线' : '欢迎，先和 AI 聊一句吧'}</h2>
        </div>
        <button
          type="button"
          aria-label={stage === 'choose' ? '关闭路线选择，进入首页' : '跳过新手指引，选择学习路线'}
          onClick={skipOrClose}
        >
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
              这里帮你<span>找 AI 工具、学使用方法、完成教学和工作任务</span>
              。无需本站账号，打开就能学。
            </p>
            <div className="intro-guide" role="status">
              <span>{guide}</span>
              {stage !== 'answer' && !tutor.busy && <ArrowDown size={18} aria-hidden="true" />}
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
              这句话就叫“提示词”。像平时聊天一样，说清楚你想做什么。
            </p>
            <div className="intro-actions">
              <button
                className="intro-primary"
                data-spotlight={stage === 'send' && !tutor.busy}
                disabled={stage !== 'send' || !tutor.ready || tutor.busy || !prompt.trim()}
                onClick={() => void generate()}
              >
                {tutor.busy ? (
                  <LoaderCircle size={16} className="intro-spin" />
                ) : (
                  <Send size={16} />
                )}
                {tutor.busy ? '正在回答…' : '发送消息'}
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
            {(!tutor.ready || tutor.error) && !tutor.busy && (
              <button className="intro-example" onClick={example}>
                先看对话示例
              </button>
            )}
            {stage === 'answer' && answer && (
              <p className="intro-muted intro-takeaway">
                收到回答后可以继续追问、补充要求。实际使用前，记得核对内容。页面上的小芽也能陪你继续练习。
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
