import type {
  AttachmentPayload,
  MessageRole,
  ResponseStyle,
} from '../types/chat'

export interface ChatHistoryItem {
  role: MessageRole
  content: string
}

export interface ChatServiceResponse {
  content: string
  model?: string
}

interface SendMessageOptions {
  attachments?: AttachmentPayload[]
  history?: ChatHistoryItem[]
  responseStyle?: ResponseStyle
  signal?: AbortSignal
}

export interface GeminiStatus {
  configured: boolean
  model: string
}

export class ChatServiceError extends Error {
  status?: number

  constructor(
    message = 'Darwix AI could not respond. Please try again.',
    status?: number,
  ) {
    super(message)
    this.name = 'ChatServiceError'
    this.status = status
  }
}

async function readError(response: Response) {
  try {
    const payload = (await response.json()) as { error?: unknown }
    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error
    }
  } catch {
    // The status-specific fallback below is clearer than a JSON parse failure.
  }

  if (response.status === 429) {
    return 'Gemini is receiving too many requests. Wait a moment and retry.'
  }
  if (response.status === 503) {
    return 'Gemini is not configured yet. Add GEMINI_API_KEY to the server environment.'
  }
  return 'Darwix AI could not complete this request. Please try again.'
}

async function sendMessage(
  content: string,
  options: SendMessageOptions = {},
): Promise<ChatServiceResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: content,
      history: options.history ?? [],
      attachments: options.attachments ?? [],
      responseStyle: options.responseStyle ?? 'balanced',
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new ChatServiceError(await readError(response), response.status)
  }

  const payload = (await response.json()) as {
    content?: unknown
    model?: unknown
  }
  if (typeof payload.content !== 'string' || !payload.content.trim()) {
    throw new ChatServiceError('Gemini returned an empty response. Please retry.')
  }

  return {
    content: payload.content.trim(),
    model: typeof payload.model === 'string' ? payload.model : undefined,
  }
}

async function getStatus(signal?: AbortSignal): Promise<GeminiStatus> {
  const response = await fetch('/api/chat', { signal })
  if (!response.ok) throw new ChatServiceError('Could not check Gemini status.')
  const payload = (await response.json()) as Partial<GeminiStatus>
  return {
    configured: payload.configured === true,
    model: typeof payload.model === 'string' ? payload.model : 'Gemini',
  }
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError'
}

export const chatService = { getStatus, sendMessage }
