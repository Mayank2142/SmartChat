import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import {
  SessionSidebar,
  type SessionSidebarProps,
} from './SessionSidebar'

interface MobileSessionDrawerProps
  extends Omit<SessionSidebarProps, 'mobile' | 'onNewChat' | 'onSelectSession'> {
  open: boolean
  backgroundInert?: boolean
  onClose: () => void
  onNewChat: () => void
  onSelectSession: (sessionId: string) => void
}

export function MobileSessionDrawer({
  backgroundInert = false,
  open,
  onClose,
  onNewChat,
  onSelectSession,
  ...sidebarProps
}: MobileSessionDrawerProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const drawerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (document.querySelector('[role="alertdialog"]')) return
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return

      const focusableElements = drawerRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
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
      document.body.style.overflow = previousOverflow
    }
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      inert={backgroundInert ? true : undefined}
    >
      <div
        className="absolute inset-0 cursor-default bg-slate-950/75 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={drawerRef}
        id="mobile-session-navigation"
        className="drawer-panel relative h-full w-[min(19rem,88vw)]"
        role="dialog"
        aria-modal="true"
        aria-label="Chat navigation"
      >
        <button
          ref={closeButtonRef}
          type="button"
          className="icon-button absolute right-3 top-4 z-10"
          aria-label="Close chat navigation"
          onClick={onClose}
        >
          <X size={18} aria-hidden="true" />
        </button>
        <SessionSidebar
          {...sidebarProps}
          mobile
          onNewChat={() => {
            onClose()
            onNewChat()
          }}
          onSelectSession={(sessionId) => {
            onClose()
            onSelectSession(sessionId)
          }}
        />
      </div>
    </div>
  )
}
