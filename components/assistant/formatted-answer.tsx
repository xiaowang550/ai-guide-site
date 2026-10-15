'use client'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import './formatted-answer.css'

// Load the parser only when a response is present, keeping the first page load small.
export const FormattedAnswer = dynamic(() => import('./answer-body').then((m) => m.AnswerBody), {
  loading: () => (
    <div className="answer-loading" role="status" aria-label="正在显示回答">
      <span />
      <span />
    </div>
  ),
})

export function EditableAnswer({
  value,
  onChange,
  busy = false,
  label = '编辑回答',
}: {
  value: string
  onChange: (value: string) => void
  busy?: boolean
  label?: string
}) {
  const [editing, setEditing] = useState(!value.trim())
  const field = useRef<HTMLTextAreaElement>(null),
    id = useId()
  useEffect(() => {
    if (busy) setEditing(false)
  }, [busy])
  useLayoutEffect(() => {
    if (!field.current) return
    field.current.style.height = 'auto'
    field.current.style.height = Math.max(160, field.current.scrollHeight) + 'px'
  }, [editing, value])
  return (
    <div className="answer-result">
      <div className="answer-view-controls">
        <button
          type="button"
          aria-pressed={editing}
          disabled={busy}
          onClick={() => {
            setEditing(!editing)
            if (!editing) requestAnimationFrame(() => field.current?.focus({ preventScroll: true }))
          }}
        >
          {editing ? '返回阅读' : '编辑文字'}
        </button>
      </div>
      {editing ? (
        <>
          <label className="sr-only" htmlFor={id}>
            {label}
          </label>
          <textarea
            ref={field}
            id={id}
            value={value}
            maxLength={5000}
            disabled={busy}
            onChange={(e) => onChange(e.target.value)}
          />
        </>
      ) : null}
      <div hidden={editing}>
        <FormattedAnswer text={value} />
      </div>
    </div>
  )
}
