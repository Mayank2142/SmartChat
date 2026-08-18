import type {
  ChatMessage,
  ChatSession,
  MessageRole,
  MessageStatus,
} from '../types/chat'

export const MAX_MESSAGE_LENGTH = 4000

export function normalizeMessageContent(content: string) {
  return content.trim()
}

export function createMessage(
  role: MessageRole,
  content: string,
  status: MessageStatus = 'sent',
): ChatMessage {
  return {
    id: globalThis.crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
  }
}

export function deriveSessionTitle(content: string) {
  const normalizedTitle = content.replace(/\s+/g, ' ').trim()
  if (!normalizedTitle) return 'New conversation'
  return normalizedTitle.length > 42
    ? `${normalizedTitle.slice(0, 41).trimEnd()}…`
    : normalizedTitle
}

export function createSession(): ChatSession {
  const timestamp = new Date().toISOString()
  return {
    id: globalThis.crypto.randomUUID(),
    title: 'New conversation',
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}
