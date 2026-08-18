import type {
  ChatMessage,
  ChatSession,
  MessageAttachment,
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
  attachments?: MessageAttachment[],
): ChatMessage {
  return {
    id: globalThis.crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
    attachments,
  }
}

export function deriveSessionTitle(content: string) {
  const normalizedTitle = content.replace(/\s+/g, ' ').trim()
  if (!normalizedTitle) return 'New conversation'
  return normalizedTitle.length > 42
    ? `${normalizedTitle.slice(0, 41).trimEnd()}…`
    : normalizedTitle
}

export function createSession(options: { temporary?: boolean } = {}): ChatSession {
  const timestamp = new Date().toISOString()
  return {
    id: globalThis.crypto.randomUUID(),
    title: options.temporary ? 'Temporary chat' : 'New conversation',
    messages: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    isTemporary: options.temporary || undefined,
  }
}
