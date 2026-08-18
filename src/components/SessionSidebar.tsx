import {
  Bot,
  ChevronLeft,
  MessageCircle,
  MessageSquarePlus,
  Settings,
  Sparkles,
  Trash2,
} from 'lucide-react'
import type { ChatSession, ThemeMode } from '../types/chat'
import { formatSessionUpdatedAt } from '../utils/date'
import { ThemeToggle } from './ThemeToggle'

export interface SessionSidebarProps {
  activeSessionId: string
  collapsed?: boolean
  mobile?: boolean
  persistenceAvailable: boolean
  sessions: ChatSession[]
  theme: ThemeMode
  onDeleteSession: (session: ChatSession, trigger: HTMLButtonElement) => void
  onNewChat: () => void
  onOpenSettings: () => void
  onSelectSession: (sessionId: string) => void
  onThemeChange: (theme: ThemeMode) => void
  onToggleCollapse?: () => void
}

export function SessionSidebar({
  activeSessionId,
  collapsed = false,
  mobile = false,
  persistenceAvailable,
  sessions,
  theme,
  onDeleteSession,
  onNewChat,
  onOpenSettings,
  onSelectSession,
  onThemeChange,
  onToggleCollapse,
}: SessionSidebarProps) {
  const isCollapsed = collapsed && !mobile

  return (
    <div className={`sidebar-content ${isCollapsed ? 'sidebar-content-collapsed' : ''}`}>
      <div className="sidebar-brand-row">
        <div className="brand-mark brand-mark-small" aria-hidden="true">
          <Bot size={20} strokeWidth={1.9} />
        </div>
        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="sidebar-brand-name">Darwix AI</p>
            <p className="sidebar-brand-tagline">
              <Sparkles size={10} aria-hidden="true" />
              Gemini workspace
            </p>
          </div>
        )}
        {!mobile && (
          <button
            type="button"
            className="icon-button sidebar-collapse-button"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            onClick={onToggleCollapse}
          >
            <ChevronLeft
              className={isCollapsed ? 'rotate-180' : undefined}
              size={17}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      <div className="sidebar-create-wrap">
        <button
          type="button"
          className="sidebar-new-chat"
          data-new-chat
          aria-label="New saved conversation"
          title={isCollapsed ? 'New saved conversation' : undefined}
          onClick={onNewChat}
        >
          <MessageSquarePlus size={17} aria-hidden="true" />
          {!isCollapsed && <span>New conversation</span>}
        </button>
      </div>

      <nav className="sidebar-history" aria-label="Chat history">
        {!isCollapsed && <p className="sidebar-label">Recent</p>}
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
                  aria-label={session.title}
                  aria-current={active ? 'page' : undefined}
                  title={isCollapsed ? session.title : undefined}
                  onClick={() => onSelectSession(session.id)}
                >
                  <MessageCircle size={16} className="shrink-0" aria-hidden="true" />
                  {!isCollapsed && (
                    <span className="min-w-0 flex-1 text-left">
                      <span className="session-title">{session.title}</span>
                      <span className="session-time">
                        {session.messages.length === 0
                          ? 'Empty chat'
                          : formatSessionUpdatedAt(session.updatedAt)}
                      </span>
                    </span>
                  )}
                </button>
                {!isCollapsed && (
                  <button
                    type="button"
                    className="session-delete"
                    aria-label={`Delete ${session.title}`}
                    onClick={(event) => onDeleteSession(session, event.currentTarget)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {!isCollapsed && <ThemeToggle theme={theme} onChange={onThemeChange} />}
        <div className="sidebar-profile">
          {!isCollapsed && <div className="profile-avatar">DU</div>}
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="profile-name">Darwix User</p>
              <p className="profile-status">
                <span
                  className={`profile-status-dot ${persistenceAvailable ? 'profile-status-dot-ready' : ''}`}
                  aria-hidden="true"
                />
                {persistenceAvailable ? 'History saved locally' : 'History unavailable'}
              </p>
            </div>
          )}
          <button
            type="button"
            className="icon-button"
            aria-label="Open settings"
            title={isCollapsed ? 'Settings' : undefined}
            onClick={onOpenSettings}
          >
            <Settings size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  )
}
