'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, LoaderCircle, Send } from 'lucide-react'
import {
  beginnerDraft,
  beginnerExample,
  beginnerPrompt,
  beginnerDirectQuestion,
  beginnerEvidence,
  beginnerTask,
  beginnerTasks,
  BEGINNER_TASK_KEY,
  BEGINNER_RESULT_KEY,
  type BeginnerDraft,
  type BeginnerEvidence,
  type BeginnerTaskId,
} from '@/lib/beginner-tasks'
import { readLocal, saveLocal } from '@/lib/onboarding-state'
import { copyText } from '@/lib/copy-text'
import { EditableAnswer, FormattedAnswer } from '@/components/assistant/formatted-answer'
import { readableAnswer } from '@/lib/answer-text'
import type { useTutor } from './use-tutor'
import './beginner-task-practice.css'

export function BeginnerTaskPractice({
  tutor,
  taskId,
  level = 'first',
  onComplete,
  completeLabel = '我检查过了，继续',
  onTaskChange,
}: {
  tutor: ReturnType<typeof useTutor>
  taskId?: BeginnerTaskId
  level?: 'first' | 'refine' | 'independent'
  onComplete: (value: BeginnerEvidence) => void
  completeLabel?: string
  onTaskChange?: (id: BeginnerTaskId) => void
}) {
  const [draft, setDraft] = useState<BeginnerDraft>(() => {
      const saved = beginnerDraft(readLocal(BEGINNER_TASK_KEY, { task: taskId }))
      return taskId && saved.task !== taskId ? beginnerDraft({ task: taskId }) : saved
    }),
    [output, setOutput] = useState(''),
    [kind, setKind] = useState<'ai' | 'example'>('ai'),
    [answer, setAnswer] = useState(''),
    [notice, setNotice] = useState(''),
    [refined, setRefined] = useState(false),
    [draftIncomplete, setDraftIncomplete] = useState(false),
    [question, setQuestion] = useState(''),
    [followup, setFollowup] = useState(''),
    [help, setHelp] = useState('')
  const request = useRef(0),
    conversation = useRef<{ role: string; content: string }[]>([]),
    result = useRef<HTMLElement>(null)
  const task = beginnerTask(draft.task)
  const direct = beginnerDirectQuestion(draft)
  const action = direct ? '发送给 AI' : task.action
  useEffect(() => {
    const saved = beginnerDraft(readLocal(BEGINNER_TASK_KEY, {}))
    const next = taskId && saved.task !== taskId ? beginnerDraft({ task: taskId }) : saved
    setDraft(next)
    const last = beginnerEvidence(readLocal(BEGINNER_RESULT_KEY, null))
    if (level === 'refine' && last && last.task === next.task && last.material === next.material) {
      setOutput(last.output)
      setKind(last.kind)
      conversation.current =
        last.kind === 'ai'
          ? [
              { role: 'user', content: beginnerPrompt(last) },
              { role: 'assistant', content: last.output },
            ]
          : []
    }
  }, [taskId, level])
  useEffect(
    () => () => {
      request.current++
    },
    [],
  )
  function update(next: Partial<BeginnerDraft>) {
    request.current++
    tutor.stop()
    const value = { ...draft, ...next }
    setDraft(value)
    saveLocal(BEGINNER_TASK_KEY, value)
    conversation.current = []
    setOutput('')
    setAnswer('')
    setNotice('')
    setRefined(false)
    setDraftIncomplete(false)
    setHelp('')
    setFollowup('')
  }
  function choose(id: BeginnerTaskId) {
    update(beginnerDraft({ task: id }))
    onTaskChange?.(id)
  }
  function showResult() {
    requestAnimationFrame(() =>
      result.current?.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      }),
    )
  }
  async function generate(example = false, shorter = false, revision = '') {
    if (tutor.busy || !draft.material.trim()) return
    const id = ++request.current,
      previous = output
    setOutput('')
    setAnswer('')
    setNotice('')
    setRefined(shorter)
    setKind(example ? 'example' : 'ai')
    setDraftIncomplete(!example)
    if (example) {
      conversation.current = []
      tutor.setError('')
      setOutput(beginnerExample(shorter ? { ...draft, format: 'list' } : draft))
      showResult()
      return
    }
    const prompt =
      revision ||
      (shorter
        ? '请把上面的回答改成几条简短要点，保留原意，不编造已经核实的信息。'
        : beginnerPrompt(draft))
    const history =
      shorter || revision
        ? conversation.current.length
          ? conversation.current
          : [
              { role: 'user', content: beginnerPrompt(draft) },
              { role: 'assistant', content: previous },
            ]
        : []
    let received = ''
    try {
      await tutor.run(
        prompt,
        (text) => {
          if (id === request.current) {
            received += text
            setOutput(received)
          }
        },
        { history },
      )
      if (id === request.current) {
        setDraftIncomplete(false)
        setFollowup('')
        conversation.current = [
          ...history,
          { role: 'user', content: prompt },
          { role: 'assistant', content: received },
        ].slice(-6)
      }
    } catch {
      if (id === request.current && !received && previous && (shorter || revision)) {
        setOutput(previous)
        setDraftIncomplete(false)
        setNotice('这次没有收到新回答，上一份内容已保留。可以重试。')
      }
    }
    if (id === request.current) showResult()
  }
  function complete() {
    if (!output.trim() || answer !== 'check' || tutor.busy || draftIncomplete) return
    saveLocal(BEGINNER_TASK_KEY, draft)
    saveLocal(BEGINNER_RESULT_KEY, { ...draft, output, kind })
    onComplete({ ...draft, output, kind })
  }
  function continueWithExample() {
    request.current++
    tutor.stop()
    conversation.current = []
    setKind('example')
    setDraftIncomplete(false)
    setAnswer('')
    setRefined(false)
    setOutput(beginnerExample(draft))
    showResult()
  }
  async function ask() {
    if (!question.trim() || tutor.busy || !tutor.ready) return
    const id = ++request.current
    setHelp('')
    try {
      await tutor.run(
        '请陪一个完全零基础的使用者完成“' +
          task.label +
          '”。只解释他现在的问题，先说一个具体操作，再给一个短例子，100字以内。问题：' +
          question +
          '\n材料：' +
          draft.material +
          '\n当前草稿：' +
          output.slice(0, 1000),
        (token) => {
          if (id === request.current) setHelp((v) => v + token)
        },
      )
    } catch {
      if (id === request.current) setHelp('暂时没有连上。可以点上面的操作提示，继续当前练习。')
    }
  }
  return (
    <section className="beginner-practice" aria-label="动手完成一个小任务">
      {
        <div className="beginner-task-tabs" aria-label="选择自己的任务">
          {beginnerTasks.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={draft.task === t.id}
              disabled={tutor.busy}
              onClick={() => {
                if (t.id === 'ask' && draft.material !== task.material) {
                  update({ task: 'ask' })
                  onTaskChange?.('ask')
                } else choose(t.id)
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      }
      <div className="beginner-now">
        <span>现在做什么</span>
        <strong>
          {level === 'refine'
            ? '补充一个要求，看看回答怎么变'
            : output
              ? direct
                ? '看看回答，再补充你的要求'
                : '对照原文，检查草稿'
              : direct
                ? '写下你的问题，然后发送'
                : '改一句下面的材料，然后点按钮'}
        </strong>
      </div>
      <div className="beginner-material">
        <label>
          {direct ? '你想问什么？' : '你要交给 AI 的材料'}
          <textarea
            aria-label="练习材料"
            maxLength={1200}
            disabled={tutor.busy}
            value={draft.material}
            onChange={(e) => update({ material: e.target.value })}
          />
        </label>
        <div className="beginner-material-help">
          <span>
            {direct
              ? '直接写你的问题；天数、预算等条件越清楚，回答越合用。'
              : '粘贴已有内容来整理。想问攻略或做计划，也可以选“直接问 AI”。'}
          </span>
          <button
            type="button"
            disabled={tutor.busy}
            onClick={() => update({ material: task.material })}
          >
            恢复练习材料
          </button>
        </div>
        {level !== 'first' && (
          <div className="beginner-requirements">
            <label>
              给谁看
              <input
                aria-label="给谁看"
                maxLength={60}
                value={draft.recipient}
                disabled={tutor.busy}
                onChange={(e) => update({ recipient: e.target.value })}
              />
            </label>
            <label>
              希望怎么写
              <select
                aria-label="希望怎么写"
                value={draft.format}
                disabled={tutor.busy}
                onChange={(e) => update({ format: e.target.value as BeginnerDraft['format'] })}
              >
                <option value="short">简短一段话</option>
                <option value="list">一条一条列出来</option>
                <option value="sections">分成三个小部分</option>
              </select>
            </label>
          </div>
        )}
      </div>
      <div className="beginner-submit">
        <button
          type="button"
          className="beginner-primary"
          disabled={tutor.busy || !tutor.ready || !draft.material.trim()}
          onClick={() => void generate()}
        >
          {tutor.busy ? <LoaderCircle size={17} className="beginner-spin" /> : <Send size={17} />}
          {tutor.busy
            ? '正在回答 · ' + tutor.elapsed + ' 秒'
            : tutor.loading
              ? '正在连接 AI…'
              : action}
        </button>
        {tutor.busy ? (
          <button type="button" onClick={tutor.stop}>
            停止
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void generate(true)}
            disabled={!draft.material.trim()}
          >
            先试教学示例
          </button>
        )}
      </div>
      <p className="beginner-caption">
        {tutor.busy && !draftIncomplete
          ? '小芽正在解释这一步，你的草稿会保留。'
          : tutor.busy && tutor.elapsed >= 8
            ? '还在等待？可以停止，先用教学示例继续练。'
            : tutor.ready
              ? direct
                ? '连接真实 AI 回答；本次没有联网查询。'
                : '由真实 AI 处理你填写的内容。'
              : tutor.loading
                ? '正在连接模型，也可以先试教学示例。'
                : 'AI 连接尚未就绪，教学示例可以直接练，不用等待。'}
      </p>
      {tutor.busy && draftIncomplete && tutor.elapsed >= 8 && (
        <button type="button" onClick={continueWithExample}>
          不等待，先试教学示例
        </button>
      )}
      {tutor.error && (draftIncomplete || !output) && (
        <div className="beginner-error" role="status">
          <p>{tutor.error}</p>
          <button type="button" disabled={tutor.busy} onClick={() => void generate(true)}>
            用教学示例继续
          </button>
        </div>
      )}
      <details className="beginner-prompt">
        <summary>想看发给 AI 的完整要求？</summary>
        <p>{beginnerPrompt(draft)}</p>
        <small>这些要求也叫“提示词”。不用先记住这个词。</small>
      </details>
      {output && (
        <article className="beginner-result" ref={result}>
          <header>
            <span>
              {kind === 'example' ? '教学示例 · 未调用 AI' : direct ? 'AI 的回答' : 'AI 生成的草稿'}
            </span>
          </header>
          <EditableAnswer
            label="我的任务草稿"
            value={output}
            busy={tutor.busy}
            onChange={(value) => {
              setOutput(value)
              const last = conversation.current.at(-1)
              if (last?.role === 'assistant') last.content = value
              setAnswer('')
              setNotice('')
            }}
          />
          <div className="beginner-result-actions">
            <button
              type="button"
              disabled={tutor.busy || !output.trim() || refined}
              onClick={() => void generate(kind === 'example', true)}
            >
              {refined ? (
                <>
                  <Check size={16} /> 已改成要点
                </>
              ) : (
                '试试：改成一条条要点'
              )}
            </button>
            <button
              type="button"
              disabled={tutor.busy || !output.trim()}
              onClick={async (e) =>
                setNotice(
                  (await copyText(
                    readableAnswer(
                      e.currentTarget.closest('article')?.querySelector('.answer-body'),
                      output,
                    ),
                  ))
                    ? '已复制。可以粘贴到聊天、笔记或文档里。'
                    : '可以选中文字，手动复制。',
                )
              }
            >
              <Copy size={16} />
              复制文字
            </button>
          </div>
          {kind === 'ai' && !draftIncomplete && (
            <form
              className="beginner-followup"
              onSubmit={(e) => {
                e.preventDefault()
                if (followup.trim()) void generate(false, false, followup.trim())
              }}
            >
              <label htmlFor={'beginner-followup-' + level}>继续告诉 AI 你想怎么改</label>
              <div>
                <input
                  id={'beginner-followup-' + level}
                  value={followup}
                  maxLength={500}
                  disabled={tutor.busy}
                  onChange={(e) => setFollowup(e.target.value)}
                  placeholder={
                    direct
                      ? '例如：带着老人出行，每天少走一点路'
                      : '例如：语气自然一点，保留时间和地点'
                  }
                />
                <button type="submit" disabled={tutor.busy || !followup.trim()}>
                  继续对话
                </button>
              </div>
            </form>
          )}
          <fieldset className="beginner-review" disabled={tutor.busy}>
            <legend>
              {direct ? '回答里的价格、时间等信息还没核实，你会怎么做？' : task.question}
            </legend>
            <button
              type="button"
              aria-pressed={answer === 'check'}
              onClick={() => setAnswer('check')}
            >
              删掉或核对后再补充
            </button>
            <button
              type="button"
              aria-pressed={answer === 'trust'}
              onClick={() => setAnswer('trust')}
            >
              看起来合理，直接用
            </button>
          </fieldset>
          {answer && (
            <p className="beginner-feedback" role="status">
              {answer === 'check'
                ? direct
                  ? '对。方案可以参考，票价、开放时间等要以官方信息为准。'
                  : '对。AI 能帮你起草，事实还需要你确认。再看一眼时间、地点和名字。'
                : '再看一下原始材料：没有提供的信息，AI 也可能写错。请先核对。'}
            </p>
          )}
          <button
            type="button"
            className="beginner-primary beginner-continue"
            disabled={answer !== 'check' || tutor.busy || !output.trim() || draftIncomplete}
            onClick={complete}
          >
            {completeLabel}
            <ArrowRight size={17} />
          </button>
        </article>
      )}
      {notice && (
        <p className="beginner-feedback" role="status">
          {notice}
        </p>
      )}
      <details className="beginner-help">
        <summary>不知道怎么做？让小芽讲简单一点</summary>
        <div className="beginner-help-actions">
          <button
            type="button"
            disabled={tutor.busy}
            onClick={() =>
              setHelp(
                draftIncomplete
                  ? '回答还没有完成。可以重新发送，或者点“用教学示例继续”，再做检查题。'
                  : output
                    ? '先对照原文检查时间、地点和名字；再回答上面的检查题，点击继续。'
                    : '先在文字框里改一句，再点“' +
                      (tutor.ready ? task.action : '试做教学示例') +
                      '”。',
              )
            }
          >
            下一步点哪里？
          </button>
          <button
            type="button"
            disabled={tutor.busy}
            onClick={() =>
              setHelp('AI 可能写错或补出你没说过的信息。先和原文核对，改好后再发送或保存。')
            }
          >
            草稿能直接用吗？
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void ask()
          }}
        >
          <label className="sr-only" htmlFor={'beginner-question-' + level}>
            问小芽当前这一步
          </label>
          <input
            id={'beginner-question-' + level}
            value={question}
            maxLength={300}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="哪里没懂？直接写下来"
          />
          <button disabled={!tutor.ready || tutor.busy || !question.trim()}>问小芽</button>
        </form>
        {help && (
          <div className="beginner-help-answer" role="status">
            <FormattedAnswer text={help} />
          </div>
        )}
      </details>
      <details className="beginner-model">
        <summary>连接与模型设置</summary>
        <select
          aria-label="练习使用的 AI 模型"
          value={tutor.model}
          disabled={tutor.busy}
          onChange={(e) => {
            request.current++
            tutor.setModel(e.target.value)
            tutor.setError('')
            setOutput('')
            setAnswer('')
            conversation.current = []
          }}
        >
          <option value="" disabled>
            连接准备中
          </option>
          {tutor.catalog?.models
            .filter((m) => m.available && tutor.catalog?.connected[m.provider])
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
        </select>
      </details>
    </section>
  )
}
