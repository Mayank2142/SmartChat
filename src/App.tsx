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
import { useAutoScroll } from './hooks/useAutoScroll'
import { useChatAnnouncement } from './hooks/useChatAnnouncement'
import { useChatSessions } from './hooks/useChatSessions'
import type { ChatSession } from './types/chat'

interface PendingSessionAction {
  action: SessionAction
  session: ChatSession
}

function App() {
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [pendingSessionAction, setPendingSessionAction] =
    useState<PendingSessionAction | null>(null)
  const navigationTriggerRef = useRef<HTMLDivElement>(null)
  const composerInputRef = useRef<HTMLTextAreaElement>(null)
  const messageCanvasRef = useRef<HTMLDivElement>(null)
  const {
    activeSession,
    clearSession,
    createNewChat,
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

  const selectSuggestion = useCallback(
    (prompt: string) => {
      setDraft(prompt)
      focusComposer()
    },
    [focusComposer],
  )

  const retryFailedMessage = useCallback(
    async (messageId: string) => {
      const succeeded = await retryMessage(messageId)
      if (succeeded) composerInputRef.current?.focus()
    },
    [retryMessage],
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

  const requestClearSession = useCallback(() => {
    setPendingSessionAction({ action: 'clear', session: activeSession })
  }, [activeSession])

  const confirmSessionAction = useCallback(() => {
    if (!pendingSessionAction) return

    if (pendingSessionAction.action === 'delete') {
      deleteSession(pendingSessionAction.session.id)
    } else {
      clearSession(pendingSessionAction.session.id)
    }
    setPendingSessionAction(null)
    setNavigationOpen(false)
    setDraft('')
    focusComposer()
  }, [clearSession, deleteSession, focusComposer, pendingSessionAction])

  const sidebarProps = {
    activeSessionId: activeSession.id,
    persistenceAvailable: persistence.available,
    sessions,
    onDeleteSession: (session: ChatSession) => requestDeleteSession(session),
    onNewChat: startNewChat,
    onSelectSession: switchSession,
  }

  return (
    <div className="app-background">
      <div aria-hidden="true" className="ambient ambient-primary" />
      <div aria-hidden="true" className="ambient ambient-secondary" />

      <div
        className="app-frame"
        inert={navigationOpen || pendingSessionAction !== null ? true : undefined}
      >
        <a className="skip-link" href="#conversation-messages">
          Skip to conversation
        </a>
        <a className="skip-link" href="#chat-message">
          Skip to message composer
        </a>
        <aside className="sidebar-panel hidden min-h-0 lg:block" aria-label="Chat navigation">
          <SessionSidebar {...sidebarProps} />
        </aside>

        <div className="grid min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)]">
          <div ref={navigationTriggerRef}>
            <AppHeader
              canClear={messages.length > 0}
              isTyping={isTyping}
              navigationOpen={navigationOpen}
              title={activeSession.title}
              onClearChat={requestClearSession}
              onNewChat={startNewChat}
              onOpenNavigation={openNavigation}
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
              inputRef={composerInputRef}
              value={draft}
              onValueChange={setDraft}
              onSend={sendMessage}
            />
          </main>
        </div>
      </div>

      <MobileSessionDrawer
        {...sidebarProps}
        backgroundInert={pendingSessionAction !== null}
        open={navigationOpen}
        onClose={closeNavigation}
      />

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
