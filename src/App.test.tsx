import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { ChatMessage } from './components/ChatMessage'
import {
  MockChatServiceError,
  mockChatService,
} from './services/mockChatService'
import type { ChatMessage as ChatMessageType } from './types/chat'
import { CHAT_STORAGE_KEY } from './utils/storage'

describe('responsive application shell', () => {
  it('renders the chat landmarks, empty state, and composer', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /new conversation/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /what can we build together/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('log', { name: /conversation messages/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/message darwix ai/i)).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /skip to conversation/i }),
    ).toHaveAttribute('href', '#conversation-messages')
    expect(
      screen.getByRole('link', { name: /skip to message composer/i }),
    ).toHaveAttribute('href', '#chat-message')
  })

  it('opens and closes the mobile navigation with the keyboard', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: /open chat navigation/i }))
    const closeButton = screen.getByRole('button', {
      name: /close chat navigation/i,
    })
    expect(closeButton).toHaveFocus()
    expect(
      screen.getByRole('dialog', { name: /chat navigation/i }),
    ).toBeInTheDocument()
    expect(document.querySelector('.app-frame')).toHaveAttribute('inert')

    await user.tab({ shift: true })
    const navigationDialog = screen.getByRole('dialog', {
      name: /chat navigation/i,
    })
    expect(
      within(navigationDialog).getByRole('button', {
        name: /delete new conversation/i,
      }),
    ).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('button', { name: /close chat navigation/i }),
    ).not.toBeInTheDocument()
  })

  it('sends a local message with Enter and returns focus to the composer', async () => {
    const user = userEvent.setup()
    render(<App />)
    const composer = screen.getByLabelText(/message darwix ai/i)

    await user.type(composer, 'Plan an accessible chat experience{Enter}')

    const message = screen.getByRole('article', { name: /your message/i })
    expect(
      within(message).getByText('Plan an accessible chat experience'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/what can we build together/i)).not.toBeInTheDocument()
    expect(composer).toHaveValue('')
    expect(composer).toHaveFocus()
  })

  it('preserves a Shift + Enter newline and prevents rapid duplicates', async () => {
    const user = userEvent.setup()
    render(<App />)
    const composer = screen.getByLabelText(/message darwix ai/i)

    await user.type(composer, 'First line')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(composer, 'Second line')
    expect(composer).toHaveValue('First line\nSecond line')

    const sendButton = screen.getByRole('button', { name: /send message/i })
    await user.dblClick(sendButton)

    const messages = screen.getAllByRole('article', { name: /your message/i })
    expect(messages).toHaveLength(1)
    expect(messages[0]).toHaveTextContent(/First line\s+Second line/)
  })

  it('blocks whitespace-only input and fills the composer from a suggestion', async () => {
    const user = userEvent.setup()
    render(<App />)
    const composer = screen.getByLabelText(/message darwix ai/i)
    const sendButton = screen.getByRole('button', { name: /send message/i })

    await user.type(composer, '   ')
    expect(sendButton).toBeDisabled()

    await user.click(screen.getByRole('button', { name: /help me draft/i }))
    expect(composer).toHaveValue('Help me draft a thoughtful project brief')
    await waitFor(() => expect(composer).toHaveFocus())
    expect(sendButton).toBeEnabled()
  })

  it('renders a distinct bot message with accessible timestamp details', () => {
    const botMessage: ChatMessageType = {
      id: 'bot-message',
      role: 'bot',
      content: 'I can help with that.',
      createdAt: '2026-08-18T10:30:00.000Z',
      status: 'sent',
    }

    render(<ChatMessage message={botMessage} />)

    const message = screen.getByRole('article', { name: /darwix ai message/i })
    expect(within(message).getByText('Darwix AI')).toBeInTheDocument()
    expect(within(message).getByText('I can help with that.')).toBeInTheDocument()
    expect(
      within(message).getByRole('button', { name: /status: sent/i }),
    ).toBeInTheDocument()
  })

  it('shows typing and completes the successful message lifecycle', async () => {
    const user = userEvent.setup()
    let resolveResponse: ((value: { content: string }) => void) | undefined
    vi.spyOn(mockChatService, 'sendMessage').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveResponse = resolve
        }),
    )
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Help with accessibility{Enter}',
    )

    expect(screen.getByLabelText(/^Sending$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('status', { name: /darwix ai is typing/i }),
    ).toBeInTheDocument()

    await act(async () => {
      resolveResponse?.({ content: 'Use semantic HTML and predictable focus.' })
    })

    expect(
      await screen.findByText('Use semantic HTML and predictable focus.'),
    ).toBeInTheDocument()
    expect(
      await screen.findByText(
        'Darwix AI replied: Use semantic HTML and predictable focus.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/^Sent$/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('status', { name: /darwix ai is typing/i }),
    ).not.toBeInTheDocument()
  })

  it('moves a failed request into the failed message state', async () => {
    const user = userEvent.setup()
    vi.spyOn(mockChatService, 'sendMessage').mockRejectedValue(
      new MockChatServiceError('Controlled delivery failure'),
    )
    render(<App />)

    await user.type(screen.getByLabelText(/message darwix ai/i), '/fail{Enter}')

    expect(await screen.findByLabelText(/^Not delivered$/i)).toBeInTheDocument()
    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Message not delivered')
    expect(error).toHaveTextContent('Controlled delivery failure')
    expect(
      within(error).getByRole('button', { name: /retry failed message/i }),
    ).toBeEnabled()
    expect(
      screen.queryByRole('status', { name: /darwix ai is typing/i }),
    ).not.toBeInTheDocument()
  })

  it('retries the original message without duplication and restores composer focus', async () => {
    const user = userEvent.setup()
    let resolveRetry: ((value: { content: string }) => void) | undefined
    vi.spyOn(mockChatService, 'sendMessage')
      .mockRejectedValueOnce(new MockChatServiceError('First attempt failed'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRetry = resolve
          }),
      )
    render(<App />)
    const composer = screen.getByLabelText(/message darwix ai/i)

    await user.type(composer, 'Retry this request{Enter}')
    await user.click(
      await screen.findByRole('button', { name: /retry failed message/i }),
    )

    expect(screen.getByLabelText(/^Retrying$/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /retrying failed message/i }),
    ).toBeDisabled()
    expect(screen.getAllByRole('article', { name: /your message/i })).toHaveLength(1)

    await act(async () => {
      resolveRetry?.({ content: 'The retry succeeded.' })
    })

    expect(await screen.findByText('The retry succeeded.')).toBeInTheDocument()
    expect(screen.getAllByRole('article', { name: /your message/i })).toHaveLength(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(composer).toHaveFocus()
  })

  it('prevents rapid retry attempts and supports repeated failure', async () => {
    const user = userEvent.setup()
    let rejectRetry: ((reason: Error) => void) | undefined
    const sendSpy = vi
      .spyOn(mockChatService, 'sendMessage')
      .mockRejectedValueOnce(new MockChatServiceError('Initial failure'))
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectRetry = reject
          }),
      )
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Keep failing{Enter}',
    )
    const retryButton = await screen.findByRole('button', {
      name: /retry failed message/i,
    })
    await user.dblClick(retryButton)

    expect(sendSpy).toHaveBeenCalledTimes(2)
    await act(async () => {
      rejectRetry?.(new MockChatServiceError('Retry also failed'))
    })

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Retry also failed')
    })
    expect(
      screen.getByRole('button', { name: /retry failed message/i }),
    ).toBeEnabled()
    expect(screen.getAllByRole('article', { name: /your message/i })).toHaveLength(1)
  })

  it('handles malformed bot responses without adding an empty message', async () => {
    const user = userEvent.setup()
    vi.spyOn(mockChatService, 'sendMessage').mockResolvedValue({ content: '' })
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Return malformed data{Enter}',
    )

    expect(await screen.findByLabelText(/^Not delivered$/i)).toBeInTheDocument()
    expect(
      screen.queryByRole('article', { name: /darwix ai message/i }),
    ).not.toBeInTheDocument()
  })

  it('provides deterministic failures and cancellable mock requests', async () => {
    await expect(
      mockChatService.sendMessage('/fail', { delayMs: 0 }),
    ).rejects.toBeInstanceOf(MockChatServiceError)
    await expect(
      mockChatService.sendMessage('/fail', { attempt: 1, delayMs: 0 }),
    ).resolves.toEqual(expect.objectContaining({ content: expect.any(String) }))
    await expect(
      mockChatService.sendMessage('/fail-always', {
        attempt: 1,
        delayMs: 0,
      }),
    ).rejects.toBeInstanceOf(MockChatServiceError)

    const controller = new AbortController()
    const request = mockChatService.sendMessage('Cancel this', {
      delayMs: 1000,
      signal: controller.signal,
    })
    controller.abort()

    await expect(request).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('saves a completed conversation and restores it after remount', async () => {
    const user = userEvent.setup()
    vi.spyOn(mockChatService, 'sendMessage').mockResolvedValue({
      content: 'This response will be restored.',
    })
    const view = render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Persist this conversation{Enter}',
    )
    expect(
      await screen.findByText('This response will be restored.'),
    ).toBeInTheDocument()

    await waitFor(() => {
      const savedValue = window.localStorage.getItem(CHAT_STORAGE_KEY)
      expect(savedValue).not.toBeNull()
      const saved = JSON.parse(savedValue ?? '{}') as {
        sessions?: Array<{ messages?: unknown[] }>
      }
      expect(saved.sessions?.[0].messages).toHaveLength(2)
    })

    view.unmount()
    render(<App />)
    expect(
      within(screen.getByRole('article', { name: /your message/i })).getByText(
        'Persist this conversation',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('This response will be restored.')).toBeInTheDocument()
  })

  it('creates a new chat and switches back to the previous session', async () => {
    const user = userEvent.setup()
    vi.spyOn(mockChatService, 'sendMessage').mockResolvedValue({
      content: 'First session response',
    })
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'First session message{Enter}',
    )
    await screen.findByText('First session response')
    await user.click(screen.getByRole('button', { name: /^new chat$/i }))

    expect(
      screen.getByRole('heading', { name: /new conversation/i }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /what can we build together/i }),
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /^first session message/i }),
    )
    expect(
      within(screen.getByRole('article', { name: /your message/i })).getByText(
        'First session message',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('First session response')).toBeInTheDocument()
  })

  it('confirms clearing a chat and restores focus after cancellation', async () => {
    const user = userEvent.setup()
    vi.spyOn(mockChatService, 'sendMessage').mockResolvedValue({
      content: 'Clearable response',
    })
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Clear this chat{Enter}',
    )
    await screen.findByText('Clearable response')
    const clearButton = screen.getByRole('button', {
      name: /clear current chat/i,
    })

    await user.click(clearButton)
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^cancel$/i })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(clearButton).toHaveFocus()

    await user.click(clearButton)
    await user.click(screen.getByRole('button', { name: /clear messages/i }))
    expect(
      screen.getByRole('heading', { name: /what can we build together/i }),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText(/message darwix ai/i)).toHaveFocus()
    })
  })

  it('deletes a session only after confirmation', async () => {
    const user = userEvent.setup()
    vi.spyOn(mockChatService, 'sendMessage').mockResolvedValue({
      content: 'Disposable response',
    })
    render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Session to delete{Enter}',
    )
    await screen.findByText('Disposable response')
    await user.click(screen.getByRole('button', { name: /^new chat$/i }))
    await user.click(
      screen.getByRole('button', { name: /delete session to delete/i }),
    )

    expect(screen.getByRole('alertdialog')).toHaveTextContent('Delete this chat?')
    await user.click(screen.getByRole('button', { name: /delete chat/i }))
    expect(
      screen.queryByRole('button', { name: /delete session to delete/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /what can we build together/i }),
    ).toBeInTheDocument()
  })

  it('continues chatting when LocalStorage writes are unavailable', async () => {
    const user = userEvent.setup()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    vi.spyOn(mockChatService, 'sendMessage').mockResolvedValue({
      content: 'In-memory response',
    })
    render(<App />)

    expect(await screen.findByText(/history unavailable/i)).toBeInTheDocument()
    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Continue in memory{Enter}',
    )
    expect(await screen.findByText('In-memory response')).toBeInTheDocument()
  })

  it('has no detectable accessibility violations in the default shell', async () => {
    const { container } = render(<App />)
    const results = await axe.run(container, {
      rules: {
        // jsdom cannot calculate visual contrast because it has no canvas.
        'color-contrast': { enabled: false },
      },
    })

    expect(results.violations).toEqual([])
  })

  it('has no detectable accessibility violations in the confirmation dialog', async () => {
    const user = userEvent.setup()
    vi.spyOn(mockChatService, 'sendMessage').mockResolvedValue({
      content: 'Accessible modal response',
    })
    const { container } = render(<App />)

    await user.type(
      screen.getByLabelText(/message darwix ai/i),
      'Open an accessible confirmation{Enter}',
    )
    await screen.findByText('Accessible modal response')
    await user.click(screen.getByRole('button', { name: /clear current chat/i }))

    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })

    expect(results.violations).toEqual([])
  })
})
