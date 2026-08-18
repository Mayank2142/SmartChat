import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { chatService, isAbortError } from '../services/chatService'
import type {
  AttachmentPayload,
  ChatMessage,
  ChatSession,
  PersistedChatState,
  ResponseStyle,
} from '../types/chat'
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
  | { type: 'session/temporary-created'; session: ChatSession }
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
        sessions: [
          action.session,
          ...state.sessions.filter((session) => !session.isTemporary),
        ],
      }

    case 'session/temporary-created':
      return {
        ...state,
        activeSessionId: action.session.id,
        sessions: [
          action.session,
          ...state.sessions.filter((session) => !session.isTemporary),
        ],
      }

    case 'session/selected':
      return state.sessions.some((session) => session.id === action.sessionId)
        ? {
            ...state,
            activeSessionId: action.sessionId,
            sessions: state.sessions.filter(
              (session) => !session.isTemporary || session.id === action.sessionId,
            ),
          }
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
  const attachmentPayloadsRef = useRef(new Map<string, AttachmentPayload[]>())
  stateRef.current = state

  const persistedState = useMemo<PersistedChatState>(
    () => {
      const sessions = state.sessions.filter((session) => !session.isTemporary)
      return {
        version: CHAT_STORAGE_VERSION,
        activeSessionId: sessions.some(
          (session) => session.id === state.activeSessionId,
        )
          ? state.activeSessionId
          : (sessions[0]?.id ?? null),
        sessions,
      }
    },
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
      attachmentPayloadsRef.current.delete(messageId)
    })
  }, [])

  const clearSessionAttachmentPayloads = useCallback((sessionId: string) => {
    const session = stateRef.current.sessions.find(
      (candidate) => candidate.id === sessionId,
    )
    session?.messages.forEach((message) => {
      attachmentPayloadsRef.current.delete(message.id)
    })
  }, [])

  const executeRequest = useCallback(
    async (
      sessionId: string,
      userMessage: ChatMessage,
      responseStyle: ResponseStyle,
    ) => {
      if (activeRequestsRef.current.has(userMessage.id)) return false

      const controller = new AbortController()
      activeRequestsRef.current.set(userMessage.id, { controller, sessionId })

      try {
        const session = stateRef.current.sessions.find(
          (candidate) => candidate.id === sessionId,
        )
        const history = (session?.messages ?? [])
          .filter(
            (message) =>
              message.id !== userMessage.id &&
              message.status === 'sent' &&
              message.content.trim().length > 0,
          )
          .map((message) => ({ role: message.role, content: message.content }))
        const response = await chatService.sendMessage(userMessage.content, {
          attachments: attachmentPayloadsRef.current.get(userMessage.id),
          history,
          responseStyle,
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
        attachmentPayloadsRef.current.delete(userMessage.id)
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
    (
      content: string,
      attachments: AttachmentPayload[] = [],
      responseStyle: ResponseStyle = 'balanced',
    ) => {
      const sessionId = stateRef.current.activeSessionId
      const userMessage = createMessage(
        'user',
        content,
        'sending',
        attachments.map(({ data: _, ...attachment }) => attachment),
      )
      if (attachments.length > 0) {
        attachmentPayloadsRef.current.set(userMessage.id, attachments)
      }
      dispatch({ type: 'message/submitted', sessionId, message: userMessage })
      return executeRequest(sessionId, userMessage, responseStyle)
    },
    [executeRequest],
  )

  const retryMessage = useCallback(
    (messageId: string, responseStyle: ResponseStyle = 'balanced') => {
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
      return executeRequest(sessionId, message, responseStyle)
    },
    [executeRequest],
  )

  const createNewChat = useCallback(() => {
    const session = createSession()
    dispatch({ type: 'session/created', session })
    return session.id
  }, [])

  const createTemporaryChat = useCallback(() => {
    const existingTemporarySession = stateRef.current.sessions.find(
      (session) => session.isTemporary,
    )
    if (existingTemporarySession) {
      abortSessionRequests(existingTemporarySession.id)
      clearSessionAttachmentPayloads(existingTemporarySession.id)
    }
    const session = createSession({ temporary: true })
    dispatch({ type: 'session/temporary-created', session })
    return session.id
  }, [abortSessionRequests, clearSessionAttachmentPayloads])

  const selectSession = useCallback(
    (sessionId: string) => {
      const activeSession = stateRef.current.sessions.find(
        (session) => session.id === stateRef.current.activeSessionId,
      )
      if (activeSession?.isTemporary && activeSession.id !== sessionId) {
        abortSessionRequests(activeSession.id)
        clearSessionAttachmentPayloads(activeSession.id)
      }
      dispatch({ type: 'session/selected', sessionId })
    },
    [abortSessionRequests, clearSessionAttachmentPayloads],
  )

  const clearSession = useCallback(
    (sessionId: string) => {
      abortSessionRequests(sessionId)
      clearSessionAttachmentPayloads(sessionId)
      dispatch({
        type: 'session/cleared',
        sessionId,
        updatedAt: new Date().toISOString(),
      })
    },
    [abortSessionRequests, clearSessionAttachmentPayloads],
  )

  const deleteSession = useCallback(
    (sessionId: string) => {
      abortSessionRequests(sessionId)
      clearSessionAttachmentPayloads(sessionId)
      dispatch({
        type: 'session/deleted',
        sessionId,
        replacementSession: createSession(),
      })
    },
    [abortSessionRequests, clearSessionAttachmentPayloads],
  )

  const activeSession =
    state.sessions.find((session) => session.id === state.activeSessionId) ??
    state.sessions[0]
  const sessions = useMemo(
    () =>
      state.sessions
        .filter((session) => !session.isTemporary)
        .sort(
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
    createTemporaryChat,
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
