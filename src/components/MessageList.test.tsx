import { useRef, useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ChatMessage as ChatMessageType } from '../types/chat'
import { ChatMessage } from './ChatMessage'
import {
  INITIAL_MESSAGE_WINDOW,
  MESSAGE_WINDOW_BATCH,
  MessageList,
} from './MessageList'

function createMessages(count: number): ChatMessageType[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `message-${index + 1}`,
    role: index % 2 === 0 ? 'user' : 'bot',
    content: `Message ${index + 1}`,
    createdAt: new Date(2026, 0, 1, 0, 0, index).toISOString(),
    status: 'sent',
  }))
}

function LargeHistoryHarness({ initialCount }: { initialCount: number }) {
  const [messages, setMessages] = useState(() => createMessages(initialCount))
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div ref={containerRef} data-testid="history-container">
      <button
        type="button"
        onClick={() =>
          setMessages((currentMessages) => [
            ...currentMessages,
            ...createMessages(1).map((message) => ({
              ...message,
              id: `message-${currentMessages.length + 1}`,
              content: `Message ${currentMessages.length + 1}`,
            })),
          ])
        }
      >
        Append message
      </button>
      <MessageList containerRef={containerRef} messages={messages} />
    </div>
  )
}

describe('large conversation rendering', () => {
  it.each([500, 1000, 5000, 10000])(
    'keeps a %d-message history within the stable DOM window',
    (messageCount) => {
      render(<LargeHistoryHarness initialCount={messageCount} />)

      expect(screen.getAllByRole('article')).toHaveLength(
        INITIAL_MESSAGE_WINDOW,
      )
      expect(
        screen.getByText(
          `Showing ${INITIAL_MESSAGE_WINDOW.toLocaleString()} of ${messageCount.toLocaleString()}`,
        ),
      ).toBeInTheDocument()
    },
  )

  it('loads older messages in bounded batches and preserves the visible anchor', async () => {
    const user = userEvent.setup()
    render(<LargeHistoryHarness initialCount={10000} />)
    const container = screen.getByTestId('history-container')

    Object.defineProperties(container, {
      scrollHeight: {
        configurable: true,
        get: () => container.querySelectorAll('article').length * 50,
      },
      scrollTop: { configurable: true, writable: true, value: 100 },
    })

    expect(screen.getByText('Message 9841')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: /load 160 older messages/i }),
    )

    expect(screen.getAllByRole('article')).toHaveLength(
      INITIAL_MESSAGE_WINDOW + MESSAGE_WINDOW_BATCH,
    )
    expect(screen.getByText('Message 9681')).toBeInTheDocument()
    expect(container.scrollTop).toBe(8100)
  })

  it('retains the oldest visible message when a new response is appended', async () => {
    const user = userEvent.setup()
    render(<LargeHistoryHarness initialCount={10000} />)

    expect(screen.getByText('Message 9841')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /append message/i }))

    expect(screen.getByText('Message 9841')).toBeInTheDocument()
    expect(screen.getByText('Message 10001')).toBeInTheDocument()
  })
})

describe('bot message actions', () => {
  it('renders assistant Markdown as semantic content without raw markers', () => {
    const message: ChatMessageType = {
      id: 'markdown-message',
      role: 'bot',
      content: '**Focus first**\n\n- Pick one task\n- Set a timer',
      createdAt: '2026-08-18T10:30:00.000Z',
      status: 'sent',
    }

    render(<ChatMessage message={message} />)
    expect(screen.getByText('Focus first').tagName).toBe('STRONG')
    expect(screen.getByRole('list')).toHaveTextContent('Pick one task')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('cleans escaped and malformed emphasis markers from assistant answers', () => {
    const message: ChatMessageType = {
      id: 'clean-markdown-message',
      role: 'bot',
      content:
        'The full form of \\*\\*API\\*\\* is **Application Programming Interface**.\n\nUse *clear language* and fix **unmatched markers.',
      createdAt: '2026-08-18T10:30:00.000Z',
      status: 'sent',
    }

    render(<ChatMessage message={message} />)

    expect(screen.getByText('API').tagName).toBe('STRONG')
    expect(screen.getByText('Application Programming Interface').tagName).toBe(
      'STRONG',
    )
    expect(screen.getByText('clear language').tagName).toBe('EM')
    expect(screen.getByText(/fix unmatched markers/i)).toBeInTheDocument()
    expect(screen.getByRole('article')).not.toHaveTextContent('**')
  })

  it('copies a bot response without moving keyboard focus', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })
    const message: ChatMessageType = {
      id: 'copy-message',
      role: 'bot',
      content: 'Copy this useful response.',
      createdAt: '2026-08-18T10:30:00.000Z',
      status: 'sent',
    }

    render(<ChatMessage message={message} />)
    const copyButton = screen.getByRole('button', { name: /copy bot message/i })
    await user.click(copyButton)

    expect(writeText).toHaveBeenCalledWith('Copy this useful response.')
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /copied bot message/i }),
      ).toHaveFocus()
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      'Bot message copied to clipboard.',
    )
  })
})
