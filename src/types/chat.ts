export type MessageRole = 'user' | 'bot'

export type MessageStatus = 'sending' | 'sent' | 'failed' | 'retrying'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status: MessageStatus
  errorMessage?: string
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface PersistedChatState {
  version: 1
  activeSessionId: string | null
  sessions: ChatSession[]
}
