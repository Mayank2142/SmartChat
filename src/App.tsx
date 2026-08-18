import { useCallback, useRef, useState } from 'react'
import { AppHeader } from './components/AppHeader'
import { ChatComposer } from './components/ChatComposer'
import {
  ConfirmSessionDialog,
  type SessionAction,
} from './components/ConfirmSessionDialog'
import { EmptyChatState } from './components/EmptyChatState'
import { JumpToLatestButton } from './components/JumpToLatestButton'
import { MessageList } from './components/MessageList'
import { MobileSessionDrawer } from './components/MobileSessionDrawer'
import { SessionSidebar } from './components/SessionSidebar'
import { SettingsDialog } from './components/SettingsDialog'
import { useAutoScroll } from './hooks/useAutoScroll'
import { useAppPreferences } from './hooks/useAppPreferences'
import { useChatAnnouncement } from './hooks/useChatAnnouncement'
import { useChatSessions } from './hooks/useChatSessions'
import type { ChatSession } from './types/chat'

interface PendingSessionAction {
  action: SessionAction
  session: ChatSession
}

function App() {
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [draft, setDraft] = useState('')
  const [pendingSessionAction, setPendingSessionAction] =
    useState<PendingSessionAction | null>(null)
  const navigationTriggerRef = useRef<HTMLDivElement>(null)
  const composerInputRef = useRef<HTMLTextAreaElement>(null)
  const messageCanvasRef = useRef<HTMLDivElement>(null)
  const { responseStyle, setResponseStyle, setTheme, theme } =
    useAppPreferences()
  const {
    activeSession,
    createNewChat,
    createTemporaryChat,
    deleteSession,
    isTyping,
    pendingResponses,
    persistence,
    retryMessage,
    selectSession,
    sendMessage,
    sessions,
  } = useChatSessions()
  const messages = activeSession.messages
  const latestMessage = messages.at(-1)
  const chatAnnouncement = useChatAnnouncement(
    activeSession.id,
    latestMessage,
  )
  const contentKey = [
    messages.length,
    latestMessage?.id ?? 'empty',
    latestMessage?.status ?? 'idle',
    isTyping ? 'typing' : 'resting',
    pendingResponses,
  ].join(':')
  const { scrollToLatest, showJumpToLatest } = useAutoScroll({
    containerRef: messageCanvasRef,
    contentKey,
    contextKey: activeSession.id,
  })

  const focusComposer = useCallback(() => {
    window.requestAnimationFrame(() => composerInputRef.current?.focus())
  }, [])

  const openNavigation = useCallback(() => {
    setNavigationOpen(true)
  }, [])

  const closeNavigation = useCallback(() => {
    setNavigationOpen(false)
    window.requestAnimationFrame(() => {
      navigationTriggerRef.current
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus()
    })
  }, [])

  const openSettings = useCallback(() => {
    setNavigationOpen(false)
    setSettingsOpen(true)
  }, [])

  const selectSuggestion = useCallback(
    (prompt: string) => {
      setDraft(prompt)
      focusComposer()
    },
    [focusComposer],
  )

  const retryFailedMessage = useCallback(
    async (messageId: string) => {
      const succeeded = await retryMessage(messageId, responseStyle)
      if (succeeded) composerInputRef.current?.focus()
    },
    [responseStyle, retryMessage],
  )

  const handleRetry = useCallback(
    (messageId: string) => {
      void retryFailedMessage(messageId)
    },
    [retryFailedMessage],
  )

  const startNewChat = useCallback(() => {
    createNewChat()
    setDraft('')
    focusComposer()
  }, [createNewChat, focusComposer])

  const startTemporaryChat = useCallback(() => {
    createTemporaryChat()
    setDraft('')
    setNavigationOpen(false)
    focusComposer()
  }, [createTemporaryChat, focusComposer])

  const switchSession = useCallback(
    (sessionId: string) => {
      selectSession(sessionId)
      setDraft('')
      focusComposer()
    },
    [focusComposer, selectSession],
  )

  const requestDeleteSession = useCallback((session: ChatSession) => {
    setPendingSessionAction({ action: 'delete', session })
  }, [])

  const confirmSessionAction = useCallback(() => {
    if (!pendingSessionAction) return

    if (pendingSessionAction.action === 'delete') {
      deleteSession(pendingSessionAction.session.id)
    }
    setPendingSessionAction(null)
    setNavigationOpen(false)
    setDraft('')
    focusComposer()
  }, [deleteSession, focusComposer, pendingSessionAction])

  const sidebarProps = {
    activeSessionId: activeSession.id,
    persistenceAvailable: persistence.available,
    sessions,
    theme,
    onDeleteSession: (session: ChatSession) => requestDeleteSession(session),
    onNewChat: startNewChat,
    onOpenSettings: openSettings,
    onSelectSession: switchSession,
    onThemeChange: setTheme,
  }

  return (
    <div className="app-background">
      <div aria-hidden="true" className="ambient ambient-primary" />
      <div aria-hidden="true" className="ambient ambient-secondary" />

      <div
        className={`app-frame ${sidebarCollapsed ? 'app-frame-sidebar-collapsed' : ''}`}
        inert={
          navigationOpen || pendingSessionAction !== null || settingsOpen
            ? true
            : undefined
        }
      >
        <a className="skip-link" href="#conversation-messages">
          Skip to conversation
        </a>
        <a className="skip-link" href="#chat-message">
          Skip to message composer
        </a>
        <aside
          className={`sidebar-panel hidden min-h-0 lg:block ${sidebarCollapsed ? 'sidebar-panel-collapsed' : ''}`}
          aria-label="Chat navigation"
        >
          <SessionSidebar
            {...sidebarProps}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed((collapsed) => !collapsed)}
          />
        </aside>

        <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
          <div ref={navigationTriggerRef}>
            <AppHeader
              isTemporary={Boolean(activeSession.isTemporary)}
              isTyping={isTyping}
              navigationOpen={navigationOpen}
              title={activeSession.title}
              onOpenNavigation={openNavigation}
              onTemporaryChat={startTemporaryChat}
            />
          </div>

          <main className="chat-panel" aria-label="Current conversation">
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {chatAnnouncement}
            </div>
            {persistence.warning && (
              <p className="persistence-warning" role="status">
                {persistence.warning}
              </p>
            )}
            {activeSession.isTemporary && (
              <div className="temporary-chat-notice" role="status">
                Temporary chat · Messages in this conversation are not saved to history.
              </div>
            )}
            <div className="message-stage">
              <div
                ref={messageCanvasRef}
                id="conversation-messages"
                className="message-canvas"
                role="log"
                aria-label="Conversation messages"
                aria-live="off"
                tabIndex={-1}
              >
                {messages.length === 0 ? (
                  <EmptyChatState onSelectSuggestion={selectSuggestion} />
                ) : (
                  <MessageList
                    key={activeSession.id}
                    containerRef={messageCanvasRef}
                    messages={messages}
                    isTyping={isTyping}
                    pendingResponses={pendingResponses}
                    onRetry={handleRetry}
                  />
                )}
              </div>
              <JumpToLatestButton
                visible={showJumpToLatest}
                onClick={() => scrollToLatest()}
              />
            </div>
            <ChatComposer
              key={activeSession.id}
              inputRef={composerInputRef}
              value={draft}
              onOpenSettings={openSettings}
              onValueChange={setDraft}
              onSend={(content, attachments) => {
                void sendMessage(content, attachments, responseStyle)
              }}
            />
          </main>
        </div>
      </div>

      <MobileSessionDrawer
        {...sidebarProps}
        backgroundInert={pendingSessionAction !== null || settingsOpen}
        open={navigationOpen}
        onClose={closeNavigation}
      />

      {settingsOpen && (
        <SettingsDialog
          responseStyle={responseStyle}
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          onResponseStyleChange={setResponseStyle}
          onThemeChange={setTheme}
        />
      )}

      {pendingSessionAction && (
        <ConfirmSessionDialog
          action={pendingSessionAction.action}
          session={pendingSessionAction.session}
          onCancel={() => setPendingSessionAction(null)}
          onConfirm={confirmSessionAction}
        />
      )}
    </div>
  )
}

export default App
