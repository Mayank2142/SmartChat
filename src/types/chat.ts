export type MessageRole = 'user' | 'bot'

export type MessageStatus = 'sending' | 'sent' | 'failed' | 'retrying'

export type ThemeMode = 'light' | 'dark'

export type ResponseStyle = 'balanced' | 'concise' | 'detailed'

export interface MessageAttachment {
  id: string
  name: string
  mimeType: string
  size: number
}

export interface AttachmentPayload extends MessageAttachment {
  data: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  status: MessageStatus
  errorMessage?: string
  attachments?: MessageAttachment[]
}

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
  isTemporary?: boolean
}

export interface PersistedChatState {
  version: 1
  activeSessionId: string | null
  sessions: ChatSession[]
}
