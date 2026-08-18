export interface MockBotResponse {
  content: string
}

interface SendMessageOptions {
  attempt?: number
  signal?: AbortSignal
  delayMs?: number
}

export class MockChatServiceError extends Error {
  constructor(message = 'Darwix AI could not respond. Please try again.') {
    super(message)
    this.name = 'MockChatServiceError'
  }
}

function deterministicDelay(content: string) {
  const contentScore = [...content].reduce(
    (score, character) => score + character.charCodeAt(0),
    0,
  )
  return 850 + (contentScore % 700)
}

function wait(delayMs: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('The request was cancelled.', 'AbortError'))
      return
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort)
      resolve()
    }, delayMs)

    function handleAbort() {
      window.clearTimeout(timer)
      reject(new DOMException('The request was cancelled.', 'AbortError'))
    }

    signal?.addEventListener('abort', handleAbort, { once: true })
  })
}

function createResponse(content: string) {
  const normalizedContent = content.toLowerCase()

  if (normalizedContent.includes('accessib')) {
    return 'A strong accessible chat starts with semantic landmarks, predictable focus, keyboard-friendly controls, and carefully scoped live-region announcements.'
  }

  if (normalizedContent.includes('design') || normalizedContent.includes('interface')) {
    return 'I would begin with a clear visual hierarchy, readable message widths, restrained glass surfaces, and interaction states that remain obvious on every screen size.'
  }

  if (normalizedContent.includes('project') || normalizedContent.includes('plan')) {
    return 'Let’s turn that into a practical plan: define the outcome, separate the work into verifiable phases, and test each high-risk interaction before adding polish.'
  }

  return `I’m ready to help with “${content.slice(0, 120)}${content.length > 120 ? '…' : ''}”. We can break it into clear steps and work through the most important part first.`
}

async function sendMessage(
  content: string,
  options: SendMessageOptions = {},
): Promise<MockBotResponse> {
  await wait(options.delayMs ?? deterministicDelay(content), options.signal)

  const normalizedContent = content.toLowerCase()
  if (
    normalizedContent.includes('/fail-always') ||
    (normalizedContent.includes('/fail') && (options.attempt ?? 0) === 0)
  ) {
    throw new MockChatServiceError()
  }

  return { content: createResponse(content) }
}

export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

export const mockChatService = { sendMessage }
