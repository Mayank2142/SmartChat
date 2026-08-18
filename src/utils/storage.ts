import type {
  ChatMessage,
  ChatSession,
  MessageRole,
  MessageStatus,
  PersistedChatState,
} from '../types/chat'
import { createSession, deriveSessionTitle } from './message'

export const CHAT_STORAGE_KEY = 'darwix-ai-chat-state'
export const CHAT_STORAGE_VERSION = 1 as const

const validRoles = new Set<MessageRole>(['user', 'bot'])
const validStatuses = new Set<MessageStatus>([
  'sending',
  'sent',
  'failed',
  'retrying',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

function parseMessage(value: unknown): ChatMessage | null {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string' ||
    typeof value.content !== 'string' ||
    !isValidDate(value.createdAt) ||
    !validRoles.has(value.role as MessageRole) ||
    !validStatuses.has(value.status as MessageStatus)
  ) {
    return null
  }

  const interrupted = value.status === 'sending' || value.status === 'retrying'
  return {
    id: value.id,
    role: value.role as MessageRole,
    content: value.content,
    createdAt: value.createdAt,
    status: interrupted ? 'failed' : (value.status as MessageStatus),
    errorMessage: interrupted
      ? 'This request was interrupted when the page reloaded.'
      : typeof value.errorMessage === 'string'
        ? value.errorMessage
        : undefined,
  }
}

function parseSession(value: unknown): ChatSession | null {
  if (!isRecord(value) || typeof value.id !== 'string') return null

  const messages = Array.isArray(value.messages)
    ? value.messages.map(parseMessage).filter((message) => message !== null)
    : []
  const createdAt = isValidDate(value.createdAt)
    ? value.createdAt
    : new Date().toISOString()
  const updatedAt = isValidDate(value.updatedAt) ? value.updatedAt : createdAt
  const firstUserMessage = messages.find((message) => message.role === 'user')

  return {
    id: value.id,
    title:
      typeof value.title === 'string' && value.title.trim()
        ? value.title.slice(0, 80)
        : firstUserMessage
          ? deriveSessionTitle(firstUserMessage.content)
          : 'New conversation',
    messages,
    createdAt,
    updatedAt,
  }
}

export function createFreshChatState(): PersistedChatState {
  const session = createSession()
  return {
    version: CHAT_STORAGE_VERSION,
    activeSessionId: session.id,
    sessions: [session],
  }
}

export interface LoadedChatState {
  available: boolean
  state: PersistedChatState
  warning?: string
}

export function loadChatState(): LoadedChatState {
  if (typeof window === 'undefined') {
    return { available: false, state: createFreshChatState() }
  }

  let storedValue: string | null
  try {
    storedValue = window.localStorage.getItem(CHAT_STORAGE_KEY)
  } catch {
    return {
      available: false,
      state: createFreshChatState(),
      warning: 'Chat history is unavailable. This session will remain in memory.',
    }
  }
  if (!storedValue) return { available: true, state: createFreshChatState() }

  let parsed: unknown
  try {
    parsed = JSON.parse(storedValue)
  } catch {
    return {
      available: true,
      state: createFreshChatState(),
      warning: 'Saved history was corrupted and could not be restored.',
    }
  }

  try {
    if (!isRecord(parsed) || parsed.version !== CHAT_STORAGE_VERSION) {
      return {
        available: true,
        state: createFreshChatState(),
        warning: 'Saved history used an unsupported format and was reset.',
      }
    }

    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.map(parseSession).filter((session) => session !== null)
      : []
    if (sessions.length === 0) {
      return {
        available: true,
        state: createFreshChatState(),
        warning: 'Saved history was invalid and could not be restored.',
      }
    }

    const requestedActiveId =
      typeof parsed.activeSessionId === 'string' ? parsed.activeSessionId : null
    const activeSessionId = sessions.some(
      (session) => session.id === requestedActiveId,
    )
      ? requestedActiveId
      : sessions[0].id

    return {
      available: true,
      state: {
        version: CHAT_STORAGE_VERSION,
        activeSessionId,
        sessions,
      },
    }
  } catch {
    return {
      available: true,
      state: createFreshChatState(),
      warning: 'Saved history was invalid and could not be restored.',
    }
  }
}

export function saveChatState(state: PersistedChatState) {
  try {
    window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
