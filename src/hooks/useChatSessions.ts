import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { isAbortError, mockChatService } from '../services/mockChatService'
import type { ChatMessage, ChatSession, PersistedChatState } from '../types/chat'
import { createMessage, createSession, deriveSessionTitle } from '../utils/message'
import {
  CHAT_STORAGE_VERSION,
  loadChatState,
  type LoadedChatState,
} from '../utils/storage'
import { useLocalStorage } from './useLocalStorage'

interface ChatState {
  activeSessionId: string
  pendingResponses: Record<string, number>
  sessions: ChatSession[]
}

type ChatAction =
  | { type: 'session/created'; session: ChatSession }
  | { type: 'session/selected'; sessionId: string }
  | { type: 'session/cleared'; sessionId: string; updatedAt: string }
  | {
      type: 'session/deleted'
      sessionId: string
      replacementSession: ChatSession
    }
  | { type: 'message/submitted'; sessionId: string; message: ChatMessage }
  | { type: 'message/retrying'; sessionId: string; messageId: string }
  | {
      type: 'request/succeeded'
      sessionId: string
      userMessageId: string
      botMessage: ChatMessage
    }
  | {
      type: 'request/failed'
      sessionId: string
      userMessageId: string
      errorMessage: string
      updatedAt: string
    }

interface ActiveRequest {
  controller: AbortController
  sessionId: string
}

function updatePendingCount(
  pendingResponses: Record<string, number>,
  sessionId: string,
  change: number,
) {
  return {
    ...pendingResponses,
    [sessionId]: Math.max(0, (pendingResponses[sessionId] ?? 0) + change),
  }
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'session/created':
      return {
        ...state,
        activeSessionId: action.session.id,
        sessions: [action.session, ...state.sessions],
      }

    case 'session/selected':
      return state.sessions.some((session) => session.id === action.sessionId)
        ? { ...state, activeSessionId: action.sessionId }
        : state

    case 'session/cleared':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.sessionId
            ? {
                ...session,
                title: 'New conversation',
                messages: [],
                updatedAt: action.updatedAt,
              }
            : session,
        ),
        pendingResponses: { ...state.pendingResponses, [action.sessionId]: 0 },
      }

    case 'session/deleted': {
      const remainingSessions = state.sessions.filter(
        (session) => session.id !== action.sessionId,
      )
      const sessions =
        remainingSessions.length > 0
          ? remainingSessions
          : [action.replacementSession]
      const { [action.sessionId]: _, ...remainingPendingResponses } =
        state.pendingResponses

      return {
        activeSessionId:
          state.activeSessionId === action.sessionId
            ? sessions[0].id
            : state.activeSessionId,
        sessions,
        pendingResponses: remainingPendingResponses,
      }
    }

    case 'message/submitted':
      return {
        ...state,
        sessions: state.sessions.map((session) => {
          if (session.id !== action.sessionId) return session
          const isFirstUserMessage = !session.messages.some(
            (message) => message.role === 'user',
          )
          return {
            ...session,
            title: isFirstUserMessage
              ? deriveSessionTitle(action.message.content)
              : session.title,
            messages: [...session.messages, action.message],
            updatedAt: action.message.createdAt,
          }
        }),
        pendingResponses: updatePendingCount(
          state.pendingResponses,
          action.sessionId,
          1,
        ),
      }

    case 'message/retrying':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.sessionId
            ? {
                ...session,
                messages: session.messages.map((message) =>
                  message.id === action.messageId
                    ? {
                        ...message,
                        status: 'retrying' as const,
                        errorMessage: undefined,
                      }
                    : message,
                ),
              }
            : session,
        ),
        pendingResponses: updatePendingCount(
          state.pendingResponses,
          action.sessionId,
          1,
        ),
      }

    case 'request/succeeded':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.sessionId
            ? {
                ...session,
                messages: [
                  ...session.messages.map((message) =>
                    message.id === action.userMessageId
                      ? {
                          ...message,
                          status: 'sent' as const,
                          errorMessage: undefined,
                        }
                      : message,
                  ),
                  action.botMessage,
                ],
                updatedAt: action.botMessage.createdAt,
              }
            : session,
        ),
        pendingResponses: updatePendingCount(
          state.pendingResponses,
          action.sessionId,
          -1,
        ),
      }

    case 'request/failed':
      return {
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === action.sessionId
            ? {
                ...session,
                messages: session.messages.map((message) =>
                  message.id === action.userMessageId
                    ? {
                        ...message,
                        status: 'failed' as const,
                        errorMessage: action.errorMessage,
                      }
                    : message,
                ),
                updatedAt: action.updatedAt,
              }
            : session,
        ),
        pendingResponses: updatePendingCount(
          state.pendingResponses,
          action.sessionId,
          -1,
        ),
      }
  }
}

function initializeState(loadedState: LoadedChatState): ChatState {
  const activeSessionId =
    loadedState.state.activeSessionId ?? loadedState.state.sessions[0].id
  return {
    activeSessionId,
    sessions: loadedState.state.sessions,
    pendingResponses: {},
  }
}

export function useChatSessions() {
  const [loadedState] = useState(loadChatState)
  const [state, dispatch] = useReducer(chatReducer, loadedState, initializeState)
  const stateRef = useRef(state)
  const activeRequestsRef = useRef(new Map<string, ActiveRequest>())
  stateRef.current = state

  const persistedState = useMemo<PersistedChatState>(
    () => ({
      version: CHAT_STORAGE_VERSION,
      activeSessionId: state.activeSessionId,
      sessions: state.sessions,
    }),
    [state.activeSessionId, state.sessions],
  )
  const persistence = useLocalStorage({
    initiallyAvailable: loadedState.available,
    initialWarning: loadedState.warning,
    state: persistedState,
  })

  useEffect(() => {
    const activeRequests = activeRequestsRef.current
    return () => {
      activeRequests.forEach(({ controller }) => controller.abort())
      activeRequests.clear()
    }
  }, [])

  const abortSessionRequests = useCallback((sessionId: string) => {
    activeRequestsRef.current.forEach((request, messageId) => {
      if (request.sessionId !== sessionId) return
      request.controller.abort()
      activeRequestsRef.current.delete(messageId)
    })
  }, [])

  const executeRequest = useCallback(
    async (sessionId: string, userMessage: ChatMessage, attempt: number) => {
      if (activeRequestsRef.current.has(userMessage.id)) return false

      const controller = new AbortController()
      activeRequestsRef.current.set(userMessage.id, { controller, sessionId })

      try {
        const response = await mockChatService.sendMessage(userMessage.content, {
          attempt,
          signal: controller.signal,
        })
        if (
          !response ||
          typeof response.content !== 'string' ||
          response.content.trim().length === 0
        ) {
          throw new Error('Darwix AI returned an invalid response. Please try again.')
        }

        dispatch({
          type: 'request/succeeded',
          sessionId,
          userMessageId: userMessage.id,
          botMessage: createMessage('bot', response.content),
        })
        return true
      } catch (error) {
        if (isAbortError(error)) return false

        dispatch({
          type: 'request/failed',
          sessionId,
          userMessageId: userMessage.id,
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Darwix AI could not respond. Please try again.',
          updatedAt: new Date().toISOString(),
        })
        return false
      } finally {
        activeRequestsRef.current.delete(userMessage.id)
      }
    },
    [],
  )

  const sendMessage = useCallback(
    (content: string) => {
      const sessionId = stateRef.current.activeSessionId
      const userMessage = createMessage('user', content, 'sending')
      dispatch({ type: 'message/submitted', sessionId, message: userMessage })
      return executeRequest(sessionId, userMessage, 0)
    },
    [executeRequest],
  )

  const retryMessage = useCallback(
    (messageId: string) => {
      const sessionId = stateRef.current.activeSessionId
      const session = stateRef.current.sessions.find(
        (candidate) => candidate.id === sessionId,
      )
      const message = session?.messages.find(
        (candidate) => candidate.id === messageId,
      )
      if (
        !message ||
        message.role !== 'user' ||
        message.status !== 'failed' ||
        activeRequestsRef.current.has(messageId)
      ) {
        return Promise.resolve(false)
      }

      dispatch({ type: 'message/retrying', sessionId, messageId })
      return executeRequest(sessionId, message, 1)
    },
    [executeRequest],
  )

  const createNewChat = useCallback(() => {
    const session = createSession()
    dispatch({ type: 'session/created', session })
    return session.id
  }, [])

  const selectSession = useCallback((sessionId: string) => {
    dispatch({ type: 'session/selected', sessionId })
  }, [])

  const clearSession = useCallback(
    (sessionId: string) => {
      abortSessionRequests(sessionId)
      dispatch({
        type: 'session/cleared',
        sessionId,
        updatedAt: new Date().toISOString(),
      })
    },
    [abortSessionRequests],
  )

  const deleteSession = useCallback(
    (sessionId: string) => {
      abortSessionRequests(sessionId)
      dispatch({
        type: 'session/deleted',
        sessionId,
        replacementSession: createSession(),
      })
    },
    [abortSessionRequests],
  )

  const activeSession =
    state.sessions.find((session) => session.id === state.activeSessionId) ??
    state.sessions[0]
  const sessions = useMemo(
    () =>
      [...state.sessions].sort(
        (first, second) =>
          new Date(second.updatedAt).getTime() -
          new Date(first.updatedAt).getTime(),
      ),
    [state.sessions],
  )
  const pendingResponses = state.pendingResponses[activeSession.id] ?? 0

  return {
    activeSession,
    clearSession,
    createNewChat,
    deleteSession,
    isTyping: pendingResponses > 0,
    pendingResponses,
    persistence,
    retryMessage,
    selectSession,
    sendMessage,
    sessions,
  }
}
