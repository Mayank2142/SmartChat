import { useEffect, useRef } from 'react'
import { Trash2, X } from 'lucide-react'
import type { ChatSession } from '../types/chat'

export type SessionAction = 'clear' | 'delete'

interface ConfirmSessionDialogProps {
  action: SessionAction
  session: ChatSession
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmSessionDialog({
  action,
  session,
  onCancel,
  onConfirm,
}: ConfirmSessionDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const previousFocusRef = useRef(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  )
  const deleting = action === 'delete'
  const title = deleting ? 'Delete this chat?' : 'Clear this conversation?'
  const description = deleting
    ? `“${session.title}” and all of its messages will be removed from this browser.`
    : 'All messages in this conversation will be removed. The empty chat will remain available.'

  useEffect(() => {
    const previousFocus = previousFocusRef.current
    cancelButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
        return
      }
      if (event.key !== 'Tab') return

      const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      )
      if (!focusableElements || focusableElements.length === 0) return
      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [onCancel])

  return (
    <div className="dialog-layer">
      <div
        className="dialog-backdrop"
        aria-hidden="true"
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
      >
        <div className="confirm-dialog-icon" aria-hidden="true">
          <Trash2 size={20} />
        </div>
        <button
          type="button"
          className="icon-button absolute right-3 top-3"
          aria-label="Cancel confirmation"
          onClick={onCancel}
        >
          <X size={17} aria-hidden="true" />
        </button>

        <h2 id="confirm-title" className="mt-4 text-lg font-semibold text-white">
          {title}
        </h2>
        <p id="confirm-description" className="mt-2 text-sm leading-6 text-slate-400">
          {description}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            type="button"
            className="dialog-button dialog-button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="dialog-button dialog-button-danger"
            onClick={onConfirm}
          >
            {deleting ? 'Delete chat' : 'Clear messages'}
          </button>
        </div>
      </div>
    </div>
  )
}
