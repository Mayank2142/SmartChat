const MAX_MESSAGE_LENGTH = 4000
const MAX_HISTORY_ITEMS = 24
const MAX_ATTACHMENT_COUNT = 3
const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024

type ResponseStyle = 'concise' | 'balanced' | 'detailed'

interface AttachmentPayload {
  id: string
  name: string
  mimeType: string
  size: number
  data: string
}

interface HistoryItem {
  role: 'user' | 'bot'
  content: string
}

interface GeminiChatRequest {
  message: string
  history: HistoryItem[]
  attachments: AttachmentPayload[]
  responseStyle: ResponseStyle
}

interface GeminiConfig {
  apiKey: string
  model: string
  signal?: AbortSignal
}

interface GeminiPayload {
  output_text?: unknown
  outputs?: unknown
  steps?: unknown
  error?: { message?: unknown }
}

export class GeminiRequestError extends Error {
  status: number

  constructor(message: string, status = 400) {
    super(message)
    this.name = 'GeminiRequestError'
    this.status = status
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseHistory(value: unknown): HistoryItem[] {
  if (!Array.isArray(value)) return []
  return value
    .slice(-MAX_HISTORY_ITEMS)
    .filter(isRecord)
    .flatMap((item) => {
      if (
        (item.role !== 'user' && item.role !== 'bot') ||
        typeof item.content !== 'string'
      ) {
        return []
      }
      return [{ role: item.role, content: item.content.slice(0, MAX_MESSAGE_LENGTH) }]
    })
}

function estimateDecodedBytes(data: string) {
  return Math.floor((data.length * 3) / 4)
}

function parseAttachments(value: unknown): AttachmentPayload[] {
  if (!Array.isArray(value)) return []
  if (value.length > MAX_ATTACHMENT_COUNT) {
    throw new GeminiRequestError('Attach up to 3 files at a time.')
  }

  let totalBytes = 0
  const attachments = value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.id !== 'string' ||
      typeof item.name !== 'string' ||
      typeof item.mimeType !== 'string' ||
      typeof item.size !== 'number' ||
      typeof item.data !== 'string'
    ) {
      throw new GeminiRequestError('An attachment was invalid. Remove it and try again.')
    }
    const estimatedBytes = estimateDecodedBytes(item.data)
    totalBytes += estimatedBytes
    return {
      id: item.id.slice(0, 100),
      name: item.name.slice(0, 180),
      mimeType: item.mimeType.slice(0, 120),
      size: Math.max(0, item.size),
      data: item.data,
    }
  })

  if (totalBytes > MAX_ATTACHMENT_BYTES) {
    throw new GeminiRequestError('Attachments must be 3 MB or less in total.')
  }
  return attachments
}

function parseResponseStyle(value: unknown): ResponseStyle {
  return value === 'concise' || value === 'detailed' ? value : 'balanced'
}

export function parseGeminiChatRequest(value: unknown): GeminiChatRequest {
  if (!isRecord(value) || typeof value.message !== 'string') {
    throw new GeminiRequestError('Enter a message before sending.')
  }
  const message = value.message.trim()
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    throw new GeminiRequestError('Messages must contain 1 to 4,000 characters.')
  }
  return {
    message,
    history: parseHistory(value.history),
    attachments: parseAttachments(value.attachments),
    responseStyle: parseResponseStyle(value.responseStyle),
  }
}

function attachmentType(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.startsWith('video/')) return 'video'
  return 'document'
}

function buildPrompt(request: GeminiChatRequest) {
  const styleGuidance: Record<ResponseStyle, string> = {
    balanced: 'Be clear, helpful, and appropriately detailed.',
    concise: 'Give a direct, concise response. Prefer short paragraphs or bullets.',
    detailed: 'Give a thorough response with useful context and concrete steps.',
  }
  const history = request.history
    .map((item) => `${item.role === 'bot' ? 'Darwix AI' : 'User'}: ${item.content}`)
    .join('\n\n')

  return [
    'You are Darwix AI, a capable and friendly assistant. Answer the current user request directly. Do not claim to have completed actions you cannot perform.',
    styleGuidance[request.responseStyle],
    history ? `Conversation so far:\n${history}` : '',
    `Current user message:\n${request.message}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function readTextBlocks(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((block) => {
    if (!isRecord(block)) return []
    if (block.type === 'text' && typeof block.text === 'string') return [block.text]
    if (Array.isArray(block.content)) return readTextBlocks(block.content)
    return []
  })
}

function extractResponseText(payload: GeminiPayload) {
  if (typeof payload.output_text === 'string') return payload.output_text.trim()
  const fromOutputs = readTextBlocks(payload.outputs).join('\n').trim()
  if (fromOutputs) return fromOutputs
  return readTextBlocks(payload.steps).join('\n').trim()
}

export async function requestGemini(
  rawRequest: unknown,
  { apiKey, model, signal }: GeminiConfig,
) {
  const request = parseGeminiChatRequest(rawRequest)
  const input = [
    { type: 'text', text: buildPrompt(request) },
    ...request.attachments.map((attachment) => ({
      type: attachmentType(attachment.mimeType),
      data: attachment.data,
      mime_type: attachment.mimeType,
    })),
  ]

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/interactions',
    {
      method: 'POST',
      headers: {
        'Api-Revision': '2026-05-20',
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({ model, input }),
      signal,
    },
  )
  const payload = (await response.json().catch(() => ({}))) as GeminiPayload

  if (!response.ok) {
    const message =
      response.status === 429
        ? 'Darwix AI is receiving many requests. Wait a moment and retry.'
        : response.status === 401 || response.status === 403
          ? 'Darwix AI is not connected correctly. Ask the administrator to check the service configuration.'
          : 'Darwix AI could not complete this request. Please try again.'
    throw new GeminiRequestError(message, response.status)
  }

  const content = extractResponseText(payload)
  if (!content) {
    throw new GeminiRequestError('Darwix AI returned an empty response.', 502)
  }
  return { content, model }
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}

function readEnvironment() {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> }
  }
  return runtime.process?.env ?? {}
}

async function handleRequest(request: Request) {
  const environment = readEnvironment()
  const model = environment.GEMINI_MODEL || 'gemini-3.6-flash'
  const apiKey = environment.GEMINI_API_KEY || environment.GOOGLE_API_KEY || ''

  if (request.method === 'GET') {
    return jsonResponse({ configured: Boolean(apiKey), model })
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405, {
      Allow: 'GET, POST',
    })
  }
  if (!apiKey) {
    return jsonResponse(
      {
        error:
          'Darwix AI is not configured. Ask the administrator to finish the secure connection setup.',
      },
      503,
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return jsonResponse({ error: 'The request body must be valid JSON.' }, 400)
  }

  try {
    return jsonResponse(await requestGemini(body, { apiKey, model }))
  } catch (error) {
    const status = error instanceof GeminiRequestError ? error.status : 500
    return jsonResponse(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Darwix AI could not complete this request.',
      },
      status,
    )
  }
}

export default { fetch: handleRequest }
