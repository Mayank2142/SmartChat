import {
  Bot,
  ChevronDown,
  MessageCircle,
  MessageSquarePlus,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { ChatSession } from '../types/chat'
import { formatSessionUpdatedAt } from '../utils/date'

export interface SessionSidebarProps {
  activeSessionId: string
  mobile?: boolean
  persistenceAvailable: boolean
  sessions: ChatSession[]
  onDeleteSession: (session: ChatSession, trigger: HTMLButtonElement) => void
  onNewChat: () => void
  onSelectSession: (sessionId: string) => void
}

export function SessionSidebar({
  activeSessionId,
  mobile = false,
  persistenceAvailable,
  sessions,
  onDeleteSession,
  onNewChat,
  onSelectSession,
}: SessionSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[4.5rem] shrink-0 items-center gap-3 border-b border-white/7 px-5">
        <div className="brand-mark brand-mark-small" aria-hidden="true">
          <Bot size={20} strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold tracking-[-0.01em] text-white">
            Darwix AI
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-400">
            <Sparkles size={10} className="text-cyan-300" aria-hidden="true" />
            Your intelligent workspace
          </p>
        </div>
        {!mobile && (
          <button type="button" className="icon-button" aria-label="Collapse sidebar" disabled>
            <ChevronDown className="-rotate-90" size={17} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-4 pt-4">
        <button
          type="button"
          className="sidebar-new-chat"
          data-new-chat
          onClick={onNewChat}
        >
          <MessageSquarePlus size={17} aria-hidden="true" />
          New conversation
        </button>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5" aria-label="Chat history">
        <p className="sidebar-label">Recent</p>
        <ul className="mt-2 space-y-1">
          {sessions.map((session) => {
            const active = session.id === activeSessionId
            return (
              <li
                key={session.id}
                className={`session-item ${active ? 'session-item-active' : ''}`}
              >
                <button
                  type="button"
                  className="session-select"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onSelectSession(session.id)}
                >
                  <MessageCircle size={16} className="shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[13px] font-medium">
                      {session.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-slate-500">
                      {session.messages.length === 0
                        ? 'Empty chat'
                        : formatSessionUpdatedAt(session.updatedAt)}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  className="session-delete"
                  aria-label={`Delete ${session.title}`}
                  onClick={(event) => onDeleteSession(session, event.currentTarget)}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-white/7 p-3">
        <div className="sidebar-profile">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/90 to-blue-500/90 text-xs font-bold text-white">
            DU
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-200">Darwix User</p>
            <p className="truncate text-[10px] text-slate-500">
              <span
                className={`mr-1.5 inline-block size-1.5 rounded-full ${persistenceAvailable ? 'bg-emerald-400' : 'bg-amber-400'}`}
                aria-hidden="true"
              />
              {persistenceAvailable ? 'History saved locally' : 'History unavailable'}
            </p>
          </div>
          <button type="button" className="icon-button" aria-label="Open settings" disabled>
            <Settings size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
