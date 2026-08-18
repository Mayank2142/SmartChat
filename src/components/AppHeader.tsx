import { Menu, MessageSquareDashed, ShieldCheck, TimerReset } from 'lucide-react'

interface AppHeaderProps {
  isTemporary: boolean
  isTyping: boolean
  navigationOpen: boolean
  title: string
  onOpenNavigation: () => void
  onTemporaryChat: () => void
}

export function AppHeader({
  isTemporary,
  isTyping,
  navigationOpen,
  title,
  onOpenNavigation,
  onTemporaryChat,
}: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          className="icon-button mobile-navigation-trigger"
          aria-label="Open chat navigation"
          aria-controls="mobile-session-navigation"
          aria-expanded={navigationOpen}
          onClick={onOpenNavigation}
        >
          <Menu size={19} aria-hidden="true" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="app-title truncate text-sm font-semibold sm:text-base">
              {title}
            </h1>
            <span className="assistant-badge hidden sm:inline-flex">
              {isTemporary ? 'Temporary' : 'Darwix AI'}
            </span>
          </div>
          <p className="app-subtitle">
            {isTemporary ? (
              <TimerReset size={12} aria-hidden="true" />
            ) : (
              <ShieldCheck size={12} aria-hidden="true" />
            )}
            {isTyping
              ? 'Darwix AI is responding'
              : isTemporary
                ? 'Not saved to history'
                : 'Saved locally on this device'}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="temporary-chat-button"
        aria-label="Start a temporary chat"
        onClick={onTemporaryChat}
      >
        <MessageSquareDashed size={17} aria-hidden="true" />
        <span className="hidden sm:inline">Temporary chat</span>
      </button>
    </header>
  )
}
