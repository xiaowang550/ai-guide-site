'use client'
/* eslint-disable @next/next/no-img-element -- 本次本地图片预览，不通过服务器图片优化器。 */
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Copy, ImagePlus, Mic, Square, Sprout } from 'lucide-react'
import { useTutor } from './use-tutor'
import { rookieLessons } from './rookie-lessons'
import { rookieProgress, readLocal, saveLocal, ROOKIE_KEY } from '@/lib/onboarding-state'
import { copyText } from '@/lib/copy-text'
import './rookie.css'

interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionConstructor = new () => Recognition
function speechApi() {
  const browser = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition
}
function practiceImage() {
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 470
  const c = canvas.getContext('2d')!
  c.fillStyle = '#f6f8f3'
  c.fillRect(0, 0, 800, 470)
  c.fillStyle = '#365c4b'
  c.font = 'bold 34px sans-serif'
  c.fillText('教研交流安排 · 练习图片', 40, 65)
  c.font = '28px sans-serif'
  ;[
    '时间：星期五 16:00',
    '地点：学校会议室',
    '内容：交流 AI 辅助备课',
    '准备：每人带一个使用案例',
  ].forEach((text, i) => {
    c.fillStyle = i % 2 ? '#ffffff' : '#e5ede6'
    c.fillRect(30, 100 + i * 82, 740, 70)
    c.fillStyle = '#26392f'
    c.fillText(text, 50, 145 + i * 82)
  })
  return canvas.toDataURL('image/jpeg', 0.85)
}
async function compressedImage(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024)
    throw new Error('请选择 8MB 以内的 JPG、PNG 或 WebP 图片。')
  const bitmap = await createImageBitmap(file)
  try {
    const ratio = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const c = canvas.getContext('2d')!
    c.fillStyle = '#fff'
    c.fillRect(0, 0, canvas.width, canvas.height)
    c.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.8, 0.6, 0.4]) {
      const result = canvas.toDataURL('image/jpeg', quality)
      if (result.length <= 240000) return result
    }
    throw new Error('图片细节较多，请裁剪要读取的部分后再上传。')
  } finally {
    bitmap.close()
  }
}
export function RookieLab() {
  const tutor = useTutor(),
    [stage, setStage] = useState(0),
    [done, setDone] = useState<number[]>([]),
    [drafts, setDrafts] = useState(rookieLessons.map((l) => l.prompt)),
    [outputs, setOutputs] = useState<string[]>(rookieLessons.map(() => '')),
    [checked, setChecked] = useState(false),
    [notice, setNotice] = useState(''),
    [finished, setFinished] = useState(false),
    [image, setImage] = useState(''),
    [imageLabel, setImageLabel] = useState(''),
    [imageBusy, setImageBusy] = useState(false),
    [subject, setSubject] = useState('一株桌面小绿植'),
    [scene, setScene] = useState('教室窗边的书桌'),
    [style, setStyle] = useState('柔和水彩'),
    [question, setQuestion] = useState(''),
    [coaching, setCoaching] = useState(''),
    [voiceAvailable, setVoiceAvailable] = useState(false),
    [listening, setListening] = useState(false),
    [quiz, setQuiz] = useState(['', ''])
  const recognition = useRef<Recognition | null>(null),
    voiceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lesson = rookieLessons[stage]
  useEffect(() => {
    const place = () => {
      const route = document.querySelector<HTMLElement>('.rookie-route'),
        active = route?.querySelector<HTMLElement>('[aria-current=step]')
      if (route && active && window.innerWidth <= 760) {
        const a = active.getBoundingClientRect(),
          r = route.getBoundingClientRect()
        route.scrollLeft += a.left - r.left - (r.width - a.width) / 2
      }
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [stage])
  const imagePrompt = `请生成一张教学配图：主体是${subject}，位于${scene}，风格为${style}，柔和浅色，横向画面，主体清楚，背景简洁，不添加文字或标志。`
  useEffect(() => {
    const progress = rookieProgress(readLocal(ROOKIE_KEY, {}), rookieLessons.length)
    setStage(progress.stage)
    setDone(progress.done)
    setFinished(progress.done.length === rookieLessons.length)
    setVoiceAvailable(!!speechApi())
    return () => {
      recognition.current?.abort()
      if (voiceTimer.current) clearTimeout(voiceTimer.current)
    }
  }, [])
  const availableCatalog = tutor.catalog,
    modelVision = tutor.current?.vision,
    setTutorModel = tutor.setModel
  useEffect(() => {
    if (stage === 3 && availableCatalog && !modelVision) {
      const model = availableCatalog.models.find(
        (m) =>
          m.available &&
          m.vision &&
          m.provider === 'openrouter' &&
          availableCatalog.connected.openrouter,
      )
      if (model) setTutorModel(model.id)
    }
  }, [stage, availableCatalog, modelVision, setTutorModel])
  function move(next: number) {
    tutor.stop()
    recognition.current?.abort()
    setListening(false)
    setStage(next)
    setChecked(false)
    setNotice('')
    setCoaching('')
    setFinished(false)
    saveLocal(ROOKIE_KEY, { stage: next, done })
    requestAnimationFrame(() =>
      document.querySelector('.rookie-workbench')?.scrollIntoView({ block: 'start' }),
    )
  }
  function complete() {
    const completed = [...new Set([...done, stage])]
    setDone(completed)
    const next = Math.min(stage + 1, rookieLessons.length - 1)
    saveLocal(ROOKIE_KEY, { stage: next, done: completed })
    if (stage === rookieLessons.length - 1) {
      if (completed.length === rookieLessons.length) setFinished(true)
      else setNotice('最后一步已记录。左侧还有未确认的练习，可以逐步补齐。')
    } else {
      setStage(next)
      setChecked(false)
      setNotice('')
      setCoaching('')
      requestAnimationFrame(() =>
        document.querySelector('.rookie-workbench')?.scrollIntoView({ block: 'start' }),
      )
    }
  }
  async function practice() {
    const at = stage,
      input =
        stage === 2
          ? `这是文生图练习。请只检查这条作图提示词，指出一个具体改进，80 字以内。不要声称已生成图片。\n${imagePrompt}`
          : stage === 4
            ? `请把以下语音识别或手工输入的材料整理成三条待办。忠于原文，未说明的信息标【待核对】：\n${drafts[4]}`
            : drafts[stage]
    setOutputs((old) => old.map((r, i) => (i === at ? '' : r)))
    setNotice('')
    try {
      await tutor.run(
        input,
        (text) => setOutputs((old) => old.map((r, i) => (i === at ? r + text : r))),
        stage === 3 ? { image } : undefined,
      )
    } catch {
      /* useTutor 显示安全错误并保留部分回答。 */
    }
  }
  async function coach(text = question) {
    if (!text.trim()) return
    setCoaching('')
    setQuestion('')
    try {
      await tutor.run(
        `我正在学习“${lesson.title}”，是完全零基础的新手。请用简单中文，只讲我当前这一步，先给一个操作，再用一个短例子解释，120 字以内。我的问题：${text}\n当前练习：${stage === 2 ? imagePrompt : drafts[stage].slice(0, 800)}\n当前结果：${outputs[stage].slice(0, 800)}`,
        (token) => setCoaching((old) => old + token),
      )
    } catch {}
  }
  function startVoice() {
    const Api = speechApi()
    if (!Api) return
    const engine = new Api()
    recognition.current = engine
    engine.lang = 'zh-CN'
    engine.interimResults = false
    engine.continuous = false
    engine.onresult = (event) => {
      const text = Array.from(event.results)
        .map((r) => r[0]?.transcript ?? '')
        .join('')
        .slice(0, 2000)
      setDrafts((old) => old.map((r, i) => (i === 4 ? text : r)))
      setNotice('语音已变成文字，请先检查名字、数字和时间。')
    }
    engine.onerror = (event) => {
      setNotice(
        event.error === 'not-allowed'
          ? '麦克风没有授权。可以允许后重试，或使用手机键盘的语音输入。'
          : '浏览器语音服务暂不可用，可以用手机键盘语音输入，或先手工录入。',
      )
      setListening(false)
    }
    engine.onend = () => {
      setListening(false)
      if (voiceTimer.current) clearTimeout(voiceTimer.current)
    }
    try {
      engine.start()
      setListening(true)
      setNotice('正在听你说话，说完可以点“停止”。')
      voiceTimer.current = setTimeout(() => engine.stop(), 45000)
    } catch {
      setNotice('没有启动语音输入，请检查浏览器权限或使用手机键盘的麦克风。')
    }
  }
  async function upload(file?: File) {
    if (!file) return
    setImageBusy(true)
    setNotice('')
    try {
      setImage(await compressedImage(file))
      setImageLabel('你本次上传的图片')
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '图片无法读取，请重试。')
    } finally {
      setImageBusy(false)
    }
  }
  async function copyPrompt() {
    setNotice(
      (await copyText(imagePrompt))
        ? '提示词已复制。去作图工具粘贴，再点生成。'
        : '复制失败，请选中提示词手工复制。',
    )
  }
  if (finished)
    return (
      <section className="rookie-finish">
        <Sprout size={42} />
        <p className="eyebrow">六个练习，由你亲手确认完成</p>
        <h2>现在，你可以开始独立探索了。</h2>
        <p>
          你已经练过对话、提示词、作图、看图、语音和一个真实任务。遇到不明白的地方，随时回来继续问小芽。
        </p>
        <div>
          <Link className="home-button" href="/">
            进入首页 <ArrowRight size={16} />
          </Link>
          <Link className="home-button-secondary" href="/guides/">
            继续看教程
          </Link>
        </div>
        <button onClick={() => move(0)}>回顾第一课</button>
      </section>
    )
  return (
    <div className="rookie-lab">
      <div className="rookie-top">
        <div>
          <p className="eyebrow">小芽陪练 · 不需要本站账号</p>
          <h2>不会也没关系，我们一次做一小步。</h2>
        </div>
        <span>
          {done.length} / {rookieLessons.length} 已确认
        </span>
      </div>
      <div className="rookie-layout">
        <nav className="rookie-route" aria-label="零基础学习步骤">
          {rookieLessons.map((l, i) => (
            <button
              key={l.title}
              aria-current={i === stage ? 'step' : undefined}
              disabled={tutor.busy || listening}
              onClick={() => move(i)}
            >
              <span>{done.includes(i) ? <Check size={15} /> : i + 1}</span>
              <strong>{l.title}</strong>
            </button>
          ))}
          <small>进度只存在本浏览器。下次从“教程 → 零基础一对一”继续。</small>
        </nav>
        <section className="rookie-workbench">
          <p className="eyebrow">
            第 {stage + 1} 步 · {lesson.goal}
          </p>
          <h3>{lesson.title}</h3>
          <ol className="rookie-how">
            {lesson.steps.map((text, i) => (
              <li key={text}>
                <span>{i + 1}</span>
                {text}
              </li>
            ))}
          </ol>
          {stage === 2 ? (
            <div className="rookie-image-builder">
              <div className="rookie-fields">
                <label>
                  画什么
                  <input
                    value={subject}
                    maxLength={100}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </label>
                <label>
                  在哪里
                  <input value={scene} maxLength={100} onChange={(e) => setScene(e.target.value)} />
                </label>
                <label>
                  什么风格
                  <select value={style} onChange={(e) => setStyle(e.target.value)}>
                    <option>柔和水彩</option>
                    <option>简洁插画</option>
                    <option>自然摄影</option>
                  </select>
                </label>
              </div>
              <div className="rookie-prompt">
                <strong>你的作图提示词</strong>
                <p>{imagePrompt}</p>
              </div>
              <div className="rookie-actions">
                <button onClick={() => void copyPrompt()}>
                  <Copy size={16} />
                  复制作图提示词
                </button>
                <a
                  href="https://www.canva.com/ai-image-generator/"
                  target="_blank"
                  rel="noreferrer"
                >
                  打开作图工具 ↗
                </a>
                <Link href="/tools/">选择其他图像工具 →</Link>
              </div>
              <p className="rookie-note">
                本站当前没有可核验的免费作图接口，这一步到外部作图工具实际生成。外部平台可能需要自己的账号，有免费次数限制；回来后可以用下一课读取图片。
              </p>
              <details>
                <summary>到了作图页面，下一步点哪里？</summary>
                <ol>
                  <li>找到文字输入框，把刚复制的提示词粘贴进去。</li>
                  <li>选择样式和横向比例；首次使用按平台提示登录。</li>
                  <li>点击生成，核对主体和背景，保存图片后回到本站。</li>
                </ol>
                <a
                  href="https://www.canva.com/ai-image-generator/"
                  target="_blank"
                  rel="noreferrer"
                >
                  查看官方作图说明 ↗
                </a>
              </details>
            </div>
          ) : (
            <>
              {stage === 3 && (
                <div className="rookie-upload">
                  <div className="rookie-actions">
                    <button
                      onClick={() => {
                        setImage(practiceImage())
                        setImageLabel('手绘日程图 · 教学练习样例')
                      }}
                    >
                      <ImagePlus size={16} />
                      使用练习图片
                    </button>
                    <label className="rookie-file">
                      {imageBusy ? '正在压缩…' : '上传自己的图片'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        aria-label="上传看图练习图片"
                        disabled={imageBusy || tutor.busy}
                        onChange={(e) => void upload(e.target.files?.[0])}
                      />
                    </label>
                  </div>
                  {image && (
                    <figure>
                      <img src={image} alt={imageLabel} />
                      <figcaption>{imageLabel}</figcaption>
                    </figure>
                  )}
                  <p className="rookie-note">
                    点击分析后，压缩图片会发送给所选模型平台。本次图片不写入本站数据库；只上传允许分享的内容。
                  </p>
                </div>
              )}
              {stage === 4 && (
                <div className="rookie-voice">
                  <div className="rookie-actions">
                    {voiceAvailable && (
                      <button
                        disabled={tutor.busy}
                        onClick={() => (listening ? recognition.current?.stop() : startVoice())}
                      >
                        {listening ? <Square size={16} /> : <Mic size={16} />}
                        {listening ? '停止说话' : '开始说话'}
                      </button>
                    )}
                    <button
                      disabled={listening}
                      onClick={() =>
                        setDrafts((old) =>
                          old.map((r, i) =>
                            i === 4
                              ? '【手工练习材料】下周三下午三点在会议室交流备课经验，每位老师带一个教学案例。'
                              : r,
                          ),
                        )
                      }
                    >
                      先填入练习材料
                    </button>
                  </div>
                  <p className="rookie-note">
                    {voiceAvailable
                      ? '只有点击后才启动麦克风，由浏览器语音服务识别，可能需要联网；本站不保存录音。'
                      : '这个浏览器没有提供语音识别接口。点下面输入框，用手机键盘上的麦克风说话，也可先手工输入练习。'}
                  </p>
                  <p className="rookie-note">
                    可以试着说：下周三下午三点在会议室交流备课经验，每位老师带一个案例。
                  </p>
                </div>
              )}
              <label className="rookie-input">
                {stage === 4 ? '先核对识别文字，再发给 AI' : '你发给 AI 的话'}
                <textarea
                  aria-label="当前练习提示词"
                  value={drafts[stage]}
                  maxLength={2000}
                  onChange={(e) =>
                    setDrafts((old) => old.map((r, i) => (i === stage ? e.target.value : r)))
                  }
                />
              </label>
            </>
          )}
          <div className="rookie-actions">
            <button
              className="rookie-primary"
              onClick={() => void practice()}
              disabled={
                !tutor.ready ||
                tutor.busy ||
                listening ||
                (stage === 3 && (!image || !tutor.current?.vision)) ||
                (stage !== 2 && !drafts[stage].trim())
              }
            >
              {tutor.busy
                ? '小芽正在回答…'
                : stage === 2
                  ? '让小芽检查作图描述'
                  : stage === 3
                    ? '让 AI 读取这张图片'
                    : stage === 4
                      ? '把文字整理成待办'
                      : '发给 AI，看看回答'}
            </button>
            {tutor.busy && <button onClick={tutor.stop}>停止生成</button>}
            <select
              aria-label="陪练免费模型"
              value={tutor.model}
              disabled={tutor.busy}
              onChange={(e) => tutor.setModel(e.target.value)}
            >
              {!tutor.model && <option value="">连接准备中</option>}
              {tutor.catalog?.models
                .filter(
                  (m) =>
                    m.available &&
                    tutor.catalog?.connected[m.provider] &&
                    (stage !== 3 || (m.vision && m.provider === 'openrouter')),
                )
                .map((m) => (
                  <option value={m.id} key={m.id}>
                    {m.name}
                  </option>
                ))}
            </select>
          </div>
          <p className="rookie-note">
            点击才使用免费请求；可能遇到平台额度或排队限制。结果需要你核对。
          </p>
          {outputs[stage] && (
            <article className="rookie-output">
              <small>当前模型的实时回答</small>
              <p>{outputs[stage]}</p>
            </article>
          )}
          {(notice || tutor.error) && (
            <p className="rookie-status" role="status">
              {notice || tutor.error}
            </p>
          )}
          <section className="rookie-coach">
            <h4>这一步卡住了？小芽只讲你现在的问题。</h4>
            <div className="rookie-actions">
              <button
                disabled={!tutor.ready || tutor.busy}
                onClick={() =>
                  void coach('我完全没听懂，请换一个生活里的例子，并告诉我现在先点哪里。')
                }
              >
                再简单一点
              </button>
              <button
                disabled={!tutor.ready || tutor.busy}
                onClick={() => void coach('我应该怎样检查当前结果是否能用？给我一个具体检查动作。')}
              >
                帮我检查这一小步
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void coach()
              }}
            >
              <input
                aria-label="问陪练小芽"
                placeholder="哪里没懂，直接问，例如：什么是提示词？"
                value={question}
                maxLength={500}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button disabled={!tutor.ready || tutor.busy || !question.trim()}>问小芽</button>
            </form>
            {coaching && <p className="rookie-coach-answer">{coaching}</p>}
          </section>
          {stage === 5 && (
            <div className="rookie-quiz">
              <h4>最后，用两道小题检查自己。</h4>
              {[
                'AI 给出一个无法确定的时间，你该怎么做？',
                '不知道哪个工具适合你的任务，你可以去哪里？',
              ].map((q, i) => (
                <fieldset key={q}>
                  <legend>{q}</legend>
                  {(i === 0
                    ? ['标出待核对，查原始材料', '看起来像真的，直接发布']
                    : ['使用本站场景决策器，再参考案例', '随便选最贵的工具']
                  ).map((a, j) => (
                    <label key={a}>
                      <input
                        type="radio"
                        name={`rookie-quiz-${i}`}
                        checked={quiz[i] === String(j)}
                        onChange={() =>
                          setQuiz((old) => old.map((v, k) => (k === i ? String(j) : v)))
                        }
                      />
                      {a}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          )}
          <footer className="rookie-next">
            <label>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
              />
              {lesson.check}
            </label>
            <button
              className="rookie-primary"
              disabled={
                !checked || tutor.busy || listening || (stage === 5 && quiz.some((a) => a !== '0'))
              }
              onClick={complete}
            >
              {stage === 5 ? '确认完成，开始独立探索' : '我做到了，继续下一步'}
              <ArrowRight size={16} />
            </button>
            <small>这是你自己的学习确认，记录进度，不自动判定材料质量。</small>
          </footer>
        </section>
      </div>
    </div>
  )
}
