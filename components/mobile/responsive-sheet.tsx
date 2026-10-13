'use client'

import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Native modal provides focus containment, Escape, and an inert background. */
export function ResponsiveSheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const node = dialog.current
    if (!node) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    node.showModal()
    return () => {
      node.close()
      document.documentElement.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="responsive-sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section>
        <div className="responsive-sheet-heading">
          <h2 id={titleId}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="关闭菜单" autoFocus>
            <X size={20} />
          </button>
        </div>
        <div className="responsive-sheet-content">{children}</div>
      </section>
    </dialog>
  )
}
