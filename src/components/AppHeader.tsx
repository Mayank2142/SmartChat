import { Menu, MessageSquarePlus, ShieldCheck, Trash2 } from 'lucide-react'

interface AppHeaderProps {
  canClear: boolean
  isTyping: boolean
  navigationOpen: boolean
  title: string
  onClearChat: () => void
  onNewChat: () => void
  onOpenNavigation: () => void
}

export function AppHeader({
  canClear,
  isTyping,
  navigationOpen,
  title,
  onClearChat,
  onNewChat,
  onOpenNavigation,
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
            <h1 className="truncate text-sm font-semibold text-white sm:text-base">
              {title}
            </h1>
            <span className="hidden rounded-full border border-white/8 bg-white/4 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 sm:inline-flex">
              AI assistant
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck size={12} className="text-emerald-400" aria-hidden="true" />
            {isTyping ? 'Darwix is responding' : 'Private session'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="icon-button"
          aria-label="Clear current chat"
          disabled={!canClear}
          onClick={onClearChat}
        >
          <Trash2 size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="new-chat-button"
          data-new-chat
          aria-label="New chat"
          onClick={onNewChat}
        >
          <MessageSquarePlus size={17} aria-hidden="true" />
          <span className="hidden sm:inline">New chat</span>
          <span className="sr-only sm:hidden">New chat</span>
        </button>
      </div>
    </header>
  )
}
